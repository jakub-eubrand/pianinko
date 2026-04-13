    /* ============================================================
       LITTLE MAESTRO — PHASE 4: MIDI CONNECTION MANAGER
       ============================================================ */

// ================================================================
// PHASE 4 — MIDI CONNECTION MANAGER
// Web MIDI API — Yamaha CLP-735R priority, hot-plug detection
// ================================================================

// ── MIDI note number → note name ─────────────────────────────────
const MIDI_NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function midiNoteToInfo(midiNumber) {
  const octave   = Math.floor(midiNumber / 12) - 1;
  const semitone = midiNumber % 12;
  const note     = MIDI_NOTE_NAMES[semitone];
  return {
    note,
    octave,
    fullNote:   `${note}${octave}`,
    midiNumber,
  };
}

// ── MIDIManager ──────────────────────────────────────────────────
const MIDIManager = (() => {
  let _access      = null;
  let _activeInput = null;
  let _status      = 'disconnected';
  let _deviceName  = null;

  const _noteOnCallbacks  = [];
  const _noteOffCallbacks = [];

  // MIDI test log — rolling array of last 10 events
  const _eventLog = [];
  const LOG_MAX   = 10;

  // ── internal: dispatch MIDI message ──
  function _handleMessage(event) {
    const [statusByte, noteNum, velocity] = event.data;
    const command  = statusByte & 0xF0;
    const noteInfo = midiNoteToInfo(noteNum);

    if (command === 0x90 && velocity > 0) {
      // Note On
      const payload = { ...noteInfo, velocity };
      _noteOnCallbacks.forEach(cb => cb(payload));
      _logEvent(`${noteInfo.fullNote} ON  vel:${velocity}`);

    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      // Note Off (0x80, or 0x90 with vel=0 — running status)
      const payload = { ...noteInfo, velocity: 0 };
      _noteOffCallbacks.forEach(cb => cb(payload));
      _logEvent(`${noteInfo.fullNote} OFF`);
    }
    // Other messages (CC, pitch bend, etc.) are silently ignored in v1
  }

  // ── internal: choose best input from MIDI access ──
  function _findBestInput(inputs) {
    // 1. Prefer any device with "yamaha" in the name (case-insensitive)
    for (const input of inputs.values()) {
      if (input.name.toLowerCase().includes('yamaha')) return input;
    }
    // 2. Fall back to first available input
    const first = inputs.values().next().value;
    return first || null;
  }

  // ── internal: attach to a specific MIDI input device ──
  function _connectInput(input) {
    if (_activeInput) {
      _activeInput.onmidimessage = null;    // detach old listener
    }
    _activeInput               = input;
    _activeInput.onmidimessage = _handleMessage;
    _deviceName                = input.name;
    _status                    = 'connected';
    _logEvent(`Connected: ${input.name}`);
    _updateStatusUI();
  }

  // ── internal: scan all inputs and connect to best one ──
  function _scanInputs() {
    if (!_access) return;
    const best = _findBestInput(_access.inputs);
    if (best) {
      _connectInput(best);
    } else {
      if (_activeInput) _activeInput.onmidimessage = null;
      _activeInput = null;
      _deviceName  = null;
      _status      = 'disconnected';
      _updateStatusUI();
    }
  }

  // ── internal: push to event log and refresh test panel ──
  function _logEvent(msg) {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
    _eventLog.unshift(`${ts}  ${msg}`);
    if (_eventLog.length > LOG_MAX) _eventLog.pop();
    _updateTestPanel();
  }

  // ── public: init ─────────────────────────────────────────────────
  // Returns Promise<boolean> — true if MIDI access granted
  function init() {
    if (!navigator.requestMIDIAccess) {
      _status = 'unsupported';
      _updateStatusUI();
      return Promise.resolve(false);
    }

    return navigator.requestMIDIAccess({ sysex: false })
      .then(access => {
        _access = access;
        _scanInputs();

        // Hot-plug: fires when any MIDI device connects or disconnects
        _access.onstatechange = (event) => {
          if (event.port.type === 'input') {
            // Small delay so the device is fully ready before we read it
            setTimeout(_scanInputs, 250);
          }
        };
        return true;
      })
      .catch(err => {
        _status = (err.name === 'SecurityError') ? 'permission-denied' : 'disconnected';
        _logEvent(`MIDI error: ${err.message}`);
        _updateStatusUI();
        return false;
      });
  }

  // ── public: onNoteOn ─────────────────────────────────────────────
  // callback(payload) where payload = { note, octave, fullNote, velocity, midiNumber }
  function onNoteOn(callback) {
    if (typeof callback === 'function') _noteOnCallbacks.push(callback);
  }

  // ── public: onNoteOff ────────────────────────────────────────────
  function onNoteOff(callback) {
    if (typeof callback === 'function') _noteOffCallbacks.push(callback);
  }

  // ── public: getStatus ────────────────────────────────────────────
  // Returns: "connected" | "disconnected" | "unsupported" | "permission-denied"
  function getStatus() {
    return _status;
  }

  // ── public: getDeviceName ────────────────────────────────────────
  // Returns device name string or null
  function getDeviceName() {
    return _deviceName;
  }

  // ── public: disconnect ───────────────────────────────────────────
  function disconnect() {
    if (_activeInput) {
      _activeInput.onmidimessage = null;
      _activeInput = null;
    }
    _status     = 'disconnected';
    _deviceName = null;
    _updateStatusUI();
    _logEvent('Disconnected manually');
  }

  // ── public: getLog ───────────────────────────────────────────────
  function getLog() {
    return [..._eventLog];
  }

  return { init, onNoteOn, onNoteOff, getStatus, getDeviceName, disconnect, getLog };
})();


