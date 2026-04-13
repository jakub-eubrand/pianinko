        showNoteNamesBelow,
        showFingerNumbers,
      };
    })();


    /* ============================================================
       LITTLE MAESTRO — PHASE 8
       Melody Mascot · Quest Map · GamificationManager · Trophy Room
       ============================================================ */

    /* ────────────────────────────────────────────────────────────
       MELODY — Animated SVG Mascot
       ──────────────────────────────────────────────────────────── */
    const Melody = (() => {

      // All 6 emotional states and their face configuration
      const STATES = {
        idle:      { eyes: 'normal', mouth: 'smile',    brows: 'neutral',  color: '#A78BFA', msg: ['♪  ♫  ♪', 'Gotowa do gry!', 'Wybierz piosenkę!'] },
        excited:   { eyes: 'wide',   mouth: 'open',     brows: 'raised',   color: '#F59E0B', msg: ['Juhu! 🎉', 'Zaczynamy!', 'Dasz radę!'] },
        correct:   { eyes: 'happy',  mouth: 'grin',     brows: 'raised',   color: '#10B981', msg: ['Perfekcyjnie! ✨', 'Świetnie! ⭐', 'Tak trzymaj!'] },
        wrong:     { eyes: 'sad',    mouth: 'frown',    brows: 'worried',  color: '#EF4444', msg: ['Spróbuj jeszcze raz!', 'Prawie! 💪', 'Dasz radę!'] },
        thinking:  { eyes: 'squint', mouth: 'hmm',      brows: 'thinking', color: '#60A5FA', msg: ['Hmm…', 'Zobaczmy…', 'Jaka nuta?'] },
        celebrate: { eyes: 'star',   mouth: 'huge',     brows: 'raised',   color: '#F59E0B', msg: ['ŚWIETNIE! 🌟', 'UDAŁO SIĘ! 🎊', 'GWIAZDA! ⭐'] },
      };

      const _s = {
        state:       'idle',
        bubbleTimer: null,
        containers:  [], // all mounted containers
      };

      // ── Build SVG markup for a given state ─────────────────────
      function _buildSVG(state, size = 80) {
        const cfg = STATES[state] || STATES.idle;
        const c   = cfg.color;

        // Eye shapes
        const eyes = {
          normal:  `<ellipse cx="30" cy="38" rx="4" ry="4.5" fill="#1A1030"/>
                    <ellipse cx="50" cy="38" rx="4" ry="4.5" fill="#1A1030"/>
                    <circle cx="31.5" cy="36.5" r="1.5" fill="white"/>
                    <circle cx="51.5" cy="36.5" r="1.5" fill="white"/>`,
          wide:    `<ellipse cx="30" cy="38" rx="5" ry="6" fill="#1A1030"/>
                    <ellipse cx="50" cy="38" rx="5" ry="6" fill="#1A1030"/>
                    <circle cx="32" cy="36" r="2" fill="white"/>
                    <circle cx="52" cy="36" r="2" fill="white"/>`,
          happy:   `<path d="M26,38 Q30,34 34,38" stroke="#1A1030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    <path d="M46,38 Q50,34 54,38" stroke="#1A1030" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
          sad:     `<ellipse cx="30" cy="39" rx="4" ry="4.5" fill="#1A1030"/>
                    <ellipse cx="50" cy="39" rx="4" ry="4.5" fill="#1A1030"/>
                    <circle cx="31.5" cy="37.5" r="1.5" fill="white"/>
                    <circle cx="51.5" cy="37.5" r="1.5" fill="white"/>`,
          squint:  `<path d="M26,38 Q30,41 34,38" stroke="#1A1030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    <path d="M46,38 Q50,41 54,38" stroke="#1A1030" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
          star:    `<text x="27" y="42" font-size="10" text-anchor="middle" fill="#F59E0B">★</text>
                    <text x="53" y="42" font-size="10" text-anchor="middle" fill="#F59E0B">★</text>`,
        };

        // Mouth shapes
        const mouths = {
          smile:  `<path d="M32,48 Q40,54 48,48" stroke="#1A1030" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
          open:   `<path d="M32,47 Q40,57 48,47" stroke="#1A1030" stroke-width="2" fill="#1A1030"/>
                   <ellipse cx="40" cy="50" rx="8" ry="5" fill="#1A1030"/>
                   <ellipse cx="40" cy="52" rx="5" ry="2.5" fill="#EF4444"/>`,
          grin:   `<path d="M30,47 Q40,58 50,47" stroke="#1A1030" stroke-width="2" fill="#1A1030"/>
                   <ellipse cx="40" cy="51" rx="10" ry="5.5" fill="#1A1030"/>
                   <ellipse cx="40" cy="53" rx="7" ry="3" fill="#EF4444"/>`,
          frown:  `<path d="M32,51 Q40,45 48,51" stroke="#1A1030" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
          hmm:    `<path d="M33,49 Q40,49 47,50" stroke="#1A1030" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
          huge:   `<path d="M28,46 Q40,62 52,46" stroke="#1A1030" stroke-width="2" fill="#1A1030"/>
                   <ellipse cx="40" cy="52" rx="12" ry="8" fill="#1A1030"/>
                   <ellipse cx="40" cy="55" rx="8" ry="4" fill="#EF4444"/>
                   <ellipse cx="37" cy="53" rx="3" ry="2" fill="white"/>
                   <ellipse cx="43" cy="53" rx="3" ry="2" fill="white"/>`,
        };

        // Brow shapes
        const brows = {
          neutral:  `<path d="M25,29 Q30,28 35,29" stroke="#1A1030" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <path d="M45,29 Q50,28 55,29" stroke="#1A1030" stroke-width="2" fill="none" stroke-linecap="round"/>`,
          raised:   `<path d="M24,26 Q30,23 36,26" stroke="#1A1030" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <path d="M44,26 Q50,23 56,26" stroke="#1A1030" stroke-width="2" fill="none" stroke-linecap="round"/>`,
          worried:  `<path d="M25,29 Q30,32 35,29" stroke="#1A1030" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <path d="M45,29 Q50,32 55,29" stroke="#1A1030" stroke-width="2" fill="none" stroke-linecap="round"/>`,
          thinking: `<path d="M24,29 Q30,26 36,28" stroke="#1A1030" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <path d="M44,28 Q50,26 56,27" stroke="#1A1030" stroke-width="2" fill="none" stroke-linecap="round"/>`,
        };

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="${size}" height="${size * 1.25}">
          <!-- Quarter note body (filled oval) -->
          <ellipse cx="40" cy="72" rx="16" ry="11" fill="${c}" transform="rotate(-12,40,72)"/>
          <!-- Stem -->
          <rect x="54" y="20" width="4.5" height="54" rx="2" fill="${c}"/>
          <!-- Flag on stem -->
          <path d="M58.5,20 Q75,30 68,45 Q62,38 58.5,42 Z" fill="${c}"/>
          <!-- Face circle -->
          <circle cx="40" cy="40" r="22" fill="${c}"/>
          <circle cx="40" cy="40" r="20" fill="${c}" opacity="0.7"/>
          <!-- Cheek blush -->
          <ellipse cx="23" cy="44" rx="5" ry="3.5" fill="rgba(255,150,150,0.35)"/>
          <ellipse cx="57" cy="44" rx="5" ry="3.5" fill="rgba(255,150,150,0.35)"/>
          <!-- Eyebrows -->
          ${brows[cfg.brows]}
          <!-- Eyes -->
          ${eyes[cfg.eyes]}
          <!-- Mouth -->
          ${mouths[cfg.mouth]}
        </svg>`;
      }

      // ── Mount Melody into a container element ──────────────────
      function mount(containerId, options = {}) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const isSmall = options.small || false;
        const size    = isSmall ? 40 : 80;

        el.innerHTML = `
          <div class="melody-figure">
            <div class="melody-svg-wrap state--idle" id="${containerId}__svg">
              ${_buildSVG('idle', size)}
            </div>
            ${!isSmall ? `<div class="melody-bubble bubble--hidden" id="${containerId}__bubble"></div>
            <div class="melody-name">Melody</div>` : ''}
          </div>`;

        _s.containers.push({ id: containerId, small: isSmall, size });
      }

      // ── Update all mounted instances to a new state ────────────
      function setState(newState) {
        if (!STATES[newState]) return;
        _s.state = newState;

        _s.containers.forEach(({ id, size }) => {
          const wrap = document.getElementById(`${id}__svg`);
          if (!wrap) return;
          // Remove all state classes
          wrap.className = 'melody-svg-wrap';
          // Set new state class + re-render SVG
          wrap.classList.add(`state--${newState}`);
          wrap.innerHTML = _buildSVG(newState, size);
        });
      }

      // ── Show speech bubble with message ───────────────────────
      function speak(message, durationMs = 3000) {
        if (_s.bubbleTimer) clearTimeout(_s.bubbleTimer);

        _s.containers.forEach(({ id, small }) => {
          if (small) return;
          const bubble = document.getElementById(`${id}__bubble`);
          if (!bubble) return;
          bubble.textContent = message;
          bubble.classList.remove('bubble--hidden');
        });

        if (durationMs > 0) {
          _s.bubbleTimer = setTimeout(() => {
            _s.containers.forEach(({ id, small }) => {
              if (small) return;
              const bubble = document.getElementById(`${id}__bubble`);
              if (bubble) bubble.classList.add('bubble--hidden');
            });
          }, durationMs);
        }
      }

      // ── Introduction sequence ──────────────────────────────────
      function introduce() {
        const msgs = [
          { state: 'idle',     text: 'Hi! I\'m Melody! 🎵', delay: 0 },
          { state: 'excited',  text: 'I\'ll help you learn piano!', delay: 2000 },
          { state: 'idle',     text: 'Let\'s make music together!', delay: 4200 },
          { state: 'idle',     text: null, delay: 7000 },
        ];
        msgs.forEach(({ state, text, delay }) => {
          setTimeout(() => {
            setState(state);
            if (text) speak(text, 2000);
          }, delay);
        });
      }

      // ── React to gameplay events ───────────────────────────────
      function reactCorrect() {
        setState('correct');
        const cfg = STATES.correct;
        speak(cfg.msg[Math.floor(Math.random() * cfg.msg.length)], 1800);
        setTimeout(() => setState('idle'), 2200);
      }

      function reactWrong() {
        setState('wrong');
        const cfg = STATES.wrong;
        speak(cfg.msg[Math.floor(Math.random() * cfg.msg.length)], 1800);
        setTimeout(() => setState('idle'), 2200);
      }

      function reactCelebrate() {
        setState('celebrate');
        const cfg = STATES.celebrate;
        speak(cfg.msg[Math.floor(Math.random() * cfg.msg.length)], 0);
      }

      function reactThinking() {
        setState('thinking');
        const cfg = STATES.thinking;
        speak(cfg.msg[Math.floor(Math.random() * cfg.msg.length)], 2500);
      }

      return {
        mount,
        setState,
        speak,
        introduce,
        reactCorrect,
        reactWrong,
        reactCelebrate,
        reactThinking,
      };
    })();


    /* ────────────────────────────────────────────────────────────
       QUEST MAP — Winding path with song nodes
       ──────────────────────────────────────────────────────────── */
    function renderQuestMap() {
      const container = document.getElementById('questmap-path-container');
      if (!container) return;

      // Determine progress from active user's data
      let completedSongs = new Set();
      let currentSongId  = null;

      try {
        const active = UserManager ? UserManager.getCurrentUser() : null;
        if (active) {
          const stored = localStorage.getItem(`littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`);
          if (stored) {
            const data = JSON.parse(stored);
            if (data.progress) {
              // Primary format: GamificationManager.awardStars writes progress[songId].stars
              Object.entries(data.progress).forEach(([sid, val]) => {
                const numId = parseInt(sid, 10);
                if (!isNaN(numId) && typeof val === 'object' && val !== null && val.stars > 0) {
                  completedSongs.add(numId);
                }
              });
              // Legacy fallback: songStars sub-object (from original UserManager schema)
              const songStars = data.progress.songStars || {};
              Object.entries(songStars).forEach(([sid, s]) => {
                if (s && s > 0) completedSongs.add(parseInt(sid, 10));
              });
            }
          }
        }
      } catch(e) { /* use defaults */ }

      // Group songs by world (exclude bonus songs and world 0 from main progression)
      const worlds = [];
      SONGS.forEach(song => {
        if (song.isBonus || song.world === 0 || song.world == null) return; // bonus handled separately
        let world = worlds.find(w => w.id === song.world);
        if (!world) {
          const WORLD_META = {
            1:  { icon: '🎀', title: 'Świat 1',  subtitle: 'Pierwsze kroki',       color: '--world-1'  },
            2:  { icon: '🎈', title: 'Świat 2',  subtitle: 'Dwie ręce',            color: '--world-2'  },
            3:  { icon: '🎠', title: 'Świat 3',  subtitle: 'Umiejętności',         color: '--world-3'  },
            4:  { icon: '🌱', title: 'Świat 4',  subtitle: 'Pierwsze nuty',        color: '--world-4'  },
            5:  { icon: '⭐', title: 'Świat 5',  subtitle: 'Proste melodie',       color: '--world-5'  },
            6:  { icon: '🎵', title: 'Świat 6',  subtitle: 'Szerszy zakres',       color: '--world-6'  },
            7:  { icon: '🥁', title: 'Świat 7',  subtitle: 'Obie ręce',            color: '--world-7'  },
            8:  { icon: '🎶', title: 'Świat 8',  subtitle: 'Harmonia',             color: '--world-8'  },
            9:  { icon: '🎹', title: 'Świat 9',  subtitle: 'Maestro',              color: '--world-9'  },
            10: { icon: '🎸', title: 'Świat 10', subtitle: 'Gwiazda rocka',        color: '--world-10' },
            11: { icon: '⚔️', title: 'Świat 11', subtitle: 'Legenda',              color: '--world-11' },
            12: { icon: '🏆', title: 'Świat 12', subtitle: 'Arcymistrz',           color: '--world-12' },
            13: { icon: '💎', title: 'Świat 13', subtitle: 'Wirtuoz',              color: '--world-13' },
            14: { icon: '🎤', title: 'Sanah',    subtitle: 'Piosenki Sanah',       color: '--world-1'  },
          };
          const meta = WORLD_META[song.world] || { icon: '🎵', title: `Świat ${song.world}`, subtitle: '' };
          world = { id: song.world, ...meta, songs: [] };
          worlds.push(world);
        }
        world.songs.push(song);
      });

      // Find current song (first incomplete song)
      let foundCurrent = false;
      worlds.forEach(world => {
        world.songs.forEach(song => {
          if (!foundCurrent && !completedSongs.has(song.id)) {
            currentSongId = song.id;
            foundCurrent  = true;
          }
        });
      });

      // Build HTML
      let html = `
        <div class="questmap-precurr-banner">
          <span class="banner-stars">✦ ✦ ✦</span>
          <span>Twoja muzyczna podróż</span>
          <span class="banner-stars">✦ ✦ ✦</span>
        </div>`;

      let nodeCount = 0;

      worlds.forEach(world => {
        html += `
          <div class="questmap-world-banner world-banner--${world.id}">
            <span class="world-banner-icon">${world.icon}</span>
            <div>
              <div class="world-banner-title">${world.title}</div>
              <div class="world-banner-subtitle">${world.subtitle}</div>
            </div>
          </div>`;

        world.songs.forEach((song, i) => {
          const isCompleted = completedSongs.has(song.id);
          const isCurrent   = song.id === currentSongId;
          const isLocked    = !isCompleted && !isCurrent && !song.alwaysUnlocked;

          // Winding pattern: alternate left/right
          const side = nodeCount % 2 === 0 ? 'left' : 'right';
          nodeCount++;

          let stateClass = 'qm-node--locked';
          if (isCompleted) stateClass = 'qm-node--completed';
          else if (isCurrent) stateClass = 'qm-node--current';

          // Star display
          let stars = '☆☆☆';
          try {
            const active = UserManager ? UserManager.getCurrentUser() : null;
            if (active && isCompleted) {
              const stored = localStorage.getItem(`littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`);
              if (stored) {
                const data = JSON.parse(stored);
                const prog = data.progress && data.progress[song.id];
                if (prog && prog.stars) {
                  stars = '★'.repeat(prog.stars) + '☆'.repeat(3 - prog.stars);
                }
              }
            }
          } catch(e) {}

          const nodeIcon = isCompleted ? '✓' : isCurrent ? song.emoji || '🎵' : '🔒';

          html += `
            <div class="questmap-connector ${isCompleted ? 'questmap-connector--active' : ''}"></div>
            <div class="questmap-row questmap-row--${side}">
              <div class="qm-node ${stateClass}"
                   role="button"
                   tabindex="${isLocked ? '-1' : '0'}"
                   aria-label="${song.title}${isLocked ? ' (locked)' : ''}"
                   data-song-id="${song.id}"
                   onclick="QuestMap.nodeClick('${song.id}')">
                <div class="qm-node-circle">
                  <span class="qm-node-icon">${nodeIcon}</span>
                  ${isCompleted ? `<span class="qm-node-stars">${stars}</span>` : ''}
                  ${isLocked ? '<span class="qm-node-lock">🔒</span>' : ''}
                </div>
                <div class="qm-node-label">${song.title}</div>
              </div>
            </div>`;
        });
      });

      // ── Bonus Songs section (always unlocked, displayed separately) ──
      const bonusSongs = SONGS.filter(s => s.isBonus);
      if (bonusSongs.length) {
        html += `
          <div class="questmap-world-banner world-banner--bonus questmap-bonus-section">
            <span class="world-banner-icon">⭐</span>
            <div>
              <div class="world-banner-title">Specjalne odblokowania</div>
              <div class="world-banner-subtitle">Graj kiedy chcesz — bez blokady</div>
            </div>
          </div>`;

        bonusSongs.forEach(song => {
          const isCompleted = completedSongs.has(song.id);
          let stars = '☆☆☆';
          try {
            const active = UserManager ? UserManager.getCurrentUser() : null;
            if (active && isCompleted) {
              const stored = localStorage.getItem(`littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`);
              if (stored) {
                const data = JSON.parse(stored);
                const prog = data.progress && data.progress[song.id];
                if (prog && prog.stars) stars = '★'.repeat(prog.stars) + '☆'.repeat(3 - prog.stars);
              }
            }
          } catch(e) {}

          const nodeIcon = isCompleted ? '✓' : '⭐';
          const side = nodeCount % 2 === 0 ? 'left' : 'right';
          nodeCount++;

          html += `
            <div class="questmap-connector questmap-connector--active"></div>
            <div class="questmap-row questmap-row--${side}">
              <div class="qm-node qm-node--current qm-node--bonus"
                   role="button" tabindex="0"
                   aria-label="${song.title} — Special Unlocked"
                   data-song-id="${song.id}"
                   onclick="QuestMap.nodeClick('${song.id}')">
                <div class="qm-node-circle">
                  <span class="qm-node-icon">${nodeIcon}</span>
                  ${isCompleted ? `<span class="qm-node-stars">${stars}</span>` : ''}
                </div>
                <div class="qm-node-label">${song.title}</div>
              </div>
            </div>`;
        });
      }

      container.innerHTML = html;
    }

    // Quest map public interface
    /* ──────────────────────────────────────────────────────────────
       HOME DASHBOARD RENDERER
       ────────────────────────────────────────────────────────────── */
    function renderHomeScreen() {
      const container = document.getElementById('home-screen-content');
      if (!container) return;

      // ── Load user data ──────────────────────────────────────────
      let userName = 'Student', userAvatar = '🎹';
      let stats = { notes: 0, streak: 0, bestStreak: 0, totalPracticeMinutes: 0, totalSessionsCompleted: 0 };
      let progressData = {};

      try {
        const user = typeof UserManager !== 'undefined' ? UserManager.getCurrentUser() : null;
        if (user) {
          userName    = user.profile.name;
          userAvatar  = user.profile.avatar || '🎹';
          const key   = `littlemaestro_${userName.toLowerCase().replace(/\s+/g,'_')}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          if (stored.stats)    stats        = { ...stats, ...stored.stats };
          if (stored.progress) progressData = stored.progress;
        }
      } catch(e) {}

      // ── Resolve song progress ───────────────────────────────────
      const songProgress = {}; // songId → stars (0-3)
      const songs = typeof SONGS !== 'undefined' ? SONGS : [];
      songs.forEach(s => { songProgress[s.id] = 0; });
      Object.entries(progressData).forEach(([sid, val]) => {
        const id = parseInt(sid, 10);
        if (!isNaN(id) && typeof val === 'object' && val !== null && val.stars > 0) {
          songProgress[id] = val.stars;
        }
      });
      const completedCount = Object.values(songProgress).filter(s => s > 0).length;

      // ── Determine "continue" song (first incomplete, skip bonus songs) ──
      const mainSongs = songs.filter(s => !s.isBonus);
      let continueSong = mainSongs[0];
      for (const s of mainSongs) {
        if (!songProgress[s.id] || songProgress[s.id] === 0) { continueSong = s; break; }
      }
      // If all complete, show last song
      if (!continueSong) continueSong = mainSongs[mainSongs.length - 1];

      // ── Time-of-day greeting ────────────────────────────────────
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? 'Dzień dobry' : hour < 17 ? 'Cześć' : 'Dobry wieczór';

      // ── Format practice time ────────────────────────────────────
      const mins  = stats.totalPracticeMinutes || 0;
      const timeDisplay = mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;

      // ── Stars HTML helper ───────────────────────────────────────
      const starsHtml = (earned) =>
        [1,2,3].map(i => `<span class="home-song-star ${i <= earned ? 'earned' : 'empty'}">${i <= earned ? '★' : '★'}</span>`).join('');

      // ── Render ──────────────────────────────────────────────────
      container.innerHTML = `

        <!-- Greeting banner -->
        <div class="home-greeting">
          <div class="home-avatar-wrap">${userAvatar}</div>
          <div class="home-greeting-text">
            <div class="home-greeting-hi">${timeGreeting}!</div>
            <div class="home-greeting-name">${userName}</div>
          </div>
          <div class="home-streak-badge">
            <div class="home-streak-num">🔥 ${stats.streak || 0}</div>
            <div class="home-streak-label">Seria dni</div>
          </div>
        </div>

        <!-- Continue button -->
        <button class="home-continue" onclick="if(typeof LessonEngine!=='undefined'){LessonEngine.startLesson(${continueSong?.id || 1});if(typeof showScreen!=='undefined')showScreen('lesson');}">
          <div class="home-continue-icon">🎵</div>
          <div class="home-continue-text">
            <div class="home-continue-label">Kontynuuj naukę</div>
            <div class="home-continue-title">${continueSong?.title || 'Hot Cross Buns'}</div>
          </div>
          <div class="home-continue-arrow">▶</div>
        </button>

        <!-- Stats row -->
        <div class="home-stats">
          <div class="home-stat-card">
            <span class="home-stat-icon">🎵</span>
            <span class="home-stat-num">${stats.notes || 0}</span>
            <span class="home-stat-label">Nuty</span>
          </div>
          <div class="home-stat-card">
            <span class="home-stat-icon">🎼</span>
            <span class="home-stat-num">${completedCount}</span>
            <span class="home-stat-label">Piosenki</span>
          </div>
          <div class="home-stat-card">
            <span class="home-stat-icon">⏱️</span>
            <span class="home-stat-num">${timeDisplay}</span>
            <span class="home-stat-label">Ćwiczenia</span>
          </div>
          <div class="home-stat-card">
            <span class="home-stat-icon">🏆</span>
            <span class="home-stat-num">${stats.bestStreak || stats.streak || 0}</span>
            <span class="home-stat-label">Najlepsze</span>
          </div>
        </div>

        <!-- Quick nav -->
        <div class="home-section-title">Odkrywaj</div>
        <div class="home-nav-grid">
          <button class="home-nav-card" onclick="if(typeof showScreen!=='undefined'){showScreen('questmap');if(typeof renderQuestMap!=='undefined')renderQuestMap();}">
            <span class="home-nav-card-icon">🗺️</span>
            <span class="home-nav-card-title">Mapa piosenek</span>
            <span class="home-nav-card-desc">Wybierz piosenkę i zacznij lekcję</span>
          </button>
          <button class="home-nav-card" onclick="if(typeof showScreen!=='undefined')showScreen('freeplay');">
            <span class="home-nav-card-icon">🎹</span>
            <span class="home-nav-card-title">Wolna gra</span>
            <span class="home-nav-card-desc">Graj co chcesz — dla zabawy</span>
          </button>
          <button class="home-nav-card" onclick="if(typeof showScreen!=='undefined')showScreen('trophyroom');">
            <span class="home-nav-card-icon">🏆</span>
            <span class="home-nav-card-title">Trofea</span>
            <span class="home-nav-card-desc">Twoje osiągnięcia</span>
          </button>
          <button class="home-nav-card" onclick="if(typeof showScreen!=='undefined')showScreen('precurriculum');" style="opacity:0.5;order:99;">
            <span class="home-nav-card-icon">📖</span>
            <span class="home-nav-card-title">Podstawy muzyki</span>
            <span class="home-nav-card-desc">Nuty, rytm i alfabet muzyczny</span>
          </button>
        </div>

        <!-- Song progress -->
        <div class="home-section-title">Postępy w piosenkach</div>
        <div class="home-songs-list">
          ${mainSongs.map((song, idx) => {
            const stars = songProgress[song.id] || 0;
            // Song is unlocked if first song, OR previous song was completed
            const prevStars = idx > 0 ? (songProgress[songs[idx-1]?.id] || 0) : 1;
            const isLocked = idx > 0 && prevStars === 0;
            return `
            <div class="home-song-row">
              <span class="home-song-emoji">${song.emoji || (idx===0?'🎵':idx===1?'🐑':idx===2?'⭐':'🎶')}</span>
              <div class="home-song-info">
                <div class="home-song-title">${song.title}</div>
                <div class="home-song-sub">${song.composer} · ${stars > 0 ? 'Ukończone' : isLocked ? 'Zablokowane' : 'W trakcie'}</div>
              </div>
              ${isLocked
                ? `<span class="home-song-locked">🔒</span>`
                : `<div class="home-song-stars">${starsHtml(stars)}</div>
                   <button class="home-song-play-btn" onclick="if(typeof LessonEngine!=='undefined'){LessonEngine.startLesson(${song.id});if(typeof showScreen!=='undefined')showScreen('lesson');}">▶</button>`
              }
            </div>`;
          }).join('')}
        </div>
      `;
    }

    window.QuestMap = window.QuestMap || {};
    const QuestMap = window.QuestMap;
    Object.assign(QuestMap, {
      render: renderQuestMap,
      nodeClick(songId) {
        if (!songId) return;
        songId = parseInt(songId, 10); // ensure number (HTML attrs arrive as strings)
        const song = typeof SONGS !== 'undefined' ? SONGS.find(s => s.id === songId) : null;
        if (!song) return;

        // Check if locked — read from progress[songId].stars (GamificationManager format)
        let completedSongs = new Set();
        try {
          const active = UserManager ? UserManager.getCurrentUser() : null;
          if (active) {
            const stored = localStorage.getItem(`littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`);
            if (stored) {
              const data = JSON.parse(stored);
              if (data.progress) {
                // Primary: GamificationManager.awardStars writes progress[songId].stars
                Object.entries(data.progress).forEach(([sid, val]) => {
                  const numId = parseInt(sid, 10);
                  if (!isNaN(numId) && typeof val === 'object' && val !== null && val.stars > 0) {
                    completedSongs.add(numId);
                  }
                });
                // Legacy fallback: songStars sub-object
                const songStars = data.progress.songStars || {};
                Object.entries(songStars).forEach(([sid, s]) => {
                  if (s && s > 0) completedSongs.add(parseInt(sid, 10));
                });
              }
            }
          }
        } catch(e) {}

        // Determine current song (first incomplete, non-bonus)
        let currentSongId = null;
        let found = false;
        (typeof SONGS !== 'undefined' ? SONGS : []).forEach(s => {
          if (!found && !s.isBonus && !completedSongs.has(s.id)) {
            currentSongId = s.id;
            found = true;
          }
        });

        // Bonus/always-unlocked songs skip the lock check entirely
        const isBonusSong = song.isBonus || song.alwaysUnlocked;
        const isLocked = !isBonusSong && !completedSongs.has(songId) && songId !== currentSongId;
        if (isLocked) {
          Melody.speak('Najpierw ukończ wcześniejsze piosenki! 🔒', 2000);
          Melody.setState('thinking');
          setTimeout(() => Melody.setState('idle'), 2500);
          return;
        }

        // Navigate to lesson screen with this song
        if (typeof showScreen === 'function') {
          showScreen('lesson');
        }

        // Wire the song into the lesson — set active song
        if (typeof LessonEngine !== 'undefined' && LessonEngine.loadSong) {
          LessonEngine.loadSong(songId);
        } else {
          // Fallback: just trigger SheetMusic render if available
          if (typeof SheetMusic !== 'undefined') {
            SheetMusic.render('lesson-sheet-music', songId);
          }
        }
      },
    });


    /* ────────────────────────────────────────────────────────────
       GAMIFICATION MANAGER
       ──────────────────────────────────────────────────────────── */
    const GamificationManager = (() => {

      const STREAK_MILESTONES = [3, 7, 14, 30];

      // ── Load current stats for active user ────────────────────
      function _loadStats() {
        try {
          const active = UserManager ? UserManager.getCurrentUser() : null;
          if (!active) return { notes: 0, streak: 0, stars: {}, completedSongs: {} };
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          return stored.stats || { notes: 0, streak: 0, stars: {}, completedSongs: {} };
        } catch(e) { return { notes: 0, streak: 0, stars: {}, completedSongs: {} }; }
      }

      // ── Save stats ────────────────────────────────────────────
      function _saveStats(stats) {
        try {
          const active = UserManager ? UserManager.getCurrentUser() : null;
          if (!active) return;
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          stored.stats = stats;
          localStorage.setItem(key, JSON.stringify(stored));
        } catch(e) {}
      }

      // ── Update HUD (header note + streak counters) ────────────
      function _updateHUD() {
        const stats = _loadStats();
        const noteEl   = document.querySelector('.js-notes');
        const streakEl = document.querySelector('.js-streak');
        if (noteEl)   noteEl.textContent   = (stats.notes || 0).toLocaleString();
        if (streakEl) streakEl.textContent = (stats.streak || 0);
      }

      // ── Award notes with floating animation ───────────────────
      function awardNotes(amount, reason) {
        if (!amount || amount <= 0) return;

        const stats = _loadStats();
        stats.notes = (stats.notes || 0) + amount;
        _saveStats(stats);
        _updateHUD();

        // Floating "+N ♪" animation near the HUD
        const noteEl = document.querySelector('.js-notes');
        const rect   = noteEl ? noteEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: 60 };

        const floater = document.createElement('div');
        floater.className = 'gam-float';
        floater.textContent = `+${amount} ♪`;
        floater.style.left = `${rect.left + rect.width / 2}px`;
        floater.style.top  = `${rect.top}px`;
        document.body.appendChild(floater);
        floater.addEventListener('animationend', () => floater.remove());
      }

      // ── Update streak (call once per play session) ─────────────
      function updateStreak() {
        const stats  = _loadStats();
        const today  = new Date().toDateString();
        const last   = stats.lastPlayDate;

        if (last === today) return; // Already counted today

        const yesterday = new Date(Date.now() - 864e5).toDateString();
        if (last === yesterday) {
          stats.streak = (stats.streak || 0) + 1;
        } else if (last !== today) {
          stats.streak = 1; // Reset streak
        }
        stats.lastPlayDate = today;
        _saveStats(stats);

        // Animate streak pill in header
        const streakEl = document.querySelector('.hdr-streak');
        if (streakEl) {
          streakEl.classList.remove('streak--flash');
          void streakEl.offsetWidth; // reflow
          streakEl.classList.add('streak--flash');
        }
        _updateHUD();

        // Check milestones
        STREAK_MILESTONES.forEach(milestone => {
          if (stats.streak === milestone) {
            setTimeout(() => showCelebration('streakMilestone', { streak: milestone }), 500);
          }
        });
      }

      // ── Award stars for a completed song ──────────────────────
      function awardStars(songId, starCount) {
        if (!songId || !starCount) return;
        starCount = Math.min(3, Math.max(1, starCount));

        try {
          const active = UserManager ? UserManager.getCurrentUser() : null;
          if (!active) return;
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');

          if (!stored.progress) stored.progress = {};
          const existing = stored.progress[songId] || {};
          const prevStars = existing.stars || 0;

          // Only upgrade stars, never downgrade
          if (starCount > prevStars) {
            stored.progress[songId] = {
              ...existing,
              stars: starCount,
              completedAt: existing.completedAt || new Date().toISOString(),
              lastAttempt: new Date().toISOString(),
            };
            localStorage.setItem(key, JSON.stringify(stored));
          }
        } catch(e) {}

        // Refresh trophy room if visible
        if (document.getElementById('screen-trophyroom') &&
            !document.getElementById('screen-trophyroom').classList.contains('screen--hidden')) {
          renderTrophyRoom();
        }
        // Refresh quest map if visible
        if (document.getElementById('screen-questmap') &&
            !document.getElementById('screen-questmap').classList.contains('screen--hidden')) {
          QuestMap.render();
        }
      }

      // ── Show celebration overlay ───────────────────────────────
      function showCelebration(type, data = {}) {
        const TYPES = {
          songPass: {
            emoji:    '🎉',
            title:    'Song Complete!',
            subtitle: 'Great job! You learned a new song!',
            btn:      'Keep Going! →',
          },
          worldComplete: {
            emoji:    '🏆',
            title:    'World Complete!',
            subtitle: 'You\'ve mastered all the songs!',
            btn:      'Next World! 🌟',
          },
          streakMilestone: {
            emoji:    '🔥',
            title:    `${data.streak || ''}-Day Streak!`,
            subtitle: 'You\'re on fire! Keep practicing!',
            btn:      'Awesome! 💪',
          },
          threeStars: {
            emoji:    '🌟',
            title:    'Three Stars!',
            subtitle: 'Perfect performance! You\'re a star!',
            btn:      'Woohoo! ⭐',
          },
        };

        const cfg = TYPES[type] || TYPES.songPass;

        // Stars row (for songPass / threeStars)
        const showStars = (type === 'songPass' || type === 'threeStars');
        const starCount = data.stars || (type === 'threeStars' ? 3 : 1);
        const starsHtml = showStars
          ? `<div class="celebration-stars">
               ${Array.from({length:3}, (_,i) => `<span class="celebration-star">${i < starCount ? '★' : '☆'}</span>`).join('')}
             </div>`
          : '';

        // Remove any existing overlay
        document.querySelectorAll('.celebration-overlay, .confetti-wrap').forEach(el => el.remove());

        // Confetti burst
        _spawnConfetti();

        // Build overlay
        const overlay = document.createElement('div');
        overlay.className = 'celebration-overlay';
        overlay.innerHTML = `
          <div class="celebration-card">
            <div class="celebration-emoji">${cfg.emoji}</div>
            <div class="celebration-title">${cfg.title}</div>
            ${starsHtml}
            <div class="celebration-subtitle">${cfg.subtitle}</div>
            <button class="celebration-btn" onclick="this.closest('.celebration-overlay').remove(); document.querySelector('.confetti-wrap')?.remove();">${cfg.btn}</button>
          </div>`;

        document.body.appendChild(overlay);

        // Melody celebrates
        if (typeof Melody !== 'undefined') {
          Melody.reactCelebrate();
          setTimeout(() => Melody.setState('excited'), 3000);
          setTimeout(() => Melody.setState('idle'), 5000);
        }
      }

      // ── Confetti particles ────────────────────────────────────
      function _spawnConfetti() {
        const colors = ['#7C3AED','#F59E0B','#10B981','#EF4444','#60A5FA','#F472B6'];
        const wrap   = document.createElement('div');
        wrap.className = 'confetti-wrap';
        document.body.appendChild(wrap);

        for (let i = 0; i < 60; i++) {
          const piece = document.createElement('div');
          piece.className = 'confetti-piece';
          piece.style.cssText = `
            left: ${Math.random() * 100}%;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-duration: ${1.5 + Math.random() * 2}s;
            animation-delay: ${Math.random() * 0.8}s;
            width: ${6 + Math.random() * 8}px;
            height: ${6 + Math.random() * 8}px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
          `;
          wrap.appendChild(piece);
        }

        // Auto-remove confetti after all pieces fall
        setTimeout(() => wrap.remove(), 4500);
      }

      // ── Initialize HUD on load ────────────────────────────────
      function init() {
        _updateHUD();
      }

      return {
        init,
        awardNotes,
        updateStreak,
        awardStars,
        showCelebration,
      };
    })();


    /* ────────────────────────────────────────────────────────────
       TROPHY ROOM — Grid of completed song cards
       ──────────────────────────────────────────────────────────── */
    function renderTrophyRoom() {
      const container = document.getElementById('trophy-grid-container');
      if (!container) return;

      // Get completed songs from localStorage
      let completedEntries = [];
      try {
        const active = UserManager ? UserManager.getCurrentUser() : null;
        if (active) {
          const key    = `littlemaestro_${active.profile.name.toLowerCase().replace(/\s+/g,'_')}`;
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          const prog   = stored.progress || {};
          Object.entries(prog).forEach(([songId, data]) => {
            if (data.stars && data.stars > 0) {
              const song = (typeof SONGS !== 'undefined' ? SONGS : []).find(s => s.id === songId);
              completedEntries.push({ songId, song, data });
            }
          });
          // Sort by completedAt descending
          completedEntries.sort((a, b) => {
            const ta = a.data.completedAt ? new Date(a.data.completedAt).getTime() : 0;
            const tb = b.data.completedAt ? new Date(b.data.completedAt).getTime() : 0;
            return tb - ta;
          });
        }
      } catch(e) {}

      // Update count badge
      const countEl = document.getElementById('trophy-count');
      if (countEl) countEl.textContent = `${completedEntries.length} Piosenek`;

      // Empty state
      if (completedEntries.length === 0) {
        container.innerHTML = `
          <div class="trophy-empty">
            <div class="trophy-empty-icon">🏆</div>
            <div class="trophy-empty-title">Brak trofeów!</div>
            <div class="trophy-empty-subtitle">Ukończ piosenki na Mapie piosenek<br>żeby zdobyć trofea.</div>
          </div>`;
        return;
      }

      // Build grid
      const WORLD_NAMES = { 1:'Świat 1', 2:'Świat 2', 3:'Świat 3', 4:'Świat 4', 5:'Świat 5', 6:'Świat 6' };

      const cards = completedEntries.map(({ songId, song, data }) => {
        const stars     = data.stars || 0;
        const starsStr  = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        const title     = song ? song.title : songId;
        const icon      = song ? (song.emoji || '🎵') : '🎵';
        const worldNum  = song ? song.world : '';
        const worldName = WORLD_NAMES[worldNum] || '';
        const dateStr   = data.completedAt
          ? new Date(data.completedAt).toLocaleDateString('pl-PL', { month:'short', day:'numeric' })
          : '';

        return `
          <div class="trophy-card" data-song-id="${songId}">
            <div class="trophy-card-badge">✓</div>
            <div class="trophy-card-icon">${icon}</div>
            <div class="trophy-card-title">${title}</div>
            <div class="trophy-card-world">${worldName}</div>
            <div class="trophy-card-stars">${starsStr}</div>
            ${dateStr ? `<div class="trophy-card-date">${dateStr}</div>` : ''}
          </div>`;
      }).join('');

      container.innerHTML = `<div class="trophy-grid">${cards}</div>`;
    }


    /* ────────────────────────────────────────────────────────────
       PHASE 8 — DOMContentLoaded wiring
       ──────────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {

      // Mount Melody in lesson center panel
      Melody.mount('lesson-panel-melody');

      // Mount small Melody companion next to nav streak
      const hdrRight = document.querySelector('.hdr-right');
      if (hdrRight) {
        const companion = document.createElement('div');
        companion.id        = 'melody-nav';
        companion.className = 'melody-nav-companion';
        companion.title     = 'Melody';
        companion.setAttribute('role', 'img');
        companion.setAttribute('aria-label', 'Melody mascot');
        companion.onclick = () => {
          Melody.setState('excited');
          Melody.speak('Hej! 🎵', 2000);
          setTimeout(() => Melody.setState('idle'), 2500);
        };
        // Insert before first child of hdr-right
        hdrRight.insertBefore(companion, hdrRight.firstChild);
        Melody.mount('melody-nav', { small: true });
      }

      // Initialize gamification HUD
      GamificationManager.init();

      // Render quest map when that screen becomes visible
      // Hook into showScreen if it exists
      const _origShowScreen = typeof showScreen === 'function' ? showScreen : null;
      if (_origShowScreen) {
        window.showScreen = function(screenId) {
          _origShowScreen(screenId);
          if (screenId === 'questmap')   { setTimeout(QuestMap.render, 220); }
          if (screenId === 'trophyroom') { setTimeout(renderTrophyRoom, 220); }
          if (screenId === 'lesson')     { Melody.setState('excited'); Melody.speak('Zaczynamy! 🎵', 2000); setTimeout(()=>Melody.setState('idle'),2500); }
        };
      }

      // Initial renders if screens already visible
      QuestMap.render();
      renderTrophyRoom();

      // Introduce Melody after short delay (only on first-ever load)
