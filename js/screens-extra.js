


    /* ============================================================
       LITTLE MAESTRO — PHASE 11
       ExportManager · SettingsScreen · FreePlay · Final Wiring
       ============================================================ */

    /* ────────────────────────────────────────────────────────────
       EXPORT MANAGER
       JSON + HTML keepsake export, drag-and-drop import.
       ──────────────────────────────────────────────────────────── */
    const ExportManager = (() => {

      const APP_VERSION = '1.0';

      // ── Load full user data ───────────────────────────────────
      function _userData(name) {
        const key = `littlemaestro_${name.toLowerCase().replace(/\s+/g,'_')}`;
        return JSON.parse(localStorage.getItem(key) || '{}');
      }

      // ── Export JSON file ──────────────────────────────────────
      function exportUser(name) {
        const data = _userData(name);
        const payload = {
          ...data,
          _meta: {
            exportDate:  new Date().toISOString(),
            appVersion:  APP_VERSION,
            exportedBy:  'LittleMaestro',
            studentName: name,
          },
        };
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const date = new Date().toISOString().slice(0,10);
        a.href     = url;
        a.download = `LittleMaestro_${name.replace(/\s+/g,'_')}_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // ── Export HTML keepsake ──────────────────────────────────
      function exportKeepsake(name) {
        const data    = _userData(name);
        const profile = data.profile || {};
        const stats   = data.stats   || {};
        const prog    = data.progress || {};

        const joined   = profile.dateCreated
          ? new Date(profile.dateCreated).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
          : 'recently';
        const minutes  = stats.totalPracticeMinutes || 0;
        const streak   = stats.streak || 0;
        const notes    = stats.notes  || 0;

        // Build completed songs list
        const completedSongs = Object.entries(prog)
          .filter(([,p]) => p.stars > 0)
          .map(([songId, p]) => {
            const song   = (typeof SONGS !== 'undefined' ? SONGS : []).find(s => s.id == songId);
            const stars  = '★'.repeat(p.stars) + '☆'.repeat(3 - p.stars);
            const date   = p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '';
            const title  = song ? song.title : `Song ${songId}`;
            const emoji  = song ? (song.emoji || '🎵') : '🎵';
            return `<tr>
              <td style="padding:8px 12px;font-size:20px;">${emoji}</td>
              <td style="padding:8px 12px;font-weight:700;">${title}</td>
              <td style="padding:8px 12px;color:#F59E0B;letter-spacing:2px;">${stars}</td>
              <td style="padding:8px 12px;color:#9CA3AF;font-size:12px;">${date}</td>
            </tr>`;
          }).join('');

        const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8"/>
  <title>Muzyczna Podróż — ${name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Nunito', sans-serif;
      background: linear-gradient(135deg, #0A0514 0%, #150B30 100%);
      color: #EDE9FE;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(124,58,237,0.3);
      border-radius: 20px;
      padding: 40px;
      max-width: 640px;
      margin: 0 auto;
    }
    h1 { font-size: 32px; font-weight: 900; color: #EDE9FE; margin-bottom: 4px; }
    .subtitle { color: #A78BFA; font-size: 15px; font-weight: 600; margin-bottom: 32px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 32px; }
    .stat { background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; padding: 14px 8px; text-align: center; }
    .stat-val { font-size: 26px; font-weight: 900; }
    .stat-lbl { font-size: 10px; font-weight: 700; color: #A78BFA; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    h2 { font-size: 16px; font-weight: 800; color: #A78BFA; letter-spacing: 0.5px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border-radius: 10px; overflow: hidden; }
    tr { border-bottom: 1px solid rgba(124,58,237,0.15); }
    tr:last-child { border-bottom: none; }
    .footer { text-align: center; margin-top: 32px; color: #6D28D9; font-size: 13px; font-weight: 700; }
    @media print {
      body { background: white; color: #1A1030; }
      .card { border-color: #DDD6FE; background: white; }
      .stat { background: #F5F3FF; border-color: #DDD6FE; }
      table { background: white; }
      tr { border-color: #EDE9FE; }
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${profile.avatar || '🎵'} Muzyczna Podróż — ${name}</h1>
    <div class="subtitle">Pianinkowa Marysi v${APP_VERSION} &nbsp;·&nbsp; Od ${joined}</div>

    <div class="stats-grid">
      <div class="stat"><div class="stat-val">${Object.keys(prog).filter(id => prog[id].stars > 0).length}</div><div class="stat-lbl">Piosenek</div></div>
      <div class="stat"><div class="stat-val">🔥 ${streak}</div><div class="stat-lbl">Seria dni</div></div>
      <div class="stat"><div class="stat-val">${minutes}</div><div class="stat-lbl">Min ćwiczeń</div></div>
      <div class="stat"><div class="stat-val">${notes}</div><div class="stat-lbl">♪ Nuty</div></div>
    </div>

    <h2>Nauczone piosenki</h2>
    ${completedSongs
      ? `<table>${completedSongs}</table>`
      : `<p style="color:#9CA3AF;font-size:13px;">Jeszcze żadna piosenka — podróż dopiero się zaczyna!</p>`}

    <div class="footer">
      Muzyczna Podróż — ${name} ❤️<br/>
      Exported ${new Date().toLocaleDateString()}
    </div>
  </div>

/* === PHASE 12 JS === */
/* ============================================================
   PHASE 12 — EDGE CASES, SOUND POLISH, FINAL WIRING
   ============================================================ */

/* ── SOUND FX MODULE ──────────────────────────────────────── */
const SoundFX = (() => {
  let _muted = false;

  function _ctx() {
    return AudioEngine && AudioEngine.context ? AudioEngine.context :
           (window._sfxCtx = window._sfxCtx || new (window.AudioContext || window.webkitAudioContext)());
  }

  function _gain(ctx, vol) {
    const g = ctx.createGain();
    const master = _muted ? 0 : (
      (() => {
        try {
          const u = UserManager.getCurrentUser();
          return u && u.settings && u.settings.volume != null ? u.settings.volume / 100 : 0.55;
        } catch(e) { return 0.55; }
      })()
    );
    g.gain.value = vol * master;
    g.connect(ctx.destination);
    return g;
  }

  function _tone(freq, type, startTime, dur, ctx, gainNode, peakVol) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(peakVol, startTime + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(env);
    env.connect(gainNode);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.05);
  }

  /* Ascending 4-note arpeggio — level up */
  function levelUp() {
    if (_muted) return;
    try {
      const ctx = _ctx();
      const g = _gain(ctx, 0.38);
      const t = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      notes.forEach((f, i) => _tone(f, 'triangle', t + i * 0.13, 0.35, ctx, g, 0.5));
    } catch(e) {}
  }

  /* Single high bell chime — correct answer */
  function chime() {
    if (_muted) return;
    try {
      const ctx = _ctx();
      const g = _gain(ctx, 0.32);
      const t = ctx.currentTime;
      _tone(1318.5, 'sine', t, 0.45, ctx, g, 0.6);       // E6 bell
      _tone(2637.0, 'sine', t + 0.01, 0.25, ctx, g, 0.2); // overtone
    } catch(e) {}
  }

  /* 3-note progression — session complete fanfare */
  function fanfare() {
    if (_muted) return;
    try {
      const ctx = _ctx();
      const g = _gain(ctx, 0.42);
      const t = ctx.currentTime;
      _tone(523.25,  'triangle', t,        0.28, ctx, g, 0.55); // C5
      _tone(659.25,  'triangle', t + 0.20, 0.28, ctx, g, 0.55); // E5
      _tone(1046.50, 'triangle', t + 0.40, 0.60, ctx, g, 0.65); // C6
      // harmony chord on final note
      _tone(783.99,  'sine',     t + 0.40, 0.55, ctx, g, 0.25); // G5
    } catch(e) {}
  }

  /* Soft tick for rhythm game */
  function tick() {
    if (_muted) return;
    try {
      const ctx = _ctx();
      const g = _gain(ctx, 0.2);
      const t = ctx.currentTime;
      _tone(880, 'square', t, 0.05, ctx, g, 0.3);
    } catch(e) {}
  }

  function mute(val) {
    _muted = (val === undefined) ? !_muted : !!val;
    return _muted;
  }
  function isMuted() { return _muted; }

  return { levelUp, chime, fanfare, tick, mute, isMuted };
})();

/* ── EDGE CASE HANDLERS ───────────────────────────────────── */
const EdgeCases = (() => {

  /* Audio init banner — shows if AudioContext is suspended */
  function _checkAudioInit() {
    const banner = document.getElementById('audio-init-banner');
    if (!banner) return;
    function dismiss() {
      banner.classList.remove('visible');
      document.removeEventListener('pointerdown', dismiss, true);
    }
    function show() {
      const ctx = window.AudioContext || window.webkitAudioContext;
      if (!ctx) return;
      // Watch for suspended context
      const check = () => {
        try {
          if (AudioEngine && AudioEngine.context && AudioEngine.context.state === 'suspended') {
            banner.classList.add('visible');
            document.addEventListener('pointerdown', () => {
              AudioEngine.context.resume().then(() => banner.classList.remove('visible'));
            }, { once: true, capture: true });
          }
        } catch(e) {}
      };
      setTimeout(check, 1200);
    }
    show();
  }

  /* Resume lesson prompt — if mid-lesson session was interrupted */
  function _checkResumeLessson() {
    const banner = document.getElementById('resume-lesson-banner');
    if (!banner) return;
    try {
      const savedScreen = sessionStorage.getItem('lm_current_screen');
      const savedSong   = sessionStorage.getItem('lm_resume_song');
      if (savedScreen === 'screen-lesson' && savedSong) {
        const songId = parseInt(savedSong, 10);
        const SONGS = window.SONGS || [];
        const song = SONGS.find(s => s.id === songId);
        if (song) {
          banner.querySelector('.resume-title').textContent =
            `Resume "${song.title}"?`;
          banner.classList.add('visible');
          banner.querySelector('.resume-yes').onclick = () => {
            banner.classList.remove('visible');
            if (window.LessonEngine) LessonEngine.startLesson(songId);
          };
          banner.querySelector('.resume-no').onclick = () => {
            banner.classList.remove('visible');
            sessionStorage.removeItem('lm_resume_song');
          };
        }
      }
    } catch(e) {}
  }

  /* localStorage quota check — fires before save operations */
  function checkStorageQuota(onFull) {
    try {
      const test = '_lm_quota_test';
      const data = 'x'.repeat(1024); // 1KB probe
      localStorage.setItem(test, data);
      localStorage.removeItem(test);
      return false; // not full
    } catch(e) {
      _showStorageWarning(onFull);
      return true; // full
    }
  }

  function _showStorageWarning(onExport) {
    let toast = document.getElementById('storage-warning-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'storage-warning-toast';
      toast.innerHTML = `
        <div class="toast-title">⚠️ Pamięć prawie pełna</div>
        <div>Pamięć przeglądarki jest prawie pełna. Wyeksportuj dane żeby ich nie stracić.</div>
        <button class="toast-btn" onclick="this.closest('#storage-warning-toast').classList.remove('visible')">Eksportuj</button>`;
      document.body.appendChild(toast);
      toast.querySelector('.toast-btn').onclick = () => {
        toast.classList.remove('visible');
        if (onExport) onExport();
        else if (window.ExportManager) {
          const u = UserManager.getCurrentUser();
          if (u) ExportManager.exportUser(u.profile.name);
        }
      };
    }
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => toast.classList.remove('visible'), 9000);
  }

  /* Import file corrupted — friendly error */
  function showImportError(message) {
    let toast = document.getElementById('import-error-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'import-error-toast';
      toast.innerHTML = '<div class="toast-title">📂 Problem z importem</div><div class="toast-body"></div>';
      document.body.appendChild(toast);
    }
    toast.querySelector('.toast-body').textContent = message || 'Ten plik nie wygląda na profil z Piankowej. Spróbuj inny plik.';
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => toast.classList.remove('visible'), 6000);
  }

  /* 6 profiles full — overlay */
  function showProfilesFull() {
    alert('🎹 Wszystkie 6 miejsc jest zajętych!\n\nPoproś rodzica o usunięcie starego profilu, żeby dodać nowy.');
  }

  /* Song with no notes — skip gracefully */
  function validateSong(song) {
    if (!song) return false;
    if (!song.notes || song.notes.length === 0) {
      console.warn(`[LittleMaestro] Song id=${song.id} "${song.title}" has no note data — skipping.`);
      return false;
    }
    return true;
  }

  /* Empty state helper — inject friendly Melody message */
  function showEmptyState(containerId, title, body) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-mascot">🎵</div>
        <div class="empty-title">${title}</div>
        <div class="empty-body">${body}</div>
      </div>`;
  }

  /* SFX mute toggle wiring */
  function _wireSFXMute() {
    document.querySelectorAll('.sfx-mute-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const muted = SoundFX.mute();
        btn.classList.toggle('muted', muted);
        btn.title = muted ? 'Unmute sounds' : 'Mute sounds';
        btn.textContent = muted ? '🔇' : '🔊';
        // persist
        try {
          const u = UserManager.getCurrentUser();
          if (u) { u.settings.sfxMuted = muted; UserManager.saveUser(); }
        } catch(e) {}
      });
    });
  }

  function init() {
    _checkAudioInit();
    setTimeout(_checkResumeLessson, 800);
    _wireSFXMute();

    // Track mid-lesson song for resume
    const _origShowScreen = window.showScreen;
    window.showScreen = function(screenId) {
      if (screenId === 'lesson') {
        try {
          const state = LessonEngine && LessonEngine._state && LessonEngine._state();
          if (state && state.songId) sessionStorage.setItem('lm_resume_song', state.songId);
        } catch(e) {}
      } else {
        sessionStorage.removeItem('lm_resume_song');
      }
      return _origShowScreen(screenId);
    };
  }

  return { init, checkStorageQuota, showImportError, showProfilesFull, validateSong, showEmptyState };
})();

