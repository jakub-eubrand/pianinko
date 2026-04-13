    }

    return { init, start, stop, show, hide, markSongEnded, hideStarScreen,
             onNoteInput, buildSchedule, getResults };
  })();

    /* ============================================================
       LITTLE MAESTRO — PHASE 6
       On-Screen Piano Keyboard (Visual Reference)
       ============================================================ */

    const PianoKeyboard = (() => {

      // ── Layout constants ─────────────────────────────────────────
      const NUM_WHITE = 15;  // C3 to C5 inclusive

      // White keys in order (left → right)
      const WHITE_NOTES = [
        'C3','D3','E3','F3','G3','A3','B3',
        'C4','D4','E4','F4','G4','A4','B4','C5',
      ];

      // Black keys: note name + offset (in white-key units from left edge of container)
      // Offset = whiteKeyIndex + 0.65 → positions black key 65% across the preceding white key
      const BLACK_KEYS = [
        { note: 'C#3', offset: 0.65 },
        { note: 'D#3', offset: 1.65 },
        { note: 'F#3', offset: 3.65 },
        { note: 'G#3', offset: 4.65 },
        { note: 'A#3', offset: 5.65 },
        { note: 'C#4', offset: 7.65 },
        { note: 'D#4', offset: 8.65 },
        { note: 'F#4', offset: 10.65 },
        { note: 'G#4', offset: 11.65 },
        { note: 'A#4', offset: 12.65 },
      ];

      // Enharmonic normalization (flat → sharp)
      const ENHARMONIC = {
        'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#',
        'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B',
      };

      // Note names for display labels (Polish: B→H)
      const WHITE_NAMES = ['C','D','E','F','G','A','H'];

      // Registered containers: { id → { el, keyMap } }
      const _containers = {};

      let _showNoteLabels = true;

      // Click callback: called with note name when a key is tapped in screen mode
      let _clickCallback = null;
      let _clickEnabled  = false;


      // ── Normalise note name → canonical sharp form ────────────────
      function _normalize(noteName) {
        const m = noteName.match(/^([A-G][b#]?)(\d)$/i);
        if (!m) return noteName;
        const [, name, oct] = m;
        const upper = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        return (ENHARMONIC[upper] || upper) + oct;
      }


      // ── Get key element(s) by note across all containers ──────────
      function _getKeys(noteName) {
        const canonical = _normalize(noteName);
        const results = [];
        for (const id in _containers) {
          const el = _containers[id].keyMap[canonical];
          if (el) results.push(el);
        }
        return results;
      }


      // ── Render keyboard into a container ──────────────────────────
      function render(containerId, opts = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
          console.warn('[PianoKeyboard] Container not found:', containerId);
          return;
        }
        container.innerHTML = '';

        const isLarge = opts.large || false;

        const wrap = document.createElement('div');
        wrap.className = 'pk-wrap' + (isLarge ? ' pk-wrap--large' : '');
        wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-label', 'On-screen piano keyboard C3 to C5');

        const keyMap = {};
        const whiteKeyWidthPct  = 100 / NUM_WHITE;  // 6.6667%
        const blackKeyWidthPct  = (0.57 / NUM_WHITE) * 100; // ~3.8%

        // ── White keys ──────────────────────────────────────────────
        WHITE_NOTES.forEach((note, idx) => {
          const btn = document.createElement('button');
          btn.className = 'pk-white';
          btn.setAttribute('data-note', note);
          btn.setAttribute('type', 'button');
          btn.setAttribute('tabindex', '-1');
          btn.setAttribute('aria-label', note.replace('#', ' sharp '));

          const noteLetter = note.replace(/\d/, '');
          const noteLetterPL = typeof noteDisplayPL === 'function' ? noteDisplayPL(note) : noteLetter;
          const isC = noteLetter === 'C';
          const isMiddleC = note === 'C4';

          // Note name label (Polish)
          const labelEl = document.createElement('span');
          labelEl.className = 'pk-label' + (_showNoteLabels ? '' : ' pk-label--hidden');
          labelEl.textContent = noteLetterPL;
          btn.appendChild(labelEl);

          // Finger number span (hidden until setFingerNumbers called)
          const fingerEl = document.createElement('span');
          fingerEl.className = 'pk-finger';
          btn.appendChild(fingerEl);

          // Middle C dot
          if (isMiddleC) {
            const dot = document.createElement('span');
            dot.className = 'pk-middle-c-dot';
            dot.setAttribute('aria-label', 'Middle C');
            btn.appendChild(dot);
          }

          // Click/tap handler for screen-mode input
          btn.addEventListener('pointerdown', (e) => {
            if (!_clickEnabled || !_clickCallback) return;
            e.preventDefault();
            _clickCallback(note);
          });

          keyMap[note] = btn;
          wrap.appendChild(btn);
        });


        // ── Black keys (absolutely positioned) ─────────────────────
        BLACK_KEYS.forEach(({ note, offset }) => {
          const btn = document.createElement('button');
          btn.className = 'pk-black';
          btn.setAttribute('data-note', note);
          btn.setAttribute('type', 'button');
          btn.setAttribute('tabindex', '-1');
          btn.setAttribute('aria-label', note.replace('#', ' sharp '));

          const leftPct = (offset / NUM_WHITE) * 100;
          btn.style.left  = leftPct.toFixed(3) + '%';
          btn.style.width = blackKeyWidthPct.toFixed(3) + '%';

          // Finger number span
          const fingerEl = document.createElement('span');
          fingerEl.className = 'pk-finger';
          btn.appendChild(fingerEl);

          // Click/tap handler for screen-mode input
          btn.addEventListener('pointerdown', (e) => {
            if (!_clickEnabled || !_clickCallback) return;
            e.preventDefault();
            _clickCallback(note);
          });

          keyMap[note] = btn;
          wrap.appendChild(btn);
        });

        container.appendChild(wrap);
        _containers[containerId] = { el: container, keyMap };
      }


      // ── Highlight states ──────────────────────────────────────────

      function highlightNext(noteName, fingerNum) {
        // Remove any existing next highlight first
        _clearClassFromAll('pk-next');
        const keys = _getKeys(noteName);
        keys.forEach(k => {
          k.classList.add('pk-next');
          if (fingerNum != null) _showFinger(k, fingerNum);
        });
      }

      function highlightPlaying(noteName) {
        // Clear previous "playing" highlight from all keys first
        _clearClassFromAll('pk-playing');
        const keys = _getKeys(noteName);
        keys.forEach(k => {
          k.classList.remove('pk-next','pk-correct','pk-wrong');
          k.classList.add('pk-playing');
        });
      }

      function flashCorrect(noteName) {
        const keys = _getKeys(noteName);
        keys.forEach(k => {
          k.classList.remove('pk-next','pk-playing','pk-wrong');
          k.classList.add('pk-correct');
          // Remove after animation completes
          const done = () => {
            k.classList.remove('pk-correct');
            k.removeEventListener('animationend', done);
          };
          k.addEventListener('animationend', done);
          // Safety fallback
          setTimeout(() => k.classList.remove('pk-correct'), 500);
        });
      }

      function flashWrong(noteName) {
        const keys = _getKeys(noteName);
        keys.forEach(k => {
          k.classList.remove('pk-next','pk-playing','pk-correct');
          k.classList.add('pk-wrong');
          setTimeout(() => k.classList.remove('pk-wrong'), 250);
        });
      }

      function clearAll() {
        ['pk-next','pk-playing','pk-correct','pk-wrong'].forEach(cls => {
          _clearClassFromAll(cls);
        });
        // Also clear all finger displays
        for (const id in _containers) {
          Object.values(_containers[id].keyMap).forEach(k => _hideFinger(k));
        }
      }

      // Clear playing highlight for a specific note (used on MIDI note-off)
      function clearPlaying(noteName) {
        const keys = _getKeys(noteName);
        keys.forEach(k => k.classList.remove('pk-playing'));
      }

      function setFingerNumbers(noteFingerMap) {
        // noteFingerMap: { 'C4': 1, 'D4': 2, ... }
        for (const id in _containers) {
          const { keyMap } = _containers[id];
          Object.entries(noteFingerMap).forEach(([note, num]) => {
            const canonical = _normalize(note);
            const k = keyMap[canonical];
            if (k) _showFinger(k, num);
          });
        }
      }

      function showNoteNames(bool) {
        _showNoteLabels = bool;
        for (const id in _containers) {
          const { keyMap } = _containers[id];
          Object.values(keyMap).forEach(k => {
            const label = k.querySelector('.pk-label');
            if (label) label.classList.toggle('pk-label--hidden', !bool);
          });
        }
      }


      // ── Helpers ───────────────────────────────────────────────────

      function _clearClassFromAll(cls) {
        for (const id in _containers) {
          Object.values(_containers[id].keyMap).forEach(k => k.classList.remove(cls));
        }
      }

      function _showFinger(keyEl, num) {
        const f = keyEl.querySelector('.pk-finger');
        if (f) {
          f.textContent = num;
          f.classList.add('pk-finger--visible');
        }
      }

      function _hideFinger(keyEl) {
        const f = keyEl.querySelector('.pk-finger');
        if (f) {
          f.textContent = '';
          f.classList.remove('pk-finger--visible');
        }
      }

      // ── Click-mode controls (screen input) ───────────────────────

      function setClickCallback(cb) {
        _clickCallback = cb;
      }

      function setClickEnabled(bool) {
        _clickEnabled = bool;
        // Visual cue: add/remove an attribute so CSS can style interactive state
        for (const id in _containers) {
          const wrap = _containers[id].el.querySelector('.pk-wrap');
          if (wrap) wrap.classList.toggle('pk-wrap--interactive', bool);
        }
      }

      // Expose clearHighlights as alias for clearAll (used by LessonEngine)
      function clearHighlights() { clearAll(); }

      return {
        render,
        highlightNext,
        highlightPlaying,
        flashCorrect,
        flashWrong,
        clearAll,
        clearHighlights,
        clearPlaying,
        setFingerNumbers,
        showNoteNames,
        setClickCallback,
        setClickEnabled,
      };
    })();


    // ── Phase 6 boot: render keyboards + wire MIDI ────────────────
    document.addEventListener('DOMContentLoaded', () => {

      // Render lesson panel keyboard
      PianoKeyboard.render('lesson-keyboard', { large: false });

      // Render free play keyboard (larger)
      PianoKeyboard.render('freeplay-keyboard', { large: true });

      // ── Wire MIDI → keyboard ──────────────────────────────────────
      // onNoteOn: highlight key + play sound via AudioEngine
      MIDIManager.onNoteOn(({ fullNote, velocity }) => {
        PianoKeyboard.highlightPlaying(fullNote);
        try {
          AudioEngine.playNoteInstant(fullNote, velocity);
        } catch(e) { /* AudioEngine may not be ready */ }

        // Update free play note display
        const noteDisplay = document.getElementById('freeplay-note-name');
        if (noteDisplay) noteDisplay.textContent = noteDisplayPL(fullNote);
      });

      // onNoteOff: remove playing highlight from that key
      MIDIManager.onNoteOff(({ fullNote }) => {
        PianoKeyboard.clearPlaying(fullNote);
      });

