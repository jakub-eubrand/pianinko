// ================================================================
// PART B — NOTE FREQUENCIES
// Equal temperament, C2-C6, all chromatic notes + enharmonic aliases
// Formula: freq = 440 * 2^((midiNote - 69) / 12)
// ================================================================

const NOTE_FREQUENCIES = {
  'A2': 110.0,
  'A#2': 116.5409,
  'Ab2': 103.8262,
  'B2': 123.4708,
  'Bb2': 116.5409,
  'C2': 65.4064,
  'C#2': 69.2957,
  'D2': 73.4162,
  'D#2': 77.7817,
  'Db2': 69.2957,
  'E2': 82.4069,
  'Eb2': 77.7817,
  'F2': 87.3071,
  'F#2': 92.4986,
  'G2': 97.9989,
  'G#2': 103.8262,
  'Gb2': 92.4986,
  'A3': 220.0,
  'A#3': 233.0819,
  'Ab3': 207.6523,
  'B3': 246.9417,
  'Bb3': 233.0819,
  'C3': 130.8128,
  'C#3': 138.5913,
  'D3': 146.8324,
  'D#3': 155.5635,
  'Db3': 138.5913,
  'E3': 164.8138,
  'Eb3': 155.5635,
  'F3': 174.6141,
  'F#3': 184.9972,
  'G3': 195.9977,
  'G#3': 207.6523,
  'Gb3': 184.9972,
  'A4': 440.0,
  'A#4': 466.1638,
  'Ab4': 415.3047,
  'B4': 493.8833,
  'Bb4': 466.1638,
  'C4': 261.6256,
  'C#4': 277.1826,
  'D4': 293.6648,
  'D#4': 311.127,
  'Db4': 277.1826,
  'E4': 329.6276,
  'Eb4': 311.127,
  'F4': 349.2282,
  'F#4': 369.9944,
  'G4': 391.9954,
  'G#4': 415.3047,
  'Gb4': 369.9944,
  'A5': 880.0,
  'A#5': 932.3275,
  'Ab5': 830.6094,
  'B5': 987.7666,
  'Bb5': 932.3275,
  'C5': 523.2511,
  'C#5': 554.3653,
  'D5': 587.3295,
  'D#5': 622.254,
  'Db5': 554.3653,
  'E5': 659.2551,
  'Eb5': 622.254,
  'F5': 698.4565,
  'F#5': 739.9888,
  'G5': 783.9909,
  'G#5': 830.6094,
  'Gb5': 739.9888,
  'A6': 1760.0,
  'A#6': 1864.655,
  'Ab6': 1661.2188,
  'B6': 1975.5332,
  'Bb6': 1864.655,
  'C6': 1046.5023,
  'C#6': 1108.7305,
  'D6': 1174.6591,
  'D#6': 1244.5079,
  'Db6': 1108.7305,
  'E6': 1318.5102,
  'Eb6': 1244.5079,
  'F6': 1396.9129,
  'F#6': 1479.9777,
  'G6': 1567.9817,
  'G#6': 1661.2188,
  'Gb6': 1479.9777,
};


// ================================================================
// PART C — AUDIO ENGINE
// Real piano samples via soundfont-player (Salamander Grand Piano)
// Fallback: Web Audio API triangle-wave synthesis if CDN unavailable
// ================================================================

