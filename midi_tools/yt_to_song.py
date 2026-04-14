#!/usr/bin/env python3
"""
YouTube karaoke/audio → MIDI → format piosenki dla Pianinkowego Świata Marysi.

Użycie:
  python yt_to_song.py "https://youtube.com/watch?v=..." --title "Szampan" --composer "Sanah"
  python yt_to_song.py --mp3 local.mp3 --title "Moja piosenka"

Wyjście:
  - song_output/<slug>.mid (surowe MIDI z Basic Pitch)
  - song_output/<slug>.json (format apki, do wklejenia do songs.js)
  - song_output/<slug>_debug.txt (analiza MIDI)

Workflow dla admina:
  1. Znajdź karaoke na YT (samo pianino lub czysta linia wokalna)
  2. Skopiuj URL
  3. `python yt_to_song.py <URL> --title "Nazwa" --composer "Artysta"`
  4. Sprawdź wynik, ew. popraw ręcznie BPM/tonacje
  5. Wklej JSON do songs.js (wewnątrz tablicy SONGS)
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import mido
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH


# Format piosenki dla apki: { note: 'C4', duration: 'quarter', hand: 'right', finger: 1 }
DURATION_THRESHOLDS = [
    # (min_seconds, name) — sortowane rosnąco po czasie
    (0.12, 'eighth'),
    (0.35, 'quarter'),
    (0.55, 'dotted_quarter'),
    (0.85, 'half'),
    (1.30, 'dotted_half'),
    (99.0, 'whole'),
]


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '_', text).strip('_')
    return text or 'untitled'


def midi_note_to_name(midi_num: int) -> str:
    """MIDI number → note name (e.g. 60 → C4)."""
    octave = (midi_num // 12) - 1
    names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    return names[midi_num % 12] + str(octave)


def note_to_midi(note: str) -> int:
    """C4 → 60."""
    m = re.match(r'^([A-G])([#b]?)(-?\d+)$', note)
    if not m:
        raise ValueError(f'Bad note: {note}')
    base = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[m.group(1)]
    if m.group(2) == '#':
        base += 1
    elif m.group(2) == 'b':
        base -= 1
    octave = int(m.group(3))
    return base + (octave + 1) * 12


def duration_seconds_to_name(seconds: float) -> str:
    for threshold, name in DURATION_THRESHOLDS:
        if seconds < threshold:
            return name
    return 'whole'


def finger_for_note(note_name: str, hand: str = 'right') -> int:
    """Prosta heurystyka palców dla prawej ręki w pozycji C-major."""
    midi = note_to_midi(note_name)
    # Right hand in C position: C4=1, D=2, E=3, F=4, G=5
    mapping = {60: 1, 62: 2, 64: 3, 65: 4, 67: 5, 69: 5, 71: 5, 72: 5}
    return mapping.get(midi, 3)


def download_yt_audio(url: str, output_dir: Path) -> Path:
    """Pobiera audio z YouTube jako MP3."""
    out = output_dir / 'audio.mp3'
    cmd = [
        'yt-dlp', '-x', '--audio-format', 'mp3',
        '-o', str(out.with_suffix('.%(ext)s')),
        url
    ]
    print(f'[1/4] Pobieranie audio z YouTube...')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print('yt-dlp stderr:', result.stderr[-500:])
        raise RuntimeError('yt-dlp failed')
    if not out.exists():
        # yt-dlp może użyć innej nazwy
        mp3s = list(output_dir.glob('audio*.mp3'))
        if mp3s:
            out = mp3s[0]
        else:
            raise RuntimeError(f'No MP3 found in {output_dir}')
    print(f'       → {out}')
    return out


def audio_to_midi(mp3_path: Path, output_dir: Path) -> Path:
    """Basic Pitch: MP3 → MIDI."""
    print(f'[2/4] Transkrypcja audio → MIDI (Basic Pitch)...')
    model_output, midi_data, note_events = predict(str(mp3_path))
    midi_out = output_dir / 'transcribed.mid'
    midi_data.write(str(midi_out))
    print(f'       → {midi_out} ({len(note_events)} notes detected)')
    return midi_out


def extract_melody_from_midi(midi_path: Path, debug_out: Path = None):
    """
    Z polifonicznego MIDI wyciąga "melodię" = ścieżka najwyższych nut w każdym momencie.
    Heurystyka: bierzemy TOP NOTE w każdym przedziale czasowym (to zwykle linia wokalna/melodia).
    """
    print(f'[3/4] Wyciąganie melodii (top-note strategy)...')
    mid = mido.MidiFile(str(midi_path))
    tempo = 500000  # default 120 BPM (microseconds per beat)
    all_notes = []  # (start_tick, end_tick, pitch, velocity)
    active = {}  # pitch -> start_tick

    abs_tick = 0
    for track in mid.tracks:
        abs_tick = 0
        for msg in track:
            abs_tick += msg.time
            if msg.type == 'set_tempo':
                tempo = msg.tempo
            elif msg.type == 'note_on' and msg.velocity > 0:
                active[msg.note] = abs_tick
            elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                if msg.note in active:
                    start = active.pop(msg.note)
                    all_notes.append((start, abs_tick, msg.note, msg.velocity))

    if not all_notes:
        return [], 120.0

    # BPM
    bpm = 60_000_000 / tempo
    ticks_per_beat = mid.ticks_per_beat

    def tick_to_sec(t):
        return (t / ticks_per_beat) * (tempo / 1_000_000)

    # Sortuj po czasie rozpoczęcia
    all_notes.sort(key=lambda x: x[0])

    # Top-note strategy: dla każdego czasu wybierz najwyższą aktywną nutę
    # Uproszczenie: przechodzimy sekwencyjnie, co 50ms sprawdzamy najwyższą aktywną
    max_tick = max(n[1] for n in all_notes)
    step_sec = 0.05  # 50ms resolution
    step_ticks = int((step_sec * 1_000_000 / tempo) * ticks_per_beat)
    melody = []  # list of (start_tick, pitch, vel) — uproszczone, każdy nowy pitch to nowa nuta
    last_pitch = None
    current_start = 0

    t = 0
    while t < max_tick:
        active_at_t = [n for n in all_notes if n[0] <= t < n[1]]
        if active_at_t:
            # Top note (najwyższy pitch)
            top = max(active_at_t, key=lambda x: x[2])
            pitch = top[2]
            if pitch != last_pitch:
                if last_pitch is not None:
                    melody.append((current_start, t, last_pitch))
                current_start = t
                last_pitch = pitch
        else:
            if last_pitch is not None:
                melody.append((current_start, t, last_pitch))
                last_pitch = None
        t += step_ticks

    if last_pitch is not None:
        melody.append((current_start, max_tick, last_pitch))

    # Konwertuj na format z sekundami
    melody_sec = [(tick_to_sec(s), tick_to_sec(e), p) for s, e, p in melody]

    if debug_out:
        with open(debug_out, 'w') as f:
            f.write(f'BPM: {bpm:.1f}\n')
            f.write(f'Total notes (polyphonic): {len(all_notes)}\n')
            f.write(f'Extracted melody notes: {len(melody_sec)}\n')
            f.write(f'Pitch range: {min(p for _,_,p in melody_sec)}..{max(p for _,_,p in melody_sec)}\n\n')
            f.write('Melody (time / duration / note):\n')
            for s, e, p in melody_sec[:50]:
                f.write(f'  {s:6.2f}s  {e-s:4.2f}s  {midi_note_to_name(p)} (MIDI {p})\n')
            if len(melody_sec) > 50:
                f.write(f'  ... +{len(melody_sec)-50} more\n')

    print(f'       → {len(melody_sec)} nut melodii, BPM ≈ {bpm:.0f}')
    return melody_sec, bpm


def transpose_to_c_major(melody, beginner_range=(60, 81)):
    """
    Przesuwa melodię do zakresu C4-A5 (beginner-friendly).
    Zakłada że input może być w dowolnej tonacji — heurystyka:
    - jeśli najniższa nuta < C4, transpose w górę o oktawy
    - jeśli najwyższa > A5, transpose w dół
    - dąży do mieszczenia w C4 (60) do A5 (81)
    """
    if not melody:
        return melody
    pitches = [p for _, _, p in melody]
    low, high = min(pitches), max(pitches)

    # Wrap octave by octave do zakresu C4-A5
    shift = 0
    while low + shift < beginner_range[0]:
        shift += 12
    while high + shift > beginner_range[1]:
        shift -= 12

    return [(s, e, p + shift) for s, e, p in melody]


def simplify_melody(melody, max_notes=40, min_duration=0.1):
    """
    Uproszczenie: filtruj zbyt krótkie nuty, limit do max_notes.
    Zachowuje rytmiczną strukturę ale usuwa ornamenty.
    """
    # Usuń za krótkie (triole, ornamenty — beginner nie poradzi)
    filtered = [(s, e, p) for s, e, p in melody if (e - s) >= min_duration]
    if not filtered:
        return melody[:max_notes]
    # Jeśli za dużo, zachowaj co n-tą
    if len(filtered) > max_notes:
        step = len(filtered) / max_notes
        filtered = [filtered[int(i * step)] for i in range(max_notes)]
    return filtered


def melody_to_song_format(melody, bpm):
    """Konwertuje listę (start, end, midi_pitch) do formatu apki."""
    notes = []
    for s, e, p in melody:
        dur = e - s
        dur_name = duration_seconds_to_name(dur)
        note_name = midi_note_to_name(p)
        # Basic Pitch używa # — apka też, OK
        notes.append({
            'note': note_name,
            'duration': dur_name,
            'hand': 'right',
            'finger': finger_for_note(note_name),
        })
    return notes


def build_song_entry(title, composer, notes, bpm_detected):
    """Tworzy wpis piosenki dla SONGS array."""
    # Skaluj BPM do 4 tempa
    base = round(bpm_detected)
    return {
        'id': None,  # do wpisania ręcznego
        'title': title,
        'composer': composer,
        'world': 14,
        'difficulty': 2,
        'funFact': f'Piosenka {composer}. Tempo oryginalne ≈ {base} BPM. Transkrypcja automatyczna — Maria może poprawić uchem!',
        'rightHandOnly': True,
        'isBonus': False,
        'alwaysUnlocked': True,
        'bpm': {
            'turtle': max(40, base // 2),
            'normal': max(60, int(base * 0.7)),
            'rabbit': max(80, int(base * 0.9)),
            'rocket': base,
        },
        'notes': notes,
    }


def format_song_js(song_entry):
    """Formatuje jako JS object (do wklejenia do songs.js)."""
    lines = ['  {']
    lines.append(f'    id: {song_entry["id"] or "???"},')
    lines.append(f'    title: {json.dumps(song_entry["title"], ensure_ascii=False)},')
    lines.append(f'    composer: {json.dumps(song_entry["composer"], ensure_ascii=False)},')
    lines.append(f'    world: {song_entry["world"]},')
    lines.append(f'    difficulty: {song_entry["difficulty"]},')
    lines.append(f'    funFact: {json.dumps(song_entry["funFact"], ensure_ascii=False)},')
    lines.append(f'    rightHandOnly: {str(song_entry["rightHandOnly"]).lower()},')
    lines.append(f'    isBonus: {str(song_entry["isBonus"]).lower()},')
    lines.append(f'    alwaysUnlocked: {str(song_entry["alwaysUnlocked"]).lower()},')
    bpm = song_entry['bpm']
    lines.append(f'    bpm: {{ turtle: {bpm["turtle"]}, normal: {bpm["normal"]}, rabbit: {bpm["rabbit"]}, rocket: {bpm["rocket"]} }},')
    lines.append('    notes: [')
    for n in song_entry['notes']:
        lines.append(f"      {{ note: '{n['note']}', duration: '{n['duration']}', hand: '{n['hand']}', finger: {n['finger']} }},")
    lines.append('    ],')
    lines.append('  },')
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('url', nargs='?', help='YouTube URL (or --mp3)')
    ap.add_argument('--mp3', help='Local MP3 file (zamiast URL YT)')
    ap.add_argument('--title', required=True, help='Tytuł piosenki')
    ap.add_argument('--composer', default='Nieznany', help='Wykonawca')
    ap.add_argument('--no-transpose', action='store_true', help='Nie transponuj do C-major')
    ap.add_argument('--max-notes', type=int, default=40, help='Maks liczba nut w uproszczonej wersji')
    ap.add_argument('--output-dir', default='song_output', help='Folder wyjściowy')
    args = ap.parse_args()

    if not args.url and not args.mp3:
        print('Podaj URL YouTube lub --mp3 <path>', file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output_dir) / slugify(args.title)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Pobierz lub użyj lokalnego mp3
    if args.mp3:
        mp3_path = Path(args.mp3)
        if not mp3_path.exists():
            print(f'Brak pliku: {mp3_path}', file=sys.stderr)
            sys.exit(1)
    else:
        mp3_path = download_yt_audio(args.url, output_dir)

    # 2. MP3 → MIDI
    midi_path = audio_to_midi(mp3_path, output_dir)

    # 3. MIDI → melodia (top notes)
    debug_out = output_dir / f'{slugify(args.title)}_debug.txt'
    melody, bpm = extract_melody_from_midi(midi_path, debug_out=debug_out)
    if not melody:
        print('Brak melodii wykrytej. Sprawdź audio.', file=sys.stderr)
        sys.exit(1)

    # 4. Transpozycja + uproszczenie
    if not args.no_transpose:
        melody = transpose_to_c_major(melody)
    melody = simplify_melody(melody, max_notes=args.max_notes)
    print(f'[4/4] Po uproszczeniu: {len(melody)} nut')

    # 5. Konwersja do formatu apki
    notes = melody_to_song_format(melody, bpm)
    song = build_song_entry(args.title, args.composer, notes, bpm)

    # 6. Zapisz
    json_path = output_dir / f'{slugify(args.title)}.json'
    js_path = output_dir / f'{slugify(args.title)}.js'

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(song, f, ensure_ascii=False, indent=2)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(format_song_js(song))

    print(f'\n✅ Gotowe!')
    print(f'   JSON:  {json_path}')
    print(f'   JS:    {js_path}')
    print(f'   Debug: {debug_out}')
    print(f'\nNastępne kroki:')
    print(f'   1. Sprawdź {debug_out} — jak wygląda melodia?')
    print(f'   2. Jeśli OK, otwórz {js_path}, dopisz id (201-210), wklej do songs.js')
    print(f'   3. Odśwież apkę, Maria testuje')


if __name__ == '__main__':
    main()
