    /* ============================================================
       LITTLE MAESTRO — PHASE 7
       VexFlow Sheet Music Renderer
       ============================================================ */

    const SheetMusic = (() => {

      // ── Colors (light notation on dark background) ────────────────
      const BASE_COLOR    = '#C8BFE0'; // soft lavender — default notation
      const GOLD_COLOR    = '#F59E0B'; // highlighted / current note
      const GREY_COLOR    = '#3D3555'; // greyed-out surrounding notes
      const CORRECT_COLOR = '#10B981'; // green checkmark
      const WRONG_COLOR   = '#EF4444'; // red wrong indicator
      const STEM_RATIO    = 0.92;      // shorten stems slightly for aesthetics

      // Duration → VexFlow code
      const DUR_MAP = {
        'whole':          'w',
        'half':           'h',
        'quarter':        'q',
        'eighth':         '8',
        'dotted-half':    'hd',
        'dotted-quarter': 'qd',
      };

      // Duration → beats (for measure splitting)
      const BEAT_MAP = {
        'whole': 4, 'half': 2, 'quarter': 1, 'eighth': 0.5,
        'dotted-half': 3, 'dotted-quarter': 1.5,
      };

      // Internal state
      const _s = {
        VF:           null,   // VexFlow API reference
        containerId:  null,
        svgEl:        null,
        songId:       null,
        song:         null,
        noteRefs:     [],     // { vfNote, svgEl, globalIdx, songNote }
        corrects:     new Set(),
        mode:         'full',
        showNames:    false,
        showFingers:  false,
        hlIndex:      -1,
      };


      // ── VexFlow bootstrap ─────────────────────────────────────────
      function _vf() {
        if (_s.VF) return _s.VF;
        // VexFlow 3.x exposes Vex.Flow global
        if (typeof Vex !== 'undefined' && Vex.Flow) { _s.VF = Vex.Flow; return _s.VF; }
        // Fallback: newer bundle may use VexFlow directly
        if (typeof VexFlow !== 'undefined') { _s.VF = VexFlow; return _s.VF; }
        return null;
      }


      // ── Note conversion helpers ───────────────────────────────────

      function _toVFKey(noteName) {
        // 'C4' → 'c/4'  |  'F#4' → 'f#/4'  |  'Bb4' → 'bb/4'
        const m = noteName.match(/^([A-G])([#b]?)(\d)$/i);
        if (!m) return 'c/4';
        return m[1].toLowerCase() + m[2] + '/' + m[3];
      }

      function _toVFDur(dur) {
        return DUR_MAP[dur] || 'q';
      }

      function _getAccidental(noteName) {
        const m = noteName.match(/^[A-G]([#b])/);
        return m ? m[1] : null;
      }


      // ── Group flat note list into measures (4/4 = 4 beats each) ──
      function _groupMeasures(notes, bpm = 4) {
        const measures = [];
        let current = [];
        let beats   = 0;

        notes.forEach(n => {
          const b = BEAT_MAP[n.duration] || 1;
          current.push(n);
          beats += b;
          // Close measure when full (or overfilled — soft mode)
          if (beats >= bpm - 0.001) {
            measures.push(current);
            current = [];
            beats   = 0;
          }
        });
        if (current.length > 0) measures.push(current);
        return measures;
      }


      // ── Apply base color to all SVG notation ──────────────────────
      function _colorAll() {
        if (!_s.svgEl) return;
        _s.svgEl.querySelectorAll('path, rect, text, polyline, polygon').forEach(el => {
          const fill   = el.getAttribute('fill');
          const stroke = el.getAttribute('stroke');

          if (!fill || fill === 'black' || fill === '#000000') {
            el.setAttribute('fill', BASE_COLOR);
          }
          if (stroke && (stroke === 'black' || stroke === '#000000')) {
            el.setAttribute('stroke', BASE_COLOR);
          }
        });
      }


      // ── Color a specific note's SVG group ─────────────────────────
      function _colorNote(ref, color, strokeColor) {
        if (!ref || !ref.vfNote) return;
        const el = ref.vfNote.attrs && ref.vfNote.attrs.el;
        if (!el) return;
        el.querySelectorAll('path, text, rect, polygon, polyline').forEach(p => {
          p.setAttribute('fill',   color);
          p.setAttribute('stroke', strokeColor || color);
        });
      }


      // ── Main render ───────────────────────────────────────────────
      function render(containerId, songId, options = {}) {
        const VF = _vf();
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!VF) {
          container.innerHTML = '<div class="sheet-error"><div class="ph-icon" style="font-size:32px;opacity:.3;">🎼</div><span>Ładowanie nut…</span></div>';
          // Retry up to 20 times (10 s) waiting for VexFlow CDN to load
          let _retries = 0;
          const _retry = setInterval(() => {
            _retries++;
            const VF2 = _vf();
            if (VF2) {
              clearInterval(_retry);
              render(containerId, songId, options);
            } else if (_retries >= 20) {
              clearInterval(_retry);
              container.innerHTML = '<div class="sheet-error"><div class="ph-icon" style="font-size:32px;opacity:.3;">🎼</div><span>Nuty niedostępne (brak internetu)</span></div>';
            }
          }, 500);
          return;
        }

        const song = SONGS.find(s => s.id === songId);
        if (!song) {
          container.innerHTML = '<div class="sheet-error"><span>Nie znaleziono piosenki</span></div>';
          return;
        }

        container.innerHTML = '<div class="sheet-loading"><div class="sheet-loading-spinner"></div><span>Renderowanie…</span></div>';

        // Defer one frame so loading spinner renders before heavy work
        requestAnimationFrame(() => {
          try {
            _doRender(VF, container, song, containerId, songId, options);
          } catch(err) {
            console.error('[SheetMusic] VexFlow error:', err);
            container.innerHTML = '<div class="sheet-error"><div class="ph-icon" style="font-size:32px;opacity:.3;">🎼</div><span>Nie można wyrenderować nut</span></div>';
          }
        });
      }


      function _doRender(VF, container, song, containerId, songId, options) {
        container.innerHTML = '';

        _s.containerId = containerId;
        _s.songId      = songId;
        _s.song        = song;
        _s.noteRefs    = [];
        _s.corrects    = new Set();
        _s.hlIndex     = -1;
        _s.showNames   = options.showNoteNames   !== undefined ? options.showNoteNames   : _s.showNames;
        _s.showFingers = options.showFingers      !== undefined ? options.showFingers     : _s.showFingers;

        // Update song title in header
        const titleEl = document.getElementById('sheet-song-title');
        if (titleEl) titleEl.textContent = song.title;

        // Show/hide notation legend
        const legendEl = document.getElementById('notation-legend');
        if (legendEl) legendEl.classList.toggle('legend--hidden', song.world !== 1);

        // Use only right-hand notes (treble clef) for Worlds 1–3
        // World 4+ adds bass clef — handled in Phase 10; placeholder for now
        const rhNotes = song.notes.filter(n => n.hand === 'right' || !n.hand);

        // Group into measures (4/4 time)
        const measures = _groupMeasures(rhNotes, 4);

        // Layout parameters
        const containerW    = container.clientWidth  || 580;
        const measPerRow    = 2;
        const marginLeft    = 12;
        const marginRight   = 12;
        const rowH          = 140;   // px per stave row
        const staveY_offset = 60;    // space above stave line within row
        const clefWidth     = 90;    // extra width used by clef+time sig on first stave
        const clefWidthMid  = 30;    // extra on row-start clefs

        const usableW   = containerW - marginLeft - marginRight;
        const staveW    = Math.floor(usableW / measPerRow);
        const numRows   = Math.ceil(measures.length / measPerRow);
        const totalH    = numRows * rowH + 30; // extra bottom padding

        // Create renderer
        const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
        renderer.resize(containerW, totalH);
        const ctx = renderer.getContext();
        ctx.setFont('Arial', 10, '');

        const svgEl = container.querySelector('svg');
        _s.svgEl = svgEl;

        let globalNoteIdx = 0;

        // Draw rows
        for (let row = 0; row < numRows; row++) {
          const rowMeasures = measures.slice(row * measPerRow, (row + 1) * measPerRow);
          const rowY        = row * rowH + staveY_offset;
          let x             = marginLeft;

          rowMeasures.forEach((mNotes, mIdx) => {
            const isFirstEver = (row === 0 && mIdx === 0);
            const isRowStart  = (mIdx === 0);

            // Extra space consumed by clef/time-sig decoration
            const extraLeft = isFirstEver ? clefWidth : isRowStart ? clefWidthMid : 0;
            const drawW     = staveW - extraLeft;

            // Create stave
            const stave = new VF.Stave(x, rowY, staveW);
            stave.setContext(ctx);

            if (isFirstEver) {
              stave.addClef('treble').addTimeSignature('4/4');
            } else if (isRowStart) {
              stave.addClef('treble');
            }

            // Draw barlines (auto) and stave lines
            stave.draw();

            // Build VF note objects
            const vfNotes = mNotes.map((n, i) => {
              const key = _toVFKey(n.note);
              const dur = _toVFDur(n.duration);

              const vfNote = new VF.StaveNote({
                clef: 'treble',
                keys: [key],
                duration: dur,
              });

              // Accidental
              const acc = _getAccidental(n.note);
              if (acc) {
                vfNote.addAccidental(0, new VF.Accidental(acc));
              }

              // Note name below (if enabled) — use Annotation
              if (_s.showNames) {
                try {
                  const noteLetter = typeof noteDisplayPL === 'function' ? noteDisplayPL(n.note) : n.note.replace(/\d/, '');
                  const ann = new VF.Annotation(noteLetter);
                  ann.setFont('Arial', 9, 'bold');
                  if (ann.setVerticalJustification) {
                    ann.setVerticalJustification(VF.Annotation.VerticalJustify
                      ? VF.Annotation.VerticalJustify.BOTTOM : 3);
                  }
                  vfNote.addModifier(0, ann);
                } catch(e) { /* skip if API differs */ }
              }

              // Finger number above (if enabled)
              if (_s.showFingers && n.finger) {
                try {
                  const fing = new VF.Annotation(String(n.finger));
                  fing.setFont('Arial', 10, 'bold');
                  if (fing.setVerticalJustification) {
                    fing.setVerticalJustification(VF.Annotation.VerticalJustify
                      ? VF.Annotation.VerticalJustify.TOP : 1);
                  }
                  vfNote.addModifier(0, fing);
                } catch(e) { /* skip if API differs */ }
              }

              // Store reference
              const globalIdx = globalNoteIdx + i;
              _s.noteRefs.push({ vfNote, globalIdx, songNote: n });

              return vfNote;
            });

            globalNoteIdx += mNotes.length;

            // Voice
            const voice = new VF.Voice({
              num_beats:  4,
              beat_value: 4,
            });
            voice.setMode(VF.Voice.Mode ? VF.Voice.Mode.SOFT : 2);
            voice.addTickables(vfNotes);

            // Format
            const fmtW = staveW - (isFirstEver ? clefWidth + 10 : isRowStart ? clefWidthMid + 8 : 10);
            new VF.Formatter()
              .joinVoices([voice])
              .format([voice], fmtW);

            // Draw voice
            voice.draw(ctx, stave);

            // Beam eighth notes automatically
            try {
              const beams = VF.Beam.generateBeams(vfNotes);
              beams.forEach(b => b.setContext(ctx).draw());
            } catch(e) { /* skip beaming errors */ }

            x += staveW;
          });
        }

        // Recolor all notation for dark background
        _colorAll();

        // Apply options-provided highlight
        if (options.highlightIndex != null && options.highlightIndex >= 0) {
          highlightNote(options.highlightIndex);
        }
      }


      // ── Public API ────────────────────────────────────────────────

      function highlightNote(index) {
        _s.hlIndex = index;
        if (!_s.svgEl) return;

        _s.noteRefs.forEach(ref => {
          if (_s.corrects.has(ref.globalIdx)) return; // preserve correct color
          _colorNote(ref, ref.globalIdx === index ? GOLD_COLOR : GREY_COLOR);
        });

        // Scroll highlighted note into view
        const target = _s.noteRefs.find(r => r.globalIdx === index);
        if (target && target.vfNote.attrs && target.vfNote.attrs.el) {
          const el = target.vfNote.attrs.el;
          const container = document.getElementById(_s.containerId);
          if (container && el.getBoundingClientRect) {
            const noteRect = el.getBoundingClientRect();
            const contRect = container.getBoundingClientRect();
            if (noteRect.top < contRect.top || noteRect.bottom > contRect.bottom) {
              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
      }

      function markCorrect(index) {
        _s.corrects.add(index);
        const ref = _s.noteRefs.find(r => r.globalIdx === index);
        if (ref) _colorNote(ref, CORRECT_COLOR);
      }

      function markIncorrect(index) {
        const ref = _s.noteRefs.find(r => r.globalIdx === index);
        if (!ref) return;
        _colorNote(ref, WRONG_COLOR);
        setTimeout(() => {
          if (_s.corrects.has(index)) {
            _colorNote(ref, CORRECT_COLOR);
          } else if (_s.hlIndex === index) {
            _colorNote(ref, GOLD_COLOR);
          } else {
            _colorNote(ref, GREY_COLOR);
          }
        }, 1000);
      }

      function setMode(mode) {
        _s.mode = mode;
        // 'follow' — 4-bar scroll view — wired fully in Phase 10
        // 'full'   — entire song scrollable
      }

      function showNoteNamesBelow(bool) {
        _s.showNames = bool;
        if (_s.songId && _s.containerId) {
          render(_s.containerId, _s.songId);
        }
      }

      function showFingerNumbers(bool) {
        _s.showFingers = bool;
        if (_s.songId && _s.containerId) {
          render(_s.containerId, _s.songId);
        }
      }

      return {
        render,
        highlightNote,
        markCorrect,
        markIncorrect,
        setMode,
        showNoteNamesBelow,
        showFingerNumbers,
      };
    })();
