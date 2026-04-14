    /* ============================================================
       LITTLE MAESTRO — PHASE 9
       LessonEngine · SessionManager · FlashcardGame
       ============================================================ */

    /* ────────────────────────────────────────────────────────────
       LESSON ENGINE
       Five-phase lesson flow for each song.
       ──────────────────────────────────────────────────────────── */
    const LessonEngine = (() => {

      // ── Internal state ─────────────────────────────────────────
      const _s = {
        songId:       null,
        song:         null,
        phase:        0,           // 1-5
        noteIndex:    0,           // current note pointer
        playHandle:   null,        // { stop } from AudioEngine.playSong
        listenCount:  0,           // how many times student listened
        playCount:    0,           // times played along in phase 4
        correctCount: 0,
        totalCount:   0,
        tempo:        'normal',
        midiHandler:  null,        // registered MIDI callback ref
        ballEl:       null,        // bouncing ball DOM element
        noteRects:    [],          // bounding rects of rendered notes (for ball)
        inputMode:         'screen',    // 'screen' | 'piano' — set by mode selector
        metronomeEnabled:  true,        // metronome on by default in Phase 4
        metronomeTid:      null,        // setInterval handle for metronome
        metronomeBeat:     0,           // beat counter for accent detection
        _phase4AudioTimer: null,        // setTimeout handle for LEAD_MS audio delay
      };

      // Song metadata extras (emoji illustration, fun facts)
      const SONG_META = {
        // World 1 – First Notes
        1:  { era:'🥐', fact:'Hot Cross Buns uses only 3 notes — E, D, and C. You can learn it in one day!' },
        2:  { era:'🐑', fact:'Mary Had a Little Lamb was the very first song ever recorded on a phonograph way back in 1877!' },
        3:  { era:'⭐', fact:'Twinkle Twinkle Little Star has the same melody as the ABC Song and a French tune from the 1700s!' },
        4:  { era:'🕯️', fact:'Jack Be Nimble is named after a real 16th-century sailor who was famous for jumping over candles!' },
        5:  { era:'🎵', fact:'Lightly Row is one of the first songs every piano student ever learns — you\'re in great company!' },
        // World 2 – Simple Melodies
        6:  { era:'🇺🇸', fact:'Yankee Doodle was originally written to make fun of American soldiers, but they loved it and made it their own!' },
        7:  { era:'🎶', fact:'Ode to Joy was composed by Beethoven — even though he was completely deaf when he wrote it!' },
        8:  { era:'🌙', fact:'Au Clair de la Lune is a French lullaby that\'s been sung to children for over 200 years!' },
        9:  { era:'👑', fact:'Good King Wenceslas was a real duke who lived in Bohemia around 900 AD and was famous for his kindness!' },
        10: { era:'🎀', fact:'Simple Gifts is a Shaker hymn from 1848 and was used in a famous piece called Appalachian Spring!' },
        // World 3 – Both Hands
        11: { era:'🎠', fact:'Merrily We Roll Along uses only 3 notes too — playing it with both hands makes it sound so much fuller!' },
        12: { era:'🔔', fact:'Jingle Bells was written for Thanksgiving in 1857 — not Christmas! It was one of the first songs ever recorded.' },
        13: { era:'⛪', fact:'When the Saints Go Marching In started as a spiritual hymn and became a famous New Orleans jazz song!' },
        14: { era:'🌉', fact:'London Bridge is Falling Down is over 800 years old — kids have been singing it since the Middle Ages!' },
        15: { era:'🌿', fact:'Scarborough Fair is an English folk ballad listing herbs like parsley, sage, rosemary, and thyme as a secret code!' },
        // World 4 – Rhythm Master
        16: { era:'🎶', fact:'Ode to Joy played with both hands sounds like a real orchestra — Beethoven would be proud of you!' },
        17: { era:'⭐', fact:'Twinkle Twinkle with both hands is a huge milestone — your two hands are learning to be a team!' },
        18: { era:'💃', fact:'Minuet in G was written by Bach for his students — so it was literally meant for kids learning piano, just like you!' },
        19: { era:'🌅', fact:'Morning by Grieg was written to sound like the sun rising over mountains — can you hear it in the notes?' },
        20: { era:'🕊️', fact:'Canon in D by Pachelbel has the same pattern repeating over and over — like a musical round-robin!' },
        // World 5 – Harmony
        21: { era:'🌸', fact:'Für Elise by Beethoven is one of the most famous piano pieces in the world. Nobody knows who Elise was!' },
        22: { era:'🌕', fact:'Moonlight Sonata was nicknamed after the moonlight on a Swiss lake — even though Beethoven never gave it that name!' },
        23: { era:'🦢', fact:'Swan Lake by Tchaikovsky was written for ballet dancers in 1876 — imagine the graceful swans when you play it!' },
        24: { era:'🌿', fact:'Greensleeves is so old that some people thought Shakespeare or King Henry VIII wrote it — it\'s from the 1500s!' },
        25: { era:'🚢', fact:'My Heart Will Go On is from the movie Titanic. It became one of the best-selling singles of all time!' },
        // World 6 – Maestro
        26: { era:'🌊', fact:'Clair de Lune means "moonlight" in French. Debussy wrote it to paint pictures with music instead of paint!' },
        27: { era:'🌸', fact:'River Flows in You by Yiruma is a modern piece that became famous around the world because of the internet!' },
        28: { era:'🧞', fact:'A Whole New World is from Aladdin! It won the Academy Award for Best Original Song in 1993.' },
        29: { era:'❄️', fact:'Let It Go from Frozen became so popular that kids in over 40 countries were singing it in their own languages!' },
        30: { era:'🌟', fact:'This is YOUR song — you pick it! You\'ve come so far. Every great pianist started right where you began.' },
      };

      // ── Utility: get song metadata ────────────────────────────
      function _meta(songId) {
        return SONG_META[songId] || { era: '🎵', fact: 'Every note you play is a step on your musical journey!' };
      }

      // ── Utility: get right-hand notes only ───────────────────
      function _rhNotes() {
        if (!_s.song) return [];
        // gameSkip: true marks lower chord notes — exclude from gameplay, keep for audio
        return _s.song.notes.filter(n => (!n.hand || n.hand === 'right') && !n.gameSkip);
      }

      // ── Utility: enharmonic normalize (match keyboard sharps) ─
      function _normalize(note) {
        const MAP = { 'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B' };
        const m = note.match(/^([A-G][b#]?)(\d)$/);
        if (!m) return note;
        return (MAP[m[1]] || m[1]) + m[2];
      }

      // ── Ensure lesson control bar exists ─────────────────────
      function _ensureControlBar() {
        let bar = document.getElementById('lesson-controls-bar');
        if (bar) return bar;

        bar = document.createElement('div');
        bar.id        = 'lesson-controls-bar';
        bar.className = 'lesson-controls-bar';
        bar.innerHTML = `
          <!-- Back to home button -->
          <button class="lesson-back-home-btn" onclick="LessonEngine._confirmExit()" title="Wróć">← Wróć</button>
          <!-- Tempo group -->
          <div class="tempo-group" id="lesson-tempo-group">
            <button class="tempo-btn" data-tempo="turtle" onclick="LessonEngine.setTempo('turtle')">🐢</button>
            <button class="tempo-btn active" data-tempo="normal" onclick="LessonEngine.setTempo('normal')">🎵</button>
            <button class="tempo-btn" data-tempo="rabbit" onclick="LessonEngine.setTempo('rabbit')">🐇</button>
            <button class="tempo-btn" data-tempo="rocket" onclick="LessonEngine.setTempo('rocket')">🚀</button>
          </div>
          <!-- Phase label -->
          <div class="lesson-phase-pill" id="lesson-phase-pill">—</div>
          <!-- Progress bar -->
          <div class="lesson-progress-wrap">
            <div class="lesson-progress-label">
              <span id="lesson-progress-text">Notes</span>
              <span id="lesson-progress-pct">0%</span>
            </div>
            <div class="lesson-progress-bar">
              <div class="lesson-progress-fill" id="lesson-progress-fill" style="width:0%"></div>
            </div>
          </div>
          <!-- Action buttons (populated per phase) -->
          <div id="lesson-action-btns" style="display:flex;gap:6px;flex-wrap:wrap;"></div>`;

        // Append after lesson screen-content
        const lessonScreen = document.getElementById('screen-lesson');
        if (lessonScreen) lessonScreen.appendChild(bar);
        return bar;
      }

      // ── Update the control bar ────────────────────────────────
      function _setPhaseUI(phaseName, tempoLocked, btns) {
        const pill   = document.getElementById('lesson-phase-pill');
        const btnBox = document.getElementById('lesson-action-btns');
        if (pill)   pill.textContent = phaseName;
        if (btnBox) btnBox.innerHTML = btns || '';

        // Tempo lock
        document.querySelectorAll('.tempo-btn').forEach(btn => {
          const t = btn.dataset.tempo;
          btn.disabled = tempoLocked ? (t !== 'normal' && t !== _s.tempo) : false;
          btn.classList.toggle('active', t === _s.tempo);
        });
      }

      // ── Update progress bar ───────────────────────────────────
      function _setProgress(current, total, label) {
        const pct   = total > 0 ? Math.round((current / total) * 100) : 0;
        const fill  = document.getElementById('lesson-progress-fill');
        const txt   = document.getElementById('lesson-progress-text');
        const pctEl = document.getElementById('lesson-progress-pct');
        if (fill)  fill.style.width = `${pct}%`;
        if (txt)   txt.textContent  = label || 'Progress';
        if (pctEl) pctEl.textContent = `${pct}%`;
      }

      // ── Clear MIDI listener ───────────────────────────────────
      function _clearMIDI() {
        // MIDIManager uses push-only callbacks; we flag our handler inactive
        _s.midiHandler = null;
      }

      // ── Stop playback ────────────────────────────────────────
      function _stopPlayback() {
        _stopMetronome();
        // Cancel the LEAD_MS audio delay timer if it's pending
        if (_s._phase4AudioTimer) {
          clearTimeout(_s._phase4AudioTimer);
          _s._phase4AudioTimer = null;
        }
        if (_s.playHandle) {
          _s.playHandle.stop();
          _s.playHandle = null;
        }
        _removeBall();
        // Stop falling notes animation (but keep highway visible for star screen)
        if (typeof FallingNotes !== 'undefined') FallingNotes.stop();
      }

      // ── Bouncing ball helpers ─────────────────────────────────
      function _createBall() {
        _removeBall();
        const scroll = document.getElementById('lesson-sheet-music');
        if (!scroll) return;
        const ball = document.createElement('div');
        ball.className = 'sheet-ball';
        ball.id        = 'lesson-ball';
        scroll.appendChild(ball);
        _s.ballEl = ball;
      }
      function _removeBall() {
        if (_s.ballEl) { _s.ballEl.remove(); _s.ballEl = null; }
        const b = document.getElementById('lesson-ball');
        if (b) b.remove();
      }
      function _moveBallToNote(noteIndex) {
        if (!_s.ballEl) return;
        const noteEls = document.querySelectorAll('#lesson-sheet-music [data-note-index]');
        const el      = noteEls[noteIndex];
        if (!el) return;
        const scrollRect = document.getElementById('lesson-sheet-music').getBoundingClientRect();
        const noteRect   = el.getBoundingClientRect();
        _s.ballEl.style.left = `${noteRect.left - scrollRect.left + noteRect.width/2 - 6}px`;
        _s.ballEl.style.top  = `${noteRect.top  - scrollRect.top  - 16}px`;
      }

      // ══════════════════════════════════════════════════════════
      //  PHASE 1 — MEET THE SONG
      // ══════════════════════════════════════════════════════════
      function _startPhase1() {
        _s.phase = 1;
        const meta = _meta(_s.songId);

        _setPhaseUI('Krok 1 · Poznaj piosenkę', true, '');
        _setProgress(0, 5, 'Lekcja');
        Melody.setState('thinking');
        Melody.speak(meta.fact, 0);

        // Build overlay card
        const overlay = document.createElement('div');
        overlay.className = 'lesson-meet-overlay';
        overlay.id        = 'lesson-meet-overlay';
        overlay.innerHTML = `
          <div class="meet-card">
            <div class="meet-card-era">${meta.era}</div>
            <div class="meet-card-title">${_s.song.title}</div>
            <div class="meet-card-composer">${_s.song.composer || 'Tradycyjna'}</div>
            <div class="meet-card-fact">${meta.fact}</div>
            <button class="lesson-btn lesson-btn--primary" style="margin-top:8px;" onclick="LessonEngine._endPhase1()">
              Posłuchaj →
            </button>
          </div>`;

        const lessonContent = document.querySelector('#screen-lesson .screen-content');
        if (lessonContent) {
          lessonContent.style.position = 'relative';
          lessonContent.appendChild(overlay);
        }

        // Transition Melody after 1.5s
        setTimeout(() => Melody.setState('excited'), 1500);
      }

      function _endPhase1() {
        const overlay = document.getElementById('lesson-meet-overlay');
        if (overlay) {
          overlay.classList.add('overlay--exit');
          setTimeout(() => overlay.remove(), 350);
        }
        Melody.speak('', 0);
        // Show input mode selector before entering lesson phases
        setTimeout(_showInputModeSelector, 400);
      }

      // ══════════════════════════════════════════════════════════
      //  INPUT MODE SELECTOR — screen tap vs. real piano (MIDI)
      // ══════════════════════════════════════════════════════════
      function _showInputModeSelector() {
        // Remove any existing modal
        document.getElementById('input-mode-overlay')?.remove();

        const midiConnected = (typeof MIDIManager !== 'undefined') &&
                              MIDIManager.getStatus() === 'connected';

        const overlay = document.createElement('div');
        overlay.id        = 'input-mode-overlay';
        overlay.className = 'input-mode-overlay';

        overlay.innerHTML = `
          <div class="input-mode-modal">
            <div class="input-mode-emoji">🎹</div>
            <div class="input-mode-title">Gotowa do gry?</div>
            <div class="input-mode-subtitle">${_s.song?.title ? '"' + _s.song.title + '"' : 'Zaczynamy!'}</div>

            <div class="input-mode-section-label">Jak chcesz grać?</div>
            <div class="input-mode-choices">
              <button class="input-mode-btn" id="mode-btn-screen">
                <span class="input-mode-btn-icon">👆</span>
                <span class="input-mode-btn-label">Klawisze na ekranie</span>
                <span class="input-mode-btn-sub">Klikaj klawisze<br>na ekranie</span>
              </button>
              <button class="input-mode-btn${midiConnected ? '' : ' input-mode-btn--disabled'}" id="mode-btn-piano">
                <span class="input-mode-btn-icon">🎹</span>
                <span class="input-mode-btn-label">Prawdziwe pianino</span>
                <span class="input-mode-btn-sub">${midiConnected ? 'Graj na<br>podłączonym pianinie' : 'Nie wykryto<br>pianina'}</span>
              </button>
            </div>
            ${!midiConnected ? '<div class="input-mode-no-midi">Podłącz pianino USB żeby grać na prawdziwym instrumencie.</div>' : ''}

            <div class="input-mode-divider"></div>
            <div class="input-mode-section-label">Tempo</div>
            <div class="input-mode-tempo-row">
              <button class="input-mode-tempo-btn" data-tempo="turtle">🐢<br><span>Wolno</span></button>
              <button class="input-mode-tempo-btn input-mode-tempo-btn--active" data-tempo="normal">▶<br><span>Normalnie</span></button>
              <button class="input-mode-tempo-btn" data-tempo="rabbit">🚀<br><span>Szybko</span></button>
            </div>
          </div>`;

        document.body.appendChild(overlay);

        // Tempo button selection
        let selectedTempo = 'normal';
        overlay.querySelectorAll('.input-mode-tempo-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            overlay.querySelectorAll('.input-mode-tempo-btn')
              .forEach(b => b.classList.remove('input-mode-tempo-btn--active'));
            btn.classList.add('input-mode-tempo-btn--active');
            selectedTempo = btn.dataset.tempo;
          });
        });

        function _startWithMode(mode) {
          _s.inputMode = mode;
          _s.tempo     = selectedTempo;
          overlay.remove();
          if (mode === 'screen') _activateScreenMode();
          else                   _activatePianoMode();
          _startPhase2();
        }

        document.getElementById('mode-btn-screen').addEventListener('click',
          () => _startWithMode('screen'));

        if (midiConnected) {
          document.getElementById('mode-btn-piano').addEventListener('click',
            () => _startWithMode('piano'));
        }
      }

      function _activateScreenMode() {
        // Enable on-screen keyboard tap input
        if (typeof PianoKeyboard !== 'undefined') {
          PianoKeyboard.setClickCallback((note) => {
            if (_s.phase === 3) _handleNoteInput(note);
            else if (_s.phase === 4) _handlePhase4NoteInput(note);
          });
          PianoKeyboard.setClickEnabled(true);
        }
      }

      function _activatePianoMode() {
        // Disable on-screen tap (keyboard is visual guide only in MIDI mode)
        if (typeof PianoKeyboard !== 'undefined') {
          PianoKeyboard.setClickEnabled(false);
        }
      }

      // Phase 4 screen-mode tap handler — routed through FallingNotes
      function _handlePhase4NoteInput(playedNote) {
        if (_s.phase !== 4) return;
        // Play the sound so Addison hears it
        try { AudioEngine.playNoteInstant(_normalize(playedNote), 90); } catch(e) {}
        // FallingNotes handles hit detection, sparkles, streak, and score
        if (typeof FallingNotes !== 'undefined') FallingNotes.onNoteInput(playedNote);
      }

      // ══════════════════════════════════════════════════════════
      //  METRONOME
      // ══════════════════════════════════════════════════════════

      function _startMetronome() {
        _stopMetronome();
        if (!_s.metronomeEnabled) return;
        const bpm        = (_s.song?.bpm && _s.song.bpm[_s.tempo]) || 100;
        const intervalMs = Math.round(60000 / bpm);
        _s.metronomeBeat = 0;

        _s.metronomeTid = setInterval(() => {
          if (_s.phase !== 4) { _stopMetronome(); return; }
          const accent = (_s.metronomeBeat % 4 === 0);
          try { AudioEngine.tick(accent); } catch(e) {}
          _pulseMetronomeDot(accent);
          _s.metronomeBeat++;
        }, intervalMs);
      }

      function _stopMetronome() {
        if (_s.metronomeTid) {
          clearInterval(_s.metronomeTid);
          _s.metronomeTid = null;
        }
      }

      function _pulseMetronomeDot(accent) {
        const dot = document.getElementById('metro-dot');
        if (!dot) return;
        const cls = accent ? 'metro-dot--accent' : 'metro-dot--beat';
        dot.classList.add(cls);
        setTimeout(() => dot.classList.remove(cls), accent ? 120 : 80);
      }

      function _toggleMetronome() {
        _s.metronomeEnabled = !_s.metronomeEnabled;
        const btn = document.getElementById('metro-toggle-btn');
        if (btn) {
          btn.classList.toggle('metro-btn--on', _s.metronomeEnabled);
          btn.querySelector('.metro-label').textContent =
            _s.metronomeEnabled ? 'Metro: Wł.' : 'Metro: Wył.';
        }
        if (_s.phase === 4) {
          if (_s.metronomeEnabled) _startMetronome();
          else _stopMetronome();
        }
      }

      // ══════════════════════════════════════════════════════════
      //  PHASE 2 — LISTEN
      // ══════════════════════════════════════════════════════════
      function _startPhase2() {
        // Hide the falling notes highway if it was visible from a previous phase 4
        if (typeof FallingNotes !== 'undefined') FallingNotes.hide();
        _s.phase      = 1; // listen is still "pre-play" logically
        _s.listenCount = 0;

        _setPhaseUI('Krok 2 · Słuchaj', true,
          `<button class="listen-instruction" id="listen-ready-btn" disabled onclick="LessonEngine._advancePhase2()">Jestem gotowa →</button>
           <button class="lesson-btn" onclick="LessonEngine._replayListen()">↺ Powtórz</button>`);
        _setProgress(1, 5, 'Lekcja');

        Melody.setState('excited');
        Melody.speak('Posłuchaj! 🎵', 3000);

        // Render sheet music
        if (typeof SheetMusic !== 'undefined') {
          SheetMusic.render('lesson-sheet-music', _s.songId, { showNoteNames: true });
        }
        if (document.getElementById('sheet-song-title')) {
          document.getElementById('sheet-song-title').textContent = _s.song.title;
        }

        _playListen();
      }

      function _playListen() {
        _stopPlayback();
        _createBall();

        // Ensure AudioContext is running — it's suspended until a user gesture
        if (typeof AudioEngine !== 'undefined' && AudioEngine.context &&
            AudioEngine.context.state === 'suspended') {
          AudioEngine.context.resume().catch(() => {});
        }

        // Safety fallback: enable button after 3 s if playSong never fires onComplete
        const _readyFallback = setTimeout(() => {
          const readyBtn = document.getElementById('listen-ready-btn');
          if (readyBtn && readyBtn.disabled) {
            readyBtn.disabled = false;
            Melody.setState('idle');
            Melody.speak('Gotowa kiedy chcesz! ✨', 3000);
          }
        }, 3000);

        const rhNotes = _rhNotes();
        _s.playHandle = AudioEngine.playSong(_s.songId, 'normal', (idx) => {
          if (typeof SheetMusic !== 'undefined') SheetMusic.highlightNote(idx);
          if (typeof PianoKeyboard !== 'undefined') {
            const n = rhNotes[idx];
            if (n) PianoKeyboard.highlightPlaying(_normalize(n.note));
          }
          _moveBallToNote(idx);
        }, () => {
          clearTimeout(_readyFallback);
          _s.listenCount++;
          _removeBall();
          // Clear highlights
          if (typeof PianoKeyboard !== 'undefined') PianoKeyboard.clearHighlights();
          // Enable "I'm Ready" after 1 listen
          const readyBtn = document.getElementById('listen-ready-btn');
          if (readyBtn) readyBtn.disabled = false;
          Melody.setState('idle');
          Melody.speak(_s.listenCount === 1 ? 'Posłuchaj jeszcze raz! 🎵' : 'Gotowa kiedy chcesz! ✨', 3000);
        });
      }

      function _advancePhase2() {
        _stopPlayback();
        // Sanah world (14+): skip note learning, go straight to falling notes (Suzuki method)
        if (_s.song && _s.song.world >= 14) {
          _startPhase4();
          return;
        }
        _startPhase3();
      }

      // ══════════════════════════════════════════════════════════
      //  PHASE 3 — LEARN THE NOTES
      // ══════════════════════════════════════════════════════════
      function _startPhase3() {
        _s.phase      = 3;
        _s.noteIndex  = 0;
        _s.correctCount = 0;

        const rhNotes = _rhNotes();
        _s.totalCount = rhNotes.length;

        _setPhaseUI('Krok 3 · Naucz się nut', false,
          `<button class="lesson-btn lesson-btn--danger" onclick="LessonEngine._triggerStuck()">Potrzebuję pomocy 🆘</button>`);
        _setProgress(0, _s.totalCount, 'Nuty');

        // Note instruction banner
        _showNoteInstructionBanner();

        Melody.setState('idle');
        _promptNextNote();

        // Register MIDI handler
        const handlerId = Date.now();
        _s.midiHandlerId = handlerId;

        MIDIManager.onNoteOn(({ fullNote }) => {
          if (_s.midiHandlerId !== handlerId) return; // stale handler guard
          if (_s.phase !== 3) return;
          if (_s.inputMode !== 'piano') return;  // screen mode uses tap, not MIDI
          _handleNoteInput(fullNote);
        });
      }

      function _showNoteInstructionBanner() {
        let banner = document.getElementById('note-instruction-banner');
        if (!banner) {
          banner = document.createElement('div');
          banner.id        = 'note-instruction-banner';
          banner.className = 'note-instruction-banner';
          const sheet = document.getElementById('lesson-panel-sheet');
          if (sheet) { sheet.style.position = 'relative'; sheet.insertBefore(banner, sheet.firstChild); }
        }
        banner.classList.remove('banner--hidden');
      }

      function _promptNextNote() {
        const rhNotes = _rhNotes();
        if (_s.noteIndex >= rhNotes.length) {
          _startPhase4();
          return;
        }

        const note     = rhNotes[_s.noteIndex];
        const noteName = noteDisplayPL(note.note);
        const finger   = note.finger || '';

        if (typeof SheetMusic !== 'undefined')    SheetMusic.highlightNote(_s.noteIndex);
        if (typeof PianoKeyboard !== 'undefined') PianoKeyboard.highlightNext(_normalize(note.note), finger);

        // Update instruction banner
        const banner = document.getElementById('note-instruction-banner');
        if (banner) {
          banner.innerHTML = `
            Znajdź nutę → <span class="note-instruction-note-name">${noteName}</span>
            ${finger ? `<span style="color:var(--color-text-muted);font-size:10px;">&nbsp;palec&nbsp;${finger}</span>` : ''}
            &nbsp;&nbsp;Zagraj świecący klawisz!`;
        }

        Melody.speak(`Znajdź ${noteName}! 🎵`, 3000);
        _setProgress(_s.noteIndex, _s.totalCount, 'Nuty');
      }

      function _handleNoteInput(playedNote) {
        const rhNotes   = _rhNotes();
        const expected  = _normalize(rhNotes[_s.noteIndex]?.note || '');
        const played    = _normalize(playedNote);

        // Play audio feedback — screen mode only.
        // In MIDI (piano) mode the global MIDIManager.onNoteOn handler already
        // called AudioEngine.playNoteInstant, so we skip it here to avoid a
        // doubled/echoed note on every keypress.
        if (_s.inputMode !== 'piano') {
          AudioEngine.playNoteInstant(played, 90);
        }

        if (played === expected) {
          // Correct!
          _s.correctCount++;
          if (typeof PianoKeyboard !== 'undefined') PianoKeyboard.flashCorrect(_normalize(expected));
          if (typeof SheetMusic    !== 'undefined') SheetMusic.markCorrect(_s.noteIndex);
          Melody.reactCorrect();

          // Small sparkle award
          GamificationManager.awardNotes(1, 'correct note');

          // Advance to next note after 300ms
          _s.noteIndex++;
          setTimeout(() => {
            if (_s.phase === 3) _promptNextNote();
          }, 300);
        } else {
          // Wrong
          if (typeof PianoKeyboard !== 'undefined') {
            PianoKeyboard.flashWrong(played);
            PianoKeyboard.highlightNext(_normalize(expected)); // keep gold key glowing
          }
          Melody.setState('wrong');
          Melody.speak('Prawie! Spróbuj złoty klawisz 🔑', 2000);
          setTimeout(() => { if (_s.phase === 3) { Melody.setState('thinking'); } }, 2200);
        }
      }

      function _triggerStuck() {
        // Show stuck panel and slow to turtle
        let panel = document.getElementById('stuck-panel');
        if (!panel) {
          panel = document.createElement('div');
          panel.id        = 'stuck-panel';
          panel.className = 'stuck-panel';
          panel.innerHTML = `
            <span class="stuck-label">🐢 Zwalniam tempo — skup się na kolejnych 4 nutach!</span>
            <button class="lesson-btn" onclick="document.getElementById('stuck-panel').classList.remove('panel--visible')">OK</button>`;
          const sheet = document.getElementById('lesson-panel-sheet');
          if (sheet) sheet.appendChild(panel);
        }
        setTimeout(() => panel.classList.add('panel--visible'), 10);
        _s.tempo = 'turtle';
        Melody.setState('thinking');
        Melody.speak('Spokojnie! 🐢', 2500);
        setTimeout(() => Melody.setState('idle'), 3000);
        // Update tempo UI
        document.querySelectorAll('.tempo-btn').forEach(b => b.classList.toggle('active', b.dataset.tempo === 'turtle'));
      }

      // ══════════════════════════════════════════════════════════
      //  PHASE 4 — PLAY ALONG  (Guitar Hero falling notes)
      // ══════════════════════════════════════════════════════════
      function _startPhase4() {
        _s.phase         = 4;
        _s.playCount     = 0;
        _s.correctCount  = 0;
        _s.totalCount    = _rhNotes().length;
        _s.noteIndex     = 0;
        _s.midiHandlerId = Date.now();

        document.getElementById('stuck-panel')?.remove();
        const banner = document.getElementById('note-instruction-banner');
        if (banner) banner.classList.add('banner--hidden');

        _setPhaseUI('Krok 4 · Graj!', false,
          `<button class="metro-btn metro-btn--on" id="metro-toggle-btn" onclick="LessonEngine._toggleMetronome()">
             <span class="metro-dot" id="metro-dot"></span>
             <span class="metro-label">Metro: Wł.</span>
           </button>`);
        _setProgress(3, 5, 'Lekcja');

        // Show the falling notes highway
        if (typeof FallingNotes !== 'undefined') FallingNotes.show();

        Melody.setState('excited');
        Melody.speak('Patrz na spadające nuty — graj gdy dotrą do linii! 🎹', 4000);

        _doPlayAlong();
      }

      function _doPlayAlong() {
        _stopPlayback();
        _s.noteIndex    = 0;
        _s.correctCount = 0;
        _s.playCount++;
        // Always stamp a fresh handler ID so any previous replay callbacks become
        // stale and exit immediately — prevents 3-4 simultaneous handler fires.
        _s.midiHandlerId = Date.now();
        // Re-show resets highway to normal height (shrinks back from full-screen star view)
        if (typeof FallingNotes !== 'undefined') FallingNotes.show();

        if (typeof FallingNotes !== 'undefined') FallingNotes.hideStarScreen();

        const rhNotes   = _rhNotes();
        const bpm       = (_s.song?.bpm && _s.song.bpm[_s.tempo]) || 100;
        const handlerId = _s.midiHandlerId;
        const LEAD_MS   = 1600; // match FallingNotes FALL_DURATION

        // Build and start falling notes animation (notes visible before song starts)
        if (typeof FallingNotes !== 'undefined') {
          const schedule = FallingNotes.buildSchedule(rhNotes, bpm);
          FallingNotes.start(schedule, (results) => {
            // onComplete callback — Melody reacts to star rating
            if (results.stars === 3) {
              Melody.setState('celebrate');
              Melody.speak('PERFEKCYJNIE! Jesteś gwiazdą! 🌟', 3000);
            } else if (results.stars === 2) {
              Melody.setState('excited');
              Melody.speak('Świetna robota! Tak trzymaj! 💪', 3000);
            } else {
              Melody.setState('idle');
              Melody.speak('Niezły wynik! Zagraj jeszcze raz — dasz radę! 🎵', 3000);
            }
            // Store accuracy for Phase 5 parent review
            _s.correctCount = results.hits;
            _s.totalCount   = results.hits + results.misses;
            setTimeout(() => Melody.setState('idle'), 3500);
          });
        }

        // Highlight first key immediately so Addison knows what's coming
        if (typeof PianoKeyboard !== 'undefined' && rhNotes[0]) {
          PianoKeyboard.highlightNext(_normalize(rhNotes[0].note));
        }

        // Wire MIDI for play-along (routed through FallingNotes)
        MIDIManager.onNoteOn(({ fullNote }) => {
          if (_s.midiHandlerId !== handlerId || _s.phase !== 4) return;
          if (_s.inputMode !== 'piano') return;
          if (typeof FallingNotes !== 'undefined') FallingNotes.onNoteInput(fullNote);
        });

        // Start metronome after lead-in
        setTimeout(() => {
          if (_s.phase === 4 && _s.midiHandlerId === handlerId) _startMetronome();
        }, LEAD_MS);

        // Start audio after lead-in (so notes fall into sync with sound)
        _s.playHandle = null;
        _s._phase4AudioTimer = setTimeout(() => {
          if (_s.phase !== 4 || _s.midiHandlerId !== handlerId) return;
          _createBall();
          _s.playHandle = AudioEngine.playSong(_s.songId, _s.tempo, (idx) => {
            if (typeof SheetMusic !== 'undefined') SheetMusic.highlightNote(idx);
            _moveBallToNote(idx);
          }, () => {
            // Audio finished — tell FallingNotes so it shows the star screen
            _stopMetronome();
            _removeBall();
            if (typeof FallingNotes !== 'undefined') FallingNotes.markSongEnded();
          });
        }, LEAD_MS);
      }

      function _updateAccuracyDisplay() {
        // Legacy no-op — accuracy now shown inside FallingNotes star screen
      }

      function _callParent() {
        _stopPlayback();
        _startPhase5();
      }

      // ══════════════════════════════════════════════════════════
      //  PHASE 5 — PARENT REVIEW
      // ══════════════════════════════════════════════════════════
      function _startPhase5() {
        _s.phase = 5;
        // Hide the falling notes highway when leaving Phase 4
        if (typeof FallingNotes !== 'undefined') FallingNotes.hide();
        _setPhaseUI('Phase 5 · Parent Review', true, '');
        _setProgress(4, 5, 'Lekcja');

        Melody.setState('celebrate');
        Melody.speak('Czas zabłysnąć! 🌟', 0);

        const acc = _s.totalCount > 0
          ? Math.round((_s.correctCount / _s.totalCount) * 100) : 0;

        const overlay = document.createElement('div');
        overlay.className = 'parent-review-overlay';
        overlay.id        = 'parent-review-overlay';
        overlay.innerHTML = `
          <div class="parent-review-card">
            <div class="parent-review-title">🌟 Time to Show What You've Learned!</div>
            <p style="font-family:var(--font-heading);font-size:13px;color:var(--color-text-muted);text-align:center;">
              Call your parent or teacher!
            </p>

            <div class="parent-review-stats">
              <div class="parent-stat">
                <div class="parent-stat-value">${_s.song.title.split(' ')[0]}</div>
                <div class="parent-stat-label">Piosenka</div>
              </div>
              <div class="parent-stat">
                <div class="parent-stat-value">${_s.playCount}×</div>
                <div class="parent-stat-label">Zagrane</div>
              </div>
              <div class="parent-stat">
                <div class="parent-stat-value">${_s.correctCount}</div>
                <div class="parent-stat-label">Poprawne</div>
              </div>
              <div class="parent-stat">
                <div class="parent-stat-value">${acc}%</div>
                <div class="parent-stat-label">Celność</div>
              </div>
            </div>

            <div class="parent-pin-row">
              <span style="font-family:var(--font-heading);font-size:12px;font-weight:700;color:var(--color-text-muted);">PIN rodzica:</span>
              <input class="parent-pin-input" id="parent-review-pin" type="password" maxlength="4" inputmode="numeric" placeholder="••••" onkeyup="LessonEngine._checkParentPin(this.value)"/>
            </div>

            <div id="parent-star-btns" style="display:none;">
              <div class="star-rating-btns">
                <div style="font-family:var(--font-heading);font-size:12px;font-weight:700;color:var(--color-text-muted);text-align:center;margin-bottom:4px;">Oceń wykonanie:</div>
                <button class="star-rating-btn" onclick="LessonEngine._awardStars(1)">
                  <span class="sr-stars">⭐☆☆</span>
                  <span class="sr-label">Ćwicz dalej — jeszcze nie teraz</span>
                </button>
                <button class="star-rating-btn" onclick="LessonEngine._awardStars(2)">
                  <span class="sr-stars">⭐⭐☆</span>
                  <span class="sr-label">Coraz lepiej — jeszcze jedna sesja</span>
                </button>
                <button class="star-rating-btn sr--3star" onclick="LessonEngine._awardStars(3)">
                  <span class="sr-stars">⭐⭐⭐</span>
                  <span class="sr-label">Zaliczone! Świetnie! Dalej!</span>
                </button>
              </div>
            </div>
          </div>`;

        document.body.appendChild(overlay);
        setTimeout(() => document.getElementById('parent-review-pin')?.focus(), 200);
      }

      function _checkParentPin(val) {
        if (val.length < 4) return;
        // Get stored PIN for active user (default 1234)
        let storedPin = '1234';
        try {
          const active = UserManager.getCurrentUser();
          if (active) {
            const stored = JSON.parse(localStorage.getItem(`littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`) || '{}');
            storedPin = (stored.settings && stored.settings.parentPin) || '1234';
          }
        } catch(e) {}

        if (val === storedPin) {
          document.getElementById('parent-star-btns').style.display = 'block';
          document.getElementById('parent-review-pin').style.borderColor = '#10B981';
        } else {
          document.getElementById('parent-review-pin').style.borderColor = '#EF4444';
          document.getElementById('parent-review-pin').value = '';
        }
      }

      function _awardStars(stars) {
        // Remove parent review overlay
        document.getElementById('parent-review-overlay')?.remove();

        // Save stars
        GamificationManager.awardStars(_s.songId, stars);

        if (stars === 3) {
          // Full celebration sequence
          GamificationManager.showCelebration('songPass', { stars: 3 });
          GamificationManager.awardNotes(50, 'song passed');

          // Unlock next song
          _unlockNextSong();

          // After 4s return to quest map
          setTimeout(() => {
            document.querySelectorAll('.celebration-overlay,.confetti-wrap').forEach(el => el.remove());
            _showNextSongReveal();
          }, 4000);
        } else {
          // Partial — encourage and return to lesson
          Melody.setState('excited');
          Melody.speak('Ćwicz dalej! Dasz radę! 💪', 3000);
          GamificationManager.awardNotes(stars === 2 ? 20 : 10, 'lesson attempt');
          _setPhaseUI('Krok 4 · Graj!', false,
            `<button class="lesson-btn" onclick="LessonEngine._showPlayAgainModal()">↺ Zagraj ponownie</button>
             <button class="lesson-btn lesson-btn--primary" onclick="LessonEngine._callParent()">Pokaż rodzicowi 👨‍👩‍👧 →</button>`);
          _s.phase = 4;
          Melody.setState('idle');
        }
      }

      function _unlockNextSong() {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return;
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          if (!stored.progress) stored.progress = {};
          // Mark current song completed
          if (!stored.progress[_s.songId]) stored.progress[_s.songId] = {};
          stored.progress[_s.songId].stars       = 3;
          stored.progress[_s.songId].completedAt = new Date().toISOString();
          // Find next song and mark it "unlocked"
          const idx  = SONGS.findIndex(s => s.id === _s.songId);
          const next = SONGS[idx + 1];
          if (next) {
            if (!stored.progress[next.id]) stored.progress[next.id] = {};
            stored.progress[next.id].unlocked = true;
          }
          localStorage.setItem(key, JSON.stringify(stored));
        } catch(e) {}
      }

      function _showNextSongReveal() {
        const idx  = SONGS.findIndex(s => s.id === _s.songId);
        const next = SONGS[idx + 1];
        if (!next) {
          // World complete!
          GamificationManager.showCelebration('worldComplete');
          setTimeout(() => {
            document.querySelectorAll('.celebration-overlay,.confetti-wrap').forEach(el => el.remove());
            if (typeof showScreen === 'function') showScreen('questmap');
          }, 4000);
          return;
        }

        const reveal = document.createElement('div');
        reveal.className = 'next-song-reveal';
        reveal.innerHTML = `
          <div class="next-song-card">
            <div class="next-song-card-icon">🔓</div>
            <div class="next-song-card-title">Nowa piosenka odblokowana!</div>
            <div class="next-song-card-name">${next.emoji || '🎵'} ${next.title}</div>
          </div>`;
        document.body.appendChild(reveal);

        setTimeout(() => {
          reveal.remove();
          if (typeof showScreen === 'function') showScreen('questmap');
          if (typeof QuestMap !== 'undefined') QuestMap.render();
        }, 4000);
      }

      // ════════════════════════════════════════════════════════
      //  PUBLIC API
      // ════════════════════════════════════════════════════════
      function startLesson(songId) {
        // Stop any in-progress lesson
        _stopPlayback();
        _clearMIDI();
        _s.midiHandlerId = Date.now();

        // FIX: Init AudioEngine early so soundfont has ~15s to load before first note
        if (typeof AudioEngine !== 'undefined') AudioEngine.init();

        // Reset input mode and disable keyboard taps until mode is chosen
        _s.inputMode = 'screen';
        if (typeof PianoKeyboard !== 'undefined') {
          PianoKeyboard.setClickEnabled(false);
        }

        // Find song
        const song = SONGS.find(s => s.id === songId);
        if (!song) { console.warn('LessonEngine: unknown songId', songId); return; }

        _s.songId = songId;
        _s.song   = song;
        _s.tempo  = 'normal';

        // Ensure control bar exists
        _ensureControlBar();

        // Render sheet music up front
        if (typeof SheetMusic !== 'undefined') {
          SheetMusic.render('lesson-sheet-music', songId, { showNoteNames: true });
        }
        if (document.getElementById('sheet-song-title')) {
          document.getElementById('sheet-song-title').textContent = song.title;
        }

        // Update streak (once per session day)
        GamificationManager.updateStreak();

        // Start Phase 1
        _startPhase1();
      }

      function loadSong(songId) {
        startLesson(songId);
      }

      function setTempo(t) {
        _s.tempo = t;
        document.querySelectorAll('.tempo-btn').forEach(b => b.classList.toggle('active', b.dataset.tempo === t));
      }

      // ── Sheet music white background toggle ───────────────────
      function _toggleSheetBg(btn) {
        const scroll = document.getElementById('lesson-sheet-music');
        if (!scroll) return;
        const isOn = scroll.classList.toggle('sheet-bg--light');
        btn.classList.toggle('toggle-on', isOn);
        btn.textContent = isOn ? '🌙 Ciemne' : '☀️ Jasne';
      }

      // ── Piano visibility toggle ───────────────────────────────
      function _togglePiano(btn) {
        const panel = document.getElementById('lesson-panel-keyboard');
        if (!panel) return;
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? '' : 'none';
        btn.classList.toggle('toggle-on', !isHidden);
        btn.textContent = isHidden ? '🎹 Pianino' : '🙈 Pianino';
        // Expand sheet panel to fill space when piano hidden
        const sheetPanel = document.getElementById('lesson-panel-sheet');
        if (sheetPanel) sheetPanel.style.flex = isHidden ? '' : '1 1 100%';
      }

      // ── Exit lesson confirmation ───────────────────────────────
      function _confirmExit() {
        document.getElementById('lesson-exit-modal-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'lesson-exit-modal-overlay';
        overlay.className = 'lesson-exit-modal-overlay';
        overlay.innerHTML = `
          <div class="lesson-exit-modal">
            <div class="lesson-exit-modal-icon">🏠</div>
            <div class="lesson-exit-modal-title">Wyjść z lekcji?</div>
            <div class="lesson-exit-modal-sub">Dotychczasowy postęp nie zostanie zapisany.</div>
            <div class="lesson-exit-modal-btns">
              <button class="lesson-btn lesson-btn--danger" onclick="LessonEngine._doExit()">Tak, wyjdź</button>
              <button class="lesson-btn lesson-btn--primary" onclick="document.getElementById('lesson-exit-modal-overlay')?.remove()">Graj dalej</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
      }

      function _doExit() {
        _stopPlayback();
        _clearMIDI();
        document.getElementById('lesson-exit-modal-overlay')?.remove();
        document.getElementById('lesson-meet-overlay')?.remove();
        document.getElementById('input-mode-overlay')?.remove();
        document.getElementById('lesson-mode-select-overlay')?.remove();
        document.querySelectorAll('.celebration-overlay,.confetti-wrap,.fn-star-screen,.parent-review-overlay').forEach(el => el.remove());
        if (typeof FallingNotes !== 'undefined') FallingNotes.stop();
        if (typeof showScreen === 'function') showScreen('home');
      }

      // ── Play Again — show mode selection ──────────────────────
      function _showPlayAgainModal() {
        document.getElementById('lesson-mode-select-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'lesson-mode-select-overlay';
        overlay.className = 'lesson-exit-modal-overlay';
        overlay.innerHTML = `
          <div class="lesson-exit-modal" style="border-color:rgba(124,58,237,0.4);max-width:360px;">
            <div class="lesson-exit-modal-icon">🎵</div>
            <div class="lesson-exit-modal-title">Zagraj ponownie</div>
            <div class="lesson-exit-modal-sub">Jak chcesz ćwiczyć?</div>
            <div class="lesson-exit-modal-btns" style="flex-direction:column;gap:8px;">
              <button class="lesson-btn lesson-btn--primary" style="width:100%;padding:10px 14px;font-size:13px;"
                onclick="document.getElementById('lesson-mode-select-overlay')?.remove(); LessonEngine._replayListen();">
                🎧 Posłuchaj piosenki
              </button>
              <button class="lesson-btn" style="width:100%;padding:10px 14px;font-size:13px;"
                onclick="document.getElementById('lesson-mode-select-overlay')?.remove(); LessonEngine._replaySheetMode();">
                🎼 Czytaj nuty
              </button>
              <button class="lesson-btn" style="width:100%;padding:10px 14px;font-size:13px;"
                onclick="document.getElementById('lesson-mode-select-overlay')?.remove(); LessonEngine._replayPlayAlong();">
                🎮 Piano Hero
              </button>
            </div>
            <button class="lesson-btn lesson-btn--danger" style="font-size:11px;"
              onclick="document.getElementById('lesson-mode-select-overlay')?.remove();">Anuluj</button>
          </div>`;
        document.body.appendChild(overlay);
      }

      return {
        startLesson, loadSong, setTempo,
        _endPhase1, _advancePhase2, _triggerStuck, _callParent,
        _checkParentPin, _awardStars, _ensureControlBar,
        _toggleMetronome,
        _confirmExit, _doExit,
        _showPlayAgainModal,
        _toggleSheetBg, _togglePiano,
        _replayListen: _playListen, _replayPlayAlong: _doPlayAlong,
        _replaySheetMode: _startPhase2,
        _state: () => _s
      };
    })();

    // Expose _endPhase1 at top-level for onclick handler
    window.LessonEngine = LessonEngine;


    /* ────────────────────────────────────────────────────────────
       FLASHCARD WARM-UP GAME
       Note recognition: see note on staff → play key on piano
       ──────────────────────────────────────────────────────────── */
    const FlashcardGame = (() => {

      // Treble clef notes available for flashcards (middle range, World 1-2 focused initially)
      const CARD_NOTES = [
        { note:'C4', label:'C', position:0,  ledger:true  }, // C just below staff
        { note:'D4', label:'D', position:1,  ledger:false },
        { note:'E4', label:'E', position:2,  ledger:false },
        { note:'F4', label:'F', position:3,  ledger:false },
        { note:'G4', label:'G', position:4,  ledger:false },
        { note:'A4', label:'A', position:5,  ledger:false },
        { note:'B4', label:'B', position:6,  ledger:false },
        { note:'C5', label:'C', position:7,  ledger:true  }, // C at top of staff
      ];

      const _s = {
        cards:        [],
        currentCard:  0,
        score:        { correct:0, hint:0, wrong:0 },
        hintShown:    false,
        hintTimer:    null,
        midiHandlerId: null,
        onDone:       null,
      };

      // ── Draw a mini treble-clef staff with one note ───────────
      function _drawStaff(noteObj) {
        const W = 280, H = 120;
        const lineGap   = 14; // px between staff lines
        const staffTop  = 20; // top of first staff line
        const staffLeft = 40;
        const staffW    = W - 80;
        const clefX     = staffLeft + 4;

        // Convert position (0=C4 below staff) to Y
        // Staff lines are E4(0), G4(1), B4(2), D5(3), F5(4) from bottom
        // In SVG Y goes down; staff top = E4 position
        // position 2 = E4 = line 0 (bottom visible line) → y = staffTop + 4*lineGap
        function posToY(pos) {
          // pos 0 = C4 (ledger below), pos 2 = E4 (line 1 from bottom)
          // Each half-step up = lineGap/2 up (–y in SVG)
          return staffTop + 4 * lineGap - (pos - 2) * (lineGap / 2);
        }

        const noteY   = posToY(noteObj.position);
        const noteX   = staffLeft + staffW / 2;
        const isLine  = noteObj.position % 2 === 0 ? (noteObj.position >= 2 && noteObj.position <= 10) : false;
        const onLine  = [2,4,6,8,10].includes(noteObj.position);

        // Staff lines
        let staffLines = '';
        for (let i = 0; i < 5; i++) {
          const y = staffTop + i * lineGap;
          staffLines += `<line x1="${staffLeft}" y1="${y}" x2="${staffLeft+staffW}" y2="${y}" stroke="#C8BFE0" stroke-width="1.2"/>`;
        }

        // Ledger lines
        let ledger = '';
        if (noteObj.position <= 0) { // C4 or below
          ledger = `<line x1="${noteX-10}" y1="${noteY}" x2="${noteX+10}" y2="${noteY}" stroke="#C8BFE0" stroke-width="1.5"/>`;
        }
        if (noteObj.position >= 12) { // C5 area
          ledger = `<line x1="${noteX-10}" y1="${noteY}" x2="${noteX+10}" y2="${noteY}" stroke="#C8BFE0" stroke-width="1.5"/>`;
        }

        // Note head (filled oval)
        const noteHead = `<ellipse cx="${noteX}" cy="${noteY}" rx="7" ry="5" fill="#F59E0B" transform="rotate(-15,${noteX},${noteY})"/>`;

        // Stem (up if below middle, down if above)
        const stemUp  = noteObj.position < 6;
        const stemX   = stemUp ? noteX + 6.5 : noteX - 6.5;
        const stemY1  = noteY;
        const stemY2  = stemUp ? noteY - 32 : noteY + 32;
        const stem    = `<line x1="${stemX}" y1="${stemY1}" x2="${stemX}" y2="${stemY2}" stroke="#F59E0B" stroke-width="2"/>`;

        // Treble clef (simplified text approximation)
        const clef = `<text x="${clefX}" y="${staffTop + lineGap * 3.5}" font-size="48" fill="#C8BFE0" opacity="0.6" font-family="serif">𝄞</text>`;

        return `<svg class="fc-staff-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
          ${staffLines}
          ${clef}
          ${ledger}
          ${noteHead}
          ${stem}
        </svg>`;
      }

      // ── Build shuffled deck ──────────────────────────────────
      function _buildDeck(count) {
        const deck = [];
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * CARD_NOTES.length);
          deck.push({ ...CARD_NOTES[idx] });
        }
        return deck;
      }

      // ── Show current card ────────────────────────────────────
      function _showCard() {
        const card      = _s.cards[_s.currentCard];
        const staffCard = document.getElementById('fc-staff-card');
        const hintEl    = document.getElementById('fc-hint');
        const instrEl   = document.getElementById('fc-instruction');

        if (!staffCard) return;

        staffCard.className = 'flashcard-staff-card';
        staffCard.innerHTML = _drawStaff(card);

        if (hintEl)   { hintEl.classList.remove('hint--visible'); hintEl.textContent = ''; }
        if (instrEl)  instrEl.textContent = 'Zagraj tę nutę na pianinie!';

        _s.hintShown = false;
        if (_s.hintTimer) clearTimeout(_s.hintTimer);

        // Auto-hint after 6s
        _s.hintTimer = setTimeout(() => {
          if (_s.hintShown) return;
          _s.hintShown = true;
          if (hintEl) { hintEl.textContent = `Podpowiedź: To ${card.label}!`; hintEl.classList.add('hint--visible'); }
          Melody.speak(`To ${card.label}! 🎵`, 2000);
        }, 6000);

        _updateDots();
      }

      // ── Update progress dots ──────────────────────────────────
      function _updateDots() {
        const dotsEl = document.getElementById('fc-dots');
        if (!dotsEl) return;
        dotsEl.innerHTML = _s.cards.map((_, i) => {
          let cls = 'fc-dot';
          if (i < _s.currentCard) {
            const state = _s.cardResults[i];
            cls += state === 'correct' ? ' fc-dot--correct' : state === 'hint' ? ' fc-dot--hint' : ' fc-dot--wrong';
          } else if (i === _s.currentCard) {
            cls += ' fc-dot--active';
          }
          return `<div class="${cls}"></div>`;
        }).join('');
      }

      // ── Handle MIDI input during flashcard ───────────────────
      function _handleInput({ fullNote }) {
        if (_s.currentCard >= _s.cards.length) return;
        const card = _s.cards[_s.currentCard];
        const played    = fullNote.replace(/b/,'b'); // already normalized by MIDI
        const expected  = card.note; // e.g. "C4"

        AudioEngine.playNoteInstant(played, 90);

        // Match note name only (ignore octave for beginners, allow adjacent octave)
        const playedName = played.replace(/\d/,'');
        const expName    = card.label;

        const correct = playedName === expName;

        if (_s.hintTimer) clearTimeout(_s.hintTimer);

        if (correct) {
          const staffCard = document.getElementById('fc-staff-card');
          if (staffCard) staffCard.classList.add('fc-card--correct');
          _s.cardResults[_s.currentCard] = _s.hintShown ? 'hint' : 'correct';
          if (!_s.hintShown) _s.score.correct++;
          else               _s.score.hint++;
          Melody.reactCorrect();

          _s.currentCard++;
          setTimeout(() => {
            if (_s.currentCard >= _s.cards.length) _showScore();
            else _showCard();
          }, 700);
        } else {
          const staffCard = document.getElementById('fc-staff-card');
          if (staffCard) staffCard.classList.add('fc-card--wrong');
          setTimeout(() => { if (staffCard) staffCard.classList.remove('fc-card--wrong'); }, 400);
          _s.score.wrong++;
          Melody.reactWrong();
        }

        _updateDots();
      }

      // ── Score reveal ─────────────────────────────────────────
      function _showScore() {
        const total = _s.cards.length;
        const notes = (_s.score.correct * 2) + (_s.score.hint * 1);
        GamificationManager.awardNotes(10 + notes, 'flashcard warmup');

        const container = document.getElementById('flashcard-container');
        if (!container) return;

        const pct = Math.round((_s.score.correct / total) * 100);
        container.innerHTML = `
          <div class="flashcard-header">
            <div class="flashcard-title">🎉 Rozgrzewka gotowa!</div>
          </div>
          <div class="flashcard-score">
            <div class="fc-score-big">${_s.score.correct}/${total}</div>
            <div class="fc-score-label">Poprawne za pierwszym razem</div>
            <div class="fc-score-award">+${10 + notes} ♪ Zdobyte nuty!</div>
            <button class="lesson-btn lesson-btn--primary" style="margin-top:8px;" onclick="FlashcardGame.close()">
              Zacznij lekcję! 🎹 →
            </button>
          </div>`;
      }

      // ── Public API ────────────────────────────────────────────
      function show(onDone) {
        _s.cards        = _buildDeck(5);
        _s.currentCard  = 0;
        _s.cardResults  = new Array(5).fill(null);
        _s.score        = { correct:0, hint:0, wrong:0 };
        _s.onDone       = onDone || null;

        // Build overlay
        const overlay = document.createElement('div');
        overlay.id        = 'flashcard-overlay';
        overlay.className = 'flashcard-overlay';
        overlay.innerHTML = `
          <div class="flashcard-container" id="flashcard-container">
            <div class="flashcard-header">
              <div class="flashcard-title">🎹 Rozgrzewka</div>
              <div class="flashcard-counter" id="fc-counter">1 / 5</div>
            </div>
            <div class="flashcard-dots" id="fc-dots"></div>
            <div class="flashcard-staff-card" id="fc-staff-card"></div>
            <div class="flashcard-hint" id="fc-hint"></div>
            <div class="flashcard-instruction" id="fc-instruction">Zagraj tę nutę na pianinie!</div>
            <button class="lesson-btn" onclick="FlashcardGame.skip()">Pomiń →</button>
          </div>`;
        document.body.appendChild(overlay);

        Melody.setState('thinking');
        Melody.speak('Jaka to nuta? 🎵', 3000);

        // Wire MIDI
        const handlerId = Date.now();
        _s.midiHandlerId = handlerId;
        MIDIManager.onNoteOn((payload) => {
          if (_s.midiHandlerId === handlerId) _handleInput(payload);
        });

        _showCard();
      }

      function skip() {
        document.getElementById('flashcard-overlay')?.remove();
        _s.midiHandlerId = null;
        if (_s.onDone) _s.onDone();
      }

      function close() {
        document.getElementById('flashcard-overlay')?.remove();
        _s.midiHandlerId = null;
        if (_s.onDone) _s.onDone();
      }

      return { show, skip, close };
    })();


    /* ────────────────────────────────────────────────────────────
       SESSION MANAGER
       Full 4-phase session: warmup → review → new work → free play
       ──────────────────────────────────────────────────────────── */
    const SessionManager = (() => {

      const _s = {
        userId:    null,
        startTime: null,
        notesEarned: 0,
      };

      function startSession(userId) {
        _s.userId    = userId;
        _s.startTime = Date.now();

        // Phase 1: Flashcard warmup (skip for Sanah/film worlds — Suzuki method)
        // Check both LessonEngine state and UserManager's current song progress
        let currentSong = null;
        try {
          if (typeof LessonEngine !== 'undefined' && LessonEngine._state) {
            currentSong = LessonEngine._state().song;
          }
          // Fallback: look up song by user's currentSong id
          if (!currentSong && typeof UserManager !== 'undefined' && typeof SONGS !== 'undefined') {
            const u = UserManager.getCurrentUser();
            const sid = u && u.progress && u.progress.currentSong;
            if (sid) currentSong = SONGS.find(s => s.id === sid);
          }
        } catch(e) {}
        const skipWarmup = currentSong && currentSong.world >= 14;
        const afterWarmup = () => {
          // Phase 2: Review last passed song (abbreviated)
          _reviewLastSong(() => {
            // Phase 3: New work — lesson for current song
            _startNewWork();
            // Phase 4: Free play timer wired inside lesson end
          });
        };
        if (skipWarmup) { afterWarmup(); }
        else { FlashcardGame.show(afterWarmup); }
      }

      function _reviewLastSong(onDone) {
        // Find the last completed song (if any) and jump to Phase 4 (play along)
        let lastSongId = null;
        try {
          const active = UserManager.getCurrentUser();
          if (active) {
            const stored = JSON.parse(localStorage.getItem(`littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`) || '{}');
            const prog   = stored.progress || {};
            const completed = Object.entries(prog)
              .filter(([,v]) => v.stars >= 1)
              .sort((a,b) => new Date(b[1].completedAt||0) - new Date(a[1].completedAt||0));
            if (completed.length > 0) lastSongId = completed[0][0];
          }
        } catch(e) {}

        if (!lastSongId) { onDone(); return; }

        // Brief "review" notice
        const notice = document.createElement('div');
        notice.style.cssText = `position:fixed;inset:0;z-index:950;display:flex;align-items:center;justify-content:center;background:rgba(10,5,20,0.85);backdrop-filter:blur(6px);`;
        notice.innerHTML = `<div style="background:var(--color-surface);border:2px solid rgba(124,58,237,0.4);border-radius:16px;padding:32px;text-align:center;max-width:340px;display:flex;flex-direction:column;gap:16px;">
          <div style="font-size:36px;">🔄</div>
          <div style="font-family:var(--font-heading);font-size:20px;font-weight:900;color:var(--color-text);">Szybka powtórka!</div>
          <div style="font-family:var(--font-heading);font-size:13px;color:var(--color-text-muted);">Powtórzmy ostatnią piosenkę</div>
          <button class="lesson-btn lesson-btn--primary" onclick="this.closest('[style]').remove(); window._sessionReviewDone();">Zacznij powtórkę →</button>
          <button class="lesson-btn" onclick="this.closest('[style]').remove(); window._sessionReviewDone();">Pomiń powtórkę</button>
        </div>`;
        document.body.appendChild(notice);
        window._sessionReviewDone = onDone;
      }

      function _startNewWork() {
        // Find current (first incomplete) song
        let currentSongId = null;
        try {
          const active = UserManager.getCurrentUser();
          if (active) {
            const stored = JSON.parse(localStorage.getItem(`littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`) || '{}');
            const prog   = stored.progress || {};
            for (const song of SONGS) {
              const p = prog[song.id];
              if (!p || !p.stars || p.stars === 0) { currentSongId = song.id; break; }
            }
          }
        } catch(e) {}

        if (!currentSongId && SONGS.length > 0) currentSongId = SONGS[0].id;
        if (!currentSongId) return;

        if (typeof showScreen === 'function') showScreen('lesson');
        LessonEngine.startLesson(currentSongId);
      }

      function endSession() {
        const duration = Math.round((Date.now() - _s.startTime) / 60000); // minutes

        // Save stats
        try {
          const active = UserManager.getCurrentUser();
          if (active) {
            const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
            const stored = JSON.parse(localStorage.getItem(key) || '{}');
            if (!stored.stats) stored.stats = {};
            stored.stats.totalPracticeMinutes = (stored.stats.totalPracticeMinutes || 0) + duration;
            stored.stats.totalSessionsCompleted = (stored.stats.totalSessionsCompleted || 0) + 1;
            stored.stats.lastPracticeDate = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(stored));
          }
        } catch(e) {}

        _showSessionSummary(duration);
      }

      function _showSessionSummary(durationMin) {
        let totalNotes = 0, totalSessions = 0;
        try {
          const active = UserManager.getCurrentUser();
          if (active) {
            const stored = JSON.parse(localStorage.getItem(`littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`) || '{}');
            totalNotes    = stored.stats?.notes || 0;
            totalSessions = stored.stats?.totalSessionsCompleted || 0;
          }
        } catch(e) {}

        const card = document.createElement('div');
        card.className = 'session-summary-overlay';
        card.innerHTML = `
          <div class="session-summary-card">
            <div style="font-size:48px;">🎵</div>
            <div class="session-summary-title">Świetna sesja!</div>
            <div class="session-summary-stats">
              <div class="session-stat">
                <div class="session-stat-value">${durationMin || 1}</div>
                <div class="session-stat-label">Minuty</div>
              </div>
              <div class="session-stat">
                <div class="session-stat-value">${totalSessions}</div>
                <div class="session-stat-label">Sesje</div>
              </div>
              <div class="session-stat">
                <div class="session-stat-value">${totalNotes}</div>
                <div class="session-stat-label">♪ Nuty</div>
              </div>
              <div class="session-stat">
                <div class="session-stat-value">🔥</div>
                <div class="session-stat-label">Seria</div>
              </div>
            </div>
            <button class="lesson-btn lesson-btn--primary" onclick="this.closest('.session-summary-overlay').remove(); if(typeof showScreen==='function') showScreen('home');">
              Mapa piosenek 🗺️
            </button>
          </div>`;
        document.body.appendChild(card);
        Melody.reactCelebrate();
      }

      return { startSession, endSession };
    })();


    /* ────────────────────────────────────────────────────────────
       PHASE 9 — DOMContentLoaded wiring
       ──────────────────────────────────────────────────────────── */
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
