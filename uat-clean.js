/**
 * Fortifai UAT Universal Executive De-Clutter Engine (uat-clean.js)
 */
(function () {
  const CLEAN_CSS = `
    b, strong, h1, h2, h3, h4, th { font-weight: 600 !important; }
    .wm, .serif-mark { font-family: 'DM Sans', -apple-system, sans-serif !important; font-style: normal !important; }

    header > div, .hbar, .topbar, .hdr, .app-header, .top-bar {
      flex-wrap: nowrap !important;
      padding-top: 9px !important;
      padding-bottom: 9px !important;
    }
    .tt-sub, .htenant, .huser, .hdr-sub, .header-sub, .brand-sub,
    .subtitle, .sub-head, .replica-pill, .audit-pill,
    header .hbtn, .hchrome > button.hbtn {
      display: none !important;
    }

    .kpi-top .tag, .kpi-top .badge, .kpi-top .pill,
    .kpi-badge, .kpi-foot, .kpi-footer, .kpi-meta, .card-foot, .metric-foot,
    [class*="kpi"] [class*="badge"],
    [class*="kpi"] [class*="pill"],
    [class*="kpi-foot"],
    [class*="metric-foot"] {
      display: none !important;
    }
    .kpi-sub, [class*="kpi-sub"], [class*="metric-sub"] {
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      font-size: 11.5px !important;
    }

    .band-h .hint,
    .panel .psub, .panel-sub, .card-sub, .sec-sub, .section-sub,
    .panel-h > .tag, .panel-h > .badge, .card-head > .tag,
    .warnbox, .boundary-box, .gts-note, .gtsnote, .pat-note, .pat-scope, .methodology-note,
    .pipe-stage .ps-meta,
    .wf-row .wf-lbl small,
    small.sub, small.desc, .micro-note, .footnote {
      display: none !important;
    }

    .tab .t-pill, .tab .badge, .tab .count,
    .nav-tab span, [role="tab"] .badge, [role="tab"] .pill {
      display: none !important;
    }

    .suite-card .sc-owner,
    .suite-card .sc-head .tag,
    .suite-card .sc-foot span:first-child,
    .eb-header .sub, .eb-header > span.mono,
    .eb-top .eb-src, .eb-body, .eb-foot > span.mono,
    #waveActionTable td:first-child > div:nth-child(2) {
      display: none !important;
    }
    .suite-card .sc-foot, .eb-foot {
      justify-content: flex-end !important;
      border-top: none !important;
      padding-top: 4px !important;
      margin-top: 6px !important;
    }
  `;

  function injectStyles() {
    if (!document.head || document.getElementById('fortifai-uat-clean-css')) return;
    const style = document.createElement('style');
    style.id = 'fortifai-uat-clean-css';
    style.textContent = CLEAN_CSS;
    document.head.appendChild(style);
  }

  const HEADER_HIDE_PATTERNS = [
    'ask sara', 'ask kuber', 'ask crystal', 'ask moneta', 'ask aegis', 'ask veritas', 'ask argus', 'ask agent', '⌘k',
    'board report', 'board dossier', 'board pack',
    'export', '.xlsx', '.xls', '.csv',
    'live sap', 'read-only', 'external audit', '? guide', 'user guide', 'methodology'
  ];

  function cleanDynamicDOM() {
    document.querySelectorAll('button, a, span, div').forEach(el => {
      if (el.dataset.uatCleaned) return;
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < 115 && rect.height > 14 && rect.height < 46 && el.children.length <= 2) {
        const txt = (el.textContent || '').trim().toLowerCase();
        if (txt.includes('usd') || txt.includes('inr') || txt === '₹ cr' || el.tagName === 'SELECT') return;
        if (HEADER_HIDE_PATTERNS.some(p => txt.includes(p))) {
          el.style.setProperty('display', 'none', 'important');
          el.dataset.uatCleaned = '1';
        }
      }
    });

    document.querySelectorAll('button, .tab, .nav-btn, [role="tab"]').forEach(tab => {
      const rect = tab.getBoundingClientRect();
      if (rect.top >= 35 && rect.top < 150 && rect.height < 56) {
        tab.querySelectorAll('span, b, small, em').forEach(b => {
          const t = (b.textContent || '').trim();
          if (/^\(?\d+\)?$/.test(t)) {
            b.style.setProperty('display', 'none', 'important');
          }
        });
        tab.childNodes.forEach(n => {
          if (n.nodeType === 3) {
            n.textContent = n.textContent.replace(/^\s*\d+\.\s*/, '').replace(/\s*\(\d+\)\s*$/, '');
          }
        });
      }
    });

    document.querySelectorAll('p, div, small, span').forEach(el => {
      if (el.children.length === 0 && !el.closest('.drawer, .modal-card, [class*="modal"], [class*="drawer"]')) {
        const txt = (el.textContent || '').trim();
        if (!txt) return;
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize || '13');
        if (fontSize <= 11.5 && txt.length > 75 && !el.closest('td.mono, th, code')) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });

    const entSel = document.getElementById('entFilter');
    if (entSel && entSel.options.length >= 1 && entSel.options[0].text.includes('Global Consolidated')) {
      entSel.options[0].text = 'Scope: All Entities';
      if (entSel.options[1]) entSel.options[1].text = 'North America (USA02)';
      if (entSel.options[2]) entSel.options[2].text = 'Latin America (MEX03)';
      if (entSel.options[3]) entSel.options[3].text = 'India & APAC (IND01)';
    }
  }

  function runAll() {
    injectStyles();
    cleanDynamicDOM();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }
  window.addEventListener('load', () => {
    runAll();
    setTimeout(runAll, 200);
  });

  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(cleanDynamicDOM, 60);
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
})();
