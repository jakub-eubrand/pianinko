

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
    <div class="subtitle">Pianinkowy Świat Marysi v${APP_VERSION} &nbsp;·&nbsp; Od ${joined}</div>

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
          'Ukończ pierwszą piosenkę żeby zdobyć trofeum. Melodia w Ciebie wierzy! 🎵');
      }
    };
  }

  // Quest map empty state guard
  document.addEventListener('lm:questmap-empty', () => {
    EdgeCases.showEmptyState('questmap-path-container',
      'Brak piosenek',
      'Najpierw ukończ mini-lekcje żeby odblokować pierwszą piosenkę!');
  });

  console.log('[LittleMaestro] Phase 12 — Final polish loaded. SoundFX & EdgeCases active.');
});

</script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const date = new Date().toISOString().slice(0,10);
        a.href     = url;
        a.download = `LittleMaestro_${name.replace(/\s+/g,'_')}_Keepsake_${date}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // ── Import JSON user ──────────────────────────────────────
      function importUser(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = JSON.parse(e.target.result);

              // Validate required fields
              if (!data.profile || !data.profile.name) {
                throw new Error('Nieprawidłowy plik — brak profilu ucznia.');
              }

              const name    = data.profile.name;
              const key     = `littlemaestro_${name.toLowerCase().replace(/\s+/g,'_')}`;
              const index   = JSON.parse(localStorage.getItem('littlemaestro__index') || '[]');
              const exists  = index.includes(name.toLowerCase().replace(/\s+/g,'_'));

              const _doImport = (keepName) => {
                const finalName = keepName || name;
                const finalKey  = `littlemaestro_${finalName.toLowerCase().replace(/\s+/g,'_')}`;
                if (!index.includes(finalName.toLowerCase().replace(/\s+/g,'_'))) {
                  index.push(finalName.toLowerCase().replace(/\s+/g,'_'));
                  localStorage.setItem('littlemaestro__index', JSON.stringify(index));
                }
                localStorage.setItem(finalKey, JSON.stringify(data));
                resolve(finalName);
              };

              if (exists) {
                // Ask: replace or keep both
                const choice = confirm(`Uczeń o imieniu "${name}" już istnieje.\n\nOK = Zastąp istniejące dane\nAnuluj = Importuj jako kopię`);
                if (choice) {
                  _doImport(name);
                } else {
                  _doImport(`${name} (imported)`);
                }
              } else {
                _doImport(name);
              }
            } catch(err) {
              reject(err);
            }
          };
          reader.readAsText(file);
        });
      }

      // ── Wire drag-and-drop on login screen ────────────────────
      function wireLoginImport() {
        const zone = document.getElementById('login-import-zone');
        if (!zone) return;

        // Click to open file picker
        zone.addEventListener('click', () => {
          const input = document.createElement('input');
          input.type   = 'file';
          input.accept = '.json';
          input.onchange = (e) => _handleImportFile(e.target.files[0]);
          input.click();
        });

        // Drag events
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('zone--hover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('zone--hover'));
        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('zone--hover');
          const file = e.dataTransfer.files[0];
          if (file) _handleImportFile(file);
        });
      }

      function _handleImportFile(file) {
        if (!file) return;
        importUser(file).then((importedName) => {
          Melody.setState('excited');
          Melody.speak(`Witaj ponownie, ${importedName}! 🎵`, 3000);
          // Refresh login screen
          if (typeof UserManager !== 'undefined' && UserManager.renderLoginScreen) {
            UserManager.renderLoginScreen();
          } else if (typeof renderLoginScreen !== 'undefined') {
            renderLoginScreen();
          }
        }).catch((err) => {
          Melody.setState('wrong');
          Melody.speak(`Oops! ${err.message}`, 3000);
          setTimeout(() => Melody.setState('idle'), 3500);
        });
      }

      return { exportUser, exportKeepsake, importUser, wireLoginImport };
    })();


    /* ────────────────────────────────────────────────────────────
       SETTINGS SCREEN
       Student-accessible (no PIN). Volume, tempo, toggles, theme.
       ──────────────────────────────────────────────────────────── */
    const SettingsScreen = (() => {

      // ── Load/save helpers ─────────────────────────────────────
      function _getSettings() {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return {};
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const data   = JSON.parse(localStorage.getItem(key) || '{}');
          return data.settings || {};
        } catch(e) { return {}; }
      }

      function _saveSetting(key, value) {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return;
          const stKey  = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const data   = JSON.parse(localStorage.getItem(stKey) || '{}');
          if (!data.settings) data.settings = {};
          data.settings[key] = value;
          localStorage.setItem(stKey, JSON.stringify(data));
        } catch(e) {}
      }

      // ── Build and inject settings HTML ────────────────────────
      function render() {
        const container = document.getElementById('settings-container');
        if (!container) return;
        const s = _getSettings();

        const vol       = s.masterVolume     ?? 0.7;
        const tempo     = s.tempoPreference  || 'normal';
        const noteNames = s.showNoteNames    !== false;
        const melodyOn  = s.melodyEnabled    !== false;
        const lightMode = s.lightMode        || false;
        const midiTest  = s.showMidiTest     || false;

        container.innerHTML = `
          <!-- Sound -->
          <div class="settings-section">
            <div class="settings-section-title">Dźwięk</div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-label">🔊 Głośność</div>
              </div>
              <input type="range" class="settings-volume-slider" id="vol-slider"
                     min="0" max="1" step="0.05" value="${vol}"
                     oninput="SettingsScreen._setVol(this.value)"/>
            </div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-label">🎵 Domyślne tempo</div>
                <div class="settings-row-sub">Początkowe tempo nowych lekcji</div>
              </div>
              <div class="settings-opts">
                ${['turtle','normal','rabbit','rocket'].map(t =>
                  `<button class="settings-opt ${tempo===t?'opt--on':''}"
                    onclick="SettingsScreen._setOpt('tempoPreference','${t}',this,'settings-opts')"
                  >${{turtle:'🐢',normal:'🎵',rabbit:'🐇',rocket:'🚀'}[t]}</button>`
                ).join('')}
              </div>
            </div>
          </div>

          <!-- Display -->
          <div class="settings-section">
            <div class="settings-section-title">Wyświetlanie</div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-label">🎹 Nazwy nut na klawiszach</div>
                <div class="settings-row-sub">Pokaż nazwy nut na klawiszach</div>
              </div>
              <div class="settings-toggle ${noteNames?'tog--on':''}" id="tog-notenames"
                   onclick="SettingsScreen._toggle('showNoteNames','tog-notenames')"></div>
            </div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-label">🌙 Jasny motyw</div>
                <div class="settings-row-sub">Przełącz na jasny motyw</div>
              </div>
              <div class="settings-toggle ${lightMode?'tog--on':''}" id="tog-light"
                   onclick="SettingsScreen._toggleTheme()"></div>
            </div>
          </div>

          <!-- Melody -->
          <div class="settings-section">
            <div class="settings-section-title">Maskotka Melody</div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-label">🎵 Pokaż Melody</div>
                <div class="settings-row-sub">Melody dopinguje Cię podczas lekcji</div>
              </div>
              <div class="settings-toggle ${melodyOn?'tog--on':''}" id="tog-melody"
                   onclick="SettingsScreen._toggle('melodyEnabled','tog-melody')"></div>
            </div>
          </div>

          <!-- MIDI -->
          <div class="settings-section">
            <div class="settings-section-title">Połączenie z pianinem</div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-label">🎹 Urządzenie MIDI</div>
                <div class="settings-row-sub" id="midi-device-name">Sprawdzam…</div>
              </div>
              <button class="lesson-btn" onclick="MIDIManager.init().then(()=>SettingsScreen._updateMidiStatus())">Połącz ponownie</button>
            </div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-label">🔧 Panel testowy MIDI</div>
                <div class="settings-row-sub">Pokaż dziennik zdarzeń MIDI</div>
              </div>
              <div class="settings-toggle ${midiTest?'tog--on':''}" id="tog-midi"
                   onclick="SettingsScreen._toggle('showMidiTest','tog-midi'); SettingsScreen._toggleMidiPanel()"></div>
            </div>
            <div class="midi-test-panel" id="midi-test-panel" style="${midiTest?'':'display:none'}">
              Dziennik MIDI (ostatnie 10):
              <div class="midi-test-log" id="midi-log-display">Czekam na sygnał…</div>
            </div>
          </div>

          <!-- About -->
          <div class="settings-section">
            <div class="settings-section-title">O aplikacji</div>
            <div class="settings-about">
              <div class="settings-about-logo">🎼</div>
              <div class="settings-about-name">Pianinkowy Świat Marysi</div>
              <div class="settings-about-ver">Wersja 1.0</div>
              <div class="settings-about-tagline">Zrobione z ❤️ dla młodych muzyków</div>
            </div>
          </div>`;

        _updateMidiStatus();
        _startMidiLog();
      }

      // ── Volume ────────────────────────────────────────────────
      SettingsScreen._setVol = function(val) {
        const v = parseFloat(val);
        AudioEngine.setVolume(v);
        _saveSetting('masterVolume', v);
      };

      // ── Option buttons (grouped) ──────────────────────────────
      SettingsScreen._setOpt = function(key, value, btn, groupClass) {
        _saveSetting(key, value);
        const group = btn.closest('.settings-opts');
        if (group) group.querySelectorAll('.settings-opt').forEach(b => b.classList.toggle('opt--on', b === btn));
      };

      // ── Toggle ────────────────────────────────────────────────
      SettingsScreen._toggle = function(key, togId) {
        const s      = _getSettings();
        const newVal = !(s[key] !== false); // default true except lightMode
        _saveSetting(key, newVal);
        const tog = document.getElementById(togId);
        if (tog) tog.classList.toggle('tog--on', newVal);
      };

      // ── Theme toggle ──────────────────────────────────────────
      SettingsScreen._toggleTheme = function() {
        const s        = _getSettings();
        const newLight = !s.lightMode;
        _saveSetting('lightMode', newLight);
        document.body.classList.toggle('theme--light', newLight);
        const tog = document.getElementById('tog-light');
        if (tog) tog.classList.toggle('tog--on', newLight);
      };

      // ── MIDI panel toggle ─────────────────────────────────────
      SettingsScreen._toggleMidiPanel = function() {
        const panel = document.getElementById('midi-test-panel');
        if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
      };

      // ── MIDI status display ───────────────────────────────────
      function _updateMidiStatus() {
        const el = document.getElementById('midi-device-name');
        if (!el) return;
        const status = MIDIManager.getStatus();
        const name   = MIDIManager.getDeviceName();
        el.textContent = status === 'connected'
          ? `✅ Połączono: ${name}`
          : status === 'unsupported'
            ? '⚠️ MIDI nie jest wspierane w tej przeglądarce'
            : '❌ Pianino niepodłączone';
      }
      SettingsScreen._updateMidiStatus = _updateMidiStatus;

      // ── Live MIDI log ─────────────────────────────────────────
      let _midiLogLines = [];
      function _startMidiLog() {
        MIDIManager.onNoteOn(({ fullNote, velocity }) => {
          const el = document.getElementById('midi-log-display');
          if (!el) return;
          _midiLogLines.unshift(`noteOn  ${fullNote}  vel:${velocity}`);
          if (_midiLogLines.length > 10) _midiLogLines.pop();
          el.textContent = _midiLogLines.join('\n');
        });
      }

      // ── Apply saved settings on startup ──────────────────────
      function applyOnLoad() {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return;
          const key  = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const s    = data.settings || {};
          if (s.masterVolume !== undefined) AudioEngine.setVolume(s.masterVolume);
          if (s.lightMode)   document.body.classList.add('theme--light');
          if (s.melodyEnabled === false) {
            document.querySelectorAll('.melody-figure, .melody-nav-companion').forEach(el => el.style.display = 'none');
          }
        } catch(e) {}
      }

      return { render, applyOnLoad };
    })();


    /* ────────────────────────────────────────────────────────────
       FREE PLAY SCREEN — Enhanced with timer, note trail, Melody
       ──────────────────────────────────────────────────────────── */
    /* ════════════════════════════════════════════════════════════
       RECITAL MANAGER
       Lets the student pick ANY song (even locked) as a recital
       piece, practice it with per-note scoring, and track a
       score history. Parent can change the recital song at any time.
       ════════════════════════════════════════════════════════════ */
    const RecitalManager = (() => {
      const STORAGE_KEY_SUFFIX = '_recital';
      let _recitalSongId = null;
      let _scoreHistory  = [];
      let _activeSession = null; // { hits, misses, timing[], noteIndex }
      let _sessionActive = false; // flag used by long-lived MIDI handler

      // ── Persistence helpers ───────────────────────────────────
      function _key() {
        try {
          const u = UserManager.getCurrentUser();
          return u ? `littlemaestro_${u.profile.name.toLowerCase().replace(/\s+/g,'_')}${STORAGE_KEY_SUFFIX}` : null;
        } catch(e) { return null; }
      }
      function _load() {
        try {
          const k = _key(); if (!k) return;
          const d = JSON.parse(localStorage.getItem(k) || '{}');
          _recitalSongId = d.songId || null;
          _scoreHistory  = d.scores || [];
        } catch(e) {}
      }
      function _save() {
        try {
          const k = _key(); if (!k) return;
          localStorage.setItem(k, JSON.stringify({ songId: _recitalSongId, scores: _scoreHistory }));
        } catch(e) {}
      }

      // ── Main render ───────────────────────────────────────────
      function render() {
        _load();
        const container = document.getElementById('recital-content');
        if (!container) return;

        const song = _recitalSongId && typeof SONGS !== 'undefined'
          ? SONGS.find(s => s.id === _recitalSongId) : null;

        container.innerHTML = `
          <div class="recital-header">
            <div class="recital-header-icon">🎤</div>
            <div class="recital-header-text">
              <h2>Tryb recitalu</h2>
              <p>Wybierz dowolną piosenkę — nawet zablokowaną — żeby przygotować się do recitalu.</p>
            </div>
          </div>

          ${song ? `
          <div class="recital-song-card">
            <div class="recital-song-icon">🎵</div>
            <div class="recital-song-info">
              <div class="recital-song-title">${song.title}</div>
              <div class="recital-song-meta">${song.composer || 'Tradycyjna'} · Trudność ${song.difficulty}/10 · Świat ${song.world || '?'}</div>
            </div>
            <button class="recital-change-btn" onclick="RecitalManager.showPicker()">Zmień piosenkę</button>
          </div>

          <button class="recital-practice-btn" onclick="RecitalManager.startSession()">
            🎤 Zacznij ćwiczenie
          </button>
          ` : `
          <div class="recital-song-card" style="justify-content:center;border-color:rgba(255,165,0,0.2);">
            <div style="text-align:center;width:100%">
              <div style="font-size:32px;margin-bottom:8px;">🎵</div>
              <div class="recital-song-title" style="font-size:15px;">Nie wybrano jeszcze piosenki</div>
              <div class="recital-song-meta" style="margin-top:6px;">Kliknij poniżej żeby wybrać</div>
            </div>
          </div>

          <button class="recital-practice-btn" onclick="RecitalManager.showPicker()" style="background:linear-gradient(135deg,#d97706,#b45309);">
            🎵 Wybierz piosenkę
          </button>
          `}

          ${_scoreHistory.length > 0 ? `
          <div class="recital-scores-title">Ostatnie próby</div>
          ${_scoreHistory.slice(-8).reverse().map((s, i) => {
            const acc = Math.round(s.accuracy * 100);
            const stars = acc >= 90 ? '⭐⭐⭐' : acc >= 70 ? '⭐⭐' : '⭐';
            const color = acc >= 90 ? '#10B981' : acc >= 70 ? '#F59E0B' : '#EF4444';
            return `
            <div class="recital-score-row">
              <div class="recital-score-num">#${_scoreHistory.length - i}</div>
              <div class="recital-score-stars">${stars}</div>
              <div class="recital-score-bar-wrap">
                <div class="recital-score-pct" style="color:${color};">${acc}%</div>
                <div class="recital-score-detail">${s.hits} traf. · ${s.misses} pud. · seria ${s.bestStreak}</div>
              </div>
              <div class="recital-score-date">${new Date(s.date).toLocaleDateString('pl-PL',{month:'short',day:'numeric'})}</div>
            </div>`;
          }).join('')}
          ` : (song ? `<div style="text-align:center;font-family:var(--font-heading);font-size:12px;color:var(--color-text-muted);padding:20px 0;">Brak prób — zacznij ćwiczyć!</div>` : '')}
        `;
      }

      // ── Song picker bottom sheet ───────────────────────────────
      function showPicker() {
        document.getElementById('recital-picker-overlay')?.remove();
        if (typeof SONGS === 'undefined') return;

        // Group songs by world
        const worldGroups = {};
        SONGS.forEach(s => {
          const w = s.isBonus ? 'Bonus' : `Świat ${s.world}`;
          if (!worldGroups[w]) worldGroups[w] = [];
          worldGroups[w].push(s);
        });

        let songsHtml = '';
        Object.entries(worldGroups).forEach(([worldLabel, songs]) => {
          songsHtml += `<div class="recital-picker-world">${worldLabel}</div>`;
          songs.forEach(s => {
            const isSelected = s.id === _recitalSongId;
            const diff = '●'.repeat(Math.min(s.difficulty, 10));
            songsHtml += `
              <div class="recital-picker-song ${isSelected ? 'picker-selected' : ''}" onclick="RecitalManager.selectSong(${s.id})">
                <div class="recital-picker-song-icon">${s.isBonus ? '⭐' : '🎵'}</div>
                <div class="recital-picker-song-info">
                  <div class="recital-picker-song-title">${s.title}</div>
                  <div class="recital-picker-song-meta">${s.composer || 'Tradycyjna'}</div>
                </div>
                <div class="recital-picker-song-difficulty" style="font-size:8px;letter-spacing:-1px;">${diff}</div>
              </div>`;
          });
        });

        const overlay = document.createElement('div');
        overlay.id = 'recital-picker-overlay';
        overlay.className = 'recital-picker-overlay';
        overlay.innerHTML = `
          <div class="recital-picker-sheet">
            <div class="recital-picker-header">
              <div class="recital-picker-title">🎤 Wybierz piosenkę</div>
              <button class="recital-picker-close" onclick="document.getElementById('recital-picker-overlay')?.remove()">✕ Zamknij</button>
            </div>
            <div class="recital-picker-list">${songsHtml}</div>
          </div>`;
        document.body.appendChild(overlay);
      }

      function selectSong(songId) {
        _recitalSongId = songId;
        _scoreHistory = []; // reset history when song changes
        _save();
        document.getElementById('recital-picker-overlay')?.remove();
        render();
      }

      // ── Recital practice session ───────────────────────────────
      function startSession() {
        const song = _recitalSongId && typeof SONGS !== 'undefined'
          ? SONGS.find(s => s.id === _recitalSongId) : null;
        if (!song) { showPicker(); return; }

        // Get right-hand notes
        const notes = song.notes.filter(n => !n.hand || n.hand === 'right');
        if (!notes.length) return;

        _activeSession = {
          notes,
          noteIndex: 0,
          hits: 0,
          misses: 0,
          bestStreak: 0,
          currentStreak: 0,
          timing: [],
          startTime: Date.now(),
          midiHandler: null,
        };

        // Render session UI
        const overlay = document.createElement('div');
        overlay.id = 'recital-session-overlay';
        overlay.className = 'recital-session-overlay';
        overlay.innerHTML = `
          <div class="recital-session-header">
            <div class="recital-session-title">🎤 ${song.title} — Recital</div>
            <div class="recital-session-stats">
              <span class="recital-stat-hit" id="rs-hits">✓ 0</span>
              <span class="recital-stat-miss" id="rs-miss">✗ 0</span>
              <span class="recital-stat-acc" id="rs-acc">—%</span>
            </div>
          </div>
          <div class="recital-session-body">
            <div class="recital-notes-grid" id="rs-notes-grid"></div>
          </div>
          <div style="padding:12px 16px;display:flex;gap:10px;flex-shrink:0;border-top:1px solid rgba(255,165,0,0.15);">
            <button class="lesson-btn" onclick="RecitalManager.endSession(true)">⏹ Stop</button>
            <div style="flex:1;font-family:var(--font-heading);font-size:11px;color:var(--color-text-muted);display:flex;align-items:center;">
              Zagraj każdą podświetloną nutę na pianinie
            </div>
          </div>`;
        document.body.appendChild(overlay);

        // Build note chips
        const grid = document.getElementById('rs-notes-grid');
        if (grid) {
          notes.forEach((n, i) => {
            const chip = document.createElement('div');
            chip.className = 'recital-note-chip chip-pending';
            chip.id = `rs-chip-${i}`;
            chip.textContent = n.note;
            grid.appendChild(chip);
          });
        }

        _activateChip(0);
        _sessionActive = true;

        // Play demo audio for first note
        _playCurrentNote();

        // Wire MIDI — push-only pattern; use _sessionActive flag to gate
        if (typeof MIDIManager !== 'undefined') {
          MIDIManager.onNoteOn(({ fullNote }) => {
            if (_sessionActive) _handleNoteInput(fullNote);
          });
        }
        // Wire on-screen keyboard
        if (typeof PianoKeyboard !== 'undefined') {
          PianoKeyboard.setClickCallback((note) => {
            if (_sessionActive) _handleNoteInput(note);
          });
          PianoKeyboard.setClickEnabled(true);
        }
      }

      function _normalize(note) {
        const MAP = {'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B'};
        const m = note.match(/^([A-G][b#]?)(\d)$/);
        if (!m) return note;
        return (MAP[m[1]] || m[1]) + m[2];
      }

      function _activateChip(idx) {
        // Deactivate previous
        const prev = document.getElementById(`rs-chip-${idx - 1}`);
        if (prev && !prev.classList.contains('chip-hit') && !prev.classList.contains('chip-miss')) {
          prev.classList.remove('chip-active');
        }
        const chip = document.getElementById(`rs-chip-${idx}`);
        if (chip) {
          chip.classList.remove('chip-pending');
          chip.classList.add('chip-active');
          chip.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }

      function _playCurrentNote() {
        if (!_activeSession) return;
        const n = _activeSession.notes[_activeSession.noteIndex];
        if (!n) return;
        try { AudioEngine.playNoteInstant(_normalize(n.note), 60); } catch(e) {}
      }

      function _handleNoteInput(played) {
        if (!_activeSession) return;
        const { notes, noteIndex } = _activeSession;
        if (noteIndex >= notes.length) return;

        const expected = _normalize(notes[noteIndex].note);
        const playedN  = _normalize(played);
        const isHit    = expected === playedN;

        // Update chip
        const chip = document.getElementById(`rs-chip-${noteIndex}`);
        if (chip) {
          chip.classList.remove('chip-active', 'chip-pending');
          chip.classList.add(isHit ? 'chip-hit' : 'chip-miss');
        }

        if (isHit) {
          _activeSession.hits++;
          _activeSession.currentStreak++;
          _activeSession.bestStreak = Math.max(_activeSession.bestStreak, _activeSession.currentStreak);
          try { AudioEngine.playNoteInstant(_normalize(notes[noteIndex].note), 90); } catch(e) {}
        } else {
          _activeSession.misses++;
          _activeSession.currentStreak = 0;
        }

        _activeSession.timing.push({ note: notes[noteIndex].note, hit: isHit, time: Date.now() - _activeSession.startTime });
        _activeSession.noteIndex++;

        // Update HUD
        const total = _activeSession.hits + _activeSession.misses;
        const acc   = total > 0 ? _activeSession.hits / total : 0;
        const hEl   = document.getElementById('rs-hits');
        const mEl   = document.getElementById('rs-miss');
        const aEl   = document.getElementById('rs-acc');
        if (hEl) hEl.textContent = `✓ ${_activeSession.hits}`;
        if (mEl) mEl.textContent = `✗ ${_activeSession.misses}`;
        if (aEl) aEl.textContent = `${Math.round(acc * 100)}%`;

        if (_activeSession.noteIndex >= notes.length) {
          setTimeout(() => endSession(false), 400);
        } else {
          _activateChip(_activeSession.noteIndex);
          // Play next note hint with slight delay
          setTimeout(_playCurrentNote, 150);
        }
      }

      function endSession(aborted) {
        if (!_activeSession) return;

        // Deactivate MIDI / screen input via flag
        _sessionActive = false;
        if (typeof PianoKeyboard !== 'undefined') {
          PianoKeyboard.setClickEnabled(false);
        }

        const { hits, misses, bestStreak, noteIndex, notes } = _activeSession;
        const total = hits + misses;
        const acc   = total > 0 ? hits / total : 0;
        const pct   = Math.round(acc * 100);
        const stars = pct >= 90 ? '⭐⭐⭐' : pct >= 70 ? '⭐⭐' : '⭐';
        const color = pct >= 90 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#EF4444';
        const grade = pct >= 90 ? 'Gotowa na recital! 🏆' : pct >= 70 ? 'Prawie! 💪' : 'Ćwicz dalej! 🎯';

        if (!aborted && total > 0) {
          _scoreHistory.push({ date: new Date().toISOString(), accuracy: acc, hits, misses, bestStreak });
          if (_scoreHistory.length > 20) _scoreHistory = _scoreHistory.slice(-20);
          _save();
        }

        _activeSession = null;

        // Show result overlay inside session
        const sessionEl = document.getElementById('recital-session-overlay');
        if (!sessionEl) return;

        const result = document.createElement('div');
        result.className = 'recital-session-result';
        result.innerHTML = `
          <div class="recital-result-score" style="color:${color};">${pct}%</div>
          <div style="font-family:var(--font-heading);font-size:22px;font-weight:900;color:var(--color-text);">${grade}</div>
          <div style="font-size:28px;">${stars}</div>
          <div class="recital-result-breakdown">
            <div class="recital-result-stat">
              <div class="recital-result-stat-val" style="color:#10B981;">${hits}</div>
              <div class="recital-result-stat-lbl">Trafione</div>
            </div>
            <div class="recital-result-stat">
              <div class="recital-result-stat-val" style="color:#EF4444;">${misses}</div>
              <div class="recital-result-stat-lbl">Pudło</div>
            </div>
            <div class="recital-result-stat">
              <div class="recital-result-stat-val" style="color:#F59E0B;">${bestStreak}</div>
              <div class="recital-result-stat-lbl">Najl. seria</div>
            </div>
          </div>
          <div class="recital-result-btns">
            <button class="lesson-btn lesson-btn--primary" onclick="document.getElementById('recital-session-overlay')?.remove(); RecitalManager.startSession();">↺ Ćwicz ponownie</button>
            <button class="lesson-btn" onclick="document.getElementById('recital-session-overlay')?.remove(); RecitalManager.render();">Gotowe</button>
          </div>`;
        sessionEl.style.position = 'relative';
        sessionEl.appendChild(result);
      }

      return { render, showPicker, selectSong, startSession, endSession };
    })();
    window.RecitalManager = RecitalManager;


    const FreePlayManager = (() => {

      const SESSION_DURATION = 120; // 2 minutes in seconds
      let _secondsLeft = SESSION_DURATION;
      let _timerInterval = null;
      let _trailNotes    = [];

      function start() {
        _secondsLeft = SESSION_DURATION;
        _trailNotes  = [];
        _buildUI();
        _startTimer();

        // Melody dances in corner
        Melody.setState('excited');
        Melody.speak('Graj co chcesz! 🎵', 3000);
        setTimeout(() => Melody.setState('idle'), 3500);

        // Wire MIDI for note names + trail
        const handlerId = Date.now();
        FreePlayManager._handlerId = handlerId;

        MIDIManager.onNoteOn(({ fullNote }) => {
          if (FreePlayManager._handlerId !== handlerId) return;
          _showFloatingNote(fullNote);
          _addTrailNote(fullNote);
          AudioEngine.playNoteInstant(fullNote, 85);
          if (typeof PianoKeyboard !== 'undefined') {
            PianoKeyboard.highlightPlaying(fullNote);
          }
        });
      }

      function _buildUI() {
        const layout = document.querySelector('.freeplay-layout');
        if (!layout) return;
        layout.innerHTML = `
          <div class="freeplay-top-bar">
            <h2 class="freeplay-title">Wolna gra 🎹</h2>
            <div>
              <span class="freeplay-timer" id="fp-timer">⏱ 2:00</span>
              &nbsp;
              <button class="freeplay-extend-btn" onclick="FreePlayManager.extend()">+1 min</button>
            </div>
          </div>
          <div class="freeplay-keyboard-wrap">
            <div class="keyboard-container" id="freeplay-keyboard"></div>
          </div>
          <div class="freeplay-trail-wrap" id="fp-trail">
            <span style="font-family:var(--font-heading);font-size:11px;font-weight:700;color:var(--color-text-dim);">Zagrane nuty:</span>
          </div>
          <div class="freeplay-melody-corner" id="fp-melody-corner"></div>`;

        // Re-mount keyboard
        if (typeof PianoKeyboard !== 'undefined') {
          PianoKeyboard.mount('freeplay-keyboard');
        }

        // Mount Melody in corner
        Melody.mount('fp-melody-corner', { small: true });
      }

      function _startTimer() {
        clearInterval(_timerInterval);
        _timerInterval = setInterval(() => {
          _secondsLeft--;
          _updateTimerDisplay();
          if (_secondsLeft <= 0) _end();
          else if (_secondsLeft <= 20) {
            const el = document.getElementById('fp-timer');
            if (el) el.classList.add('timer--ending');
          }
        }, 1000);
      }

      function _updateTimerDisplay() {
        const el  = document.getElementById('fp-timer');
        if (!el) return;
        const m   = Math.floor(_secondsLeft / 60);
        const s   = String(_secondsLeft % 60).padStart(2, '0');
        el.textContent = `⏱ ${m}:${s}`;
      }

      function extend() {
        _secondsLeft += 60;
        const el = document.getElementById('fp-timer');
        if (el) el.classList.remove('timer--ending');
        Melody.speak('Jeszcze minuta! 🎵', 1500);
      }
      FreePlayManager.extend = extend;

      function _end() {
        clearInterval(_timerInterval);
        FreePlayManager._handlerId = null;
        GamificationManager.awardNotes(5, 'free play session');
        Melody.speak('Świetnie grasz! 🌟', 3000);
        setTimeout(() => {
          if (typeof showScreen === 'function') showScreen('home');
        }, 3200);
      }

      function stop() {
        clearInterval(_timerInterval);
        FreePlayManager._handlerId = null;
      }

      // ── Floating note label ────────────────────────────────────
      function _showFloatingNote(note) {
        const kbd  = document.getElementById('freeplay-keyboard');
        if (!kbd) return;
        const keys = kbd.querySelectorAll(`[data-note="${note}"]`);
        const rect = keys[0] ? keys[0].getBoundingClientRect() : kbd.getBoundingClientRect();
        const el   = document.createElement('div');
        el.className   = 'fp-float-note';
        el.textContent = note.replace(/\d/,'');
        el.style.left  = `${rect.left + rect.width/2}px`;
        el.style.top   = `${rect.top - 8}px`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
      }

      // ── Trail note pill ────────────────────────────────────────
      function _addTrailNote(note) {
        _trailNotes.push(note);
        if (_trailNotes.length > 24) _trailNotes.shift();
        const trail = document.getElementById('fp-trail');
        if (!trail) return;
        const existing = trail.querySelectorAll('.fp-trail-note');
        if (existing.length >= 24) existing[0].remove();
        const pill = document.createElement('div');
        pill.className   = 'fp-trail-note';
        pill.textContent = note.replace(/\d/,'');
        trail.appendChild(pill);
      }

      return { start, stop, extend };
    })();


    /* ────────────────────────────────────────────────────────────
       FINAL WIRING — Complete journey + screen hooks
       ──────────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {

      // ── 1. Apply saved settings on every launch ───────────────
      // Deferred until user is active
      const _applySettingsWhenReady = () => {
        try {
          if (typeof UserManager !== 'undefined' && UserManager.getCurrentUser()) {
            SettingsScreen.applyOnLoad();
          }
        } catch(e) {}
      };

      // ── 2. Hook showScreen for settings + freeplay ────────────
      const _origShow11 = window.showScreen;
      if (_origShow11) {
        window.showScreen = function(screenId) {
          _origShow11(screenId);

          // Settings
          if (screenId === 'settings') {
            setTimeout(SettingsScreen.render, 220);
          }

          // Free play — start timer and enhanced UI
          if (screenId === 'freeplay') {
            setTimeout(() => FreePlayManager.start(), 220);
          } else {
            // Leaving freeplay — stop timer
            FreePlayManager.stop();
          }

          // Recital — render the screen
          if (screenId === 'recital') {
            setTimeout(() => { if (typeof RecitalManager !== 'undefined') RecitalManager.render(); }, 220);
          }

          // Apply settings when switching away from login
          if (screenId !== 'login') _applySettingsWhenReady();
        };
      }

      // ── 3. Wire Import drag-drop on login screen ──────────────
      ExportManager.wireLoginImport();

      // ── 4. Wire nav items with correct screen IDs ─────────────
      // Ensure all nav buttons point to their screen correctly
      // (Phase 2 wired these, but free play needs to trigger manager)
      document.querySelectorAll('.nav-item').forEach(btn => {
        const target = btn.dataset.target;
        if (target === 'screen-freeplay') {
          btn.addEventListener('click', () => {
            if (typeof showScreen === 'function') showScreen('freeplay');
          });
        }
        if (target === 'screen-recital') {
          btn.addEventListener('click', () => {
            if (typeof showScreen === 'function') showScreen('recital');
          });
        }
      });

      // ── 5. Wire export buttons in Parent Dashboard data tab ───
      // ParentDashboard already wires _exportData; add keepsake option
      window.exportKeepsake = function() {
        const active = typeof UserManager !== 'undefined' ? UserManager.getCurrentUser() : null;
        if (active) ExportManager.exportKeepsake(active.profile.name);
      };

      // ── 6. Settings screen render ─────────────────────────────
      SettingsScreen.render();

      // ── 7. Initial free play UI build ─────────────────────────
      // (Just build the basic layout; timer starts on screen enter)
      const fpLayout = document.querySelector('.freeplay-layout');
      if (fpLayout && !document.getElementById('fp-timer')) {
        // Ensure keyboard is mounted (Phase 6 mounts it; this is fallback)
        const fpKbd = document.getElementById('freeplay-keyboard');
        if (fpKbd && typeof PianoKeyboard !== 'undefined') {
          PianoKeyboard.mount('freeplay-keyboard');
        }
      }

      // ── 8. Persist last screen across page closes ─────────────
      // Already handled in Phase 2 UserManager DOMContentLoaded hook.
      // Add: save screen on nav clicks for cross-session persistence.
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          try {
            const active = UserManager.getCurrentUser();
            if (active) sessionStorage.setItem('lm_last_screen', btn.dataset.target);
          } catch(e) {}
        });
      });

      // ── 9. Pre-curriculum → Quest Map unlock check ─────────────
      // When all 5 mini-lessons done, unlock quest map nav
      function _checkPrecurrDone() {
        try {
          const active = UserManager.getCurrentUser();
          if (!active) return false;
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const data   = JSON.parse(localStorage.getItem(key) || '{}');
          return (data.precurriculum || []).every(Boolean);
        } catch(e) { return false; }
      }
      window._isPrecurrDone = _checkPrecurrDone;

      // ── 10. Wire parent mode button on login screen ───────────
      const parentBtn = document.querySelector('.login-parent-btn');
      if (parentBtn) {
        parentBtn.addEventListener('click', () => {
          if (typeof showScreen === 'function') showScreen('parentmode');
        });
      }

      // ── 11. Export keepsake from parent data tab ──────────────
      // Patch ParentDashboard data tab to include keepsake export
      const _origBuildData = typeof ParentDashboard !== 'undefined' && ParentDashboard._buildData;

      // ── 12. MIDI: connect on load ─────────────────────────────
      if (typeof MIDIManager !== 'undefined') {
        MIDIManager.init().then(() => {
          if (typeof SettingsScreen !== 'undefined') SettingsScreen._updateMidiStatus && SettingsScreen._updateMidiStatus();
        }).catch(() => {});
      }

    }); // end DOMContentLoaded
