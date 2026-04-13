    document.addEventListener('DOMContentLoaded', () => {

      // Wire "Start Session" button on quest map (if it exists)
      // Quest Map node clicks already call LessonEngine.startLesson via QuestMap.nodeClick

      // Ensure lesson screen has position:relative for overlay placement
      const lessonScreen = document.getElementById('screen-lesson');
      const lessonContent = lessonScreen?.querySelector('.screen-content');
      if (lessonContent) lessonContent.style.position = 'relative';

      // Build lesson control bar on page load
      const controlBarCheck = document.getElementById('lesson-controls-bar');
      if (!controlBarCheck && lessonScreen) {
        // Build it immediately so it's ready
        LessonEngine._ensureControlBar && LessonEngine._ensureControlBar();
      }
    });


    /* ============================================================
       LITTLE MAESTRO — PHASE 10
       Pre-Curriculum Mini-Lessons · Parent Mode Dashboard
       ============================================================ */

    /* ────────────────────────────────────────────────────────────
       PRE-CURRICULUM MINI-LESSONS
       5 interactive lessons that unlock before World 1.
       ──────────────────────────────────────────────────────────── */
    const MiniLessons = (() => {

      // ── State ─────────────────────────────────────────────────
      const _s = {
        completed: new Array(5).fill(false),
        midiHandler: null,
      };

      const KEYS = {
        C3:'c3', D3:'d3', E3:'e3', F3:'f3', G3:'g3', A3:'a3', B3:'b3',
        C4:'c4', D4:'d4', E4:'e4', F4:'f4', G4:'g4', A4:'a4', B4:'b4', C5:'c5',
      };

      // ── Load completion state ──────────────────────────────────
      function _load() {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return;
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          if (stored.precurriculum) _s.completed = stored.precurriculum;
        } catch(e) {}
      }

      // ── Save completion state ─────────────────────────────────
      function _save() {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return;
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          stored.precurriculum = _s.completed;
          localStorage.setItem(key, JSON.stringify(stored));
        } catch(e) {}
      }

      // ── Mark a lesson done ────────────────────────────────────
      function _complete(idx) {
        if (_s.completed[idx]) return;
        _s.completed[idx] = true;
        _save();
        _updateDots();
        _updateCards();
        GamificationManager.awardNotes(5, `mini-lesson ${idx+1}`);
        Melody.reactCorrect();

        // Check all done
        if (_s.completed.every(Boolean)) {
          setTimeout(_onAllComplete, 600);
        }
      }

      function _onAllComplete() {
        GamificationManager.awardNotes(20, 'all mini-lessons');
        GamificationManager.showCelebration('songPass', { stars: 3 });
        Melody.reactCelebrate();
        Melody.speak('Świat 1 odblokowany! 🎉', 0);
      }

      // ── Update progress dots ──────────────────────────────────
      function _updateDots() {
        const nextUnlocked = _s.completed.findIndex(c => !c);
        document.querySelectorAll('.precurr-dot').forEach((dot, i) => {
          dot.classList.toggle('precurr-dot--done',    _s.completed[i]);
          dot.classList.toggle('precurr-dot--current', i === nextUnlocked);
        });
      }

      // ── Update card locked/active/done states ─────────────────
      function _updateCards() {
        document.querySelectorAll('.precurr-lesson-card').forEach((card, i) => {
          const isDone      = _s.completed[i];
          const isUnlocked  = i === 0 || _s.completed[i - 1];
          card.classList.toggle('card--done',   isDone);
          card.classList.toggle('card--active', !isDone && isUnlocked);
          card.classList.toggle('card--locked', !isDone && !isUnlocked);
        });
      }

      // ══════════════════════════════════════════════════════════
      //  LESSON 1 — WHAT IS A STAFF?
      // ══════════════════════════════════════════════════════════
      function _buildLesson1() {
        let interacted = false;
        const linePositions = [10, 27, 44, 61, 78]; // % of canvas height
        return `
          <div class="precurr-desc">Pięciolinia to <strong>5 linii</strong> na których mieszka muzyka!</div>
          <div class="staff-canvas" id="staff-canvas-l1">
            ${linePositions.map((pct, i) => `
              <div class="staff-line-anim" id="staff-line-${i}"
                   style="top:${pct}%"
                   onclick="MiniLessons._glowLine(${i})"
                   title="Linia ${i+1}">
                <span style="position:absolute;left:4px;top:-14px;font-family:var(--font-heading);font-size:9px;font-weight:700;color:var(--color-text-muted);opacity:0;" id="staff-label-${i}">Linia ${i+1}</span>
              </div>`).join('')}
          </div>
          <div class="precurr-desc" id="l1-msg">Kliknij każdą linię żeby zaświeciła! ✨</div>
          <button class="precurr-complete-btn" id="precurr-btn-0" onclick="MiniLessons._completeLocked(0)">
            ✓ Rozumiem — Dalej!
          </button>`;
      }

      function _animateStaffLines() {
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const line  = document.getElementById(`staff-line-${i}`);
            const label = document.getElementById(`staff-label-${i}`);
            if (line)  line.classList.add('line--drawn');
            if (label) { label.style.opacity = '1'; label.style.transition = 'opacity 0.4s ease'; }
          }, i * 400);
        }
        // Enable complete button after all lines drawn + a tap
        setTimeout(() => {
          const btn = document.getElementById('precurr-btn-0');
          if (btn) btn.classList.add('btn--ready');
        }, 5 * 400 + 800);
      }

      function _glowLine(idx) {
        document.querySelectorAll('.staff-line-anim').forEach(l => l.classList.remove('line--glow'));
        const line = document.getElementById(`staff-line-${idx}`);
        if (line) line.classList.add('line--glow');
        AudioEngine.playNoteInstant(['C4','E4','G4','B4','D5'][idx], 70);
      };
      function _completeLocked(idx) { _complete(idx); }

      // ══════════════════════════════════════════════════════════
      //  LESSON 2 — MEET THE TREBLE CLEF
      // ══════════════════════════════════════════════════════════
      function _buildLesson2() {
        return `
          <div class="precurr-desc">Ten zawijasek oznacza że gramy <strong>PRAWĄ ręką!</strong></div>
          <div class="clef-svg-container">
            <svg viewBox="0 0 100 180" width="80" height="144">
              <!-- Staff lines context -->
              ${[30,50,70,90,110].map(y =>
                `<line x1="10" y1="${y}" x2="90" y2="${y}" stroke="#3D3555" stroke-width="1.5"/>`
              ).join('')}
              <!-- Treble clef path (simplified) -->
              <path id="clef-path-l2" class="clef-draw-path"
                d="M52,15 C60,15 72,22 72,35 C72,48 62,56 52,62
                   C42,68 30,76 30,90 C30,110 44,120 52,120
                   C66,120 78,108 78,92 C78,76 66,68 52,62
                   C38,56 28,46 28,35 C28,22 38,12 52,8
                   L52,145 M40,145 C40,145 64,145 64,155 C64,168 52,172 52,172
                   C44,172 38,166 38,158 C38,150 46,145 52,145"
                stroke="#A78BFA" stroke-width="3" fill="none"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="precurr-desc">Narysuj go palcem poniżej! 👇</div>
          <div class="clef-trace-area" id="clef-trace-area"
               onmousemove="MiniLessons._traceClef(event)"
               ontouchmove="MiniLessons._traceClef(event)"
               onmousedown="MiniLessons._startTrace()"
               ontouchstart="MiniLessons._startTrace()">
            <svg class="clef-trace-trail" id="clef-trace-svg">
              <path id="clef-trace-path" d="" stroke="#F59E0B" stroke-width="3" fill="none" stroke-linecap="round"/>
            </svg>
          </div>
          <button class="precurr-complete-btn btn--ready" id="precurr-btn-1" onclick="MiniLessons._completeLocked(1)">
            ✓ Rozumiem — Dalej!
          </button>`;
      }

      function _animateClef() {
        setTimeout(() => {
          const path = document.getElementById('clef-path-l2');
          if (path) path.classList.add('clef--drawn');
        }, 300);
      }

      let _tracePath = '';
      let _tracing   = false;
      function _startTrace() { _tracing = true; _tracePath = ''; }
      function _traceClef(e) {
        if (!_tracing) return;
        e.preventDefault();
        const area = document.getElementById('clef-trace-area');
        const svg  = document.getElementById('clef-trace-svg');
        const path = document.getElementById('clef-trace-path');
        if (!area || !path) return;
        const rect = area.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        _tracePath += (_tracePath ? ` L${x},${y}` : `M${x},${y}`);
        path.setAttribute('d', _tracePath);
      }

      // ══════════════════════════════════════════════════════════
      //  LESSON 3 — THE MUSICAL ALPHABET
      // ══════════════════════════════════════════════════════════
      const ALPHA_NOTES = ['C4','D4','E4','F4','G4','A4','B4'];
      const ALPHA_NAMES = ['C','D','E','F','G','A','B'];

      function _buildLesson3() {
        return `
          <div class="precurr-desc">Muzyka używa tylko <strong>7 liter</strong> — potem zaczyna od nowa!</div>
          <div class="music-alphabet-row" id="alpha-row">
            ${ALPHA_NAMES.map((l, i) => `
              <div class="alpha-letter" data-idx="${i}" onclick="MiniLessons._playAlpha(${i})">${l}</div>
            `).join('')}
          </div>
          <div class="scroll-alphabet-track">
            <div class="scroll-alphabet-inner" id="scroll-alpha">
              ${[...ALPHA_NAMES,...ALPHA_NAMES,...ALPHA_NAMES].map(l =>
                `<div class="scroll-alpha-letter">${l}</div>`
              ).join('')}
            </div>
          </div>
          <div class="precurr-desc" id="l3-played-msg">Kliknij dowolną literę żeby ją usłyszeć! 🎵</div>
          <button class="precurr-complete-btn" id="precurr-btn-2" onclick="MiniLessons._completeLocked(2)">
            ✓ Umiem — Dalej!
          </button>`;
      }

      let _alphaPlayed = new Set();
      function _playAlpha(idx) {
        AudioEngine.playNoteInstant(ALPHA_NOTES[idx], 90);
        document.querySelectorAll('.alpha-letter').forEach(el => el.classList.remove('letter--active'));
        const el = document.querySelector(`.alpha-letter[data-idx="${idx}"]`);
        if (el) {
          el.classList.add('letter--active');
          setTimeout(() => el.classList.replace('letter--active','letter--played'), 400);
        }
        _alphaPlayed.add(idx);
        Melody.speak(`To ${ALPHA_NAMES[idx]}! 🎵`, 1500);
        // Enable complete after 3 letters played
        if (_alphaPlayed.size >= 3) {
          const btn = document.getElementById('precurr-btn-2');
          if (btn) btn.classList.add('btn--ready');
        }
      }

      // ══════════════════════════════════════════════════════════
      //  LESSON 4 — QUARTER & HALF NOTES (CLAPPING GAME)
      // ══════════════════════════════════════════════════════════
      const RHYTHM_PATTERNS = [
        [1,0,1,0,1,0,1,0], // 4 quarter beats
        [1,0,0,0,1,0,0,0], // 2 half notes
        [1,0,1,0,1,0,0,0], // mixed
        [1,0,0,0,1,0,1,0], // mixed 2
      ];

      function _buildLesson4() {
        return `
          <div class="precurr-desc">♩ Ćwierćnuta = <strong>idzie szybko</strong>&nbsp;&nbsp;𝅗𝅥 Półnuta = <strong>idzie wolno</strong></div>
          <div class="rhythm-pattern-dots" id="rp-dots">
            ${RHYTHM_PATTERNS.map((_,i) => `<div class="rp-dot" id="rp-dot-${i}"></div>`).join('')}
          </div>
          <div class="rhythm-display" id="rhythm-display"></div>
          <button class="rhythm-clap-btn" id="clap-btn" onclick="MiniLessons._clap()" title="Klaskaj!">👏</button>
          <div class="precurr-desc" id="rhythm-msg">Posłuchaj, potem wyklaskaj!</div>
          <button class="precurr-complete-btn" id="precurr-btn-3" onclick="MiniLessons._completeLocked(3)">
            ✓ Super — Dalej!
          </button>`;
      }

      let _rhythmState = { pattern: 0, step: 0, clapExpected: false, correct: 0, playing: false, intervals: [] };

      function _startRhythm(patternIdx) {
        // Only run while the pre-curriculum screen is the active screen.
        // MiniLessons.render() is called unconditionally at page load, which
        // would otherwise start this rhythm loop running in the background
        // on every screen forever (plays 4 notes, nobody claps, retries, repeat).
        const pcScreen = document.getElementById('screen-precurriculum');
        if (!pcScreen || !pcScreen.classList.contains('active')) return;

        const state = _rhythmState;
        state.pattern = patternIdx;
        state.step    = 0;
        state.correct = 0;
        state.playing = true;
        state.intervals.forEach(clearInterval);
        state.intervals = [];

        // Update pattern dots
        document.querySelectorAll('.rp-dot').forEach((d,i) => {
          d.className = 'rp-dot' + (i < patternIdx ? ' rp-dot--done' : i === patternIdx ? ' rp-dot--current' : '');
        });

        // Build beat display
        const pat   = RHYTHM_PATTERNS[patternIdx];
        const disp  = document.getElementById('rhythm-display');
        if (disp) {
          disp.innerHTML = pat.map((_,i) => `<div class="rhythm-beat" id="rb-${i}">🎵</div>`).join('');
        }

        // Play-then-clap: first play it, then ask student to clap
        let playStep = 0;
        const playInterval = setInterval(() => {
          if (playStep >= pat.length) {
            clearInterval(playInterval);
            // Ask student to clap
            setTimeout(() => _askClap(patternIdx), 800);
            return;
          }
          const beat = document.getElementById(`rb-${playStep}`);
          if (beat) { beat.classList.add('beat--active'); setTimeout(() => beat?.classList.remove('beat--active'), 200); }
          if (pat[playStep]) AudioEngine.playNoteInstant('C4', 80);
          playStep++;
        }, 400);
        state.intervals.push(playInterval);
      }

      function _askClap(patternIdx) {
        const state   = _rhythmState;
        const pat     = RHYTHM_PATTERNS[patternIdx];
        state.step    = 0;
        const msgEl   = document.getElementById('rhythm-msg');
        if (msgEl) msgEl.textContent = 'Teraz Ty wyklaskaj!';

        let askStep = 0;
        const askInterval = setInterval(() => {
          if (askStep >= pat.length) {
            clearInterval(askInterval);
            // Check if clapped correctly
            setTimeout(() => {
              if (state.correct >= pat.filter(Boolean).length) {
                // Pattern passed
                const next = patternIdx + 1;
                if (next < RHYTHM_PATTERNS.length) {
                  if (msgEl) msgEl.textContent = '✓ Super! Następny wzór!';
                  setTimeout(() => _startRhythm(next), 800);
                } else {
                  if (msgEl) msgEl.textContent = '🎉 Świetny rytm!';
                  const btn = document.getElementById('precurr-btn-3');
                  if (btn) btn.classList.add('btn--ready');
                  Melody.reactCelebrate();
                }
              } else {
                if (msgEl) msgEl.textContent = 'Spróbuj jeszcze raz!';
                state.correct = 0;
                setTimeout(() => _startRhythm(patternIdx), 1000);
              }
            }, 500);
            return;
          }
          const beat = document.getElementById(`rb-${askStep}`);
          if (beat) { beat.classList.add('beat--active'); setTimeout(() => beat?.classList.remove('beat--active'), 180); }
          state.clapExpected = !!pat[askStep];
          askStep++;
          state.step = askStep;
        }, 400);
        state.intervals.push(askInterval);
      }

      function _clap() {
        const state = _rhythmState;
        if (!state.playing) return;
        AudioEngine.playNoteInstant('C4', 90);
        const beat = document.getElementById(`rb-${state.step - 1}`);
        if (state.clapExpected) {
          state.correct++;
          if (beat) { beat.classList.add('beat--hit-correct'); }
        } else {
          if (beat) { beat.classList.add('beat--hit-wrong'); }
        }
        state.clapExpected = false;
      }

      // ══════════════════════════════════════════════════════════
      //  LESSON 5 — WHERE IS MIDDLE C?
      // ══════════════════════════════════════════════════════════
      const MC_WHITE_NOTES = ['G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5'];
      const MC_BLACK_NOTES = [
        { note:'G#3', after:0 }, { note:'A#3', after:1 },
        { note:'C#4', after:3 }, { note:'D#4', after:4 },
        { note:'F#4', after:6 }, { note:'G#4', after:7 }, { note:'A#4', after:8 },
      ];

      function _buildLesson5() {
        const wPct = 100 / MC_WHITE_NOTES.length; // % width per white key
        const whites = MC_WHITE_NOTES.map((note, i) => {
          const isMiddleC = note === 'C4';
          return `<div class="mc-key mc-key--white ${isMiddleC ? 'mc-key--c mc-key--target' : ''}"
                       style="left:${i * wPct}%;width:${wPct}%"
                       data-note="${note}"
                       onclick="MiniLessons._hitMC('${note}')">
                    ${isMiddleC ? `<div class="mc-label" style="left:50%;transform:translateX(-50%)">Środkowe C</div>` : ''}
                  </div>`;
        }).join('');
        const blacks = MC_BLACK_NOTES.map(({ note, after }) => {
          const leftPct = (after + 0.65) * wPct;
          const bwPct   = wPct * 0.57;
          return `<div class="mc-key mc-key--black"
                       style="left:${leftPct}%;width:${bwPct}%"
                       data-note="${note}"
                       onclick="MiniLessons._hitMC('${note}')"></div>`;
        }).join('');

        // Find index of C4 for arrow position
        const c4idx  = MC_WHITE_NOTES.indexOf('C4');
        const arrowL = (c4idx + 0.2) * wPct;

        return `
          <div class="precurr-desc"><strong>Środkowe C</strong> to Twój punkt wyjścia! Zawsze zacznij tutaj.</div>
          <div style="position:relative;width:100%;max-width:420px;">
            <div class="mc-arrow" id="mc-arrow" style="left:${arrowL}%;transform:translateX(-50%);">👇</div>
            <div class="middle-c-keyboard" id="mc-keyboard">
              ${whites}${blacks}
            </div>
          </div>
          <div class="precurr-desc" id="l5-msg">Znajdź <strong>środkowe C</strong> i kliknij je! 🎹</div>
          <button class="precurr-complete-btn" id="precurr-btn-4" onclick="MiniLessons._completeLocked(4)">
            ✓ Znalazłam — Dalej!
          </button>`;
      }

      function _hitMC(note) {
        AudioEngine.playNoteInstant(note, 90);
        if (note === 'C4') {
          // Correct!
          const key = document.querySelector('.mc-key--target');
          if (key) { key.classList.remove('mc-key--target'); key.classList.add('mc-key--found'); }
          const arrow = document.getElementById('mc-arrow');
          if (arrow) arrow.remove();
          const msg = document.getElementById('l5-msg');
          if (msg) msg.innerHTML = '🎉 Znalazłaś <strong>środkowe C</strong>! To Twój punkt wyjścia na zawsze!';
          const btn = document.getElementById('precurr-btn-4');
          if (btn) btn.classList.add('btn--ready');
          Melody.reactCelebrate();
          GamificationManager.awardNotes(5, 'found middle C');

          // Also wire MIDI for Middle C detection
        } else {
          Melody.speak('Nie ten — szukaj strzałki! 👇', 1500);
        }
      }

      // ══════════════════════════════════════════════════════════
      //  RENDER ALL 5 LESSONS
      // ══════════════════════════════════════════════════════════
      function render() {
        const container = document.getElementById('precurr-container');
        if (!container) return;
        _load();

        const LESSONS = [
          { title: 'Co to pięciolinia?',        builder: _buildLesson1 },
          { title: 'Klucz wiolinowy',    builder: _buildLesson2 },
          { title: 'Alfabet muzyczny',    builder: _buildLesson3 },
          { title: 'Ćwierćnuta i półnuta',    builder: _buildLesson4 },
          { title: 'Gdzie jest środkowe C?',       builder: _buildLesson5 },
        ];

        const dots = `<div class="precurr-dots">
          ${LESSONS.map((_,i) => `<div class="precurr-dot" id="precurr-dot-${i}"></div>`).join('')}
        </div>`;

        const cards = LESSONS.map((lesson, i) => `
          <div class="precurr-lesson-card" id="precurr-card-${i}">
            <div class="precurr-card-header">
              <div class="precurr-card-num">${i+1}</div>
              <div class="precurr-card-title">${lesson.title}</div>
              <div class="precurr-card-check">✅</div>
            </div>
            <div class="precurr-card-body" id="precurr-body-${i}">
              ${lesson.builder()}
            </div>
          </div>`).join('');

        container.innerHTML = dots + cards;

        _updateDots();
        _updateCards();

        // Trigger animations after a short delay
        setTimeout(_animateStaffLines, 400);
        setTimeout(_animateClef, 600);
        setTimeout(() => _startRhythm(0), 800);

        // Wire MIDI for Middle C
        const handlerId = Date.now();
        MIDIManager.onNoteOn(({ fullNote }) => {
          if (fullNote === 'C4') _hitMC('C4');
        });
      }

      return { render, _complete, _glowLine, _completeLocked, _startTrace, _traceClef, _playAlpha, _clap, _hitMC };
    })();


    /* ────────────────────────────────────────────────────────────
       PARENT DASHBOARD
       5-tab PIN-protected dashboard.
       ──────────────────────────────────────────────────────────── */
    const ParentDashboard = (() => {

      // ── PIN state ─────────────────────────────────────────────
      const _pin = {
        entered:    '',
        attempts:   0,
        lockedUntil: 0,
      }

      // ── Load user data helper ─────────────────────────────────
      function _userData() {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return {};
          const key = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          return JSON.parse(localStorage.getItem(key) || '{}');
        } catch(e) { return {}; }
      }

      function _saveUserData(data) {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return;
          const key = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          localStorage.setItem(key, JSON.stringify(data));
        } catch(e) {}
      }

      // ── Render full parent screen ─────────────────────────────
      function render() {
        const container = document.getElementById('pm-container');
        if (!container) return;
        container.innerHTML = _buildPinScreen();
      }

      // ── PIN entry screen ──────────────────────────────────────
      function _buildPinScreen() {
        return `
          <div class="pm-pin-screen" id="pm-pin-screen">
            <div style="font-size:40px;">🔒</div>
            <div class="pm-pin-title">Tryb rodzica</div>
            <div class="pm-pin-dots" id="pm-pin-dots">
              <div class="pm-pin-dot" id="pm-pd-0"></div>
              <div class="pm-pin-dot" id="pm-pd-1"></div>
              <div class="pm-pin-dot" id="pm-pd-2"></div>
              <div class="pm-pin-dot" id="pm-pd-3"></div>
            </div>
            <div class="pm-pin-err" id="pm-pin-err"></div>
            <div class="pm-pin-numpad">
              ${[1,2,3,4,5,6,7,8,9].map(n =>
                `<button class="pm-pin-key" onclick="ParentDashboard._pinKey(${n})">${n}</button>`
              ).join('')}
              <button class="pm-pin-key pm-pin-key--zero" onclick="ParentDashboard._pinKey(0)">0</button>
              <button class="pm-pin-key pm-pin-key--back" onclick="ParentDashboard._pinBack()">⌫</button>
            </div>
          </div>`;
      }

      // ── PIN key press ─────────────────────────────────────────
      function _pinKey(digit) {
        const now = Date.now();
        if (_pin.lockedUntil > now) {
          const secs = Math.ceil((_pin.lockedUntil - now) / 1000);
          const err  = document.getElementById('pm-pin-err');
          if (err) err.textContent = `Zablokowane — poczekaj ${secs}s`;
          return;
        }
        if (_pin.entered.length >= 4) return;
        _pin.entered += digit;
        _updatePinDots();
        if (_pin.entered.length === 4) _checkPin();
      }

      function _pinBack() {
        _pin.entered = _pin.entered.slice(0, -1);
        _updatePinDots();
        const err = document.getElementById('pm-pin-err');
        if (err) err.textContent = '';
      }

      function _updatePinDots() {
        for (let i = 0; i < 4; i++) {
          const dot = document.getElementById(`pm-pd-${i}`);
          if (dot) dot.classList.toggle('dot--filled', i < _pin.entered.length);
        }
      }

      function _checkPin() {
        const data     = _userData();
        const expected = (data.settings && data.settings.parentPin) || '1234';
        if (_pin.entered === expected) {
          _pin.attempts = 0;
          _pin.entered  = '';
          _showDashboard();
        } else {
          _pin.attempts++;
          _pin.entered = '';
          _updatePinDots();
          // Shake
          const dots = document.getElementById('pm-pin-dots');
          if (dots) {
            dots.classList.add('pm-pin-shake');
            setTimeout(() => dots.classList.remove('pm-pin-shake'), 500);
            dots.querySelectorAll('.pm-pin-dot').forEach(d => {
              d.classList.add('dot--wrong');
              setTimeout(() => d.classList.remove('dot--wrong'), 500);
            });
          }
          const err = document.getElementById('pm-pin-err');
          if (_pin.attempts >= 3) {
            _pin.lockedUntil = Date.now() + 30000;
            if (err) err.textContent = 'Za dużo prób — poczekaj 30s';
            _pin.attempts = 0;
          } else {
            if (err) err.textContent = `Błędny PIN — ${3 - _pin.attempts === 1 ? 'pozostała' : 'pozostały'} ${3 - _pin.attempts} ${3 - _pin.attempts === 1 ? 'próba' : 'próby'}`;
          }
        }
      }

      // ── Show full dashboard ────────────────────────────────────
      function _showDashboard() {
        const container = document.getElementById('pm-container');
        if (!container) return;
        container.innerHTML = `
          <div class="pm-dashboard" id="pm-dashboard">
            <div class="pm-tabs" id="pm-tabs">
              <button class="pm-tab active" onclick="ParentDashboard._tab(0)">Przegląd</button>
              <button class="pm-tab" onclick="ParentDashboard._tab(1)">Historia</button>
              <button class="pm-tab" onclick="ParentDashboard._tab(2)">Notatki</button>
              <button class="pm-tab" onclick="ParentDashboard._tab(3)">Ustawienia</button>
              <button class="pm-tab" onclick="ParentDashboard._tab(4)">Dane</button>
            </div>
            <div class="pm-panels">
              <div class="pm-panel panel--active" id="pm-panel-0">${_buildOverview()}</div>
              <div class="pm-panel" id="pm-panel-1">${_buildHistory()}</div>
              <div class="pm-panel" id="pm-panel-2">${_buildNotes()}</div>
              <div class="pm-panel" id="pm-panel-3">${_buildSettings()}</div>
              <div class="pm-panel" id="pm-panel-4">${_buildData()}</div>
            </div>
          </div>`;
      }

      function _tab(idx) {
        document.querySelectorAll('.pm-tab').forEach((t,i) => t.classList.toggle('active', i === idx));
        document.querySelectorAll('.pm-panel').forEach((p,i) => p.classList.toggle('panel--active', i === idx));
      }

      // ── TAB 1: OVERVIEW ───────────────────────────────────────
      function _buildOverview() {
        const data    = _userData();
        const active  = UserManager.getCurrentUser();
        const stats   = data.stats || {};
        const prog    = data.progress || {};
        const profile = data.profile || {};

        const completedCount = Object.values(prog).filter(p => p.stars > 0).length;
        const streak         = stats.streak || 0;
        const longestStreak  = stats.longestStreak || streak;
        const practiceMin    = stats.totalPracticeMinutes || 0;
        const sessions       = stats.totalSessionsCompleted || 0;
        const notes          = stats.notes || 0;

        // "Ready to move on?" — practiced 3+ times on current song
        const currentSong  = SONGS.find(s => !prog[s.id] || !prog[s.id].stars);
        const currentProg  = currentSong ? (prog[currentSong.id] || {}) : {};
        const practiceRuns = currentProg.sessionCount || 0;
        const readyToMove  = practiceRuns >= 3;

        // Today's session
        const todayStr    = new Date().toDateString();
        const practicedToday = stats.lastPlayDate && new Date(stats.lastPlayDate).toDateString() === todayStr;

        return `
          <div class="pm-student-header">
            <div class="pm-student-avatar">${profile.avatar || '🎵'}</div>
            <div>
              <div class="pm-student-name">${active ? active.profile.name : '—'}</div>
              <div class="pm-student-level">${currentSong ? `Teraz: ${currentSong.title}` : 'Wszystkie piosenki ukończone!'}</div>
            </div>
          </div>

          <div class="pm-stat-grid">
            <div class="pm-stat-cell">
              <div class="pm-stat-val">${completedCount}</div>
              <div class="pm-stat-lbl">Piosenek</div>
            </div>
            <div class="pm-stat-cell">
              <div class="pm-stat-val">🔥 ${streak}</div>
              <div class="pm-stat-lbl">Seria dni</div>
            </div>
            <div class="pm-stat-cell">
              <div class="pm-stat-val">${practiceMin}</div>
              <div class="pm-stat-lbl">Min ćwiczeń</div>
            </div>
            <div class="pm-stat-cell">
              <div class="pm-stat-val">${sessions}</div>
              <div class="pm-stat-lbl">Sesje</div>
            </div>
            <div class="pm-stat-cell">
              <div class="pm-stat-val">${longestStreak}</div>
              <div class="pm-stat-lbl">Najl. seria</div>
            </div>
            <div class="pm-stat-cell">
              <div class="pm-stat-val">${notes}</div>
              <div class="pm-stat-lbl">♪ Nuty</div>
            </div>
          </div>

          <div class="pm-ready-indicator ${readyToMove ? 'ready--yes' : 'ready--no'}">
            ${readyToMove
              ? '✅ Gotowa na dalszą naukę! Ćwiczyła obecną piosenkę 3+ razy.'
              : `📚 Wciąż się uczy — ćwiczyła tę piosenkę ${practiceRuns}/3 razy.`}
          </div>

          ${practicedToday
            ? `<div style="font-family:var(--font-heading);font-size:13px;color:var(--color-text-muted);">✨ Ćwiczyła dzisiaj — świetny nawyk!</div>`
            : `<div style="font-family:var(--font-heading);font-size:13px;color:var(--color-text-muted);">Jeszcze nie ćwiczyła dzisiaj.</div>`}

          <button class="lesson-btn" onclick="ParentDashboard._lock()" style="align-self:flex-start;">🔒 Zablokuj</button>`;
      }

      // ── TAB 2: HISTORY ─────────────────────────────────────────
      function _buildHistory() {
        const data  = _userData();
        const hist  = (data.stats && data.stats.dailyHistory) || {};

        // Build 30-day calendar
        const today = new Date();
        const days  = [];
        for (let i = 29; i >= 0; i--) {
          const d   = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toDateString();
          days.push({ date:d, key, practiced: !!hist[key], isToday: i === 0 });
        }

        const DAY_LABELS = ['Nd','Pn','Wt','Śr','Cz','Pt','So'];
        // Fill leading blanks to align with weekday
        const startWD = days[0].date.getDay();
        const blanks  = Array.from({length:startWD}, () => '<div class="cal-day cal-day--empty"></div>');

        const calHtml = `
          <div class="pm-section-title">Kalendarz ćwiczeń (ostatnie 30 dni)</div>
          <div class="pm-calendar">
            ${DAY_LABELS.map(d => `<div class="cal-day-label">${d}</div>`).join('')}
            ${blanks.join('')}
            ${days.map(d => `
              <div class="cal-day ${d.practiced ? 'cal-day--practiced' : ''} ${d.isToday ? 'cal-day--today' : ''}" title="${d.date.toLocaleDateString()}">
                ${d.date.getDate()}
              </div>`).join('')}
          </div>`;

        // Bar chart: last 14 days session lengths
        const last14 = days.slice(-14);
        const maxLen  = Math.max(1, ...last14.map(d => (hist[d.key]?.minutes || 0)));
        const barHtml = `
          <div class="pm-section-title" style="margin-top:8px;">Długość sesji (ostatnie 14 dni)</div>
          <div class="pm-bar-chart">
            ${last14.map(d => {
              const mins   = (hist[d.key]?.minutes || 0);
              const height = Math.round((mins / maxLen) * 56) + 2;
              return `<div class="pm-bar-col">
                <div class="pm-bar" style="height:${height}px" title="${mins} min"></div>
              </div>`;
            }).join('')}
          </div>
          <div style="font-family:var(--font-heading);font-size:10px;color:var(--color-text-dim);text-align:right;">Minut dziennie</div>`;

        return calHtml + barHtml;
      }

      // ── TAB 3: NOTES ──────────────────────────────────────────
      function _buildNotes() {
        const data   = _userData();
        const fcHist = (data.stats && data.stats.flashcardHistory) || {};
        const notes  = data.parentNotes || [];

        // Weak notes chart
        const noteNames = ['C','D','E','F','G','A','B'];
        const noteDisplayNames = ['C','D','E','F','G','A','H'];
        const maxMisses = Math.max(1, ...noteNames.map(n => fcHist[n]?.wrong || 0));
        const weakChart = `
          <div class="pm-section-title">Najczęściej mylone nuty</div>
          <div class="pm-weak-notes-chart">
            ${noteNames.map((n, i) => {
              const wrong = fcHist[n]?.wrong || 0;
              const pct   = Math.round((wrong / maxMisses) * 100);
              return `<div class="pm-note-bar-row">
                <div class="pm-note-bar-label">${noteDisplayNames[i]}</div>
                <div class="pm-note-bar-track"><div class="pm-note-bar-fill" style="width:${pct}%"></div></div>
                <div class="pm-note-bar-count">${wrong}</div>
              </div>`;
            }).join('')}
          </div>`;

        // Teacher notes
        const existingNotes = notes.slice(-8).reverse().map(note => `
          <div class="pm-note-entry">
            <div class="pm-note-entry-date">${new Date(note.date).toLocaleDateString()}</div>
            <div class="pm-note-entry-text">${note.text}</div>
          </div>`).join('') || `<div style="font-family:var(--font-heading);font-size:12px;color:var(--color-text-dim);">Brak notatek.</div>`;

        return `
          ${weakChart}
          <div class="pm-section-title" style="margin-top:8px;">Notatki rodzica</div>
          <textarea class="pm-teacher-notes-area" id="pm-notes-input" placeholder="Dodaj notatkę o dzisiejszej sesji…" rows="3"></textarea>
          <button class="lesson-btn lesson-btn--primary" style="align-self:flex-start;" onclick="ParentDashboard._saveNote()">Zapisz</button>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">${existingNotes}</div>`;
      }

      function _saveNote() {
        const input = document.getElementById('pm-notes-input');
        if (!input || !input.value.trim()) return;
        const data = _userData();
        if (!data.parentNotes) data.parentNotes = [];
        data.parentNotes.push({ date: new Date().toISOString(), text: input.value.trim() });
        _saveUserData(data);
        input.value = '';
        // Refresh notes panel
        const panel = document.getElementById('pm-panel-2');
        if (panel) panel.innerHTML = _buildNotes();
        Melody.speak('Zapisano! 📝', 1500);
      }

      // ── TAB 4: SETTINGS ───────────────────────────────────────
      function _buildSettings() {
        const data     = _userData();
        const settings = data.settings || {};
        const tempo    = settings.tempoPreference || 'normal';
        const sessLen  = settings.sessionLength   || '15';
        const noteNms  = settings.showNoteNames !== false;
        const lhUnlock = settings.leftHandUnlocked || false;
        const currSpd  = settings.curriculumSpeed  || 'standard';

        function tempoOpts() {
          return ['turtle','normal','rabbit','rocket'].map(t =>
            `<button class="pm-select-opt ${tempo===t?'opt--active':''}" onclick="ParentDashboard._setSetting('tempoPreference','${t}',this)">${{turtle:'🐢',normal:'🎵',rabbit:'🐇',rocket:'🚀'}[t]}</button>`
          ).join('');
        }
        function sessOpts() {
          return ['10','15','20','Free'].map(s =>
            `<button class="pm-select-opt ${sessLen===s||(!sessLen&&s==='15')?'opt--active':''}" onclick="ParentDashboard._setSetting('sessionLength','${s}',this)">${s}${s!=='Free'?' min':''}</button>`
          ).join('');
        }
        function spdOpts() {
          return [['gentle','Łagodna'],['standard','Standardowa'],['accelerated','Przyspieszona']].map(([key,label]) =>
            `<button class="pm-select-opt ${currSpd.toLowerCase()===key?'opt--active':''}" onclick="ParentDashboard._setSetting('curriculumSpeed','${key}',this)">${label}</button>`
          ).join('');
        }

        return `
          <div class="pm-settings-row">
            <div><div class="pm-settings-label">Domyślne tempo</div></div>
            <div class="pm-select-group">${tempoOpts()}</div>
          </div>
          <div class="pm-settings-row">
            <div><div class="pm-settings-label">Długość sesji</div></div>
            <div class="pm-select-group">${sessOpts()}</div>
          </div>
          <div class="pm-settings-row">
            <div><div class="pm-settings-label">Nazwy nut na klawiszach</div></div>
            <div class="pm-toggle ${noteNms?'toggle--on':''}" id="pm-toggle-notes" onclick="ParentDashboard._toggleSetting('showNoteNames','pm-toggle-notes')"></div>
          </div>
          <div class="pm-settings-row">
            <div>
              <div class="pm-settings-label">Świat lewej ręki</div>
              <div class="pm-settings-sub">Odblokuj piosenki na dwie ręce</div>
            </div>
            <div class="pm-toggle ${lhUnlock?'toggle--on':''}" id="pm-toggle-lh" onclick="ParentDashboard._toggleSetting('leftHandUnlocked','pm-toggle-lh')"></div>
          </div>
          <div class="pm-settings-row">
            <div><div class="pm-settings-label">Szybkość programu</div></div>
            <div class="pm-select-group">${spdOpts()}</div>
          </div>
          <div class="pm-settings-row">
            <div><div class="pm-settings-label">Zmień PIN</div></div>
            <div class="pm-pin-change-form">
              <input class="pm-pin-change-input" id="pm-new-pin" type="password" maxlength="4" inputmode="numeric" placeholder="••••"/>
              <button class="lesson-btn" onclick="ParentDashboard._changePin()">Zapisz</button>
            </div>
          </div>
          <div class="pm-settings-row">
            <div><div class="pm-settings-label">Resetuj postępy</div><div class="pm-settings-sub">Usuwa wszystkie gwiazdki</div></div>
            <button class="pm-danger-btn" onclick="ParentDashboard._confirmReset()">Resetuj…</button>
          </div>
          <div class="pm-settings-row">
            <div><div class="pm-settings-label">Usuń profil</div><div class="pm-settings-sub">Trwale usuwa wszystkie dane</div></div>
            <button class="pm-danger-btn" onclick="ParentDashboard._confirmDelete()">Usuń…</button>
          </div>`;
      }

      function _setSetting(key, value, btn) {
        const data = _userData();
        if (!data.settings) data.settings = {};
        data.settings[key] = value;
        _saveUserData(data);
        // Update active state in sibling buttons
        const group = btn.closest('.pm-select-group');
        if (group) group.querySelectorAll('.pm-select-opt').forEach(b => b.classList.toggle('opt--active', b === btn));
      }

      function _toggleSetting(key, toggleId) {
        const data = _userData();
        if (!data.settings) data.settings = {};
        data.settings[key] = !data.settings[key];
        _saveUserData(data);
        const toggle = document.getElementById(toggleId);
        if (toggle) toggle.classList.toggle('toggle--on', !!data.settings[key]);
      }

      function _changePin() {
        const input = document.getElementById('pm-new-pin');
        if (!input || input.value.length !== 4 || !/^\d{4}$/.test(input.value)) {
          input.style.borderColor = '#EF4444';
          return;
        }
        const data = _userData();
        if (!data.settings) data.settings = {};
        data.settings.parentPin = input.value;
        _saveUserData(data);
        input.value = '';
        input.style.borderColor = '#10B981';
        Melody.speak('PIN zmieniony! 🔒', 1500);
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
      }

      function _confirmReset() {
        if (confirm('Zresetować postępy? Tej operacji nie można cofnąć.') &&
            confirm('Na pewno? Wszystkie gwiazdki zostaną usunięte.') &&
            confirm('Ostatnie potwierdzenie: zresetować postępy?')) {
          const data = _userData();
          data.progress = {};
          _saveUserData(data);
          alert('Postępy zresetowane.');
        }
      }

      function _confirmDelete() {
        const active = UserManager.getCurrentUser();
        if (!active) return;
        if (confirm(`Usunąć profil ${active.profile.name}? Tej operacji nie można cofnąć.`) &&
            confirm('Wszystkie dane zostaną trwale usunięte.') &&
            confirm(`Ostatnie potwierdzenie: usunąć ${active.profile.name}?`)) {
          UserManager.deleteUser(active.profile.name);
          if (typeof showScreen === 'function') showScreen('login');
        }
      }

      // ── TAB 5: DATA ───────────────────────────────────────────
      function _buildData() {
        return `
          <div class="data-action-cards">
            <div class="data-action-card" onclick="ParentDashboard._exportData()">
              <div class="data-action-icon">⬇️</div>
              <div class="data-action-label">Eksportuj dane</div>
              <div class="data-action-sub">Pobierz kopię zapasową JSON</div>
            </div>
            <div class="data-action-card" onclick="ParentDashboard._importTrigger()">
              <div class="data-action-icon">⬆️</div>
              <div class="data-action-label">Importuj dane</div>
              <div class="data-action-sub">Przywróć z pliku JSON</div>
            </div>
            <div class="data-action-card" onclick="window.print()">
              <div class="data-action-icon">🖨️</div>
              <div class="data-action-label">Drukuj trofea</div>
              <div class="data-action-sub">Widok do druku</div>
            </div>
            <div class="data-action-card" onclick="ParentDashboard._exportAll()">
              <div class="data-action-icon">📦</div>
              <div class="data-action-label">Eksportuj wszystkich</div>
              <div class="data-action-sub">Wszystkie profile jako JSON</div>
            </div>
          </div>
          <input type="file" id="pm-import-input" accept=".json" style="display:none" onchange="ParentDashboard._importData(event)"/>`;
      }

      function _exportData() {
        const active = UserManager.getCurrentUser();
        if (!active) return;
        const data   = _userData();
        const json   = JSON.stringify(data, null, 2);
        const blob   = new Blob([json], { type:'application/json' });
        const url    = URL.createObjectURL(blob);
        const a      = document.createElement('a');
        const date   = new Date().toISOString().slice(0,10);
        a.href       = url;
        a.download   = `LittleMaestro_${active.profile.name.replace(/\s+/g,'_')}_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      function _importTrigger() {
        document.getElementById('pm-import-input')?.click();
      }

      function _importData(evt) {
        const file = evt.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            // Validate structure
            if (!data.profile) throw new Error('Nieprawidłowy plik — brak profilu');
            const active = UserManager.getCurrentUser();
            if (!active) return;
            const key = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
            localStorage.setItem(key, JSON.stringify(data));
            alert('Dane zaimportowane!');
            // Refresh
            ParentDashboard._tab(0);
            const p = document.getElementById('pm-panel-0');
            if (p) p.innerHTML = _buildOverview();
          } catch(err) {
            alert(`Import nie powiódł się: ${err.message}`);
          }
        };
        reader.readAsText(file);
        evt.target.value = '';
      }

      function _exportAll() {
        try {
          const idx   = JSON.parse(localStorage.getItem('littlemaestro__index') || '[]');
          const allData = {};
          idx.forEach(name => {
            const key  = `littlemaestro_${name.toLowerCase().replace(/\s+/g,'_')}`;
            allData[name] = JSON.parse(localStorage.getItem(key) || '{}');
          });
          const json = JSON.stringify(allData, null, 2);
          const blob = new Blob([json], { type:'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          const date = new Date().toISOString().slice(0,10);
          a.href     = url;
          a.download = `LittleMaestro_AllStudents_${date}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } catch(e) { alert('Eksport nie powiódł się'); }
      }

      // ── Lock dashboard (return to PIN screen) ─────────────────
      function _lock() {
        _pin.entered  = '';
        _pin.attempts = 0;
        render();
      }

      return { render, _tab, _pinKey, _pinBack, _saveNote, _setSetting, _toggleSetting, _changePin, _confirmReset, _confirmDelete, _exportData, _importTrigger, _importData, _exportAll, _lock };
    })();


    /* ────────────────────────────────────────────────────────────
       PHASE 10 — DOMContentLoaded wiring
