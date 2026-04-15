#!/usr/bin/env python3
"""
Synthesia YouTube video → MIDI → format apki Pianinkowej.

Pipeline:
  1. yt-dlp: pobiera video (MP4)
  2. OpenCV: analizuje klatki, wykrywa kolorowe notki spadające na klawiaturę
  3. Mapuje pozycję X → MIDI pitch (88 klawiszy)
  4. Kolor notki → ręka (zielony=RH, niebieski=LH)
  5. Tempo = automatycznie z BPM pierwszych notek
  6. Output: JSON + JS do wklejenia

Wymaga:
  - yt-dlp, opencv-python, numpy
  - Synthesia-style video z czystymi kolorowymi notkami

Użycie:
  python synthesia_to_song.py "https://youtube.com/watch?v=..." --title "No sory" --composer "Sanah"
  python synthesia_to_song.py --video local.mp4 --title "Moja"

Opcjonalne:
  --debug          Zapisuje klatki z adnotacjami do debug_frames/
  --no-transpose   Nie transponuj do C-major
  --rh-hand-only   Ignoruj LH (dla początkujących)
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from collections import defaultdict

import cv2
import numpy as np

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


# Kolory notek w Synthesia (HSV range)
# Zielony = RH (prawa, melodia)
# Niebieski = LH (lewa, bass)
HSV_RANGES = {
    'right': [(40, 100, 100), (80, 255, 255)],   # Green
    'left':  [(100, 100, 100), (130, 255, 255)],  # Blue
}


def slugify(t):
    t = t.lower()
    t = re.sub(r'[^\w\s-]', '', t)
    t = re.sub(r'[\s_-]+', '_', t).strip('_')
    return t or 'untitled'


def download_video(url, output_path, section=None):
    python_dir = Path(sys.executable).parent
    yt_dlp = str(python_dir / 'yt-dlp.exe')
    if not Path(yt_dlp).exists():
        yt_dlp = 'yt-dlp'
    cmd = [yt_dlp, '-f', 'best[height<=720]', '-o', str(output_path), url]
    if section:
        cmd.insert(-1, '--download-sections')
        cmd.insert(-1, f'*{section}')
    print(f'[1/5] Pobieranie video z YouTube...')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print('yt-dlp error:', result.stderr[-500:], file=sys.stderr)
        raise RuntimeError('yt-dlp failed')
    print(f'       → {output_path}')


def detect_piano_keyboard(cap, sample_frames=10):
    """
    Wykrywa obszar klawiatury piano (dolne ~30% klatki z silnym biało-czarnym wzorem).
    Zwraca (y_top, y_bottom, x_left, x_right) klawiatury + hit_line_y (tuż nad piano).
    """
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Uśrednij N klatek dla stabilnej detekcji
    samples = []
    for i in range(sample_frames):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * (i + 1) / (sample_frames + 1)))
        ret, frame = cap.read()
        if ret:
            samples.append(frame)
    if not samples:
        raise RuntimeError('Brak klatek do analizy')

    mean_frame = np.mean(samples, axis=0).astype(np.uint8)

    # Klawiatura = największy ciągły obszar z >50% jasnych pikseli w dolnej połowie
    gray = cv2.cvtColor(mean_frame, cv2.COLOR_BGR2GRAY)
    white_rows = np.sum(gray > 180, axis=1)

    bottom_start = int(h * 0.5)
    threshold = 0.5 * w  # 50% białych

    # Znajdź wszystkie wiersze spełniające warunek
    candidate_rows = [y for y in range(bottom_start, h) if white_rows[y] > threshold]

    if not candidate_rows:
        y_top = int(h * 0.8)
        y_bottom = h
    else:
        # Znajdź największy CIĄGŁY blok (rozdziel wg przerw > 3 pikseli)
        blocks = []
        current = [candidate_rows[0]]
        for y in candidate_rows[1:]:
            if y - current[-1] <= 3:
                current.append(y)
            else:
                blocks.append(current)
                current = [y]
        blocks.append(current)

        # Wybierz najdłuższy blok (największa klawiatura)
        best_block = max(blocks, key=len)
        y_top = best_block[0]
        y_bottom = best_block[-1]

    # Hit line: 2-5 pikseli nad pianinem (tam gdzie notka trafia klawisz)
    hit_line_y = max(0, y_top - 3)

    return {
        'piano_y_top': y_top,
        'piano_y_bottom': y_bottom,
        'piano_x_left': 0,
        'piano_x_right': w,
        'hit_line_y': hit_line_y,
        'frame_width': w,
        'frame_height': h,
    }


def detect_key_boundaries(cap, piano_info, sample_frames=5):
    """
    Wykrywa granice klawiszy białych — szuka czarnych pionowych linii (dzielniki).
    Zwraca listę x-pozycji środków białych klawiszy.
    """
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    # Sampluj 30-50% od góry piano - tam są wyraźne czarne dzielniki klawiszy
    # (nie 15% bo tam jest jeszcze hit area, nie 70% bo tam są żółte litery)
    piano_h = piano_info['piano_y_bottom'] - piano_info['piano_y_top']
    y_sample = piano_info['piano_y_top'] + max(3, int(piano_h * 0.4))

    samples = []
    for i in range(sample_frames):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * (i + 1) / (sample_frames + 1)))
        ret, frame = cap.read()
        if ret:
            # Uśrednij kilka wierszy wokół y_sample
            rows = frame[max(0, y_sample - 2):y_sample + 3, :, :]
            samples.append(np.mean(rows, axis=0))
    if not samples:
        return []

    # Wiersz: jasność
    mean_row = np.mean(samples, axis=0)
    gray_row = np.mean(mean_row, axis=1)  # BGR → grayscale

    # Binarny: białe (>150) vs czarne (dzielniki + black keys) — int8 dla diff bez wrap
    binary = (gray_row > 150).astype(np.int8)

    # Znajdź granice: przejścia 0→1 i 1→0
    diff = np.diff(binary)
    white_starts = np.where(diff == 1)[0]
    white_ends = np.where(diff == -1)[0]

    # Sparuj starts i ends
    white_centers = []
    for s in white_starts:
        # Znajdź najbliższy end > s
        ends_after = white_ends[white_ends > s]
        if len(ends_after) > 0:
            e = ends_after[0]
            center = (s + e) // 2
            width = e - s
            # Odrzuć za wąskie (<5px) lub za szerokie (>40% klatki)
            if 5 < width < piano_info['frame_width'] * 0.2:
                white_centers.append({'x': center, 'width': width, 'start': s, 'end': e})

    return white_centers


def detect_colored_pixels_at_hitline(frame, hit_line_y, hand='right', tolerance=5):
    """
    Zwraca listę x-pozycji gdzie na hit_line_y (±tolerance) są kolorowe piksele podanej ręki.
    """
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    low, high = HSV_RANGES[hand]
    mask = cv2.inRange(hsv, np.array(low), np.array(high))

    # Zbierz maskę w pasie ±tolerance px
    y0 = max(0, hit_line_y - tolerance)
    y1 = min(frame.shape[0], hit_line_y + tolerance)
    strip = mask[y0:y1, :]

    # Zsumuj pionowo — jeśli >0, pixel aktywny
    active_cols = np.any(strip > 0, axis=0)

    # Grupuj sąsiadujące piksele w "notki"
    active_indices = np.where(active_cols)[0]
    if len(active_indices) == 0:
        return []

    # Continuity groups
    groups = []
    start = active_indices[0]
    prev = start
    for i in active_indices[1:]:
        if i - prev > 3:  # przerwa > 3px = nowa notka
            groups.append((start, prev))
            start = i
        prev = i
    groups.append((start, prev))

    # Zwróć środki grup o szerokości >= 5px
    return [(s + e) // 2 for s, e in groups if e - s >= 5]


def x_to_midi_note(x, white_centers, piano_width):
    """
    Mapuje pozycję X do MIDI note.
    Zakłada że white_centers zawiera 52 białe klawisze (88-key piano).
    Jeśli mniej: dopasowuje do dostępnego zakresu (typowe Synthesia: 49 keys lub 61).
    """
    if not white_centers:
        return None

    # Znajdź najbliższy biały klawisz
    xs = [w['x'] for w in white_centers]
    idx = int(np.argmin([abs(x - cx) for cx in xs]))

    # Mapowanie białych klawiszy na MIDI
    # Pełne piano 88 keys: A0 (21), B0 (23), C1 (24), D1 (26)...
    # 52 białe klawisze
    # Dla mniejszych range: zakładamy środek ≈ C4 (MIDI 60)
    n_keys = len(white_centers)

    # Uproszczenie: zakładamy że środek klawiatury to C4 (60)
    # Sekwencja: C D E F G A B (7 białych / oktawa)
    white_pattern = [0, 2, 4, 5, 7, 9, 11]  # offsets od C
    mid_idx = n_keys // 2

    octave_offset = (idx - mid_idx) // 7
    key_in_octave = (idx - mid_idx) % 7
    if key_in_octave < 0:
        key_in_octave += 7
        octave_offset -= 1

    midi_note = 60 + octave_offset * 12 + white_pattern[key_in_octave]
    return midi_note


def extract_notes_from_video(video_path, debug=False):
    print(f'[2/5] Analiza klatek (OpenCV)...')
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps
    print(f'       Video: {total_frames} klatek @ {fps}fps ({duration_sec:.1f}s)')

    print(f'[3/5] Wykrywanie klawiatury piano...')
    piano = detect_piano_keyboard(cap)
    print(f'       Piano: y={piano["piano_y_top"]}-{piano["piano_y_bottom"]}, hit_line={piano["hit_line_y"]}')

    white_centers = detect_key_boundaries(cap, piano)
    print(f'       Wykryto {len(white_centers)} białych klawiszy')
    if len(white_centers) < 10:
        print('       UWAGA: mało klawiszy, detekcja może być niedokładna', file=sys.stderr)

    # Reset to start
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    print(f'[4/5] Tracking notek klatka po klatce...')
    # Track active notes: {(hand, midi_pitch): start_time_sec}
    active = {}
    events = []  # list of (start_sec, end_sec, midi_pitch, hand)

    debug_dir = None
    if debug:
        debug_dir = video_path.parent / 'debug_frames'
        debug_dir.mkdir(exist_ok=True)

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        time_sec = frame_idx / fps

        # Co 3 klatkę (10fps przy 30fps source) — szybsze, wystarcza
        if frame_idx % 3 != 0:
            frame_idx += 1
            continue

        current_active = {'right': set(), 'left': set()}

        for hand in ['right', 'left']:
            xs = detect_colored_pixels_at_hitline(frame, piano['hit_line_y'], hand=hand)
            for x in xs:
                midi = x_to_midi_note(x, white_centers, piano['frame_width'])
                if midi and 21 <= midi <= 108:
                    current_active[hand].add(midi)

        # Update events
        for hand in ['right', 'left']:
            # New notes: in current but not in active
            for midi in current_active[hand]:
                key = (hand, midi)
                if key not in active:
                    active[key] = time_sec
            # Ended notes: in active but not in current
            for key in list(active.keys()):
                if key[0] == hand and key[1] not in current_active[hand]:
                    start = active.pop(key)
                    events.append((start, time_sec, key[1], key[0]))

        # Debug: save annotated frame every 30 frames
        if debug and frame_idx % 30 == 0:
            dbg = frame.copy()
            cv2.line(dbg, (0, piano['hit_line_y']), (piano['frame_width'], piano['hit_line_y']), (0, 255, 255), 1)
            for hand, color in [('right', (0, 255, 0)), ('left', (255, 0, 0))]:
                for midi in current_active[hand]:
                    # Estimate x
                    diffs = [abs(60 - midi)]  # placeholder
                    cv2.putText(dbg, f'{hand}:{midi}', (10, 30 + 20 * (0 if hand == 'right' else 1)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            cv2.imwrite(str(debug_dir / f'frame_{frame_idx:05d}.png'), dbg)

        frame_idx += 1

    # Close any remaining active
    t_end = frame_idx / fps
    for key, start in active.items():
        events.append((start, t_end, key[1], key[0]))

    cap.release()

    events.sort()
    print(f'       → {len(events)} notek wykrytych')
    rh = [e for e in events if e[3] == 'right']
    lh = [e for e in events if e[3] == 'left']
    print(f'       RH (prawa): {len(rh)}, LH (lewa): {len(lh)}')

    return events, fps


def midi_to_note_name(midi):
    names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    return names[midi % 12] + str(midi // 12 - 1)


DURATION_THRESHOLDS = [
    (0.12, 'eighth'),
    (0.35, 'quarter'),
    (0.55, 'dotted_quarter'),
    (0.85, 'half'),
    (1.30, 'dotted_half'),
    (99.0, 'whole'),
]


def duration_to_name(sec):
    for t, n in DURATION_THRESHOLDS:
        if sec < t:
            return n
    return 'whole'


def events_to_song(events, title, composer, bpm_estimate=100, rh_only=False, transpose=True, max_notes=40):
    print(f'[5/5] Konwersja do formatu apki...')

    # Filter to RH only if requested
    if rh_only:
        events = [e for e in events if e[3] == 'right']

    # Limit length
    if max_notes > 0 and len(events) > max_notes:
        # Keep evenly distributed
        step = len(events) / max_notes
        events = [events[int(i * step)] for i in range(max_notes)]

    # Transpose to C4-A5 if out of range
    if transpose and events:
        pitches = [e[2] for e in events]
        shift = 0
        while min(pitches) + shift < 60:
            shift += 12
        while max(pitches) + shift > 81:
            shift -= 12
        events = [(s, e, p + shift, h) for s, e, p, h in events]

    notes = []
    for s, e, p, h in events:
        dur = duration_to_name(e - s)
        name = midi_to_note_name(p)
        # Finger heuristic for RH in C position
        fingers = {60: 1, 62: 2, 64: 3, 65: 4, 67: 5, 69: 5, 71: 5, 72: 5}
        finger = fingers.get(p, 3)
        notes.append({
            'note': name,
            'duration': dur,
            'hand': h,
            'finger': finger,
        })

    return {
        'id': None,
        'title': title,
        'composer': composer,
        'world': 14,
        'difficulty': 2,
        'funFact': f'Transkrypcja z video Synthesia (OpenCV). {composer} — {title}. Melodia w zakresie C4-A5.',
        'rightHandOnly': rh_only,
        'isBonus': False,
        'alwaysUnlocked': True,
        'autoTranscribed': True,
        'bpm': {
            'turtle': max(40, bpm_estimate // 2),
            'normal': max(60, int(bpm_estimate * 0.7)),
            'rabbit': max(80, int(bpm_estimate * 0.9)),
            'rocket': bpm_estimate,
        },
        'notes': notes,
    }


def format_song_js(song):
    lines = ['  {']
    lines.append(f'    id: {song["id"] or "???"},')
    lines.append(f'    title: {json.dumps(song["title"], ensure_ascii=False)},')
    lines.append(f'    composer: {json.dumps(song["composer"], ensure_ascii=False)},')
    lines.append(f'    world: {song["world"]},')
    lines.append(f'    difficulty: {song["difficulty"]},')
    lines.append(f'    funFact: {json.dumps(song["funFact"], ensure_ascii=False)},')
    lines.append(f'    rightHandOnly: {str(song["rightHandOnly"]).lower()},')
    lines.append(f'    isBonus: {str(song["isBonus"]).lower()},')
    lines.append(f'    alwaysUnlocked: {str(song["alwaysUnlocked"]).lower()},')
    if song.get('autoTranscribed'):
        lines.append(f'    autoTranscribed: true,')
    b = song['bpm']
    lines.append(f'    bpm: {{ turtle: {b["turtle"]}, normal: {b["normal"]}, rabbit: {b["rabbit"]}, rocket: {b["rocket"]} }},')
    lines.append('    notes: [')
    for n in song['notes']:
        lines.append(f"      {{ note: '{n['note']}', duration: '{n['duration']}', hand: '{n['hand']}', finger: {n['finger']} }},")
    lines.append('    ],')
    lines.append('  },')
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('url', nargs='?')
    ap.add_argument('--video', help='Lokalny plik mp4')
    ap.add_argument('--title', required=True)
    ap.add_argument('--composer', default='Nieznany')
    ap.add_argument('--rh-only', action='store_true', help='Tylko prawa ręka')
    ap.add_argument('--no-transpose', action='store_true')
    ap.add_argument('--debug', action='store_true', help='Zapisz klatki z adnotacjami')
    ap.add_argument('--section', default=None, help='Fragment video, np. "20-60"')
    ap.add_argument('--bpm', type=int, default=100)
    ap.add_argument('--max-notes', type=int, default=40, help='Max notes to keep (0 = all)')
    args = ap.parse_args()

    if not args.url and not args.video:
        print('Podaj URL YouTube lub --video <path>', file=sys.stderr)
        sys.exit(1)

    output_dir = Path('synthesia_output') / slugify(args.title)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Download or use local
    if args.video:
        video_path = Path(args.video)
    else:
        video_path = output_dir / 'source.mp4'
        download_video(args.url, video_path, section=args.section)

    # 2-5. Analysis
    events, fps = extract_notes_from_video(video_path, debug=args.debug)
    if not events:
        print('Brak notek wykrytych.', file=sys.stderr)
        sys.exit(1)

    song = events_to_song(events, args.title, args.composer, bpm_estimate=args.bpm,
                           rh_only=args.rh_only, transpose=not args.no_transpose,
                           max_notes=args.max_notes)

    # Save
    js = format_song_js(song)
    with open(output_dir / f'{slugify(args.title)}.js', 'w', encoding='utf-8') as f:
        f.write(js)
    with open(output_dir / f'{slugify(args.title)}.json', 'w', encoding='utf-8') as f:
        json.dump(song, f, ensure_ascii=False, indent=2)

    print(f'\n✅ Gotowe!')
    print(f'   JS:   {output_dir}/{slugify(args.title)}.js')
    print(f'   JSON: {output_dir}/{slugify(args.title)}.json')
    print(f'   Notes: {len(song["notes"])}')
    print(f'\nNastępne kroki:')
    print(f'   1. Otwórz {slugify(args.title)}.js')
    print(f'   2. Nadaj id (np. 214+)')
    print(f'   3. Wklej do js/songs.js')


if __name__ == '__main__':
    main()
