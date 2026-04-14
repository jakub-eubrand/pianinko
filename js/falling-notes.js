  /* ============================================================
     LITTLE MAESTRO — FALLING NOTES HIGHWAY
     Guitar Hero–style note highway for Phase 4 play-along.
     Notes fall from the top of the highway down to the hit zone,
     aligned with the corresponding piano keys below.
     ============================================================ */
  const FallingNotes = (() => {

    // ── Layout mirrors PianoKeyboard constants ──────────────────
    const NUM_WHITE  = 15;
    const WHITE_NOTES = ['C3','D3','E3','F3','G3','A3','B3',
                         'C4','D4','E4','F4','G4','A4','B4','C5'];
    const BLACK_KEYS  = [
      {note:'C#3',offset:0.65},{note:'D#3',offset:1.65},
      {note:'F#3',offset:3.65},{note:'G#3',offset:4.65},{note:'A#3',offset:5.65},
      {note:'C#4',offset:7.65},{note:'D#4',offset:8.65},
      {note:'F#4',offset:10.65},{note:'G#4',offset:11.65},{note:'A#4',offset:12.65},
    ];
    const ENHARMONIC = {Db:'C#',Eb:'D#',Fb:'E',Gb:'F#',Ab:'G#',Bb:'A#',Cb:'B'};
    const NOTE_COLORS = {
      C:'#FF6B6B', D:'#FF9F43', E:'#FECA57',
      F:'#48dbfb', G:'#1dd1a1', A:'#a29bfe', B:'#fd79a8',
      'C#':'#ff7675','D#':'#fdcb6e','F#':'#6ab04c','G#':'#e056fd','A#':'#686de0',
    };

    // ── Timing ───────────────────────────────────────────────────
    const FALL_DURATION  = 1600;  // ms for a note to travel from top to hit zone
    const HIGHWAY_HEIGHT = 180;   // px
    const HIT_ZONE_H     = 32;    // px — glowing band at bottom
    const NOTE_H         = 26;    // px — height of each note tile
    const HIT_TOLERANCE  = 280;   // ms window around hit time to count as hit
    const DURATION_BEATS = {whole:4, half:2, quarter:1, eighth:0.5,
                             dotted_quarter:1.5, dotted_half:3};

    // ── State ─────────────────────────────────────────────────────
    let _canvas = null, _ctx = null, _active = false, _raf = null;
    let _schedule = [];    // [{note, hitTime, durMs, state:'falling'|'hit'|'miss'}]
    let _startedAt = 0;    // performance.now() at which song time 0 = hit zone arrival
    let _particles = [];
    let _score = 0, _streak = 0, _bestStreak = 0, _hits = 0, _misses = 0;
    let _onComplete = null;
    let _songEnded  = false;

    // ── Helpers ───────────────────────────────────────────────────
    function _norm(n) {
      const m = n.match(/^([A-G][b#]?)(\d)$/i);
      if (!m) return n;
      const [,name,oct] = m;
      const up = name[0].toUpperCase() + name.slice(1).toLowerCase();
      return (ENHARMONIC[up] || up) + oct;
    }

    function _xFrac(noteName) {
      const n = _norm(noteName);
      const wi = WHITE_NOTES.indexOf(n);
      if (wi >= 0) return (wi + 0.5) / NUM_WHITE;
      const bk = BLACK_KEYS.find(k => k.note === n);
      if (bk) return (bk.offset + 0.285) / NUM_WHITE;
      return 0.5;
    }

    function _noteWidth(noteName, cw) {
      const isBlack = _norm(noteName).includes('#');
      const ww = cw / NUM_WHITE;
      return isBlack ? ww * 0.50 : ww * 0.82;
    }

    function _roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, w/2, h/2);
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
      ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
      ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
      ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
      ctx.closePath();
    }

    // ── Build schedule from SONGS notes array + bpm ───────────────
    function buildSchedule(notes, bpm) {
      const beatMs = 60000 / bpm;
      const usesAbsTime = notes.length > 0 && notes[0].t !== undefined;
      if (usesAbsTime) {
        // Absolute beat positions: hitTime = t * beatMs
        return notes.map(n => {
          const beats  = DURATION_BEATS[n.duration] || 1;
          const durMs  = beats * beatMs;
          return { note: n.note, hitTime: n.t * beatMs, durMs, state: 'falling' };
        });
      }
      // Sequential fallback
      let t = 0;
      return notes.map(n => {
        const beats  = DURATION_BEATS[n.duration] || 1;
        const durMs  = beats * beatMs;
        const item   = { note: n.note, hitTime: t, durMs, state: 'falling' };
        t += durMs;
        return item;
      });
    }

    // ── Init: create canvas inside highway div ────────────────────
    function init() {
      const container = document.getElementById('falling-notes-highway');
      if (!container) return;
      // Remove old canvas if any
      const old = container.querySelector('.fn-canvas');
      if (old) old.remove();
      _canvas = document.createElement('canvas');
      _canvas.className = 'fn-canvas';
      container.insertBefore(_canvas, container.firstChild);
      _ctx = _canvas.getContext('2d');
      _resize();
    }

    function _resize() {
      if (!_canvas) return;
      const hw = document.getElementById('falling-notes-highway');
      if (!hw) return;
      _canvas.width  = hw.offsetWidth  || 400;
      _canvas.height = hw.offsetHeight || HIGHWAY_HEIGHT;
    }

    // ── Start: schedule ready, audio will begin after FALL_DURATION ─
    function start(schedule, onCompleteCb) {
      if (!_canvas) init();
      _resize();
      _schedule    = schedule.map(n => ({...n, state:'falling'}));
      _score       = 0;
      _streak      = 0;
      _bestStreak  = 0;
      _hits        = 0;
      _misses      = 0;
      _particles   = [];
      _active      = true;
      _songEnded   = false;
      _onComplete  = onCompleteCb || null;
      // t=0 of song corresponds to _startedAt + FALL_DURATION
      _startedAt   = performance.now();
      _updateScoreUI();
      _animate();
    }

    function stop() {
      _active = false;
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    }

    function markSongEnded() { _songEnded = true; }

    // ── Animation loop ────────────────────────────────────────────
    function _animate() {
      if (!_active) return;
      _raf = requestAnimationFrame(_animate);
      _tick();
    }

    function _tick() {
      const cw  = _canvas.width;
      const ch  = _canvas.height || HIGHWAY_HEIGHT;
      // songTime: negative while lead-in, 0 = song starts, positive = into song
      const songTime = (performance.now() - _startedAt) - FALL_DURATION;

      // Auto-miss notes that are too far past hit time
      _schedule.forEach(n => {
        if (n.state !== 'falling') return;
        if (songTime - n.hitTime > HIT_TOLERANCE + 80) _registerMiss(n);
      });

      // Check if all notes resolved and song ended
      if (_songEnded) {
        const allDone = _schedule.every(n => n.state !== 'falling');
        if (allDone) {
          _active = false;
          setTimeout(() => _showStarScreen(), 400);
          return;
        }
      }

      // ── Clear ──
      _ctx.clearRect(0, 0, cw, ch);

      // ── Background ──
      _ctx.fillStyle = '#080612';
      _ctx.fillRect(0, 0, cw, ch);

      // ── Lane dividers ──
      _ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      _ctx.lineWidth = 1;
      for (let i = 1; i < NUM_WHITE; i++) {
        const lx = (i / NUM_WHITE) * cw;
        _ctx.beginPath(); _ctx.moveTo(lx, 0); _ctx.lineTo(lx, ch); _ctx.stroke();
      }

      // ── Hit zone ──
      const hitY = ch - HIT_ZONE_H;
      const grad = _ctx.createLinearGradient(0, hitY, 0, ch);
      grad.addColorStop(0, 'rgba(139,92,246,0.30)');
      grad.addColorStop(1, 'rgba(139,92,246,0.05)');
      _ctx.fillStyle = grad;
      _ctx.fillRect(0, hitY, cw, HIT_ZONE_H);
      _ctx.strokeStyle = 'rgba(139,92,246,0.75)';
      _ctx.lineWidth = 2;
      _ctx.beginPath(); _ctx.moveTo(0, hitY); _ctx.lineTo(cw, hitY); _ctx.stroke();

      // ── Falling notes ──
      _schedule.forEach(n => {
        if (n.state === 'hit') return;  // don't draw hit notes
        const progress = (songTime - n.hitTime + FALL_DURATION) / FALL_DURATION;
        if (progress < -0.1 || progress > 1.35) return;

        const y   = progress * (ch - HIT_ZONE_H) - NOTE_H;
        const xf  = _xFrac(n.note);
        const w   = _noteWidth(n.note, cw);
        const x   = xf * cw - w / 2;
        const _letter = _norm(n.note).replace(/\d/, '');
        const letter  = typeof noteDisplayPL === 'function' ? noteDisplayPL(n.note) : _letter;
        const color   = NOTE_COLORS[_letter] || '#8B5CF6';

        const nearHit = Math.max(0, 1 - Math.abs(songTime - n.hitTime) / 400);

        // Glow
        if (nearHit > 0.1) {
          _ctx.shadowColor = color;
          _ctx.shadowBlur  = 18 * nearHit;
        } else {
          _ctx.shadowBlur = 0;
        }

        // Note tile
        if (n.state === 'miss') {
          _ctx.fillStyle = 'rgba(180,180,180,0.25)';
        } else {
          _ctx.fillStyle = color;
        }
        _roundRect(_ctx, x, y, w, NOTE_H, 5);
        _ctx.fill();
        _ctx.shadowBlur = 0;

        // Letter label
        if (n.state !== 'miss') {
          _ctx.fillStyle = 'rgba(0,0,0,0.75)';
          const fs = Math.max(9, Math.min(13, w * 0.45));
          _ctx.font = `bold ${fs}px Nunito, sans-serif`;
          _ctx.textAlign = 'center';
          _ctx.textBaseline = 'middle';
          _ctx.fillText(letter, x + w/2, y + NOTE_H/2);
        }
      });

      // ── Particles ──
      _drawParticles();
    }

    function _drawParticles() {
      const now = performance.now();
      _particles = _particles.filter(p => p.end > now);
      _particles.forEach(p => {
        const elapsed = now - p.born;
        const life    = p.end - p.born;
        const t       = elapsed / life;
        _ctx.globalAlpha = 1 - t;
        _ctx.fillStyle   = p.color;
        _ctx.beginPath();
        _ctx.arc(
          p.x + p.vx * elapsed * 0.06,
          p.y + p.vy * elapsed * 0.06 + 40 * t * t,
          p.r * (1 - t * 0.4), 0, Math.PI*2
        );
        _ctx.fill();
        _ctx.globalAlpha = 1;
      });
    }

    function _spawnParticles(x, y, color, count) {
      const now = performance.now();
      for (let i = 0; i < count; i++) {
        _particles.push({
          x, y, color,
          vx: (Math.random() - 0.5) * 4,
          vy: -(Math.random() * 3 + 1),
          r:  Math.random() * 4 + 2,
          born: now,
          end:  now + 350 + Math.random() * 300,
        });
      }
    }

    // ── Hit / Miss logic ──────────────────────────────────────────
    function onNoteInput(playedNote) {
      if (!_active) return false;
      const canonical = _norm(playedNote);
      const songTime  = (performance.now() - _startedAt) - FALL_DURATION;

      // Find nearest unplayed matching note within tolerance
      let best = null, bestDist = Infinity;
      _schedule.forEach(n => {
        if (n.state !== 'falling') return;
        if (_norm(n.note) !== canonical) return;
        const dist = Math.abs(songTime - n.hitTime);
        if (dist < HIT_TOLERANCE && dist < bestDist) { bestDist = dist; best = n; }
      });

      if (best) {
        _registerHit(best, bestDist);
        return true;
      } else {
        // Wrong note — flash it
        if (typeof PianoKeyboard !== 'undefined') PianoKeyboard.flashWrong(canonical);
        _streak = 0;
        _updateScoreUI();
        return false;
      }
    }

    function _registerHit(note, dist) {
      note.state = 'hit';
      _hits++;
      _streak++;
      if (_streak > _bestStreak) _bestStreak = _streak;

      const perfect  = dist < 100;
      const multi    = Math.max(1, Math.floor(_streak / 5));
      _score += (perfect ? 100 : 50) * multi;

      // Sparkles at hit zone aligned to note
      const cw   = _canvas?.width || 400;
      const xf   = _xFrac(note.note);
      const letter = _norm(note.note).replace(/\d/, '');
      const color  = NOTE_COLORS[letter] || '#8B5CF6';
      const ch2 = _canvas?.height || HIGHWAY_HEIGHT;
      _spawnParticles(xf * cw, ch2 - HIT_ZONE_H, color, perfect ? 18 : 9);

      if (typeof PianoKeyboard !== 'undefined') PianoKeyboard.flashCorrect(_norm(note.note));

      if (_streak === 5)  _streakToast('🔥 On Fire!',   '#FF9F43');
      if (_streak === 10) _streakToast('⚡ Electric!',   '#FECA57');
      if (_streak === 20) _streakToast('🌟 Incredible!', '#fff');

      _updateScoreUI();
    }

    function _registerMiss(note) {
      note.state = 'miss';
      _misses++;
      _streak = 0;
      // Gently show which key was missed
      if (typeof PianoKeyboard !== 'undefined') PianoKeyboard.highlightNext(_norm(note.note));
      _updateScoreUI();
    }

    function _streakToast(msg, color) {
      const hw = document.getElementById('falling-notes-highway');
      if (!hw) return;
      const el = document.createElement('div');
      el.className   = 'fn-streak-toast';
      el.textContent = msg;
      el.style.color = color;
      hw.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }

    function _updateScoreUI() {
      const sc = document.getElementById('fn-score-display');
      if (sc) sc.textContent = `Punkty: ${_score}`;
      const st = document.getElementById('fn-streak-display');
      if (st) {
        if (_streak >= 2) {
          st.textContent = `🔥 x${_streak}`;
          st.style.color = _streak >= 10 ? '#FECA57' : _streak >= 5 ? '#FF9F43' : '#ccc';
        } else { st.textContent = ''; }
      }
    }

    // ── Star screen ───────────────────────────────────────────────
    function _showStarScreen() {
      const hw      = document.getElementById('falling-notes-highway');
      const section = document.getElementById('screen-lesson');
      if (!hw) return;

      // Expand highway to cover full lesson section so nothing clips
      if (section) hw.style.height = section.offsetHeight + 'px';

      const total  = _hits + _misses;
      const acc    = total > 0 ? _hits / total : 0;
      // Beginner-friendly thresholds for Sanah/film worlds (14+): 80/55/any
      // Standard thresholds for primer/classical: 90/70/any
      const song   = (typeof LessonEngine !== 'undefined' && LessonEngine._state)
        ? LessonEngine._state().song : null;
      const beginnerFriendly = song && song.world >= 14;
      const stars  = beginnerFriendly
        ? (acc >= 0.80 ? 3 : acc >= 0.55 ? 2 : 1)
        : (acc >= 0.90 ? 3 : acc >= 0.70 ? 2 : 1);
      const pct    = Math.round(acc * 100);

      const titles = ['Dobry początek! 🌱', 'Nieźle! 👍', 'ŚWIETNIE! 🌟'];
      const title  = titles[stars - 1];

      const starHtml = [1,2,3].map(i =>
        `<span class="${i <= stars ? '' : 'fn-star-empty'}">⭐</span>`
      ).join('');

      const screen = document.createElement('div');
      screen.className = 'fn-star-screen';
      screen.id        = 'fn-star-screen';
      screen.innerHTML = `
        <div class="fn-star-title">${title}</div>
        <div class="fn-star-row">${starHtml}</div>
        <div class="fn-star-score">Punkty: ${_score} &nbsp;|&nbsp; Najlepsza seria: ${_bestStreak}</div>
        <div class="fn-star-accuracy">${pct}% celność</div>
        <div class="fn-star-buttons">
          <button class="fn-star-btn fn-star-btn--again" onclick="LessonEngine._showPlayAgainModal()">↺ Zagraj ponownie</button>
          <button class="fn-star-btn fn-star-btn--continue" onclick="LessonEngine._callParent()">Dalej →</button>
        </div>`;
      hw.appendChild(screen);

      if (_onComplete) _onComplete({ stars, score: _score, accuracy: acc, bestStreak: _bestStreak });
    }

    function hideStarScreen() {
      document.getElementById('fn-star-screen')?.remove();
    }

    function show() {
      const hw      = document.getElementById('falling-notes-highway');
      const section = document.getElementById('screen-lesson');
      const kbPanel = document.getElementById('lesson-panel-keyboard');
      if (!hw || !section || !kbPanel) return;

      // Measure positions relative to the section
      const secRect = section.getBoundingClientRect();
      const kbRect  = kbPanel.getBoundingClientRect();

      // Highway spans full width, from section top down to just above keyboard panel
      const highwayH = Math.max(180, kbRect.top - secRect.top - 8);
      hw.style.left   = '0';
      hw.style.right  = '0';
      hw.style.top    = '0';
      hw.style.height = highwayH + 'px';

      hw.classList.remove('fn-highway--hidden');
      _resize();
    }
    function hide() {
      const hw = document.getElementById('falling-notes-highway');
      if (hw) hw.classList.add('fn-highway--hidden');
      stop();
    }

    function getResults() {
      const total = _hits + _misses;
      const acc   = total > 0 ? _hits / total : 0;
      return { score: _score, hits: _hits, misses: _misses, accuracy: acc, bestStreak: _bestStreak,
               stars: acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1 };
    }

    return { init, start, stop, show, hide, markSongEnded, hideStarScreen,
             onNoteInput, buildSchedule, getResults };
  })();
