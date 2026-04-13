        parentBtn.addEventListener('click', () => {
          if (typeof showScreen === 'function') showScreen('parentmode');
        });
      }

      // ── 11. Export keepsake from parent data tab ──────────────
      // Patch ParentDashboard data tab to include keepsake export
      const _origBuildData = typeof ParentDashboard !== 'undefined' && ParentDashboard._buildData;

