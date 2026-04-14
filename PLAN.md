# Pianinkowy Świat Marysi — Plan Rozwoju

## Kontekst

Maria, 11 lat. Ma słuch muzyczny, śpiewa, była w chórze. Gra ze słuchu (Sanah, pop).
Próbowała uczyć się tradycyjnie — zniechęciła się, nut się nie nauczyła.
Instrument: Casio CT-S1BK (USB-MIDI, kabel USB-B → USB-A).
Fundament: apka Little Maestro (21k linii, single-file HTML, falling notes, MIDI, scoring).

## Metodyki pedagogiczne

1. **Rote-to-Note (Suzuki)** — słuchaj → graj → czytaj. Maria jest na "graj ze słuchu", brakuje mostu do notacji. Rozwiązanie: falling notes bez notacji → potem "patrz, to zagrałaś wygląda TAK".
2. **Landmark Notes** — 3 kotwy (C, F, G), reszta z interwałów. Chórzystki myślą interwałami.
3. **Pattern Reading** — wzory: krok (sąsiednia), skok (co druga), powtórzenie. "Idzie w górę po schodkach" > "to jest E".
4. **Chord-first** — 4 akordy = prawdziwa piosenka od dnia 1. Lewa: akordy, prawa: melodia ze słuchu.

---

## Faza 1 — Polonizacja + Sanah + UX krytyczny ✅ (GOTOWE 2026-04-14)

Cel: Maria siada i gra piosenki które zna, po polsku.

### Polonizacja
- [x] Rename: Little Maestro → **Pianinkowy Świat Marysi**
- [x] Polonizacja UI (~400 edycji, ~250 stringów)
- [x] Polskie nazwy nut: B→H (funkcja `noteDisplayPL` w midi.js)
- [x] Polskie nazwy 13 światów + World 14 = "Sanah" (bez mylącego numeru)
- [x] Polskie nazwy tempa: Żółw/Normalnie/Szybko
- [x] Sesja domyślna: 20 min
- [x] Polski welcome, PIN modal, error messages, empty states

### Content
- [x] Nowy świat **Sanah** (10 piosenek, alwaysUnlocked, difficulty 2):
  Szampan, Ten Stan, Nic dwa razy, Ostatnia nadzieja, Ale jazz!,
  Cześć jak się masz?, Szary świat, Etc., Melodia, Eldorado
- [x] Fun facts po polsku do każdej Sanah
- [x] Sanah przeniesione na **POCZĄTEK** listy (questmap + home)

### UX krytyczny na dzień 1
- [x] Nowy profil → od razu questmap (nie home/primer)
- [x] Skip warmup flashcard dla world 14+ (Suzuki)
- [x] Domyślnie: turtle speed
- [x] Domyślnie: ukryte nazwy nut na klawiszach
- [x] Pre-curriculum schowany (opacity 0.5, order 99)
- [x] Progi gwiazd dla Sanah: 80/55 zamiast 90/70 (beginner-friendly)
- [x] "Ćwicz dalej! 💪" → "Dobry początek! 🌱" (motywujące)
- [x] Przycisk "Jestem gotowa →" duży, gradientowy, pulsujący
- [x] Melody mówi konkretnie "Kliknij «Jestem gotowa» 👇"

### Refaktor monolitu
- [x] Split 21k-liniowego HTML → 14 modułów:
  - index.html (667 linii)
  - css/style.css (6107)
  - js/songs.js (7090), audio.js, midi.js, user-manager.js,
    falling-notes.js, piano-keyboard.js, sheet-music.js,
    screens.js, lesson-engine.js, mini-lessons.js, screens-extra.js, init.js
  - lib/vexflow.min.js, lib/soundfont.min.js
- [x] Backup monolitu zachowany jako `Little Maestro App.html`

### Audyt + bugi po refaktorze
- [x] app-header → global-header (header nie pokazywał się po logowaniu)
- [x] `LessonEngine._currentSong()` → `_state().song` (skipWarmup nie działał)
- [x] Brakujące ~1000 linii: SettingsScreen, RecitalManager, FreePlayManager
  (ekstrakcja zjadła je przez `</script>` w template string)
- [x] Melody intro po angielsku → polski
- [x] "Melody" → "Melodia"
- [x] Czarny pas po wyjściu z lekcji (FallingNotes.stop() → .hide())
- [x] Unlock logic na home screen respektuje `alwaysUnlocked`

---

## 🎯 NASTĘPNE KROKI (priorytet)

