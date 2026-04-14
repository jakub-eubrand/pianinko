# 🎹 Pianinkowy Świat Marysi

Apka do nauki gry na pianinie po polsku, dla 11-letniej Marii. Gra piosenki Sanah.

## Dla Marysi — jak używać

1. Otwórz w **Chrome** albo **Edge** (inne przeglądarki mogą nie działać z MIDI)
2. **Podłącz pianino Casio CT-S1** kablem USB (czarny kabel, USB-B do pianina, USB-A do laptopa)
3. **Włącz pianino** — zobacz czy świeci się ekran
4. Odśwież stronę (F5) jeśli już była otwarta
5. Kliknij **"Zezwól"** gdy Chrome zapyta o dostęp do MIDI
6. Na górze po prawej zobaczysz 🎹 zielone "Połączono"
7. Stwórz profil (imię, awatar, kolor) → zagrasz od razu piosenki Sanah!

## Jak grać

- Wybierz piosenkę Sanah (np. **Szampan**) z mapy
- Posłuchaj jak leci melodia
- Kliknij pulsujący przycisk **"Jestem gotowa →"**
- Patrz jak nuty spadają na klawisze — graj gdy dotrą do linii na dole
- Jak się mylisz — nie szkodzi, spróbuj jeszcze raz!
- Tempo: zacznij od 🐢 **Żółwia**, potem możesz przyspieszyć

## Dla taty (tech stack)

- Static site, GitHub Pages, `master` branch
- Vanilla JS (14 modułów), CSS, VexFlow (notacja), Soundfont-player (sample fortepianu)
- Web MIDI API + localStorage
- Polski system nut: C, D, E, F, G, A, **H**
- Deploy: `git push origin master` → auto-rebuild Pages

## Metodyki pedagogiczne

Apka wdraża 4 podejścia dla dzieci ze słuchem muzycznym ale bez umiejętności czytania nut:

1. **Suzuki Rote-to-Note** — słuchaj → graj → czytaj (nie odwrotnie!)
2. **Landmark Notes** — 3 kotwy: C, F, G
3. **Pattern Reading** — kroki/skoki/powtórzenia, nie nazwy nut
4. **Chord-first** — 4 akordy = prawdziwa piosenka od dnia 1

Szczegóły w [PLAN.md](PLAN.md).

## Licencja

Fundament: [Little Maestro](https://github.com/piano-learning-platform/little-maestro) (MIT).
Polonizacja, Sanah, metodyki — by Kubusz + Claude.
