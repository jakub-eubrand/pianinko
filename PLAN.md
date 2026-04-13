# Aplikacja Piankowa Marysi — Plan Rozwoju

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

## Faza 1 — Polonizacja + Sanah (sesja 1)

Cel: Maria siada i gra piosenki które zna, po polsku.

- [ ] Zmiana nazwy: "Little Maestro" → "Aplikacja Piankowa Marysi" (12 lokalizacji)
- [ ] Polonizacja UI (~250 stringów): nawigacja, ekrany, komunikaty, scoring
- [ ] Polskie nazwy nut: B→H, bemol/krzyżyk (6 lokalizacji w kodzie)
- [ ] Polskie nazwy światów (13 światów)
- [ ] Polskie nazwy tempa: Żółw/Normalny/Zając/Rakieta
- [ ] Sesja domyślna: 20 min
- [ ] Nowy świat "Piosenki Sanah" (world 14, alwaysUnlocked)
- [ ] 10 piosenek Sanah (uproszczone melodie, prawa ręka):
  1. Szampan
  2. Ten Stan
  3. Nic dwa razy (Szymborska)
  4. Ostatnia nadzieja (feat. Kwiat Jabłoni)
  5. Ale jazz! (feat. Vito Bambino)
  6. Cześć, jak się masz? (feat. Miętha)
  7. Szary świat (feat. Kwiat Jabłoni)
  8. Etc. (na disco)
  9. Melodia
  10. Eldorado (feat. Daria Zawiałow)
- [ ] Fun facts po polsku do każdej piosenki Sanah
- [ ] Nowy świat "Piosenki z filmów" (world 15, alwaysUnlocked) — Sing 1 & 2:
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
- [ ] Test MIDI z Casio CT-S1 (Maria podłącza kabel, otwiera w Chrome)

## Faza 2 — Rote-to-Note + Chord-first (sesja 2)

Cel: Maria uczy się czytać nuty z piosenek które już gra ze słuchu.

- [ ] Przebudowa flow lekcji:
  - Faza A: Posłuchaj piosenki (obecne "Meet the Song")
  - Faza B: Zagraj z falling notes — BEZ notacji na pięciolinii
  - Faza C: "Patrz co zagrałaś!" — VexFlow pokazuje tę samą melodię na pięciolinii
  - Faza D: Zagraj jeszcze raz, teraz z notacją widoczną obok
- [ ] Tryb akordowy lewej ręki:
  - Piosenki Sanah dostają pole `chords: [{name: 'Am', notes: ['A2','C3','E3'], duration: 'whole'}, ...]`
  - Falling notes lewej ręki pokazują nazwę akordu (Am, C, G, F) zamiast 3 osobnych nut
  - Gracz naciska dowolną nutę z akordu = zaliczone
- [ ] Podkłady audio (backing tracks) dla piosenek Sanah — S3 hosting
- [ ] Wizualne połączenie: kolor na falling notes = kolor na pięciolinii (ta sama nuta)

## Faza 3 — Landmark Notes + Pattern Reading (sesja 3)

Cel: Maria czyta nuty samodzielnie, nie tylko z falling notes.

- [ ] Nowe mini-lekcje (zastępują obecne 5 z pre-curriculum):
  1. "Twój dom na klawiaturze" — znajdź środkowe C (landmark #1)
  2. "Dwie kotwy" — F i G jako punkty orientacyjne (landmark #2, #3)
  3. "Kroki i skoki" — sąsiednia nuta = krok, co druga = skok
  4. "Wzory w muzyce" — rozpoznawanie powtórzeń, sekwencji
  5. "Pięciolinia to mapa" — nuty z piosenek Sanah na pięciolinii
- [ ] Hinty na falling notes:
  - "↑" = krok w górę
  - "↑↑" = skok w górę
  - "=" = powtórzenie
  - "↓" = krok w dół
  - Opcjonalne, włączane w ustawieniach
- [ ] Interwały z solfeżu:
  - Maria zna interwały z chóru — wykorzystać to
  - "Ta melodia zaczyna się jak «Wlazł kotek»" — rozpoznawanie interwałów

---

## Infrastruktura

- **Hosting**: GitHub Pages (static site, auto-deploy z git push, darmowy)
- **S3**: `ig-temp-evacitynotes` (eu-central-1) — soundfonty, backing tracks w fazie 2
- **MIDI**: USB-B → USB-A, Casio CT-S1, Chrome/Edge, Web MIDI API
- **Dane**: localStorage w przeglądarce Marii, prefix `littlemaestro_`
- **Deploy workflow**: edycja → git push → GitHub Pages auto-deploy → Maria odświeża
- **PC taty jest off** kiedy Maria wraca ze szkoły — dlatego GitHub Pages, nie local server
- **Nie Pi-hole** (krytyczny DNS), nie satellite (busy audio), nie OpenWrt (router)

## Notatki techniczne

- Plik: `Little Maestro App.html` (21 124 linii, ~1.7 MB)
- Embedded: VexFlow (notacja), Soundfont-player (sample fortepianu)
- Audio fallback: Web Audio API synth (triangle+sine, ADSR)
- PWA: manifest + SW w `_assets/` (brak tych plików — PWA nie działa)
- Format piosenek: `{ note: 'C4', duration: 'quarter', hand: 'right', finger: 1 }`
- Duracje: whole, half, quarter, eighth, dotted_quarter, dotted_half
- Polski system nut: C, D, E, F, G, A, H (nie B!), krzyżyk = is, bemol = es
