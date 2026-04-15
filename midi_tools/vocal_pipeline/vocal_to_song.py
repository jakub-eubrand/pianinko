#!/usr/bin/env python3
"""
Vocal pipeline: audio → Demucs → vocals.wav → CREPE → MIDI → format apki.

Użycie:
  python vocal_to_song.py "https://youtube.com/watch?v=..." --title "Nazwa" --composer "Sanah"
  python vocal_to_song.py --audio song.mp3 --title "Nazwa"
"""
import argparse
import json
import subprocess
import sys
import os
import re
from pathlib import Path

import numpy as np
import crepe
import soundfile as sf

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def slugify(t):
    t = t.lower()
    t = re.sub(r'[^\w\s-]', '', t)
    t = re.sub(r'[\s_-]+', '_', t).strip('_')
    return t or 'untitled'


def download_audio(url, out_mp3, section=None):
    python_dir = Path(sys.executable).parent
    yt_dlp = str(python_dir / 'yt-dlp.exe')
    if not Path(yt_dlp).exists():
        # Try other venv
        yt_dlp = 'E:/_projekt/pianinko/midi_tools/.venv/Scripts/yt-dlp.exe'
    cmd = [yt_dlp, '-x', '--audio-format', 'mp3', '-o', str(out_mp3.with_suffix('.%(ext)s')), url]
    if section:
        cmd = cmd[:1] + ['--download-sections', f'*{section}'] + cmd[1:]
    print(f'[1/5] Pobieranie audio...')
    subprocess.run(cmd, check=True, capture_output=True)
    print(f'       → {out_mp3}')


def run_demucs(input_mp3, output_dir):
    print(f'[2/5] Demucs: separacja wokalu...')
    cmd = [sys.executable, '-m', 'demucs', '--two-stems=vocals', '-n', 'htdemucs',
           '-o', str(output_dir), str(input_mp3)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr[-800:], file=sys.stderr)
        raise RuntimeError('Demucs failed')
    # Find vocals.wav
    stem_name = input_mp3.stem
    vocals = output_dir / 'htdemucs' / stem_name / 'vocals.wav'
    if not vocals.exists():
        raise RuntimeError(f'No vocals.wav at {vocals}')
    print(f'       → {vocals}')
    return vocals


def run_crepe(vocals_wav):
    print(f'[3/5] CREPE: monofoniczny pitch tracker...')
    audio, sr = sf.read(str(vocals_wav))
    if audio.ndim > 1:
        audio = audio.mean(axis=1)  # mono
    # CREPE expects 16kHz
    if sr != 16000:
        # Simple resampling
        import scipy.signal
        audio = scipy.signal.resample_poly(audio, 16000, sr)
        sr = 16000
    time, frequency, confidence, _ = crepe.predict(audio, sr, viterbi=True, step_size=50)
    print(f'       → {len(frequency)} próbek, min conf: {confidence.min():.2f}, max: {confidence.max():.2f}')
    return time, frequency, confidence


def freq_to_midi(freq):
    """Hz → MIDI note number"""
    if freq <= 0:
        return 0
    return int(round(69 + 12 * np.log2(freq / 440.0)))


def extract_notes(time, frequency, confidence, min_conf=0.7, min_duration=0.08):
    """Z ciągłej pitch curve → dyskretne notki MIDI."""
    print(f'[4/5] Kwantyzacja pitch → notes...')
    notes = []  # list of (start_sec, end_sec, midi_pitch)
    current_pitch = None
    current_start = None

    for i, (t, f, c) in enumerate(zip(time, frequency, confidence)):
        if c < min_conf or f < 80 or f > 1200:
            # silence or very uncertain
            if current_pitch is not None:
                if t - current_start >= min_duration:
                    notes.append((current_start, t, current_pitch))
                current_pitch = None
                current_start = None
            continue

        midi = freq_to_midi(f)
        if current_pitch is None:
            current_pitch = midi
            current_start = t
        elif abs(midi - current_pitch) >= 1:  # pitch change
            if t - current_start >= min_duration:
                notes.append((current_start, t, current_pitch))
            current_pitch = midi
            current_start = t

    if current_pitch is not None and time[-1] - current_start >= min_duration:
        notes.append((current_start, time[-1], current_pitch))

    print(f'       → {len(notes)} notek')
    if notes:
        pitches = [n[2] for n in notes]
        print(f'       Range: MIDI {min(pitches)}-{max(pitches)}')
    return notes