/* ── HOOK SOUND FX INTO EXISTING MODULES ──────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Patch GamificationManager to play sounds
  if (window.GamificationManager) {
    const _origShowCelebration = GamificationManager.showCelebration.bind(GamificationManager);
    GamificationManager.showCelebration = function(type, data) {
      if (type === 'songPass' && data && data.stars === 3) SoundFX.fanfare();
      else if (type === 'worldComplete')   SoundFX.fanfare();
      else if (type === 'streakMilestone') SoundFX.levelUp();
      else if (type === 'threeStars')      SoundFX.fanfare();
      return _origShowCelebration(type, data);
    };

    const _origAwardNotes = GamificationManager.awardNotes.bind(GamificationManager);
    GamificationManager.awardNotes = function(amount, reason) {
      if (amount >= 25) SoundFX.levelUp();
      return _origAwardNotes(amount, reason);
    };
  }

  // Patch LessonEngine for correct-note chime
  if (window.LessonEngine && LessonEngine._onCorrect === undefined) {
    // Hook via global event
    document.addEventListener('lm:note-correct', () => SoundFX.chime());
  }

  // Patch SessionManager for session complete fanfare
  if (window.SessionManager) {
    const _origEndSession = SessionManager.endSession.bind(SessionManager);
    SessionManager.endSession = function() {
      SoundFX.fanfare();
      return _origEndSession();
    };
  }

  // Patch MiniLessons completion
  if (window.MiniLessons) {
    const _origRender = MiniLessons.render.bind(MiniLessons);
    // listen for precurriculum complete event
    document.addEventListener('lm:precurr-complete', () => SoundFX.fanfare());
  }

  // Wire SFX mute buttons (from settings screen)
  document.addEventListener('lm:settings-rendered', () => {
    if (window.EdgeCases) EdgeCases._wireSFXMute && EdgeCases._wireSFXMute();
  });

  // Expose helpers globally for other modules
  window.SoundFX = SoundFX;
  window.EdgeCases = EdgeCases;

  // Init edge cases
  EdgeCases.init();

  // Add skip-to-main accessibility link
  if (!document.querySelector('.skip-to-main')) {
    const skip = document.createElement('a');
    skip.className = 'skip-to-main';
    skip.href = '#app-root';
    skip.textContent = 'Przejdź do treści';
    document.body.insertBefore(skip, document.body.firstChild);
  }

  // Add audio init banner to DOM if not present
  if (!document.getElementById('audio-init-banner')) {
    const banner = document.createElement('div');
    banner.id = 'audio-init-banner';
    banner.innerHTML = `<span class="audio-banner-icon">🔊</span> Kliknij gdziekolwiek żeby włączyć dźwięk`;
    document.body.appendChild(banner);
    document.addEventListener('pointerdown', () => {
      banner.classList.remove('visible');
    }, { once: true, capture: true });
    // Check if we need to show it after a moment
    setTimeout(() => {
      try {
        if (AudioEngine && AudioEngine.context && AudioEngine.context.state === 'suspended') {
          banner.classList.add('visible');
        } else if (!AudioEngine || !AudioEngine.context) {
          // No audio context created yet — show banner proactively on first load
          banner.classList.add('visible');
          setTimeout(() => banner.classList.remove('visible'), 4000);
        }
      } catch(e) {
        banner.classList.add('visible');
        setTimeout(() => banner.classList.remove('visible'), 4000);
      }
    }, 1500);
  }

  // Add resume lesson banner to DOM
  if (!document.getElementById('resume-lesson-banner')) {
    const rb = document.createElement('div');
    rb.id = 'resume-lesson-banner';
    rb.innerHTML = `
      <div class="resume-title">Kontynuować piosenkę?</div>
      <div class="resume-sub" style="font-size:13px;color:var(--color-text-muted)">Byłaś w trakcie lekcji.</div>
      <div class="resume-actions">
        <button class="resume-yes">▶ Kontynuuj</button>
        <button class="resume-no">Zacznij od nowa</button>
      </div>`;
    document.body.appendChild(rb);
  }

  // Intercept UserManager.createUser to catch 6-profile limit
  if (window.UserManager && UserManager.createUser) {
    const _origCreate = UserManager.createUser.bind(UserManager);
    UserManager.createUser = function(name, avatar, color) {
      try {
        return _origCreate(name, avatar, color);
      } catch(e) {
        if (e.message && (e.message.includes('limit') || e.message.includes('Maksymalnie'))) {
          EdgeCases.showProfilesFull();
        }
        throw e;
      }
    };
  }

  // Intercept ExportManager.importUser to show friendly errors
  if (window.ExportManager && ExportManager.importUser) {
    const _origImport = ExportManager.importUser.bind(ExportManager);
    ExportManager.importUser = function(file) {
      return _origImport(file).catch(err => {
        EdgeCases.showImportError(err && err.message ? err.message : null);
        throw err;
      });
    };
  }

  // Trophy room empty state
  const _origRenderTrophyRoom = window.renderTrophyRoom;
  if (_origRenderTrophyRoom) {
    window.renderTrophyRoom = function() {
      _origRenderTrophyRoom();
      const grid = document.getElementById('trophy-grid-container');
      if (grid && grid.children.length === 0) {
        EdgeCases.showEmptyState('trophy-grid-container',
          'Brak trofeów!',
          'Finish your first song to earn a trophy. Melody believes in you! 🎵');
      }
    };
  }

  // Quest map empty state guard
  document.addEventListener('lm:questmap-empty', () => {
    EdgeCases.showEmptyState('questmap-path-container',
      'No songs available',
      'Complete the Mini-Lessons first to unlock your first song!');
  });

  console.log('[LittleMaestro] Phase 12 — Final polish loaded. SoundFX & EdgeCases active.');
});