const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let activeNodes = [];
  let playbackTimer = null;

  // ── Soundfont (real piano samples) ───────────────────────────────
  let _sfInstrument = null;   // loaded soundfont-player instrument
  let _sfLoading    = false;
  let _sfFailed     = false;

  function _loadSoundfont() {
    if (_sfLoading || _sfInstrument || _sfFailed) return;
    if (typeof Soundfont === 'undefined') {
      setTimeout(_loadSoundfont, 800);   // wait for script to parse
      return;
    }
    if (!ctx) return;  // AudioContext not yet created
    _sfLoading = true;
    Soundfont.instrument(ctx, 'acoustic_grand_piano', {
      format     : 'mp3',
      soundfont  : 'MusyngKite',
      destination: masterGain,           // FIX: route through master gain for volume control
      nameToUrl  : (name, sf, fmt) =>
        `https://gleitz.github.io/midi-js-soundfonts/${sf}/${name}-${fmt}.js`  // FIX: correct CDN URL
    }).then(inst => {
      _sfInstrument = inst;
      _sfLoading    = false;
      console.log('[AudioEngine] 🎹 Piano samples loaded');
    }).catch(err => {
      console.warn('[AudioEngine] Soundfont unavailable, using synth:', err.message);
      _sfFailed  = true;
      _sfLoading = false;
    });
  }

  // Duration in beats → milliseconds
  function beatMs(bpm) {
    return 60000 / bpm; // ms per quarter note
  }
  function durationMs(durName, bpm) {
    const q = beatMs(bpm);
    switch (durName) {
      case 'whole':          return q * 4;
      case 'half':           return q * 2;
      case 'quarter':        return q;
      case 'eighth':         return q / 2;
      case 'dotted-quarter': return q * 1.5;
      case 'dotted-half':    return q * 3;
      default:               return q;
    }
  }

  // ── init ──────────────────────────────────────────────────────────
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.connect(ctx.destination);
    _loadSoundfont();  // start loading piano samples in the background
  }

  // ── playNote ──────────────────────────────────────────────────────
  // noteName : "C4", "G#4", "Bb3", etc.
  // durationMs: number (milliseconds)
  // velocity  : 0-127 (MIDI-style; default 80)
  function playNote(noteName, durMs, velocity = 80) {
    init();

    // ── Real piano samples (soundfont-player) ──
    if (_sfInstrument) {
      try {
        const masterVol = masterGain ? masterGain.gain.value : 0.7;
        const gainVal   = (velocity / 127) * masterVol * 1.4;
        _sfInstrument.play(noteName, ctx.currentTime, {
          duration: (durMs / 1000) * 0.9,
          gain    : gainVal,
        });
      } catch(e) {}
      return;
    }

    // ── Synth fallback ──────────────────────────────────────────────
    if (!NOTE_FREQUENCIES[noteName]) return;

    const freq    = NOTE_FREQUENCIES[noteName];
    const gainVal = (velocity / 127) * 0.55;
    const now     = ctx.currentTime;

    // Primary oscillator — triangle wave (warm, piano-like)
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    // Harmonic overtone — sine at 2× freq, lower gain
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    // Gain envelope for primary oscillator
    const env1 = ctx.createGain();
    env1.gain.setValueAtTime(0, now);
    // Attack: 8ms
    env1.gain.linearRampToValueAtTime(gainVal, now + 0.008);
    // Decay: 120ms to sustain
    env1.gain.linearRampToValueAtTime(gainVal * 0.65, now + 0.128);
    // Hold at sustain until near end
    const releaseAt = now + (durMs / 1000) - 0.04;
    if (releaseAt > now + 0.128) {
      env1.gain.setValueAtTime(gainVal * 0.65, releaseAt);
    }
    // Release: 400ms
    env1.gain.linearRampToValueAtTime(0, releaseAt + 0.4);

    // Gain envelope for overtone (always quieter)
    const env2 = ctx.createGain();
    env2.gain.setValueAtTime(0, now);
    env2.gain.linearRampToValueAtTime(gainVal * 0.18, now + 0.008);
    env2.gain.linearRampToValueAtTime(gainVal * 0.08, now + 0.3);
    env2.gain.linearRampToValueAtTime(0, releaseAt + 0.4);

    // Routing: osc → env → master
    osc1.connect(env1); env1.connect(masterGain);
    osc2.connect(env2); env2.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + (durMs / 1000) + 0.45);
    osc2.stop(now + (durMs / 1000) + 0.45);

    activeNodes.push(osc1, osc2, env1, env2);
  }

  // ── playSong ──────────────────────────────────────────────────────
  // songId     : number (1-30)
  // tempo      : "turtle"|"normal"|"rabbit"|"rocket"
  // onNotePlay : (noteIndex, noteObject) => void  — fires as each note plays
  // onComplete : () => void
  // returns    : { stop: () => void }
  function playSong(songId, tempo = 'normal', onNotePlay, onComplete) {
    const song = SONGS.find(s => s.id === songId);
    if (!song || song.notes.length === 0) {
      if (onComplete) onComplete();
      return { stop: () => {} };
    }
    init();

    const bpm   = song.bpm[tempo] || song.bpm.normal;
    const notes = song.notes;
    let stopped  = false;
    let timeouts = [];

    // Separate RH and LH notes, then schedule by position
    // We schedule all notes with accumulated time offsets
    // Notes are stored sequentially per hand — we interleave by type
    // For single-hand songs, simple sequential playback
    // For two-hand songs, we schedule both hands independently

    const rhNotes = notes.filter(n => n.hand === 'right');
    const lhNotes = notes.filter(n => n.hand === 'left');

    // Detect whether this song uses absolute beat positions (t property)
    const usesAbsTime = notes.length > 0 && notes[0].t !== undefined;
    const beatMs = 60000 / bpm; // ms per quarter-note beat

    function scheduleHand(noteList, onNoteCallback) {
      if (usesAbsTime) {
        // Absolute-time mode: each note has a `t` beat position from song start
        noteList.forEach((noteObj, idx) => {
          const dur = durationMs(noteObj.duration, bpm);
          const tMs = noteObj.t * beatMs;
          const tid = setTimeout(() => {
            if (stopped) return;
            playNote(noteObj.note, dur * 0.92, 80);
            if (onNoteCallback) onNoteCallback(idx, noteObj);
          }, tMs);
          timeouts.push(tid);
        });
        if (noteList.length === 0) return 0;
        const last = noteList[noteList.length - 1];
        return last.t * beatMs + durationMs(last.duration, bpm);
      } else {
        // Sequential mode: accumulate elapsed time per note (legacy)
        let elapsed = 0;
        noteList.forEach((noteObj, idx) => {
          const dur = durationMs(noteObj.duration, bpm);
          const t   = elapsed;
          const tid = setTimeout(() => {
            if (stopped) return;
            playNote(noteObj.note, dur * 0.92, 80);
            if (onNoteCallback) onNoteCallback(idx, noteObj);
          }, t);
          timeouts.push(tid);
          elapsed += dur;
        });
        return elapsed;
      }
    }

    const rhDuration = scheduleHand(rhNotes, (idx, noteObj) => {
      if (onNotePlay) onNotePlay(idx, noteObj);
    });
    scheduleHand(lhNotes, null);

    // onComplete fires after the longest hand finishes
    const lhDuration = usesAbsTime
      ? (lhNotes.length ? lhNotes[lhNotes.length-1].t * beatMs + durationMs(lhNotes[lhNotes.length-1].duration, bpm) : 0)
      : lhNotes.reduce((acc, n) => acc + durationMs(n.duration, bpm), 0);
    const totalDur = Math.max(rhDuration, lhDuration);

    const completeTid = setTimeout(() => {
      if (!stopped && onComplete) onComplete();
    }, totalDur + 200);
    timeouts.push(completeTid);

    function stop() {
      stopped = true;
      timeouts.forEach(clearTimeout);
      AudioEngine.stop();
    }

    return { stop };
  }

  // ── playNoteInstant ───────────────────────────────────────────────
  // Single note, immediate playback — for key taps and flashcards
  function playNoteInstant(noteName, velocity = 90) {
    init();
    if (_sfInstrument) {
      try {
        const masterVol = masterGain ? masterGain.gain.value : 0.7;
        _sfInstrument.play(noteName, ctx.currentTime, {
          duration: 0.6,
          gain    : (velocity / 127) * masterVol * 1.4,
        });
      } catch(e) {}
      return;
    }
    playNote(noteName, 500, velocity);
  }

  // ── tick ─────────────────────────────────────────────────────────
  // Short click for metronome — accent beat is higher-pitched
  function tick(accent = false) {
    init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1400 : 1000;
    env.gain.setValueAtTime(accent ? 0.25 : 0.12, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  // ── setVolume ─────────────────────────────────────────────────────
  function setVolume(level) {
    init();
    // level: 0.0–1.0
    masterGain.gain.linearRampToValueAtTime(
      Math.max(0, Math.min(1, level)),
      ctx.currentTime + 0.05
    );
  }

  // ── stop ─────────────────────────────────────────────────────────
  function stop() {
    if (!ctx) return;
    activeNodes.forEach(node => {
      try { node.disconnect(); } catch(e) {}
    });
    activeNodes = [];
    if (playbackTimer) {
      clearTimeout(playbackTimer);
      playbackTimer = null;
    }
  }

  // ── previewScale ──────────────────────────────────────────────────
  // Utility: play a C major scale ascending (for testing / screen load)
  function previewScale(octave = 4) {
    init();
    const scale = ['C','D','E','F','G','A','B',`C`];
    const freqs = scale.map((n, i) => n + (i < 7 ? octave : octave+1));
    freqs.forEach((note, i) => {
      setTimeout(() => playNoteInstant(note, 75), i * 200);
    });
  }

  // Public API
  return {
    init,
    playNote,
    playSong,
    playNoteInstant,
    tick,
    setVolume,
    stop,
    previewScale,
    get context()        { return ctx; },
    get isReady()        { return ctx !== null; },
    get samplesLoaded()  { return _sfInstrument !== null; },
  };
})();
