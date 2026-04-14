# Midi Tools — Admin pipeline do dodawania piosenek

## Szybki start

```bash
cd E:/_projekt/pianinko/midi_tools

# Aktywuj venv
source .venv/Scripts/activate    # Git Bash
# lub
.venv\Scripts\activate           # PowerShell

# Dodaj piosenkę z YouTube (karaoke najlepiej)
python yt_to_song.py "https://youtube.com/watch?v=XXXXX" \
  --title "Szampan" \
  --composer "Sanah"

# Lub z lokalnego MP3
python yt_to_song.py --mp3 piosenka.mp3 --title "Moja piosenka" --composer "Artysta"
```

## Wyjście

Skrypt tworzy folder `song_output/<slug>/`:
- `audio.mp3` — pobrane audio (usuń po)
- `transcribed.mid` — surowe MIDI z Basic Pitch
- `<slug>.json` — piosenka w formacie JSON
- `<slug>.js` — piosenka jako JS object do wklejenia do `songs.js`
- `<slug>_debug.txt` — analiza: BPM, zakres, lista nut

## Workflow admina

1. Znajdź **karaoke** wersję na YT:
   - Szukaj "Sanah [nazwa] karaoke", "Sanah [nazwa] instrumental", "Sanah [nazwa] piano"
   - **Najlepsze**: samo pianino lub piano tutorial (czystszy input → lepsza transkrypcja)
   - Unikaj: pełne nagrania z wokalem i instrumentami (Basic Pitch się pogubi)

2. Skopiuj URL YouTube

3. Uruchom skrypt:
   ```bash
   python yt_to_song.py "URL" --title "Tytuł" --composer "Artysta"
   ```

4. Sprawdź `<slug>_debug.txt`:
   - Czy BPM jest sensowny?
   - Czy zakres nut pasuje (C4-A5 idealnie)?
   - Czy nuty wyglądają na melodię (nie akordy)?

5. Wklej `<slug>.js` do `js/songs.js`:
   - Przed `];` na końcu tablicy SONGS
   - Zmień `id: ???` na następny wolny numer (211+)
   - Ewentualnie popraw `title`, `funFact`

6. `git commit + push` → GitHub Pages rebuild → Maria odświeża Chrome

## Troubleshooting

**Basic Pitch zwraca dużo nut / chaos**:
- Spróbuj karaoke z samym pianinem (czystszy input)
- Użyj `--max-notes 20` żeby jeszcze bardziej uprościć

**BPM nie pasuje**:
- Basic Pitch nie zawsze dobrze wykrywa tempo
- Popraw ręcznie `bpm.turtle` w wygenerowanym JS

**Zakres nut za wysoki/niski**:
- Użyj `--no-transpose` jeśli chcesz oryginalną wysokość
- Domyślnie transponuje do C4-A5 (klawiatura dziecka)

## Jak to działa

```
YouTube URL
    ↓ (yt-dlp)
MP3
    ↓ (Basic Pitch / Spotify)
MIDI polifoniczne
    ↓ (top-note strategy)
Melodia (jedna linia)
    ↓ (transpose + simplify)
Format apki (note, duration, hand, finger)
```

**Top-note strategy**: z polifonicznego MIDI wybiera najwyższą aktywną nutę w każdym momencie. Dla wokalu/melodii to zwykle prawidłowa linia, bo:
- Basic Pitch wykrywa wokal jako "high track"
- Akompaniament (bas, akordy) jest niższy
- Melodia w karaoke piano tutorial jest w RH, zwykle >= C4

## Biblioteki

- `basic-pitch` (Spotify) — AI audio → MIDI
- `yt-dlp` — pobieranie audio z YouTube
- `mido` — parsowanie MIDI
- Python 3.11 (basic-pitch nie wspiera 3.12+)

## TODO / Przyszłe usprawnienia

- [ ] Web UI w apce (admin-only, PIN-protected) — wkleja URL, czeka, dostaje piosenkę
- [ ] Lepsza segmentacja: zwrotka vs refren (teraz wszystko razem)
- [ ] Detekcja tonacji + auto-transposition tylko jeśli spoza zakresu
- [ ] Rozpoznawanie lewej ręki (akordy z niższej oktawy)
- [ ] Fingering heurystyka lepsza niż pozycja C