### 🔴 Sesja 2 — Deploy + testy z Marią (priorytet 1)

**Cel: Maria gra Sanah na żywo, pierwszy test pedagogiczny.**

- [ ] **GitHub repo + GitHub Pages deploy**
  - `gh repo create pianinko --public`
  - Enable Pages w Settings → main branch root
  - URL: `https://<user>.github.io/pianinko/`
  - Dodać do README instrukcję dla Marii
- [ ] **Test MIDI z Casio CT-S1 na PC Marii**
  - Kabel USB-B → USB-A podłączony
  - Chrome → zezwól MIDI → Pianinkowy Świat wykrywa
- [ ] **Pierwsza sesja z Marią** (15-20 min, z tatą)
  - Obserwacje: gdzie się gubi, co ją cieszy, co ją frustruje
  - Notatki do kolejnych faz
- [ ] **Bugfixy na podstawie testu Marii**

### 🟠 Sesja 3 — Rote-to-Note flow (priorytet 2)

**Cel: Maria uczy się czytać nuty Z PIOSENEK KTÓRE GRA.**

Kluczowy insight: Sanah teraz pomija fazę 3 (Learn Notes) i idzie prosto do falling notes. Ale to oznacza że Maria NIGDY nie zobaczy notacji. Trzeba dodać fazę 5: "Patrz co zagrałaś!"

- [ ] **Przebudowa lesson flow dla Sanah (world 14+):**
  - Faza 1: Meet the Song (już jest)
  - Faza 2: Listen (już jest — z pulsującym "Jestem gotowa")
  - **Faza 3 NEW**: Falling Notes BEZ notacji na pięciolinii (ukryć sheet music panel)
  - **Faza 4 NEW**: "Patrz co zagrałaś!" — VexFlow pokazuje notację po pierwszym passie
  - **Faza 5 NEW**: Zagraj ponownie — teraz WIDZISZ nuty + falling notes obok siebie
- [ ] **Visual sync**: kolor nuty na pięciolinii = kolor klawisza = kolor falling note tile
- [ ] **"Posłuchaj piosenki" button w każdej fazie** — Suzuki: listen zawsze dostępny

### 🟡 Sesja 4 — Chord-first (priorytet 3)

**Cel: Maria gra AKORDY lewą ręką pod melodię.**

- [ ] **Rozszerzenie formatu piosenki:**
  ```js
  {
    id: 201, title: "Szampan",
    chords: [
      { name: 'Am', notes: ['A2','C3','E3'], beat: 1 },
      { name: 'F',  notes: ['F2','A2','C3'], beat: 5 },
      // ...
    ]
  }
  ```
- [ ] **Tryb akordowy lewej ręki:**
  - Falling notes lewej ręki pokazują **NAZWĘ akordu** ("Am") zamiast 3 osobnych nut
  - Gracz naciska DOWOLNĄ nutę z akordu = zaliczone
  - Opcjonalnie: 1-palcowe akordy (tylko bas) → 3-palcowe (pełne)
- [ ] **Backing tracks** — sample bass+drums na S3 (`ig-temp-evacitynotes`)
- [ ] **Toggle w ustawieniach**: "Graj z akompaniamentem" (lewa ręka)

### 🟢 Sesja 5 — Landmark Notes + Pattern Reading (priorytet 4)

**Cel: Maria czyta nuty SAMODZIELNIE, bez falling notes.**

