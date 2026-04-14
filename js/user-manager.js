    /* ============================================================
       LITTLE MAESTRO — PHASE 5
       User Management System + Login Screen + Screen Transitions
       ============================================================ */

    // ── UserManager ──────────────────────────────────────────────
    const UserManager = (() => {
      const INDEX_KEY = 'littlemaestro__index';  // double underscore = not a username
      const PREFIX    = 'littlemaestro_';
      let _current    = null;

      function _key(name) {
        return PREFIX + name.toLowerCase().replace(/\s+/g, '_');
      }

      function _defaultProfile(name, avatar, color) {
        return {
          profile: {
            name,
            avatar,
            favoriteColor: color,
            dateCreated: new Date().toISOString(),
          },
          progress: {
            currentWorld: 1,
            currentSong:  1,
            completedSongs: [],
            songStars: {},
            flashcardHistory: {},
          },
          stats: {
            totalPracticeMinutes: 0,
            totalSessionsCompleted: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastPracticeDate: null,
            totalMusicNotes: 0,
            musicNotesSpent: 0,
          },
          parentNotes: [],
          settings: {
            tempoPreference: 'turtle',
            sessionLength: 20,
            leftHandUnlocked: false,
            showNoteNames: false,
            parentPin: '1234',
          },
        };
      }

      function _getIndex() {
        try { return JSON.parse(localStorage.getItem(INDEX_KEY)) || []; }
        catch { return []; }
      }

      function _saveIndex(arr) {
        localStorage.setItem(INDEX_KEY, JSON.stringify(arr));
      }

      function getAllUsers() {
        return _getIndex()
          .map(name => {
            try { return JSON.parse(localStorage.getItem(_key(name))); }
            catch { return null; }
          })
          .filter(Boolean);
      }

      function createUser(name, avatar, color) {
        const idx = _getIndex();
        if (idx.length >= 6) throw new Error('Maksymalnie 6 profili');
        if (idx.some(n => n.toLowerCase() === name.toLowerCase())) {
          throw new Error('Uczeń o imieniu "' + name + '" już istnieje');
        }
        const profile = _defaultProfile(name, avatar, color);
        localStorage.setItem(_key(name), JSON.stringify(profile));
        idx.push(name);
        _saveIndex(idx);
        return profile;
      }

      function loadUser(name) {
        const idx = _getIndex();
        const found = idx.find(n => n.toLowerCase() === name.toLowerCase());
        if (!found) throw new Error('Nie znaleziono profilu: "' + name + '"');
        const data = JSON.parse(localStorage.getItem(_key(found)));
        _current = data;
        sessionStorage.setItem('lm_active_user', found);
        // Update streak on load
        _checkStreak(data);
        return data;
      }

      function _checkStreak(data) {
        const today = new Date().toDateString();
        const last  = data.stats.lastPracticeDate
          ? new Date(data.stats.lastPracticeDate).toDateString()
          : null;
        if (last === today) return; // already practiced today
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (last === yesterday) {
          // Streak continues
        } else if (last !== null) {
          data.stats.currentStreak = 0; // missed a day
        }
      }

      function saveUser() {
        if (!_current) return;
        localStorage.setItem(_key(_current.profile.name), JSON.stringify(_current));
      }

      function deleteUser(name) {
        const idx    = _getIndex();
        const newIdx = idx.filter(n => n.toLowerCase() !== name.toLowerCase());
        localStorage.removeItem(_key(name));
        _saveIndex(newIdx);
        if (_current && _current.profile.name.toLowerCase() === name.toLowerCase()) {
          _current = null;
          sessionStorage.removeItem('lm_active_user');
        }
      }

      function exportUser(name) {
        const idx   = _getIndex();
        const found = idx.find(n => n.toLowerCase() === name.toLowerCase());
        if (!found) throw new Error('Nie znaleziono profilu');
        return localStorage.getItem(_key(found));
      }

      function importUser(jsonString) {
        const data = JSON.parse(jsonString);
        if (!data.profile || !data.profile.name) throw new Error('Nieprawidłowe dane profilu');
        const name = data.profile.name;
        const idx  = _getIndex();
        if (!idx.some(n => n.toLowerCase() === name.toLowerCase())) {
          if (idx.length >= 6) throw new Error('Maksymalnie 6 profili');
          idx.push(name);
          _saveIndex(idx);
        }
        localStorage.setItem(_key(name), JSON.stringify(data));
        return data;
      }

      function getCurrentUser() {
        if (_current) return _current;
        const stored = sessionStorage.getItem('lm_active_user');
        if (stored) {
          try {
            _current = JSON.parse(localStorage.getItem(_key(stored)));
            return _current;
          } catch { return null; }
        }
        return null;
      }

      return {
        getAllUsers, createUser, loadUser, saveUser,
        deleteUser, exportUser, importUser, getCurrentUser,
      };
    })();


    // ── showScreen ───────────────────────────────────────────────
    function showScreen(screenId) {
      const screens  = document.querySelectorAll('.screen');
      const current  = Array.from(screens).find(s => s.classList.contains('active'));
      // Accept both 'questmap' and 'screen-questmap' forms
      let next = document.getElementById(screenId);
      if (!next) next = document.getElementById('screen-' + screenId);
      if (!next || next === current) return;
      // Normalize to short form for wrapper chain checks
      if (screenId.startsWith('screen-')) screenId = screenId.slice(7);

      const nav    = document.getElementById('bottom-nav');
      const header = document.getElementById('global-header');
      const isLogin = screenId === 'login';

      const doSwap = () => {
        if (current) current.classList.remove('active');
        next.classList.add('active');
        next.style.opacity = '0';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          next.style.transition = 'opacity 200ms ease-out';
          next.style.opacity    = '1';
          setTimeout(() => {
            next.style.opacity    = '';
            next.style.transition = '';
          }, 210);
        }));
        // Nav bar active item — data-target may be "screen-X" or short "X"
        document.querySelectorAll('.nav-item').forEach(btn => {
          const t  = btn.dataset.target || '';
          const ts = t.startsWith('screen-') ? t.slice(7) : t;
          const on = ts === screenId || t === screenId;
          btn.classList.toggle('active', on);
          on ? btn.setAttribute('aria-current', 'page') : btn.removeAttribute('aria-current');
        });
        // Show / hide nav + header
        if (nav)    nav.style.display    = isLogin ? 'none' : '';
        if (header) header.style.display = isLogin ? 'none' : '';
        sessionStorage.setItem('lm_current_screen', screenId);
      };

      if (current) {
        current.style.transition = 'opacity 200ms ease-out';
        current.style.opacity    = '0';
        setTimeout(doSwap, 200);
      } else {
        doSwap();
      }
    }


    // ── Login screen renderer ─────────────────────────────────────
    const AVATAR_OPTIONS = ['🐱','🐶','🦊','🐰','🦋','🐸','🦄','🐨'];
    const COLOR_OPTIONS  = [
      '#7C3AED', '#EF4444', '#F59E0B',
      '#10B981', '#0EA5E9', '#EC4899',
    ];

    function _escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
              .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function renderLoginScreen() {
      const grid = document.querySelector('.avatar-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const users = UserManager.getAllUsers();

      users.forEach(user => {
        const { name, avatar, favoriteColor } = user.profile;
        const { currentWorld, currentSong }   = user.progress;
        const { currentStreak }               = user.stats;
        const color = favoriteColor || '#7C3AED';
        const glow  = color + '44';

        const card  = document.createElement('div');
        card.className = 'avatar-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', name + ', World ' + currentWorld + ' Song ' + currentSong);
        card.style.cssText = '--card-color:' + color + ';--card-glow:' + glow + ';';

        const streakHtml = currentStreak > 0
          ? '<span class="ava-streak" aria-label="' + currentStreak + ' dni z rzędu">🔥 ' + currentStreak + '</span>'
          : '';

        card.innerHTML =
          '<div class="ava-circle" style="--card-color:' + color + ';" aria-hidden="true">' + _escHtml(avatar) + '</div>' +
          '<span class="ava-name">' + _escHtml(name) + '</span>' +
          '<span class="ava-progress">Świat ' + currentWorld + ' · Piosenka ' + currentSong + '</span>' +
          streakHtml +
          '<div class="ava-accent-bar"></div>' +
          '<button class="ava-delete-btn" aria-label="Usuń ' + _escHtml(name) + '" title="Usuń ucznia">🗑</button>';

        // Click to load
        card.addEventListener('click', e => {
          if (e.target.closest('.ava-delete-btn')) return;
          _loadUserWithAnimation(name, card);
        });
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            _loadUserWithAnimation(name, card);
          }
        });

        // Long press (1 second) → delete
        let pressTimer = null;
        card.addEventListener('pointerdown', () => {
          pressTimer = setTimeout(() => _confirmDeleteUser(name), 1000);
        });
        ['pointerup','pointerleave','pointermove'].forEach(ev =>
          card.addEventListener(ev, () => clearTimeout(pressTimer))
        );

        // Delete btn
        card.querySelector('.ava-delete-btn').addEventListener('click', e => {
          e.stopPropagation();
          _confirmDeleteUser(name);
        });

        grid.appendChild(card);
      });

      // Add Student card (only if < 6 users)
      if (users.length < 6) {
        const addCard = document.createElement('div');
        addCard.className = 'avatar-card add-card';
        addCard.id = 'add-student-card';
        addCard.setAttribute('role', 'listitem');
        addCard.setAttribute('tabindex', '0');
        addCard.setAttribute('aria-label', 'Add a new student');
        addCard.innerHTML =
          '<div class="add-circle" aria-hidden="true">＋</div>' +
          '<span class="add-label">Add Student</span>';
        addCard.addEventListener('click', openAddForm);
        addCard.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAddForm(); }
        });
        grid.appendChild(addCard);
      }

      // Wire parent mode button
      const parentBtn = document.querySelector('.login-parent-btn');
      if (parentBtn) {
        parentBtn.onclick = () => _showPinModal(
          () => showScreen('parentmode'),
          'Wpisz PIN rodzica'
        );
      }

      // First-time experience
      if (users.length === 0) _showWelcomeOverlay();
    }


    // ── Load user with card loading animation ─────────────────────
    function _loadUserWithAnimation(name, card) {
      card.classList.add('card-loading');
      setTimeout(() => {
        try {
          const user = UserManager.loadUser(name);
          // Update header
          const nameEl   = document.querySelector('.hdr-student-name');
          const avatarEl = document.querySelector('.hdr-student-avatar');
          if (nameEl)   nameEl.textContent   = user.profile.name;
          if (avatarEl) avatarEl.textContent  = user.profile.avatar;
          // New profile → go to quest map (Sanah world visible immediately)
          if (window._isNewProfile) {
            window._isNewProfile = false;
            showScreen('questmap');
          } else {
            showScreen('home');
          }
        } catch(err) {
          console.error('[LM] Load user failed:', err);
          card.classList.remove('card-loading');
        }
      }, 320);
    }


    // ── Add Student form ──────────────────────────────────────────
    function openAddForm() {
      const form = document.getElementById('add-student-form');
      if (!form) return;
      // Reset state
      form.querySelector('.form-name-input').value = '';
      form.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
      form.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      form._selectedAvatar = null;
      form._selectedColor  = null;
      const errEl = form.querySelector('.form-error');
      if (errEl) errEl.style.display = 'none';
      // Hide Add card
      const addCard = document.getElementById('add-student-card');
      if (addCard) addCard.style.display = 'none';
      form.classList.add('form--visible');
      setTimeout(() => form.querySelector('.form-name-input').focus(), 80);
    }

    function closeAddForm() {
      const form = document.getElementById('add-student-form');
      if (form) form.classList.remove('form--visible');
      renderLoginScreen(); // re-render to restore Add card
    }

    function _submitAddForm() {
      const form   = document.getElementById('add-student-form');
      const name   = form.querySelector('.form-name-input').value.trim();
      const avatar = form._selectedAvatar;
      const color  = form._selectedColor;
      const errEl  = form.querySelector('.form-error');

      if (!name)   { errEl.textContent = 'Wpisz imię.';               errEl.style.display = 'block'; return; }
      if (!avatar) { errEl.textContent = 'Wybierz awatar.';           errEl.style.display = 'block'; return; }
      if (!color)  { errEl.textContent = 'Wybierz kolor.';            errEl.style.display = 'block'; return; }
      errEl.style.display = 'none';

      try {
        UserManager.createUser(name, avatar, color);
        form.classList.remove('form--visible');
        window._isNewProfile = true; // flag: skip home, go to Sanah
        renderLoginScreen();
        // Auto-load the newly created user
        setTimeout(() => {
          const cards = document.querySelectorAll('.avatar-card:not(.add-card)');
          const last  = cards[cards.length - 1];
          if (last) _loadUserWithAnimation(name, last);
        }, 150);
      } catch(err) {
        errEl.textContent   = err.message;
        errEl.style.display = 'block';
      }
    }


    // ── PIN modal ─────────────────────────────────────────────────
    function _showPinModal(onSuccess, message) {
      const modal = document.getElementById('pin-modal');
      if (!modal) {
        // Fallback: browser prompt
        const pin = prompt((message || '') + '\n\nWpisz PIN rodzica:');
        const users = UserManager.getAllUsers();
        const validPin = users.length > 0 && users[0].settings
          ? (users[0].settings.parentPin || '1234') : '1234';
        if (pin === validPin) onSuccess();
        return;
      }
      const msgEl = modal.querySelector('.pin-modal-msg');
      if (msgEl) msgEl.textContent = message || '';
      const input = modal.querySelector('.pin-input');
      if (input)  input.value = '';
      const errEl = modal.querySelector('.pin-error');
      if (errEl)  errEl.style.display = 'none';
      modal._onSuccess = onSuccess;
      modal.classList.add('pin-modal--visible');
      setTimeout(() => { if (input) input.focus(); }, 100);
    }

    function _hidePinModal() {
      const modal = document.getElementById('pin-modal');
      if (modal) modal.classList.remove('pin-modal--visible');
    }

    function _submitPin() {
      const modal  = document.getElementById('pin-modal');
      const input  = modal.querySelector('.pin-input');
      const errEl  = modal.querySelector('.pin-error');
      const entered = input ? input.value.trim() : '';
      const users   = UserManager.getAllUsers();
      const validPin = users.length > 0 && users[0].settings
        ? (users[0].settings.parentPin || '1234') : '1234';
      if (entered === validPin) {
        _hidePinModal();
        if (modal._onSuccess) modal._onSuccess();
      } else {
        if (errEl) errEl.style.display = 'block';
        if (input) { input.value = ''; input.focus(); }
        setTimeout(() => { if (errEl) errEl.style.display = 'none'; }, 2000);
      }
    }


    // ── Delete confirmation ───────────────────────────────────────
    function _confirmDeleteUser(name) {
      _showPinModal(() => {
        if (confirm('Usunąć "' + name + '"? Tej operacji nie można cofnąć.')) {
          UserManager.deleteUser(name);
          renderLoginScreen();
        }
      }, 'Wpisz PIN rodzica żeby usunąć "' + name + '"');
    }


    // ── First-time welcome overlay ────────────────────────────────
    function _showWelcomeOverlay() {
      const overlay = document.getElementById('welcome-overlay');
      if (!overlay) { openAddForm(); return; }
      overlay.classList.add('welcome--visible');
      setTimeout(() => {
        overlay.classList.remove('welcome--visible');
        setTimeout(() => openAddForm(), 300);
      }, 2400);
    }


    // ── Build the Add-Student form (called once on DOM ready) ─────
    function _buildAddForm() {
      const form = document.getElementById('add-student-form');
      if (!form) return;

      // Avatar picker
      const pickerEl = form.querySelector('.avatar-picker');
      if (pickerEl) {
        AVATAR_OPTIONS.forEach(emoji => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'avatar-opt';
          btn.textContent = emoji;
          btn.title = 'Wybierz ' + emoji;
          btn.addEventListener('click', () => {
            form.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            form._selectedAvatar = emoji;
          });
          pickerEl.appendChild(btn);
        });
      }

      // Color swatches
      const swatchEl = form.querySelector('.color-swatch-grid');
      if (swatchEl) {
        COLOR_OPTIONS.forEach(hex => {
          const sw = document.createElement('button');
          sw.type = 'button';
          sw.className = 'color-swatch';
          sw.style.background = hex;
          sw.setAttribute('aria-label', 'Color ' + hex);
          sw.title = hex;
          sw.addEventListener('click', () => {
            form.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            sw.classList.add('selected');
            form._selectedColor = hex;
          });
          swatchEl.appendChild(sw);
        });
      }
    }


    // ── Boot ──────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
      _buildAddForm();
      renderLoginScreen();

      // Nav bar clicks
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.target;
          if (target) showScreen(target);
        });
      });

      // PIN modal keyboard
      const pinInput = document.querySelector('#pin-modal .pin-input');
      if (pinInput) {
        pinInput.addEventListener('keydown', e => {
          if (e.key === 'Enter') _submitPin();
          if (e.key === 'Escape') _hidePinModal();
        });
      }

      // Close PIN modal on overlay click
      const pinModal = document.getElementById('pin-modal');
      if (pinModal) {
        pinModal.addEventListener('click', e => {
          if (e.target === pinModal) _hidePinModal();
        });
      }

      // On page load, hide bottom-nav and header (login screen is first)
      const nav    = document.getElementById('bottom-nav');
      const header = document.getElementById('global-header');
      if (nav)    nav.style.display    = 'none';
      if (header) header.style.display = 'none';

      // Restore session if user was mid-session
      const savedUser = sessionStorage.getItem('lm_active_user');
      if (savedUser) {
        try {
          const user = UserManager.loadUser(savedUser);
          const nameEl   = document.querySelector('.hdr-student-name');
          const avatarEl = document.querySelector('.hdr-student-avatar');
          if (nameEl)   nameEl.textContent  = user.profile.name;
          if (avatarEl) avatarEl.textContent = user.profile.avatar;
          if (nav)    nav.style.display    = '';
          if (header) header.style.display = '';
          const savedScreen = sessionStorage.getItem('lm_current_screen');
          if (savedScreen && savedScreen !== 'screen-login') {
            showScreen(savedScreen);
          } else {
            showScreen('home');
          }
        } catch(e) {
          sessionStorage.removeItem('lm_active_user');
        }
      }
    });
