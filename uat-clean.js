/**
 * Fortifai UAT Universal Executive De-Clutter + Currency Sync Engine (uat-clean.js v4)
 */
(function () {
  const CLEAN_CSS = `
    b, strong, h1, h2, h3, h4, th { font-weight: 600 !important; }
    .wm, .serif-mark { font-family: 'DM Sans', -apple-system, sans-serif !important; font-style: normal !important; }

    /* 1. Single-Row Sleek Agent Topbars & Hide Redundant Chrome */
    header > div, .hbar, .topbar, .hdr, .app-header, .top-bar, .nav-header {
      flex-wrap: nowrap !important;
      padding-top: 9px !important;
      padding-bottom: 9px !important;
    }
    .tt-sub, .htenant, .huser, .hdr-sub, .header-sub, .brand-sub,
    .subtitle, .sub-head, .replica-pill, .audit-pill, .sap-pill, .live-pill,
    header .hbtn, .hchrome > button.hbtn {
      display: none !important;
    }

    /* 2. Clean 3-Element KPI Cards */
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

    /* 3. Strip Small-Font Explanations, Subtitles & Warnboxes */
    .band-h .hint,
    .panel .psub, .panel-sub, .card-sub, .sec-sub, .section-sub,
    .panel-h > .tag, .panel-h > .badge, .card-head > .tag,
    .warnbox, .boundary-box, .gts-note, .gtsnote, .pat-note, .pat-scope, .methodology-note,
    .pipe-stage .ps-meta,
    .wf-row .wf-lbl small,
    small.sub, small.desc, .micro-note, .footnote {
      display: none !important;
    }

    /* 4. Clean Suite Cards, Briefs & Action Queue Multi-Line Explanations */
    .suite-card .sc-owner,
    .suite-card .sc-head .tag,
    .suite-card .sc-foot span:first-child,
    .eb-header .sub, .eb-header > span.mono,
    .eb-top .eb-src, .eb-body, .eb-foot > span.mono,
    #waveActionTable td:first-child > div:nth-child(2) {
      display: none !important;
    }
  `;

  function injectStyles() {
    if (!document.head || document.getElementById('fortifai-uat-clean-css')) return;
    const style = document.createElement('style');
    style.id = 'fortifai-uat-clean-css';
    style.textContent = CLEAN_CSS;
    document.head.appendChild(style);
  }

  // Exact button/badge phrases to strip directly (works on gradient headers, divs, spans, or buttons!)
  const HIDE_BUTTON_PATTERNS = [
    'board report', 'board dossier', 'board pack',
    'export (.xls)', 'export (.xlsx)', 'export cfo pack', 'export csv', 'export pdf',
    'ask kuber', 'ask sara', 'ask crystal', 'ask moneta', 'ask aegis', 'ask veritas', 'ask argus', 'ask agent',
    'live sap', 'read-only sap', 'external audit',
    '? guide', 'user guide', 'cockpit guide',
    'suppressed fp'
  ];

  function cleanDynamicDOM() {
    // 1. Strip Cluttered Header Buttons & Technical Pills Directly by Text (No fragile colour/position gates)
    document.querySelectorAll('button, a, span, div').forEach(el => {
      if (el.tagName === 'SELECT' || el.closest('.drawer, .modal-card, [class*="modal"], [class*="drawer"], table, tbody')) return;
      // Only target leaf buttons/pills (up to 3 small child icons/spans, compact width/height)
      if (el.children.length > 3) return;
      const raw = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!raw || raw.length > 36) return;
      if (raw.includes('usd') || raw.includes('inr') || raw === 'export') return;

      if (HIDE_BUTTON_PATTERNS.some(p => raw === p || raw.includes(p))) {
        // Make sure we hide the button/pill itself, not a huge wrapper container
        const rect = el.getBoundingClientRect();
        if (rect.width < 260 && rect.height < 52) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });

    // Also catch plain "Export" buttons in top bars
    document.querySelectorAll('button, a').forEach(btn => {
      const raw = (btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (raw === 'export' || raw.startsWith('export (')) {
        btn.style.setProperty('display', 'none', 'important');
      }
    });

    // 2. Strip numeric count badges ("14", "22") inside Navigation Tabs (e.g. "Opportunity Workbench 14")
    document.querySelectorAll('button, a, div, li, .tab, [role="tab"]').forEach(tab => {
      const tLen = (tab.textContent || '').trim().length;
      if (tab.children.length >= 1 && tab.children.length <= 3 && tLen > 4 && tLen < 45) {
        tab.querySelectorAll('span, b, small, em').forEach(badge => {
          const t = (badge.textContent || '').trim();
          if (/^\(?\d+\)?$/.test(t)) {
            badge.style.setProperty('display', 'none', 'important');
          }
        });
      }
    });

    // 3. Hide small-font helper instructions ("Click any KPI card to inspect...") & multi-line grey blurbs
    document.querySelectorAll('p, div, small, span').forEach(el => {
      if (el.closest('svg') || el.previousElementSibling?.tagName === 'svg') return;
      if (el.children.length === 0 && !el.closest('.drawer, .modal-card, [class*="modal"], [class*="drawer"]')) {
        const txt = (el.textContent || '').trim();
        if (!txt) return;
        const lower = txt.toLowerCase();
        if (lower.startsWith('click any kpi card') || lower.startsWith('click any bubble') || lower.startsWith('click any row')) {
          el.style.setProperty('display', 'none', 'important');
          return;
        }
        const fontSize = parseFloat(window.getComputedStyle(el).fontSize || '13');
        if (fontSize <= 11.5 && txt.length > 68 && !el.closest('td.mono, th, code')) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });
  }

  // =========================================================================
  // UNIVERSAL USD <-> INR CURRENCY CONVERTER (1 USD Million = ₹8.35 Cr)
  // =========================================================================
  const FX_CR_PER_USDM = 8.35;

  function convertAllTextNodesToCurrency(targetCur) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.tagName)) return;
      const pTxt = (parent.textContent || '').trim();
      if (pTxt === '$ USD' || pTxt === '₹ INR' || pTxt === '₹ Cr' || pTxt === 'INR' || pTxt === 'USD') return;

      if (node._origCurrText === undefined) {
        if (/[₹$]/.test(node.nodeValue)) {
          node._origCurrText = node.nodeValue;
        } else {
          return;
        }
      }

      const orig = node._origCurrText;
      if (!orig) return;

      if (targetCur === 'USD') {
        let updated = orig.replace(/₹\s?([\d,]+(?:\.\d+)?)\s*Cr\b/gi, (_, numStr) => {
          const cr = parseFloat(numStr.replace(/,/g, ''));
          if (isNaN(cr)) return _;
          const usdM = cr / FX_CR_PER_USDM;
          if (usdM >= 1) return '$' + usdM.toFixed(usdM >= 10 ? 1 : 2).replace(/\.00$/, '.0') + 'M';
          if (usdM === 0) return '$0M';
          return '$' + Math.round(usdM * 1000) + 'K';
        });
        updated = updated.replace(/₹\s?([\d,]+(?:\.\d+)?)\s*L\b/gi, (_, numStr) => {
          const lakhs = parseFloat(numStr.replace(/,/g, ''));
          if (isNaN(lakhs)) return _;
          const usdK = (lakhs * 100000) / 83.5 / 1000;
          return '$' + Math.round(usdK) + 'K';
        });
        if (node.nodeValue !== updated) node.nodeValue = updated;
      } else if (targetCur === 'INR') {
        if (orig.includes('₹')) {
          if (node.nodeValue !== orig) node.nodeValue = orig;
        } else {
          let updated = orig.replace(/\$\s?([\d,]+(?:\.\d+)?)\s*M\b/gi, (_, numStr) => {
            const usdM = parseFloat(numStr.replace(/,/g, ''));
            if (isNaN(usdM)) return _;
            const cr = usdM * FX_CR_PER_USDM;
            return '₹' + cr.toFixed(1) + ' Cr';
          });
          if (node.nodeValue !== updated) node.nodeValue = updated;
        }
      }
    });
  }

  function wireCurrencyButtons() {
    document.querySelectorAll('button, span, a, div').forEach(btn => {
      if (btn.dataset.currWired || btn.children.length > 1) return;
      const t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      if (t === '$ USD' || t === 'USD' || t === '₹ INR' || t === 'INR' || t === '₹ Cr') {
        btn.dataset.currWired = '1';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', function () {
          const mode = t.includes('USD') ? 'USD' : 'INR';
          localStorage.setItem('fortifai_currency', mode);

          const grp = btn.parentElement;
          if (grp && grp.children.length <= 3) {
            Array.from(grp.children).forEach(sib => {
              const sibIsTarget = sib === btn;
              sib.classList.toggle('active', sibIsTarget);
              sib.classList.toggle('on', sibIsTarget);
              sib.style.background = sibIsTarget ? '#2E5A8A' : 'transparent';
              sib.style.color = sibIsTarget ? '#FFFFFF' : 'rgba(255,255,255,0.7)';
            });
          }

          try {
            if (typeof window.setCurr === 'function') window.setCurr(mode);
            else if (typeof window.setCur === 'function') window.setCur(mode, btn);
            else if (typeof window.setCurrency === 'function') window.setCurrency(mode);
          } catch (e) {}

          setTimeout(() => convertAllTextNodesToCurrency(mode), 30);
          setTimeout(() => convertAllTextNodesToCurrency(mode), 150);
        });
      }
    });
  }

  function runAll() {
    injectStyles();
    cleanDynamicDOM();
    wireCurrencyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }
  window.addEventListener('load', () => {
    runAll();
    setTimeout(runAll, 250);
    setTimeout(runAll, 700);
  });

  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      cleanDynamicDOM();
      wireCurrencyButtons();
    }, 80);
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
})();