- [ ] **Nowe mini-lekcje zastąpią obecne 5:**
  1. "Twój dom na klawiaturze" — środkowe C (landmark #1)
  2. "Dwie kotwy" — F i G (landmark #2, #3)
  3. "Kroki i skoki" — sąsiednia nuta = krok, co druga = skok
  4. "Wzory w muzyce" — rozpoznawanie powtórzeń, sekwencji
  5. "Pięciolinia to mapa" — nuty z Sanah na pięciolinii
- [ ] **Pattern hints na falling notes (opcjonalne):**
  - "↑" krok w górę, "↑↑" skok w górę, "=" powtórzenie, "↓" krok w dół
  - Toggle w ustawieniach
- [ ] **Solfeż z chóru:**
  - "Ta melodia zaczyna się jak «Wlazł kotek»" — rozpoznawanie interwałów

### 🟢 Sesja 6 — Sing 1 & 2 songs (priorytet 5)

**Cel: więcej piosenek które Maria kocha.**

- [ ] **Nowy świat** (po Sanah w kolejności, też alwaysUnlocked):
  1. I'm Still Standing (Elton John / Sing 1)
  2. Shake It Off (Taylor Swift / Sing 1)
  3. Don't You Worry 'bout a Thing (Stevie Wonder / Sing 1)
  4. Hallelujah (Leonard Cohen / Sing 1)
  5. Set It All Free (Ash / Sing 1)
  6. Faith (Stevie Wonder & Ariana Grande / Sing 1)
  7. A Sky Full of Stars (Coldplay / Sing 2)
  8. Could Have Been Me (The Struts / Sing 2)
  9. Your Song Saved My Life (Bono/U2 / Sing 2)
  10. I Still Haven't Found What I'm Looking For (U2 / Sing 2)

### 🟢 Sesja 7+ — Polish & Performance

- [ ] **PWA assets** (katalog `_assets/`):
  - `manifest.json` (name, icons, theme)
  - `sw.js` (service worker, cache offline)
  - `icon-192.svg`, `icon-512.svg`
- [ ] **Performance:**
  - Lazy-load songs.js per świat (split na songs-sanah.js, songs-primer.js, etc.)
  - VexFlow lazy (ładuj tylko gdy user wchodzi w lesson)
- [ ] **Parent Dashboard metrics per piosenka Sanah** (który utwór Maria ćwiczy)
- [ ] **Settings: Toggle "Suzuki Mode"** — domyślnie ON dla world 14+
- [ ] **Analytics w star screen**: "Która nuta była trudna?"
- [ ] **Dokończenie tłumaczeń** fun factów klasyków (Chopin, Bach) — jeśli Maria do nich dojdzie
- [ ] **Typo fix**: "Nagrana na żywo w jednym ujęciu" → "podejściu" (songs.js, Sanah 4)

---

## Test checklist przed każdą sesją z Marią

1. [ ] Stwórz nowy profil → od razu questmap
2. [ ] Świat Sanah jako PIERWSZY na mapie
3. [ ] Wszystkie 10 Sanah odblokowane (bez 🔒)
4. [ ] Kliknij Szampan → "Meet the Song" z fun factem
5. [ ] "Posłuchaj →" → melodia gra
6. [ ] Po melodii: "Jestem gotowa →" pulsuje (gradientowy, duży)
7. [ ] Klik → falling notes DIRECTLY (bez flashcard warmupu)
8. [ ] Tempo domyślne: żółw 🐢
9. [ ] Klawiatura BEZ etykiet liter
10. [ ] Po ukończeniu: gwiazdki 80/55 próg, tytuł "Dobry początek!" (nie "Ćwicz dalej!")
11. [ ] "Wyjdź" → NIE ma czarnego pasa
12. [ ] Header i bottom nav widoczne (nie `app-header` bug)

---

## Infrastruktura

- **Hosting**: GitHub Pages (static site, darmowy, auto-deploy z git push)
- **S3**: `ig-temp-evacitynotes` (eu-central-1) — backing tracks w fazie 4
- **MIDI**: USB-B → USB-A, Casio CT-S1, Chrome/Edge, Web MIDI API
- **Dane**: localStorage w przeglądarce Marii, prefix `littlemaestro_`
- **Deploy**: edycja → git push → Pages auto-deploy → Maria Ctrl+F5
- **PC taty off** wieczorem → dlatego Pages, nie local server

## Notatki techniczne

- **14 modułów JS** w `js/`, CSS w `css/style.css`, libs w `lib/`
- **145 piosenek**: 10 Sanah (pierwsze), 84 primer (world 1-3), 50 klasyki (world 4-13)
- **Format piosenki**: `{ note: 'C4', duration: 'quarter', hand: 'right', finger: 1 }`
- **Duracje**: whole, half, quarter, eighth, dotted_quarter, dotted_half
- **Polski system nut**: C, D, E, F, G, A, **H** (nie B!), # = is, b = es
- **localStorage**: `littlemaestro_${name.toLowerCase()}`
- **Kluczowe funkcje/flagi**:
  - `window._isNewProfile` → po utworzeniu profilu idzie do questmap
  - `noteDisplayPL(note)` w midi.js — B→H translation dla UI
  - `song.world >= 14` → skip Phase 3 (learn notes) + beginner stars thresholds
  - `song.alwaysUnlocked` → respektowane w home screen list i questmap

## Backup

- Monolith `Little Maestro App.html` zostaje jako backup (1.7 MB, 21k linii)
- Git history: pełna historia zmian od initial commit