// ================================================================
// CONNECTION STATUS UI
// Pill badge in header — auto-updates on state change
// ================================================================

function _updateStatusUI() {
  const pill   = document.getElementById('midi-status-pill');
  const status = MIDIManager.getStatus();
  const name   = MIDIManager.getDeviceName();
  if (!pill) return;

  // Remove all state classes
  pill.className = 'midi-pill';

  let label, cls;

  switch (status) {
    case 'connected':
      // Shorten known long device names for the badge
      const displayName = name && name.includes('Yamaha')
        ? 'CLP-735'
        : (name || 'Piano');
      label = `🎹 ${displayName} Connected`;
      cls   = 'midi-pill--connected';
      break;
    case 'unsupported':
      label = '🎹 Use Chrome for MIDI';
      cls   = 'midi-pill--info';
      break;
    case 'permission-denied':
      label = '🎹 MIDI Permission Denied';
      cls   = 'midi-pill--warn';
      break;
    default: // disconnected
      label = '🎹 Pianino niepodłączone';
      cls   = 'midi-pill--disconnected';
  }

  pill.textContent = label;
  pill.classList.add(cls);
}

// Show / hide the connection instructions modal
function showMIDIModal() {
  const overlay = document.getElementById('midi-modal-overlay');
  if (overlay) {
    overlay.classList.add('midi-modal--visible');
    overlay.setAttribute('aria-hidden', 'false');
  }
}
function hideMIDIModal() {
  const overlay = document.getElementById('midi-modal-overlay');
  if (overlay) {
    overlay.classList.remove('midi-modal--visible');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

// Toggle MIDI test panel (called from settings)
function toggleMIDITestPanel() {
  const panel = document.getElementById('midi-test-panel');
  if (!panel) return;
  const isVisible = panel.classList.toggle('midi-test--visible');
  const btn = document.getElementById('midi-test-toggle-btn');
  if (btn) btn.textContent = isVisible ? 'Hide MIDI Log' : 'Show MIDI Log';
}

// Refresh the scrolling test log display
function _updateTestPanel() {
  const log = document.getElementById('midi-test-log');
  if (!log) return;
  const events = MIDIManager.getLog();
  if (events.length === 0) {
    log.innerHTML = '<span class="midi-log-empty">Czekam na sygnał MIDI…</span>';
  } else {
    log.innerHTML = events.map(e =>
      `<div class="midi-log-entry">${e}</div>`
    ).join('');
  }
}


// ================================================================
// AUTO-INIT: attempt MIDI connection on page load
// (Will prompt for permission on first run in Chrome)
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialise status pill immediately so it shows correct default state
  _updateStatusUI();

  // Wire pill click → modal (when disconnected/unsupported)
  const pill = document.getElementById('midi-status-pill');
  if (pill) {
    pill.addEventListener('click', () => {
      const s = MIDIManager.getStatus();
      if (s === 'connected') return; // no modal when already connected
      showMIDIModal();
    });
  }

  // Wire modal close buttons
  document.querySelectorAll('.midi-modal-close').forEach(btn => {
    btn.addEventListener('click', hideMIDIModal);
  });

  // Close modal on overlay click
  const overlay = document.getElementById('midi-modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) hideMIDIModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideMIDIModal();
  });

  // Keep test panel dot in sync with pill state
  function refreshTestPanelStatus() {
    const dot   = document.getElementById('midi-test-dot');
    const label = document.getElementById('midi-test-status-label');
    const s = MIDIManager.getStatus();
    if (!dot || !label) return;
    dot.className = 'midi-test-dot';
    if (s === 'connected') {
      dot.classList.add('dot-connected');
      label.textContent = MIDIManager.getDeviceName() || 'Connected';
    } else if (s === 'unsupported') {
      dot.classList.add('dot-unsupported');
      label.textContent = 'Web MIDI nie jest wspierane';
    } else {
      dot.classList.add('dot-disconnected');
      label.textContent = 'Pianino niepodłączone';
    }
  }
  // Patch _updateStatusUI to also refresh test panel dot
  const _origUpdateStatusUI = _updateStatusUI;
  window._updateStatusUIWithDot = () => { _origUpdateStatusUI(); refreshTestPanelStatus(); };

  // Attempt MIDI init — browser will prompt for permission
  MIDIManager.init().then(granted => {
    if (!granted) _updateStatusUI();
  });
});

// ── Polish note name display ──────────────────────────────────────
// Internal data stays English (C,D,E,F,G,A,B). Display uses Polish/German system.
// B→H, Bb→B, sharps→is suffix, flats→es suffix (special cases: Es, As, B)
function noteDisplayPL(noteName) {
  if (!noteName) return '';
  const n = noteName.replace(/\d+$/, ''); // strip octave
  const map = {
    'B': 'H', 'B#': 'His',
    'Bb': 'B', 'A#': 'B',
    'C#': 'Cis', 'Db': 'Des',
    'D#': 'Dis', 'Eb': 'Es',
    'F#': 'Fis', 'Gb': 'Ges',
    'G#': 'Gis', 'Ab': 'As',
  };
  return map[n] || n;
}

