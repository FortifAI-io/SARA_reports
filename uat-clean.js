/**
 * Fortifai UAT Universal Executive De-Clutter + Currency Sync Engine (uat-clean.js v3)
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
    header .hbtn, .hchrome > button.hbtn,
    button[onclick*="Board"], button[onclick*="board"],
    button[onclick*="Export"], button[onclick*="export"],
    button[onclick*="Ask"], button[onclick*="ask"],
    button[onclick*="Guide"], button[onclick*="guide"],
    button[onclick*="Copilot"], button[onclick*="Drawer"] {
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

    /* 4. Hide Tab Numeric Count Pills (e.g. Kuber "14", "22") */
    .tab .t-pill, .tab .badge, .tab .count,
    .nav-tab span, .tab-btn span, [role="tab"] span, [role="tab"] .badge, [role="tab"] .pill {
      /* Handled selectively in JS below so tab text spans stay visible */
    }

    /* 5. Clean Suite Cards, Briefs & Action Queue Multi-Line Explanations */
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

  // Exact button/pill labels to strip anywhere in any agent's top header bar
  const EXACT_HEADER_BTNS = [
    'board report', 'board dossier', 'board pack',
    'export (.xls)', 'export (.xlsx)', 'export cfo pack (.xlsx)', 'export csv', 'export',
    '⌘k ask kuber', 'ask kuber', '⌘k ask sara', 'ask sara', 'ask crystal', 'ask moneta', 'ask aegis', 'ask veritas', 'ask argus', 'ask agent',
    'live sap', '• live sap', '● live sap', 'read-only', 'external audit',
    '? guide', 'guide', 'user guide'
  ];

  function cleanDynamicDOM() {
    // 1. Hide Cluttered Topbar Buttons & Pills (No fragile Y-coordinate restriction!)
    document.querySelectorAll('button, a, span, div').forEach(el => {
      if (el.children.length > 2 || el.tagName === 'SELECT') return;
      const raw = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!raw || raw.length > 34) return;
      if (raw.includes('usd') || raw.includes('inr')) return;

      // Check if element is inside a dark navy top header or sticky top bar
      const inTopBar = el.closest('header, .hbar, .topbar, .hdr, .top-bar, .app-header, nav') ||
                       (() => {
                         let p = el.parentElement;
                         for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
                           const bg = window.getComputedStyle(p).backgroundColor;
                           if (bg === 'rgb(13, 21, 32)' || bg === 'rgb(19, 31, 48)' || bg === 'rgb(15, 23, 42)' || bg === 'rgb(22, 34, 52)') return true;
                         }
                         return false;
                       })();

      if (inTopBar && EXACT_HEADER_BTNS.some(p => raw === p || raw.includes(p))) {
        el.style.setProperty('display', 'none', 'important');
      }
    });

    // 2. Strip numeric count pills ("14", "22") & leading "1. " numbers inside Tabs
    document.querySelectorAll('button, a, div, .tab, [role="tab"]').forEach(tab => {
      if (tab.children.length >= 1 && tab.children.length <= 3 && (tab.textContent || '').length < 45) {
        tab.querySelectorAll('span, b, small, em').forEach(badge => {
          const t = (badge.textContent || '').trim();
          if (/^\(?\d+\)?$/.test(t)) {
            badge.style.setProperty('display', 'none', 'important');
          }
        });
      }
    });

    // 3. Hide small-font (<= 11.5px) multi-line explanation blurbs outside drawers/modals/SVGs
    document.querySelectorAll('p, div, small, span').forEach(el => {
      if (el.closest('svg') || el.previousElementSibling?.tagName === 'svg') return;
      if (el.children.length === 0 && !el.closest('.drawer, .modal-card, [class*="modal"], [class*="drawer"]')) {
        const txt = (el.textContent || '').trim();
        if (!txt) return;
        const fontSize = parseFloat(window.getComputedStyle(el).fontSize || '13');
        if (fontSize <= 11.5 && txt.length > 72 && !el.closest('td.mono, th, code')) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });
  }

  // =========================================================================
  // UNIVERSAL USD <-> INR CURRENCY CONVERTER FOR HARDCODED AGENT TEXT & SVGs
  // Fixes Kuber (and any other agent) where ₹ Cr / $M strings are hardcoded!
  // Rate: 1 USD Million ($1.0M) = ₹8.35 Cr (at ₹83.5 / USD)
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
      // Never rewrite the toggle button labels themselves ("₹ INR" / "$ USD" / "₹ Cr")
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
        // Convert ₹X Cr -> $Y.YM (or $YK) and ₹X L -> $YK
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
        // If original was already in ₹, restore exact original text!
        if (orig.includes('₹')) {
          if (node.nodeValue !== orig) node.nodeValue = orig;
        } else {
          // Convert $X.XM -> ₹Y.Y Cr
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

          // Toggle visual active state on sibling currency buttons if agent's native handler failed
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

          // Run native currency function if defined, then sweep all hardcoded DOM/SVG labels
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

    // Sync active visual currency on initial load (e.g., if "$ USD" button starts highlighted in Kuber)
    const activeUsdBtn = Array.from(document.querySelectorAll('button, span')).find(b => {
      const t = (b.textContent || '').trim();
      if (t !== '$ USD' && t !== 'USD') return false;
      const bg = window.getComputedStyle(b).backgroundColor;
      return b.classList.contains('active') || b.classList.contains('on') ||
             (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !bg.includes('13, 21, 32'));
    });
    if (activeUsdBtn) {
      convertAllTextNodesToCurrency('USD');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }
  window.addEventListener('load', () => {
    runAll();
    setTimeout(runAll, 250);
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