def notes_to_song_format(notes, title, composer, max_notes=40, transpose_to_c=True, bpm=100):
    print(f'[5/5] Format apki...')
    if not notes:
        return None

    # Merge identical consecutive pitches (same MIDI within 100ms gap)
    merged = []
    for s, e, p in notes:
        if merged and merged[-1][2] == p and s - merged[-1][1] < 0.15:
            merged[-1] = (merged[-1][0], e, p)
        else:
            merged.append((s, e, p))
    notes = merged

    # Limit length
    if max_notes and len(notes) > max_notes:
        step = len(notes) / max_notes
        notes = [notes[int(i * step)] for i in range(max_notes)]

    # Transpose to C4-A5 range if too high/low for beginner
    if transpose_to_c:
        pitches = [n[2] for n in notes]
        shift = 0
        while min(pitches) + shift < 60: shift += 12
        while max(pitches) + shift > 84: shift -= 12
        notes = [(s, e, p + shift) for s, e, p in notes]

    # Convert to app format
    names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    dur_thresholds = [(0.15, 'eighth'), (0.4, 'quarter'), (0.65, 'dotted_quarter'),
                      (0.9, 'half'), (1.3, 'dotted_half'), (99.0, 'whole')]
    finger_map = {60: 1, 62: 2, 64: 3, 65: 4, 67: 5, 69: 5, 71: 5, 72: 5}

    app_notes = []
    for s, e, p in notes:
        dur = e - s
        dur_name = next(n for t, n in dur_thresholds if dur < t)
        octave = p // 12 - 1
        name = names[p % 12] + str(octave)
        finger = finger_map.get(p, 3)
        app_notes.append({'note': name, 'duration': dur_name, 'hand': 'right', 'finger': finger})

    print(f'       → {len(app_notes)} notek w formacie apki')
    return {
        'title': title, 'composer': composer, 'world': 14, 'difficulty': 2,
        'funFact': f'{composer} — {title}. Transkrypcja z wokalu (Demucs separacja + CREPE pitch tracker).',
        'rightHandOnly': True, 'isBonus': False, 'alwaysUnlocked': True, 'autoTranscribed': True,
        'bpm': {'turtle': max(40, bpm // 2), 'normal': max(60, int(bpm * 0.7)),
                'rabbit': max(80, int(bpm * 0.9)), 'rocket': bpm},
        'notes': app_notes,
    }


def format_song_js(song, song_id):
    L = ['  {']
    L.append(f'    id: {song_id},')
    L.append(f'    title: {json.dumps(song["title"], ensure_ascii=False)},')
    L.append(f'    composer: {json.dumps(song["composer"], ensure_ascii=False)},')
    L.append(f'    world: {song["world"]},')
    L.append(f'    difficulty: {song["difficulty"]},')
    L.append(f'    funFact: {json.dumps(song["funFact"], ensure_ascii=False)},')
    L.append(f'    rightHandOnly: true, isBonus: false, alwaysUnlocked: true, autoTranscribed: true,')
    b = song['bpm']
    L.append(f'    bpm: {{ turtle: {b["turtle"]}, normal: {b["normal"]}, rabbit: {b["rabbit"]}, rocket: {b["rocket"]} }},')
    L.append('    notes: [')
    for n in song['notes']:
        L.append(f"      {{ note: '{n['note']}', duration: '{n['duration']}', hand: '{n['hand']}', finger: {n['finger']} }},")
    L.append('    ],')
    L.append('  },')
    return '\n'.join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('url', nargs='?')
    ap.add_argument('--audio')
    ap.add_argument('--title', required=True)
    ap.add_argument('--composer', default='Sanah')
    ap.add_argument('--id', type=int, default=999)
    ap.add_argument('--section', default='0-90')
    ap.add_argument('--max-notes', type=int, default=40)
    ap.add_argument('--no-transpose', action='store_true')
    ap.add_argument('--bpm', type=int, default=100)
    ap.add_argument('--min-conf', type=float, default=0.7)
    args = ap.parse_args()

    if not args.url and not args.audio:
        sys.exit('Podaj URL lub --audio')

    output_dir = Path('output') / slugify(args.title)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.audio:
        mp3 = Path(args.audio)
    else:
        mp3 = output_dir / 'source.mp3'
        download_audio(args.url, mp3, section=args.section)

    vocals = run_demucs(mp3, output_dir / 'separated')
    time, freq, conf = run_crepe(vocals)
    notes = extract_notes(time, freq, conf, min_conf=args.min_conf)
    if not notes:
        sys.exit('Brak notek wykrytych.')

    song = notes_to_song_format(notes, args.title, args.composer,
                                 max_notes=args.max_notes,
                                 transpose_to_c=not args.no_transpose, bpm=args.bpm)

    js = format_song_js(song, args.id)
    with open(output_dir / f'{slugify(args.title)}.js', 'w', encoding='utf-8') as f:
        f.write(js)
    with open(output_dir / f'{slugify(args.title)}.json', 'w', encoding='utf-8') as f:
        json.dump(song, f, ensure_ascii=False, indent=2)

    print(f'\n✅ Gotowe!')
    print(f'   JS:   {output_dir}/{slugify(args.title)}.js')
    print(f'   Notes: {len(song["notes"])}')


if __name__ == '__main__':
    main()
