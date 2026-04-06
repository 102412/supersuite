/* ═══════════════════════════════════════════════════════════
   SUPERSUITE  script.js  v1.1
   Fix 1: Features block — any number of service cards
   Fix 2: Export matches preview (no iframe scaling mismatch)
   Fix 3: Global color/style changes fully update preview header
   Fix 4: SS favicon + logo mark (in index.html + CSS)
   Fix 5: Mobile detection popup (in index.html + here)
   Fix 6: Templates have dramatically different visual signatures
   Fix 7: Preview opens at full desktop width immediately
═══════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
const state = {
  template: 'glass',
  blocks: [],
  selectedBlockId: null,
  spacing: 'normal',
  customCSS: '',
  globalStyles: {
    primaryColor:   '#6366f1',
    secondaryColor: '#ec4899',
    bgColor:        '#ffffff',
    textColor:      '#111827',
    headingFont:    "'Syne', sans-serif",
    bodyFont:       "'DM Sans', sans-serif",
    btnStyle:       'rounded',
  },
};

// ── Undo / Redo ───────────────────────────────
const history = [];
let historyIndex = -1;

function saveHistory() {
  const snap = JSON.stringify({
    blocks: state.blocks, globalStyles: state.globalStyles,
    template: state.template, spacing: state.spacing, customCSS: state.customCSS,
  });
  if (history[historyIndex] === snap) return;
  history.splice(historyIndex + 1);
  history.push(snap);
  if (history.length > 80) history.shift();
  historyIndex = history.length - 1;
  updateUndoRedoBtns();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  restoreHistory();
}
function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  restoreHistory();
}
function restoreHistory() {
  const snap = JSON.parse(history[historyIndex]);
  state.blocks = snap.blocks;
  Object.assign(state.globalStyles, snap.globalStyles);
  state.template = snap.template;
  state.spacing  = snap.spacing;
  state.customCSS = snap.customCSS;
  state.selectedBlockId = null;
  closeRightPanel();
  syncStylePanelUI();
  updateLayersList();
  updateStatusBar();
  updateUndoRedoBtns();
  renderPreview();
  showToast('History restored');
}
function updateUndoRedoBtns() {
  const u = document.getElementById('undo-btn');
  const r = document.getElementById('redo-btn');
  if (u) u.disabled = historyIndex <= 0;
  if (r) r.disabled = historyIndex >= history.length - 1;
  const el = document.getElementById('status-undo');
  if (el) el.textContent = history.length > 1
    ? `${historyIndex + 1}/${history.length} states` : 'No history';
}

let blockIdCounter = 1;
let dragSrcId = null;

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
document.getElementById('gate-pw').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkPassword();
});

function checkPassword() {
  const pw = document.getElementById('gate-pw').value.trim();
  if (pw === 'SS26') {
    const gate = document.getElementById('gate');
    gate.style.transition = 'opacity 0.5s';
    gate.style.opacity = '0';
    setTimeout(() => {
      gate.style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      initApp();
    }, 500);
  } else {
    const err = document.getElementById('gate-err');
    err.style.opacity = '1';
    document.getElementById('gate-pw').style.borderColor = '#f87171';
    setTimeout(() => { err.style.opacity = '0'; document.getElementById('gate-pw').style.borderColor = ''; }, 3000);
  }
}

function initApp() {
  // FIX 5: show mobile warning if screen is small
  if (window.innerWidth < 900) {
    document.getElementById('mobile-warning').classList.remove('hidden');
  }
  setupKeyboardShortcuts();
  // FIX 7: ensure preview is in desktop mode from the start (no max-width)
  setSize('desktop', document.querySelector('.size-btn'));
  applyTemplate('glass', document.querySelector('.template-card.active'), false);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if (e.key === 'Escape') closeRightPanel();
  });
}

// ═══════════════════════════════════════════════
//  TAB / SIZE SWITCHING
// ═══════════════════════════════════════════════
function setPanelTab(btn, tab) {
  document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['templates','blocks','styles','layers'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}

function setTopTab(btn) {
  document.querySelectorAll('.topbar-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// FIX 7: desktop = no max-width constraint so it fills available space
function setSize(size, btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const wrap = document.getElementById('preview-wrap');
  // Remove all size classes, then add only if not desktop
  wrap.className = 'preview-wrap' + (size !== 'desktop' ? ' ' + size : '');
}

// ═══════════════════════════════════════════════
//  TEMPLATES  (FIX 6: dramatically different styles)
// ═══════════════════════════════════════════════
const templates = {

  glass: {
    name: 'Liquid Glass',
    // Light frosted background, subtle colors, glassmorphism cards
    bodyBg:   'linear-gradient(160deg, #ededf7 0%, #e2e2f0 100%)',
    darkMode: false,
    css: `
      body { background: linear-gradient(160deg, #ededf7 0%, #e2e2f0 100%); font-family: __BODY__; color: __TEXT__; margin: 0; }
      .ss-nav { background: rgba(255,255,255,0.72); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1.5px solid rgba(255,255,255,0.9); box-shadow: 0 2px 24px rgba(0,0,0,0.06); }
      .ss-hero { background: rgba(255,255,255,0.55); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.8); }
      .ss-section { background: rgba(255,255,255,0.38); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.5); }
      .ss-alt-section { background: rgba(255,255,255,0.58); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.55); }
      .ss-cta-section { background: linear-gradient(135deg, __PRIMARY__ee 0%, __SECONDARY__cc 100%); }
      .ss-btn { background: __PRIMARY__; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 24px __PRIMARY__55; letter-spacing: 0.03em; }
      .ss-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 36px __PRIMARY__88; }
      .ss-btn-outline { background: transparent; border: 2px solid __PRIMARY__; border-radius: __BTN_RADIUS__; color: __PRIMARY__; padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; }
      .ss-btn-outline:hover { background: __PRIMARY__; color: #fff; }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.78); border: 1.5px solid rgba(200,200,220,0.55); backdrop-filter: blur(8px); color: __TEXT__; }
      .ss-card { background: rgba(255,255,255,0.68); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.88); border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
      .ss-pricing-card { background: rgba(255,255,255,0.68); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.88); border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
      .ss-pricing-card.featured { background: __PRIMARY__; color: #fff; border-color: transparent; box-shadow: 0 24px 64px __PRIMARY__55; }
      .ss-faq-item { background: rgba(255,255,255,0.62); border: 1px solid rgba(255,255,255,0.82); border-radius: 12px; margin-bottom: 8px; backdrop-filter: blur(8px); overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; color: __TEXT__; }
      .ss-faq-q:hover { background: rgba(255,255,255,0.4); }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: __TEXT__99; line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-feature-icon-wrap { background: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.9); border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    `
  },

  bold: {
    name: 'Classy Bold',
    // FIX 6: PITCH BLACK background, stark white text, thick colored borders
    bodyBg:   '#000000',
    darkMode: true,
    css: `
      body { background: #000000; font-family: __BODY__; color: #ffffff; margin: 0; }
      .ss-nav { background: #000000; border-bottom: 3px solid __PRIMARY__; }
      .ss-hero { background: #000000; border-bottom: 1px solid #222; position: relative; overflow: hidden; }
      .ss-hero::before { content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 700px; height: 700px; background: radial-gradient(circle, __PRIMARY__20 0%, transparent 70%); pointer-events: none; }
      .ss-section { background: #0a0a0a; border-bottom: 1px solid #1a1a1a; }
      .ss-alt-section { background: #050505; border-bottom: 1px solid #1a1a1a; }
      .ss-cta-section { background: __PRIMARY__; }
      .ss-btn { background: __PRIMARY__; border-radius: __BTN_RADIUS__; color: #fff; padding: 15px 36px; font-family: __HEADING__; font-weight: 800; font-size: 15px; border: none; cursor: pointer; transition: all 0.25s; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: none; }
      .ss-btn:hover { background: #fff; color: #000; transform: none; box-shadow: none; }
      .ss-btn-outline { background: transparent; border: 2px solid #ffffff44; border-radius: __BTN_RADIUS__; color: #fff; padding: 13px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.25s; letter-spacing: 0.04em; }
      .ss-btn-outline:hover { border-color: #fff; }
      .ss-form input, .ss-form textarea { background: #111; border: 1px solid #333; color: #fff; }
      .ss-card { background: #111111; border: 1px solid #222; border-radius: 0; border-left: 3px solid __PRIMARY__; }
      .ss-pricing-card { background: #0f0f0f; border: 1px solid #222; border-radius: 0; color: #fff; }
      .ss-pricing-card.featured { background: __PRIMARY__; color: #fff; border-color: __PRIMARY__; box-shadow: none; border-radius: 0; }
      .ss-faq-item { background: transparent; border: none; border-bottom: 1px solid #222; margin-bottom: 0; border-radius: 0; overflow: hidden; }
      .ss-faq-q { padding: 20px 0; cursor: pointer; font-weight: 700; display: flex; justify-content: space-between; align-items: center; transition: color 0.2s; color: #fff; letter-spacing: 0.02em; }
      .ss-faq-q:hover { color: __PRIMARY__; }
      .ss-faq-a { padding: 0; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: #888; line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 0 20px; }
      .ss-heading { color: #ffffff !important; letter-spacing: -0.03em; }
      .ss-subheading { color: #666 !important; }
      .ss-feature-icon-wrap { background: transparent; border: 1px solid __PRIMARY__; border-radius: 0; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px; }
      .ss-pricing-card .ss-plan-name, .ss-pricing-card .ss-plan-price, .ss-pricing-card .ss-plan-period { color: #fff; }
      .ss-pricing-card .ss-plan-features li { border-bottom-color: #222; color: #aaa; }
      .ss-cta-section .ss-heading { color: #000 !important; }
      .ss-cta-section .ss-subheading { color: #00000088 !important; }
      .ss-cta-section .ss-btn { background: #000 !important; color: __PRIMARY__ !important; }
      .ss-cta-section .ss-btn:hover { background: #fff !important; color: #000 !important; }
    `
  },

  custom: {
    name: 'Vivid Custom',
    bodyBg:   'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    darkMode: true,
    css: `
      body { background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); font-family: __BODY__; color: #fff; margin: 0; min-height: 100vh; }
      .ss-nav { background: rgba(15,12,41,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.1); }
      .ss-hero { background: transparent; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .ss-section { background: rgba(0,0,0,0.25); border-bottom: 1px solid rgba(255,255,255,0.05); }
      .ss-alt-section { background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.06); }
      .ss-cta-section { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__, #ff6b6b); }
      .ss-btn { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__); border: none; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 40px __PRIMARY__33; letter-spacing: 0.03em; }
      .ss-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 12px 44px __PRIMARY__77; }
      .ss-btn-outline { background: transparent; border: 2px solid rgba(255,255,255,0.3); border-radius: __BTN_RADIUS__; color: #fff; padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; }
      .ss-btn-outline:hover { border-color: rgba(255,255,255,0.7); }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.2); color: #fff; }
      .ss-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.13); border-radius: 20px; color: #fff; backdrop-filter: blur(10px); }
      .ss-pricing-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.13); border-radius: 20px; color: #fff; backdrop-filter: blur(10px); }
      .ss-pricing-card.featured { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__); border-color: transparent; box-shadow: 0 24px 64px __PRIMARY__55; }
      .ss-faq-item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; color: #fff; }
      .ss-faq-q:hover { background: rgba(255,255,255,0.05); }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: rgba(255,255,255,0.55); line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-heading { color: #ffffff !important; }
      .ss-subheading { color: rgba(255,255,255,0.6) !important; }
      .ss-feature-icon-wrap { background: linear-gradient(135deg, __PRIMARY__33, __SECONDARY__22); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
    `
  },

  neon: {
    name: 'Neon Noir',
    bodyBg:   '#030308',
    darkMode: true,
    css: `
      body { background: #030308; font-family: __BODY__; color: #d0d0ff; margin: 0; }
      .ss-nav { background: rgba(3,3,8,0.97); backdrop-filter: blur(20px); border-bottom: 1px solid __PRIMARY__55; box-shadow: 0 0 30px __PRIMARY__22; }
      .ss-hero { background: radial-gradient(ellipse at 50% 0%, __PRIMARY__18 0%, transparent 65%), #030308; border-bottom: 1px solid __PRIMARY__33; }
      .ss-section { background: #060612; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .ss-alt-section { background: radial-gradient(ellipse at 50% 50%, __SECONDARY__0c 0%, transparent 70%), #05050f; border-bottom: 1px solid rgba(255,255,255,0.03); }
      .ss-cta-section { background: #030308; border-top: 1px solid __PRIMARY__55; border-bottom: 1px solid __SECONDARY__44; }
      .ss-btn { background: transparent; border: 1.5px solid __PRIMARY__; border-radius: __BTN_RADIUS__; color: __PRIMARY__; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; letter-spacing: 0.06em; box-shadow: 0 0 20px __PRIMARY__22, inset 0 0 20px __PRIMARY__08; }
      .ss-btn:hover { background: __PRIMARY__1a; box-shadow: 0 0 50px __PRIMARY__55, inset 0 0 30px __PRIMARY__15; transform: translateY(-1px); color: #fff; }
      .ss-btn-outline { background: transparent; border: 1px solid __SECONDARY__88; border-radius: __BTN_RADIUS__; color: __SECONDARY__; padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; box-shadow: 0 0 16px __SECONDARY__22; }
      .ss-btn-outline:hover { box-shadow: 0 0 36px __SECONDARY__55; }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.04); border: 1px solid __PRIMARY__44; color: #d0d0ff; }
      .ss-form input:focus, .ss-form textarea:focus { border-color: __PRIMARY__; box-shadow: 0 0 24px __PRIMARY__44; }
      .ss-card { background: rgba(255,255,255,0.02); border: 1px solid __PRIMARY__44; border-radius: 16px; color: #d0d0ff; box-shadow: 0 0 40px __PRIMARY__0f; }
      .ss-pricing-card { background: rgba(255,255,255,0.02); border: 1px solid __PRIMARY__44; border-radius: 16px; color: #d0d0ff; }
      .ss-pricing-card.featured { background: transparent; border: 1px solid __PRIMARY__; box-shadow: 0 0 80px __PRIMARY__44, inset 0 0 80px __PRIMARY__08; }
      .ss-faq-item { background: rgba(255,255,255,0.02); border: 1px solid __PRIMARY__33; border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; color: #d0d0ff; }
      .ss-faq-q:hover { background: __PRIMARY__0d; color: __PRIMARY__; }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: rgba(208,208,255,0.45); line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-heading { color: #ffffff !important; text-shadow: 0 0 50px __PRIMARY__66; }
      .ss-subheading { color: rgba(208,208,255,0.45) !important; }
      .ss-feature-icon-wrap { background: transparent; border: 1px solid __PRIMARY__66; border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; box-shadow: 0 0 24px __PRIMARY__44; }
      .ss-plan-price { text-shadow: 0 0 30px __PRIMARY__99 !important; color: #fff !important; }
      .ss-plan-name { color: __PRIMARY__ !important; }
      .ss-cta-section .ss-heading { text-shadow: 0 0 60px __PRIMARY__; }
      .ss-cta-section .ss-btn { border-color: #fff; color: #fff; box-shadow: 0 0 30px rgba(255,255,255,0.2); }
    `
  },

  clean: {
    name: 'Clean Light',
    bodyBg:   '#ffffff',
    darkMode: false,
    css: `
      body { background: #ffffff; font-family: __BODY__; color: __TEXT__; margin: 0; }
      .ss-nav { background: #fff; border-bottom: 1px solid rgba(0,0,0,0.07); }
      .ss-hero { background: #fff; border-bottom: 1px solid rgba(0,0,0,0.05); }
      .ss-section { background: #f7f7fa; border-bottom: 1px solid rgba(0,0,0,0.05); }
      .ss-alt-section { background: #fff; border-bottom: 1px solid rgba(0,0,0,0.05); }
      .ss-cta-section { background: __TEXT__; }
      .ss-btn { background: __TEXT__; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.25s; letter-spacing: 0.02em; }
      .ss-btn:hover { background: __PRIMARY__; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.14); }
      .ss-btn-outline { background: transparent; border: 1.5px solid rgba(0,0,0,0.18); border-radius: __BTN_RADIUS__; color: __TEXT__; padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.25s; }
      .ss-btn-outline:hover { border-color: __TEXT__; }
      .ss-form input, .ss-form textarea { background: #f3f3f7; border: 1.5px solid rgba(0,0,0,0.09); color: __TEXT__; }
      .ss-card { background: #fff; border: 1px solid rgba(0,0,0,0.07); border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.05); }
      .ss-pricing-card { background: #fff; border: 1.5px solid rgba(0,0,0,0.07); border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.05); }
      .ss-pricing-card.featured { background: __TEXT__; color: #fff; border-color: transparent; box-shadow: 0 24px 64px rgba(0,0,0,0.18); }
      .ss-faq-item { background: #fff; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; color: __TEXT__; }
      .ss-faq-q:hover { background: #f7f7fa; }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: rgba(0,0,0,0.48); line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-cta-section .ss-heading { color: #fff !important; }
      .ss-cta-section .ss-subheading { color: rgba(255,255,255,0.6) !important; }
      .ss-cta-section .ss-btn { background: #fff !important; color: __TEXT__ !important; }
      .ss-cta-section .ss-btn:hover { background: __PRIMARY__ !important; color: #fff !important; }
      .ss-feature-icon-wrap { background: #f3f3f7; border: 1px solid rgba(0,0,0,0.07); border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
    `
  }
};

// ── CSS interpolation ─────────────────────────
function getSpacingPx() {
  if (state.spacing === 'compact')  return '52px 40px';
  if (state.spacing === 'spacious') return '120px 40px';
  return '84px 40px';
}
function getBtnRadius() {
  if (state.globalStyles.btnStyle === 'square') return '6px';
  if (state.globalStyles.btnStyle === 'pill')   return '999px';
  return '12px';
}
function interpolateCSS(css) {
  return css
    .replace(/__PRIMARY__/g,    state.globalStyles.primaryColor)
    .replace(/__SECONDARY__/g,  state.globalStyles.secondaryColor)
    .replace(/__TEXT__/g,       state.globalStyles.textColor)
    .replace(/__HEADING__/g,    state.globalStyles.headingFont)
    .replace(/__BODY__/g,       state.globalStyles.bodyFont)
    .replace(/__BTN_RADIUS__/g, getBtnRadius());
}

// ── Apply template ────────────────────────────
function applyTemplate(name, card, doSave = true) {
  state.template = name;
  if (card) {
    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
  }
  const el = document.getElementById('status-template');
  if (el) el.textContent = 'Template: ' + templates[name].name;

  if (state.blocks.length === 0) {
    addBlock('hero', false);
    addBlock('features', false);
    addBlock('pricing', false);
    addBlock('testimonials', false);
    addBlock('cta', false);
  }
  renderPreview();
  if (doSave) { saveHistory(); showToast('Template: ' + templates[name].name); }
  else saveHistory();
}

// ── Sync style panel UI to state ─────────────
function syncStylePanelUI() {
  const gs = state.globalStyles;
  const fields = [
    ['swatch-primary',   'hex-primary',   gs.primaryColor],
    ['swatch-secondary', 'hex-secondary', gs.secondaryColor],
    ['swatch-bg',        'hex-bg',        gs.bgColor],
    ['swatch-text',      'hex-text',      gs.textColor],
  ];
  fields.forEach(([swId, hexId, val]) => {
    const sw = document.getElementById(swId);
    const hx = document.getElementById(hexId);
    if (sw) { sw.style.background = val; const inp = sw.querySelector('input'); if (inp) inp.value = val; }
    if (hx) hx.textContent = val;
  });
  const hf = document.getElementById('select-heading-font');
  const bf = document.getElementById('select-body-font');
  if (hf) hf.value = gs.headingFont;
  if (bf) bf.value = gs.bodyFont;
}

// ═══════════════════════════════════════════════
//  BLOCK DEFAULTS
// ═══════════════════════════════════════════════
function createBlock(type) {
  const id = 'block_' + (blockIdCounter++);
  const defs = {
    hero: {
      type:'hero', label:'Hero Section', icon:'🚀',
      heading:'Build Your Dream Website',
      subheading:'Fast, beautiful, and fully customizable. Start for free today.',
      btnText:'Get Started Free', btn2Text:'See Examples', showBtn2:true,
      textAlign:'center', showBadge:true, badgeText:'🎉 New — Version 2.0 is here',
    },
    // FIX 1: features block starts with 3 items, user can add unlimited
    features: {
      type:'features', label:'Features / Services', icon:'✨',
      heading:'Everything You Need to Succeed',
      subheading:'Powerful tools, intuitive design, real results.',
      columns: 3,
      items: [
        { icon:'⚡', title:'Lightning Fast', desc:'Pages load in under 200ms globally on modern infrastructure.' },
        { icon:'🎨', title:'Beautiful Design', desc:'Professionally crafted templates that convert visitors to customers.' },
        { icon:'🔒', title:'Enterprise Security', desc:'SSL, DDoS protection, and SOC2 compliance on every plan.' },
      ],
    },
    lead: {
      type:'lead', label:'Lead Form', icon:'📬',
      heading:'Stay in the Loop',
      subheading:'Get exclusive updates, tips, and early access in your inbox.',
      fields:['Full name','Email address'],
      btnText:'Subscribe Now',
      successMsg:'🎉 You\'re in! Check your inbox.',
    },
    testimonials: {
      type:'testimonials', label:'Testimonials', icon:'💬',
      heading:'What Our Customers Say',
      subheading:'Trusted by thousands of creators and businesses worldwide.',
      reviews:[
        { name:'Sarah J.', role:'Founder, Bloom Co.', text:'Supersuite transformed our online presence. Conversions went up 3x in the first month!', avatar:'👩‍💼', rating:5 },
        { name:'Marcus T.', role:'Creative Director', text:'I\'ve tried every website builder. Nothing comes close to this level of design quality.', avatar:'👨‍🎨', rating:5 },
        { name:'Priya K.', role:'E-commerce Owner', text:'Set up my entire store in a weekend. The export is clean code I actually own.', avatar:'👩‍💻', rating:5 },
      ],
    },
    pricing: {
      type:'pricing', label:'Pricing', icon:'💎',
      heading:'Simple, Transparent Pricing',
      subheading:'No hidden fees. Cancel anytime. Start for free.',
      showToggle:true,
      plans:[
        { name:'Starter', price:'$0',  priceAnnual:'$0',  period:'/mo', features:['5 pages','1 custom domain','Basic templates','SSL included','Email support'], featured:false, btn:'Start Free', badge:'' },
        { name:'Pro',     price:'$29', priceAnnual:'$19', period:'/mo', features:['Unlimited pages','3 custom domains','All templates','Priority support','Analytics','Custom code'], featured:true, btn:'Get Pro', badge:'Most Popular' },
        { name:'Business',price:'$79', priceAnnual:'$59', period:'/mo', features:['Everything in Pro','10 domains','Team collaboration','White label','API access','Dedicated support'], featured:false, btn:'Contact Sales', badge:'' },
      ],
    },
    faq: {
      type:'faq', label:'FAQ', icon:'❓',
      heading:'Frequently Asked Questions',
      subheading:'Got questions? We\'ve got answers.',
      items:[
        { q:'Can I cancel anytime?', a:'Yes. Cancel your subscription at any time with no questions asked. You retain access until the end of your billing period.' },
        { q:'Do I own my website?', a:'100%. When you export, you get clean HTML, CSS, and JS that you own forever. No vendor lock-in, ever.' },
        { q:'Is there a free trial?', a:'The Starter plan is free forever. For Pro, you get a 14-day free trial — no credit card required.' },
        { q:'Can I use my own domain?', a:'Yes! Connect any custom domain you own. We support apex domains and subdomains.' },
      ],
    },
    cta: {
      type:'cta', label:'CTA Section', icon:'⚡',
      heading:'Ready to Build Something Amazing?',
      subheading:'Join 47,000+ creators who launched their dream site this week.',
      btnText:'Start Building Free →', btn2Text:'Schedule a Demo', showBtn2:true,
    },
  };
  return { id, ...defs[type] };
}

// ═══════════════════════════════════════════════
//  BLOCK CRUD
// ═══════════════════════════════════════════════
function addBlock(type, render = true) {
  const block = createBlock(type);
  state.blocks.push(block);
  updateLayersList(); updateStatusBar();
  if (render) { renderPreview(); selectBlock(block.id); saveHistory(); showToast(block.label + ' added!'); }
}

function removeBlock(id) {
  state.blocks = state.blocks.filter(b => b.id !== id);
  if (state.selectedBlockId === id) { state.selectedBlockId = null; closeRightPanel(); }
  updateLayersList(); updateStatusBar(); renderPreview(); saveHistory();
  showToast('Block removed');
}

function moveBlock(id, dir) {
  const idx = state.blocks.findIndex(b => b.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.blocks.length) return;
  const arr = [...state.blocks];
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  state.blocks = arr;
  updateLayersList(); renderPreview(); saveHistory();
  // Refresh right panel so move buttons update
  const block = state.blocks.find(b => b.id === id);
  if (block && state.selectedBlockId === id) openRightPanel(block);
  showToast(dir < 0 ? 'Moved up' : 'Moved down');
}

function selectBlock(id) {
  state.selectedBlockId = id;
  const block = state.blocks.find(b => b.id === id);
  if (!block) return;
  openRightPanel(block);
  updateLayersList();
  const frame = document.getElementById('preview-frame');
  if (frame.contentWindow) frame.contentWindow.postMessage({ type:'select', id }, '*');
}

// ═══════════════════════════════════════════════
//  LAYERS  (drag-to-reorder)
// ═══════════════════════════════════════════════
function updateLayersList() {
  const list  = document.getElementById('layers-list');
  const empty = document.getElementById('layers-empty');
  const count = document.getElementById('layer-count');
  if (!list) return;
  count.textContent = state.blocks.length + ' block' + (state.blocks.length !== 1 ? 's' : '');
  if (state.blocks.length === 0) { list.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  list.innerHTML = state.blocks.map((b, i) => `
    <div class="block-order-item ${b.id === state.selectedBlockId ? 'selected' : ''}"
         data-id="${b.id}" draggable="true" onclick="selectBlock('${b.id}')">
      <span class="drag-handle">⠿</span>
      <span class="block-order-icon">${b.icon}</span>
      <span style="flex:1;font-size:11px;font-weight:500">${b.label}</span>
      <span style="color:var(--text3);font-size:10px">#${i+1}</span>
    </div>`).join('');

  list.querySelectorAll('.block-order-item').forEach(el => {
    el.addEventListener('dragstart', () => {
      dragSrcId = el.dataset.id;
      setTimeout(() => el.classList.add('dragging'), 0);
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      list.querySelectorAll('.block-order-item').forEach(x => x.classList.remove('drag-over'));
    });
    el.addEventListener('dragover', e => {
      e.preventDefault();
      list.querySelectorAll('.block-order-item').forEach(x => x.classList.remove('drag-over'));
      el.classList.add('drag-over');
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      if (dragSrcId === el.dataset.id) return;
      const fi = state.blocks.findIndex(b => b.id === dragSrcId);
      const ti = state.blocks.findIndex(b => b.id === el.dataset.id);
      const arr = [...state.blocks];
      const [mv] = arr.splice(fi, 1);
      arr.splice(ti, 0, mv);
      state.blocks = arr;
      updateLayersList(); renderPreview(); saveHistory();
      showToast('Block reordered');
    });
  });
}

function updateStatusBar() {
  const el = document.getElementById('status-blocks');
  if (el) el.textContent = state.blocks.length + ' block' + (state.blocks.length !== 1 ? 's' : '');
}

// ═══════════════════════════════════════════════
//  RIGHT PANEL
// ═══════════════════════════════════════════════
function openRightPanel(block) {
  document.getElementById('right-panel').classList.remove('hidden');
  document.getElementById('rp-title').textContent = block.icon + ' ' + block.label;
  document.getElementById('right-panel-content').innerHTML = buildBlockProps(block);
  attachPropListeners(block);
}
function closeRightPanel() {
  document.getElementById('right-panel').classList.add('hidden');
  state.selectedBlockId = null;
  updateLayersList();
}

// ── Build block props ─────────────────────────
function buildBlockProps(block) {
  let h = '';
  const idx = state.blocks.findIndex(b => b.id === block.id);
  const last = state.blocks.length - 1;
  h += `<div class="block-move-btns">
    <button class="move-btn" onclick="moveBlock('${block.id}',-1)" ${idx===0?'disabled':''}>↑ Move Up</button>
    <button class="move-btn" onclick="moveBlock('${block.id}',1)"  ${idx===last?'disabled':''}>↓ Move Down</button>
  </div>`;

  if (block.type === 'hero') {
    h += pg('Content', `
      ${pr('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${pr('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
      ${pr('Button 1',   `<input class="prop-input" data-prop="btnText"    value="${esc(block.btnText)}">`)}
      ${pr('Button 2',   `<input class="prop-input" data-prop="btn2Text"   value="${esc(block.btn2Text)}">`)}
      ${tog('Show Button 2','showBtn2',block.showBtn2)}
      ${pr('Badge Text', `<input class="prop-input" data-prop="badgeText"  value="${esc(block.badgeText)}">`)}
      ${tog('Show Badge','showBadge',block.showBadge)}
      ${pr('Align', `<select class="prop-input" data-prop="textAlign">
        <option value="left"   ${block.textAlign==='left'  ?'selected':''}>Left</option>
        <option value="center" ${block.textAlign==='center'?'selected':''}>Center</option>
        <option value="right"  ${block.textAlign==='right' ?'selected':''}>Right</option>
      </select>`)}
    `);
  }

  // FIX 1: Features — full editing with add/remove, column count
  else if (block.type === 'features') {
    h += pg('Content', `
      ${pr('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${pr('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
      ${pr('Columns', `<select class="prop-input" data-prop="columns">
        <option value="1" ${block.columns===1?'selected':''}>1 column</option>
        <option value="2" ${block.columns===2?'selected':''}>2 columns</option>
        <option value="3" ${block.columns===3?'selected':''}>3 columns</option>
        <option value="4" ${block.columns===4?'selected':''}>4 columns</option>
      </select>`)}
    `);
    h += `<div class="prop-group">
      <div class="prop-group-title">Service / Feature Cards
        <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:10px">${block.items.length} cards</span>
      </div>`;
    block.items.forEach((item, i) => {
      h += `<div class="nested-card">
        <div class="nested-card-header">Card ${i+1}
          <button class="mini-btn danger" onclick="removeFeatureItem('${block.id}',${i})">Remove</button>
        </div>
        ${pr('Icon',  `<input class="prop-input" data-fitem="${i}" data-field="icon"  value="${esc(item.icon)}">`)}
        ${pr('Title', `<input class="prop-input" data-fitem="${i}" data-field="title" value="${esc(item.title)}">`)}
        ${pr('Desc',  `<textarea class="prop-textarea" data-fitem="${i}" data-field="desc">${esc(item.desc)}</textarea>`)}
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addFeatureItem('${block.id}')">+ Add Service / Feature Card</button></div>`;
  }

  else if (block.type === 'lead') {
    h += pg('Content', `
      ${pr('Heading',     `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${pr('Subheading',  `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
      ${pr('Button',      `<input class="prop-input" data-prop="btnText"    value="${esc(block.btnText)}">`)}
      ${pr('Success Msg', `<input class="prop-input" data-prop="successMsg" value="${esc(block.successMsg)}">`)}
    `);
    h += `<div class="prop-group"><div class="prop-group-title">Form Fields</div>`;
    block.fields.forEach((f, i) => {
      h += `<div class="feature-row">
        <input class="feature-input" data-field-idx="${i}" value="${esc(f)}" placeholder="Field label">
        <button class="remove-feature-btn" onclick="removeFormField('${block.id}',${i})">✕</button>
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addFormField('${block.id}')">+ Add Field</button></div>`;
  }

  else if (block.type === 'testimonials') {
    h += pg('Content', `
      ${pr('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${pr('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
    `);
    h += `<div class="prop-group"><div class="prop-group-title">Reviews (${block.reviews.length})</div>`;
    block.reviews.forEach((r, i) => {
      h += `<div class="nested-card">
        <div class="nested-card-header">Review ${i+1}
          <button class="mini-btn danger" onclick="removeReview('${block.id}',${i})">Remove</button>
        </div>
        ${pr('Name',   `<input class="prop-input" data-review="${i}" data-field="name"   value="${esc(r.name)}">`)}
        ${pr('Role',   `<input class="prop-input" data-review="${i}" data-field="role"   value="${esc(r.role)}">`)}
        ${pr('Avatar', `<input class="prop-input" data-review="${i}" data-field="avatar" value="${esc(r.avatar)}" style="width:60px;flex:0 0 60px">`)}
        ${pr('Text',   `<textarea class="prop-textarea" data-review="${i}" data-field="text">${esc(r.text)}</textarea>`)}
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addReview('${block.id}')">+ Add Review</button></div>`;
  }

  else if (block.type === 'pricing') {
    h += pg('Content', `
      ${pr('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${pr('Subheading', `<input class="prop-input" data-prop="subheading" value="${esc(block.subheading)}">`)}
      ${tog('Annual Toggle','showToggle',block.showToggle)}
    `);
    h += `<div class="prop-group"><div class="prop-group-title">Plans (${block.plans.length})</div>`;
    block.plans.forEach((p, i) => {
      h += `<div class="nested-card ${p.featured?'featured-card':''}">
        <div class="nested-card-header ${p.featured?'featured-header':''}">
          ${p.featured?'⭐ ':''}Plan ${i+1}
          <div style="display:flex;gap:4px">
            <button class="mini-btn" onclick="toggleFeaturedPlan('${block.id}',${i})">${p.featured?'Unfeature':'Feature'}</button>
            <button class="mini-btn danger" onclick="removePlan('${block.id}',${i})">Remove</button>
          </div>
        </div>
        ${pr('Name',      `<input class="prop-input" data-plan="${i}" data-field="name"        value="${esc(p.name)}">`)}
        ${pr('Price/mo',  `<input class="prop-input" data-plan="${i}" data-field="price"       value="${esc(p.price)}">`)}
        ${pr('Price/yr',  `<input class="prop-input" data-plan="${i}" data-field="priceAnnual" value="${esc(p.priceAnnual)}">`)}
        ${pr('Badge',     `<input class="prop-input" data-plan="${i}" data-field="badge"       value="${esc(p.badge)}">`)}
        ${pr('Button',    `<input class="prop-input" data-plan="${i}" data-field="btn"         value="${esc(p.btn)}">`)}
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px">Features in this plan</div>
        ${p.features.map((f,fi) => `
          <div class="feature-row">
            <input class="feature-input" data-plan="${i}" data-feat="${fi}" value="${esc(f)}">
            <button class="remove-feature-btn" onclick="removePlanFeature('${block.id}',${i},${fi})">✕</button>
          </div>`).join('')}
        <button class="add-item-btn" onclick="addPlanFeature('${block.id}',${i})">+ Add feature line</button>
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addPlan('${block.id}')">+ Add Plan</button></div>`;
  }

  else if (block.type === 'faq') {
    h += pg('Content', `
      ${pr('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${pr('Subheading', `<input class="prop-input" data-prop="subheading" value="${esc(block.subheading)}">`)}
    `);
    h += `<div class="prop-group"><div class="prop-group-title">FAQ Items (${block.items.length})</div>`;
    block.items.forEach((item, i) => {
      h += `<div class="nested-card">
        <div class="nested-card-header">Item ${i+1}
          <button class="mini-btn danger" onclick="removeFAQ('${block.id}',${i})">Remove</button>
        </div>
        ${pr('Question', `<input class="prop-input" data-faq="${i}" data-field="q" value="${esc(item.q)}">`)}
        ${pr('Answer',   `<textarea class="prop-textarea" data-faq="${i}" data-field="a">${esc(item.a)}</textarea>`)}
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addFAQ('${block.id}')">+ Add FAQ</button></div>`;
  }

  else if (block.type === 'cta') {
    h += pg('Content', `
      ${pr('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${pr('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
      ${pr('Button 1',   `<input class="prop-input" data-prop="btnText"    value="${esc(block.btnText)}">`)}
      ${pr('Button 2',   `<input class="prop-input" data-prop="btn2Text"   value="${esc(block.btn2Text)}">`)}
      ${tog('Show Button 2','showBtn2',block.showBtn2)}
    `);
  }

  h += `<button class="delete-block-btn" onclick="removeBlock('${block.id}')">🗑 Remove This Block</button>`;
  return h;
}

// ── Prop helpers ──────────────────────────────
function pg(title, inner) { return `<div class="prop-group"><div class="prop-group-title">${title}</div>${inner}</div>`; }
function pr(label, input) { return `<div class="prop-row"><span class="prop-label">${label}</span>${input}</div>`; }
function tog(label, prop, val) {
  return `<div class="toggle-row">
    <span class="toggle-label">${label}</span>
    <div class="toggle ${val?'on':''}" data-toggle="${prop}" onclick="handleToggle(this,'${prop}')"></div>
  </div>`;
}
function handleToggle(el, prop) {
  el.classList.toggle('on');
  const block = state.blocks.find(b => b.id === state.selectedBlockId);
  if (block) { block[prop] = el.classList.contains('on'); renderPreview(); saveHistory(); }
}

// ── Attach listeners ──────────────────────────
function attachPropListeners(block) {
  const rp = document.getElementById('right-panel-content');
  rp.querySelectorAll('[data-prop]').forEach(el => {
    el.addEventListener('input',  () => { block[el.dataset.prop] = el.tagName==='SELECT'?el.value:el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });
  rp.querySelectorAll('[data-review]').forEach(el => {
    el.addEventListener('input',  () => { block.reviews[+el.dataset.review][el.dataset.field] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });
  rp.querySelectorAll('[data-plan]').forEach(el => {
    el.addEventListener('input', () => {
      if (el.dataset.feat !== undefined) block.plans[+el.dataset.plan].features[+el.dataset.feat] = el.value;
      else block.plans[+el.dataset.plan][el.dataset.field] = el.value;
      renderPreview();
    });
    el.addEventListener('change', () => saveHistory());
  });
  rp.querySelectorAll('[data-fitem]').forEach(el => {
    el.addEventListener('input',  () => { block.items[+el.dataset.fitem][el.dataset.field] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });
  rp.querySelectorAll('[data-faq]').forEach(el => {
    el.addEventListener('input',  () => { block.items[+el.dataset.faq][el.dataset.field] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });
  rp.querySelectorAll('[data-field-idx]').forEach(el => {
    el.addEventListener('input',  () => { block.fields[+el.dataset.fieldIdx] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });
}

// ── Block mutation helpers ────────────────────
function refreshPanel() { const b = state.blocks.find(x => x.id === state.selectedBlockId); if (b) openRightPanel(b); }

function addReview(id)            { const b=state.blocks.find(x=>x.id===id); b.reviews.push({name:'New Reviewer',role:'Their Role',text:'This product is fantastic.',avatar:'👤',rating:5}); renderPreview();saveHistory();refreshPanel(); }
function removeReview(id,i)       { const b=state.blocks.find(x=>x.id===id); b.reviews.splice(i,1); renderPreview();saveHistory();refreshPanel(); }
function addPlan(id)              { const b=state.blocks.find(x=>x.id===id); b.plans.push({name:'New Plan',price:'$49',priceAnnual:'$39',period:'/mo',features:['Feature 1','Feature 2'],featured:false,btn:'Get Started',badge:''}); renderPreview();saveHistory();refreshPanel(); }
function removePlan(id,i)         { const b=state.blocks.find(x=>x.id===id); b.plans.splice(i,1); renderPreview();saveHistory();refreshPanel(); }
function toggleFeaturedPlan(id,i) { const b=state.blocks.find(x=>x.id===id); b.plans.forEach((p,j)=>p.featured=j===i?!p.featured:false); renderPreview();saveHistory();refreshPanel(); }
function addPlanFeature(id,pi)    { const b=state.blocks.find(x=>x.id===id); b.plans[pi].features.push('New feature'); renderPreview();saveHistory();refreshPanel(); }
function removePlanFeature(id,pi,fi){ const b=state.blocks.find(x=>x.id===id); b.plans[pi].features.splice(fi,1); renderPreview();saveHistory();refreshPanel(); }
// FIX 1: feature item helpers
function addFeatureItem(id)       { const b=state.blocks.find(x=>x.id===id); b.items.push({icon:'🌟',title:'New Service',desc:'Describe this service or feature briefly.'}); renderPreview();saveHistory();refreshPanel(); }
function removeFeatureItem(id,i)  { const b=state.blocks.find(x=>x.id===id); b.items.splice(i,1); renderPreview();saveHistory();refreshPanel(); }
function addFAQ(id)               { const b=state.blocks.find(x=>x.id===id); b.items.push({q:'Your question here?',a:'Your detailed answer goes here.'}); renderPreview();saveHistory();refreshPanel(); }
function removeFAQ(id,i)          { const b=state.blocks.find(x=>x.id===id); b.items.splice(i,1); renderPreview();saveHistory();refreshPanel(); }
function addFormField(id)         { const b=state.blocks.find(x=>x.id===id); b.fields.push('New field'); renderPreview();saveHistory();refreshPanel(); }
function removeFormField(id,i)    { const b=state.blocks.find(x=>x.id===id); b.fields.splice(i,1); renderPreview();saveHistory();refreshPanel(); }

// ═══════════════════════════════════════════════
//  GLOBAL STYLE UPDATES  (FIX 3: fully reflected)
// ═══════════════════════════════════════════════
function updateGlobalColor(key, value) {
  const map = { primary:'primaryColor', secondary:'secondaryColor', bg:'bgColor', textColor:'textColor' };
  state.globalStyles[map[key]] = value;
  const sw = document.getElementById('swatch-' + key);
  if (sw) sw.style.background = value;
  const hx = document.getElementById('hex-' + key);
  if (hx) hx.textContent = value;
  renderPreview(); // FIX 3: full re-render so nav/header update too
}
function updateGlobalFont(type, value) {
  if (type === 'heading') state.globalStyles.headingFont = value;
  else state.globalStyles.bodyFont = value;
  renderPreview(); saveHistory();
}
function updateBtnStyle(style, el) {
  document.querySelectorAll('.btn-style-opt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  state.globalStyles.btnStyle = style;
  renderPreview(); saveHistory(); showToast('Button style: ' + style);
}
function updateSpacingOpt(val, el) {
  document.querySelectorAll('.btn-style-opt').forEach(b => {
    // Only reset siblings in the same row
  });
  // find the row and reset
  el.parentElement.querySelectorAll('.btn-style-opt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  state.spacing = val;
  renderPreview(); saveHistory();
}
function updateCustomCSS(val) {
  state.customCSS = val;
  renderPreview();
}

// ═══════════════════════════════════════════════
//  RENDER PREVIEW
// ═══════════════════════════════════════════════
function renderPreview() {
  const html = buildSiteHTML();
  const frame = document.getElementById('preview-frame');
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  document.getElementById('empty-state').style.display = state.blocks.length ? 'none' : '';
}

// ═══════════════════════════════════════════════
//  BUILD SITE HTML
//  FIX 2: export-ready CSS — no iframe scaling hack
//  FIX 3: all global styles including nav/header
//  FIX 6: templates control body, nav, ALL sections
// ═══════════════════════════════════════════════
function buildSiteHTML(forExport = false) {
  const tpl = templates[state.template];
  const css = interpolateCSS(tpl.css);
  const sp  = getSpacingPx();
  const dark = tpl.darkMode;
  const blocksHTML = state.blocks.map(b => renderBlock(b, sp, dark)).join('\n');
  const gfonts = 'family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500&family=Space+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400';

  // FIX 2: exported site uses responsive CSS, not iframe transforms
  // The preview iframe also uses the same CSS — no mismatch
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Supersuite Site</title>
<link href="https://fonts.googleapis.com/css2?${gfonts}&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%}
body{min-height:100vh;font-size:16px}
${css}

/* ── FIX 3: Nav/header CSS fully driven by template + global colors ── */
.ss-nav-inner{max-width:1080px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 40px;height:100%}
.ss-nav-logo{font-family:${state.globalStyles.headingFont};font-size:20px;font-weight:800;color:${dark?'#fff':state.globalStyles.textColor};letter-spacing:-0.5px}
.ss-nav-links{display:flex;gap:28px}
.ss-nav-link{font-size:14px;font-weight:500;color:${dark?'rgba(255,255,255,0.65)':state.globalStyles.textColor+'99'};cursor:pointer;transition:color .2s;text-decoration:none}
.ss-nav-link:hover{color:${state.globalStyles.primaryColor}}
.ss-nav-cta{background:${state.globalStyles.primaryColor};color:#fff;padding:8px 18px;border-radius:${getBtnRadius()};font-family:${state.globalStyles.headingFont};font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .2s}
.ss-nav-cta:hover{opacity:.88}

/* ── Layout ── */
.ss-block{padding:${sp};transition:outline .15s;cursor:default}
.ss-block:hover{outline:2px dashed rgba(99,102,241,.2);outline-offset:-3px}
.ss-block.selected{outline:2px solid ${state.globalStyles.primaryColor};outline-offset:-3px}
.ss-container{max-width:1080px;margin:0 auto}
.ss-cta-block{padding:${sp}}

/* ── Badge ── */
.ss-badge{display:inline-flex;align-items:center;gap:6px;background:${state.globalStyles.primaryColor}1a;border:1px solid ${state.globalStyles.primaryColor}44;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;color:${state.globalStyles.primaryColor};margin-bottom:24px}

/* ── Typography ── */
.ss-heading{font-family:${state.globalStyles.headingFont};font-size:clamp(34px,5.5vw,72px);font-weight:800;line-height:1.04;letter-spacing:-0.025em;margin-bottom:20px;color:${dark?'#fff':state.globalStyles.textColor}}
.ss-subheading{font-size:clamp(16px,2vw,20px);color:${dark?'rgba(255,255,255,0.55)':state.globalStyles.textColor+'88'};line-height:1.65;max-width:600px;margin-bottom:36px;font-family:${state.globalStyles.bodyFont}}

/* ── Buttons ── */
.ss-btn-group{display:flex;gap:12px;flex-wrap:wrap}

/* ── Form ── */
.ss-form{max-width:500px;width:100%}
.ss-form input,.ss-form textarea{display:block;width:100%;padding:14px 18px;border-radius:10px;font-size:15px;font-family:${state.globalStyles.bodyFont};outline:none;margin-bottom:12px;transition:all .2s}
.ss-form input:focus,.ss-form textarea:focus{border-color:${state.globalStyles.primaryColor}!important;box-shadow:0 0 0 3px ${state.globalStyles.primaryColor}33}
.ss-form-success{display:none;text-align:center;padding:20px;font-size:18px;font-weight:600;color:${state.globalStyles.primaryColor}}

/* ── Features ── */
.ss-features-grid{display:grid;gap:24px;margin-top:48px}
.ss-feature-item{padding:28px}
.ss-feature-title{font-family:${state.globalStyles.headingFont};font-size:18px;font-weight:700;margin-bottom:10px;color:${dark?'#fff':state.globalStyles.textColor}}
.ss-feature-desc{font-size:15px;line-height:1.65;color:${dark?'rgba(255,255,255,0.55)':state.globalStyles.textColor+'88'};font-family:${state.globalStyles.bodyFont}}

/* ── Testimonials ── */
.ss-testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.ss-card{padding:28px;transition:transform .2s}
.ss-card:hover{transform:translateY(-5px)}
.ss-avatar{font-size:42px;margin-bottom:16px}
.ss-stars{color:#fbbf24;margin-bottom:12px;font-size:16px;letter-spacing:2px}
.ss-review-text{font-size:15px;line-height:1.72;font-style:italic;color:${dark?'rgba(255,255,255,0.85)':state.globalStyles.textColor+'dd'}}
.ss-reviewer{font-weight:700;font-size:15px;margin-bottom:3px;font-family:${state.globalStyles.headingFont};color:${dark?'#fff':state.globalStyles.textColor}}
.ss-reviewer-role{font-size:12px;color:${dark?'rgba(255,255,255,0.45)':state.globalStyles.textColor+'66'}}

/* ── Pricing ── */
.ss-pricing-annual-wrap{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:44px}
.ss-toggle-pill{width:48px;height:26px;background:${state.globalStyles.primaryColor};border-radius:13px;cursor:pointer;position:relative;transition:background .2s;border:none}
.ss-toggle-pill::after{content:'';position:absolute;width:18px;height:18px;background:#fff;border-radius:50%;top:4px;left:26px;transition:left .2s}
.ss-toggle-pill.monthly::after{left:4px}
.ss-toggle-lbl{font-size:14px;font-weight:500;opacity:.6;cursor:pointer;color:${dark?'#fff':state.globalStyles.textColor};font-family:${state.globalStyles.bodyFont}}
.ss-toggle-lbl.active{opacity:1;font-weight:700}
.ss-pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;align-items:start}
.ss-pricing-card{padding:36px 28px;transition:transform .25s}
.ss-pricing-card:hover{transform:translateY(-5px)}
.ss-plan-badge{display:inline-block;background:rgba(255,255,255,.2);border-radius:999px;padding:3px 12px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px}
.ss-plan-name{font-family:${state.globalStyles.headingFont};font-size:18px;font-weight:700;margin-bottom:12px;color:${dark?'#fff':state.globalStyles.textColor}}
.ss-plan-price{font-family:${state.globalStyles.headingFont};font-size:54px;font-weight:800;line-height:1;letter-spacing:-3px;color:${dark?'#fff':state.globalStyles.textColor}}
.ss-plan-period{font-size:16px;font-weight:400;opacity:.5;color:${dark?'#fff':state.globalStyles.textColor}}
.ss-plan-features{list-style:none;margin:24px 0}
.ss-plan-features li{padding:9px 0;border-bottom:1px solid ${dark?'rgba(255,255,255,.1)':'rgba(0,0,0,.07)'};font-size:14px;display:flex;align-items:center;gap:9px;color:${dark?'rgba(255,255,255,0.7)':state.globalStyles.textColor+'cc'};font-family:${state.globalStyles.bodyFont}}
.ss-pricing-card.featured .ss-plan-features li{border-bottom-color:rgba(255,255,255,.15);color:#fff}
.ss-pricing-card.featured .ss-plan-name,.ss-pricing-card.featured .ss-plan-price,.ss-pricing-card.featured .ss-plan-period{color:#fff}
.ss-feature-check{color:#34d399;font-size:14px;flex-shrink:0}
.ss-pricing-card.featured .ss-feature-check{color:rgba(255,255,255,.9)}

/* ── FAQ ── */
.ss-faq-arrow{transition:transform .3s;display:inline-block;font-style:normal}
.ss-faq-item.open .ss-faq-arrow{transform:rotate(180deg)}

/* ── CTA ── */
.ss-cta-block .ss-heading{color:#fff!important}
.ss-cta-block .ss-subheading{color:rgba(255,255,255,.72)!important;margin:0 auto 36px}
.ss-cta-block .ss-btn{background:#fff!important;color:${state.globalStyles.primaryColor}!important}
.ss-cta-block .ss-btn:hover{opacity:.92!important;box-shadow:0 10px 30px rgba(0,0,0,.2)!important}

/* ── Scroll animations ── */
@keyframes ssSlideUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
.ss-animate{opacity:0}
.ss-animate.visible{animation:ssSlideUp .55s cubic-bezier(.16,1,.3,1) forwards}

/* ── FIX 2 + Mobile optimisation (FIX 5): proper responsive CSS ── */
@media(max-width:768px){
  .ss-block,.ss-cta-block{padding:52px 20px!important}
  .ss-heading{font-size:clamp(28px,8vw,48px)!important}
  .ss-nav-inner{padding:0 20px}
  .ss-nav-links{display:none}
  .ss-pricing-grid,.ss-testimonials-grid,.ss-features-grid{grid-template-columns:1fr!important}
  .ss-btn-group{flex-direction:column;align-items:flex-start}
  .ss-container{padding:0}
}
@media(max-width:480px){
  .ss-heading{font-size:clamp(24px,9vw,36px)!important}
  .ss-subheading{font-size:16px!important}
}

${state.customCSS}
</style>
</head>
<body>

<!-- FIX 3: Nav/header rendered as part of site, respects all global colors -->
<nav class="ss-nav" style="height:64px;position:sticky;top:0;z-index:100">
  <div class="ss-nav-inner">
    <div class="ss-nav-logo">${state.globalStyles.headingFont.includes('Bebas')?'BRAND':'Brand'}</div>
    <div class="ss-nav-links">
      <a class="ss-nav-link" href="#">Features</a>
      <a class="ss-nav-link" href="#">Pricing</a>
      <a class="ss-nav-link" href="#">About</a>
      <a class="ss-nav-link" href="#">Blog</a>
    </div>
    <button class="ss-nav-cta">Get Started</button>
  </div>
</nav>

${blocksHTML}

<script>
// Block click → builder
document.querySelectorAll('.ss-block,.ss-cta-block').forEach(b=>{
  b.addEventListener('click',()=>parent.postMessage({type:'blockClick',id:b.dataset.id},'*'));
});
// Select highlight from builder
window.addEventListener('message',e=>{
  if(e.data.type==='select'){
    document.querySelectorAll('.ss-block,.ss-cta-block').forEach(b=>b.classList.remove('selected'));
    const el=document.querySelector('[data-id="'+e.data.id+'"]');
    if(el){el.classList.add('selected');el.scrollIntoView({behavior:'smooth',block:'center'});}
  }
});
// FAQ accordion
document.querySelectorAll('.ss-faq-q').forEach(q=>{
  q.addEventListener('click',()=>{
    const item=q.parentElement;
    const a=item.querySelector('.ss-faq-a');
    const open=item.classList.contains('open');
    document.querySelectorAll('.ss-faq-item').forEach(i=>{i.classList.remove('open');i.querySelector('.ss-faq-a').classList.remove('open');});
    if(!open){item.classList.add('open');a.classList.add('open');}
  });
});
// Pricing toggle
const ptb=document.getElementById('pricing-toggle');
if(ptb){
  let annual=false;
  ptb.addEventListener('click',()=>{
    annual=!annual;
    ptb.classList.toggle('monthly',!annual);
    const al=document.getElementById('toggle-annual');
    const ml=document.getElementById('toggle-monthly');
    if(al){al.classList.toggle('active',annual);}
    if(ml){ml.classList.toggle('active',!annual);}
    document.querySelectorAll('[data-price-mo]').forEach(el=>{
      el.textContent=annual?el.dataset.priceAnnual:el.dataset.priceMo;
    });
  });
}
// Form submit
document.querySelectorAll('.ss-lead-form').forEach(f=>{
  f.addEventListener('submit',e=>{
    e.preventDefault();
    const suc=f.querySelector('.ss-form-success');
    const flds=f.querySelector('.ss-form-fields');
    if(flds)flds.style.display='none';
    if(suc)suc.style.display='block';
  });
});
// Scroll animations
const obs=new IntersectionObserver(entries=>{
  entries.forEach(en=>{if(en.isIntersecting)en.target.classList.add('visible');});
},{threshold:.1});
document.querySelectorAll('.ss-animate').forEach(el=>obs.observe(el));
<\/script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════
//  RENDER BLOCKS
// ═══════════════════════════════════════════════
function renderBlock(block, sp, dark) {
  const align = block.textAlign || 'center';
  const alignItems = align==='center'?'center':align==='right'?'flex-end':'flex-start';

  if (block.type === 'hero') {
    return `<section class="ss-block ss-hero" data-id="${block.id}" style="text-align:${align}">
  <div class="ss-container" style="display:flex;flex-direction:column;align-items:${alignItems}">
    ${block.showBadge?`<div class="ss-badge ss-animate">${esc2(block.badgeText)}</div>`:''}
    <div class="ss-heading ss-animate" style="animation-delay:.04s">${esc2(block.heading)}</div>
    <div class="ss-subheading ss-animate" style="animation-delay:.1s">${esc2(block.subheading)}</div>
    <div class="ss-btn-group ss-animate" style="justify-content:${alignItems};animation-delay:.17s">
      <button class="ss-btn">${esc2(block.btnText)}</button>
      ${block.showBtn2?`<button class="ss-btn-outline">${esc2(block.btn2Text)}</button>`:''}
    </div>
  </div>
</section>`;
  }

  // FIX 1: features uses block.columns for grid-template-columns
  if (block.type === 'features') {
    const cols = block.columns || 3;
    const minW = cols <= 2 ? '320px' : cols >= 4 ? '200px' : '260px';
    return `<section class="ss-block ss-alt-section" data-id="${block.id}">
  <div class="ss-container">
    <div style="text-align:center">
      <div class="ss-heading ss-animate">${esc2(block.heading)}</div>
      <div class="ss-subheading ss-animate" style="margin:0 auto;animation-delay:.08s">${esc2(block.subheading)}</div>
    </div>
    <div class="ss-features-grid" style="grid-template-columns:repeat(${cols},1fr)">
      ${block.items.map((item,i) => `
        <div class="ss-card ss-feature-item ss-animate" style="animation-delay:${.05*(i%cols)}s">
          <div class="ss-feature-icon-wrap">${esc2(item.icon)}</div>
          <div class="ss-feature-title">${esc2(item.title)}</div>
          <div class="ss-feature-desc">${esc2(item.desc)}</div>
        </div>`).join('')}
    </div>
  </div>
</section>`;
  }

  if (block.type === 'lead') {
    return `<section class="ss-block ss-section" data-id="${block.id}">
  <div class="ss-container" style="display:flex;flex-direction:column;align-items:center;text-align:center">
    <div class="ss-heading ss-animate">${esc2(block.heading)}</div>
    <div class="ss-subheading ss-animate" style="margin:0 auto;animation-delay:.08s">${esc2(block.subheading)}</div>
    <form class="ss-form ss-lead-form ss-animate" style="animation-delay:.15s">
      <div class="ss-form-fields">
        ${block.fields.map(f=>`<input type="text" placeholder="${esc2(f)}" required>`).join('')}
        <button type="submit" class="ss-btn" style="width:100%">${esc2(block.btnText)}</button>
      </div>
      <div class="ss-form-success">${esc2(block.successMsg)}</div>
    </form>
  </div>
</section>`;
  }

  if (block.type === 'testimonials') {
    return `<section class="ss-block ss-section" data-id="${block.id}">
  <div class="ss-container">
    <div style="text-align:center;margin-bottom:48px">
      <div class="ss-heading ss-animate">${esc2(block.heading)}</div>
      <div class="ss-subheading ss-animate" style="margin:0 auto;animation-delay:.08s">${esc2(block.subheading)}</div>
    </div>
    <div class="ss-testimonials-grid">
      ${block.reviews.map((r,i)=>`
        <div class="ss-card ss-animate" style="animation-delay:${i*.08}s">
          <div class="ss-avatar">${r.avatar}</div>
          <div class="ss-stars">${'★'.repeat(r.rating||5)}</div>
          <div class="ss-review-text">"${esc2(r.text)}"</div>
          <div style="margin-top:20px">
            <div class="ss-reviewer">${esc2(r.name)}</div>
            <div class="ss-reviewer-role">${esc2(r.role)}</div>
          </div>
        </div>`).join('')}
    </div>
  </div>
</section>`;
  }

  if (block.type === 'pricing') {
    return `<section class="ss-block ss-alt-section" data-id="${block.id}">
  <div class="ss-container">
    <div style="text-align:center;margin-bottom:${block.showToggle?'0':'48px'}">
      <div class="ss-heading ss-animate">${esc2(block.heading)}</div>
      <div class="ss-subheading ss-animate" style="margin:0 auto;animation-delay:.08s">${esc2(block.subheading)}</div>
    </div>
    ${block.showToggle?`
    <div class="ss-pricing-annual-wrap ss-animate" style="animation-delay:.15s">
      <span class="ss-toggle-lbl active" id="toggle-monthly">Monthly</span>
      <button class="ss-toggle-pill monthly" id="pricing-toggle" aria-label="Toggle billing"></button>
      <span class="ss-toggle-lbl" id="toggle-annual">Annual <span style="color:#34d399;font-size:12px;font-weight:700">Save 35%</span></span>
    </div>`:''}
    <div class="ss-pricing-grid">
      ${block.plans.map((p,i)=>`
        <div class="ss-pricing-card ${p.featured?'featured':''} ss-animate" style="animation-delay:${i*.07}s">
          ${p.badge?`<div class="ss-plan-badge">${esc2(p.badge)}</div>`:''}
          <div class="ss-plan-name">${esc2(p.name)}</div>
          <div style="margin-bottom:8px">
            <span class="ss-plan-price" data-price-mo="${esc2(p.price)}" data-price-annual="${esc2(p.priceAnnual)}">${esc2(p.price)}</span>
            <span class="ss-plan-period">${esc2(p.period)}</span>
          </div>
          <ul class="ss-plan-features">
            ${p.features.map(f=>`<li><span class="ss-feature-check">✓</span>${esc2(f)}</li>`).join('')}
          </ul>
          <button class="ss-btn" style="width:100%">${esc2(p.btn)}</button>
        </div>`).join('')}
    </div>
  </div>
</section>`;
  }

  if (block.type === 'faq') {
    return `<section class="ss-block ss-section" data-id="${block.id}">
  <div class="ss-container" style="max-width:760px">
    <div style="text-align:center;margin-bottom:48px">
      <div class="ss-heading ss-animate">${esc2(block.heading)}</div>
      <div class="ss-subheading ss-animate" style="margin:0 auto;animation-delay:.08s">${esc2(block.subheading)}</div>
    </div>
    ${block.items.map((item,i)=>`
      <div class="ss-faq-item ss-animate" style="animation-delay:${i*.05}s">
        <div class="ss-faq-q">${esc2(item.q)}<i class="ss-faq-arrow">▾</i></div>
        <div class="ss-faq-a">${esc2(item.a)}</div>
      </div>`).join('')}
  </div>
</section>`;
  }

  if (block.type === 'cta') {
    return `<section class="ss-cta-section ss-cta-block" data-id="${block.id}">
  <div class="ss-container" style="display:flex;flex-direction:column;align-items:center;text-align:center">
    <div class="ss-heading ss-animate">${esc2(block.heading)}</div>
    <div class="ss-subheading ss-animate" style="animation-delay:.08s">${esc2(block.subheading)}</div>
    <div class="ss-btn-group ss-animate" style="justify-content:center;animation-delay:.16s">
      <button class="ss-btn">${esc2(block.btnText)}</button>
      ${block.showBtn2?`<button class="ss-btn-outline" style="border-color:rgba(255,255,255,.35);color:#fff">${esc2(block.btn2Text)}</button>`:''}
    </div>
  </div>
</section>`;
  }
  return '';
}

function esc2(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function esc(s){  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ═══════════════════════════════════════════════
//  POSTMESSAGE FROM IFRAME
// ═══════════════════════════════════════════════
window.addEventListener('message', e => {
  if (e.data.type === 'blockClick') {
    selectBlock(e.data.id);
    const lt = document.querySelectorAll('.panel-tab')[3];
    if (lt) setPanelTab(lt, 'layers');
    updateLayersList();
  }
});

// ═══════════════════════════════════════════════
//  EXPORT  (FIX 2: exports match preview exactly)
// ═══════════════════════════════════════════════
function showExportModal()  { if (!state.blocks.length) { showToast('Add some blocks first!'); return; } document.getElementById('export-modal').classList.remove('hidden'); }
function hideExportModal()  { document.getElementById('export-modal').classList.add('hidden'); }
document.getElementById('export-modal').addEventListener('click', function(e) { if (e.target === this) hideExportModal(); });

function exportHTML() {
  // FIX 2: buildSiteHTML(true) — same function, no scaling divergence
  const html = buildSiteHTML(true);
  dlBlob(html, 'supersuite-site.html', 'text/html');
  hideExportModal();
  showToast('Exported! ✓ Pixel-perfect match to preview');
}

function copyHTMLToClipboard() {
  navigator.clipboard.writeText(buildSiteHTML(true))
    .then(() => { hideExportModal(); showToast('HTML copied to clipboard! ✓'); })
    .catch(() => showToast('Copy failed — try the download option'));
}

function exportSeparateFiles() {
  const full = buildSiteHTML(true);
  // Extract style block
  const styleMatch = full.match(/<style>([\s\S]*?)<\/style>/);
  const scriptMatch = full.match(/<script>([\s\S]*?)<\/script>/);
  const siteCss = styleMatch ? styleMatch[1] : '';
  const siteJs  = scriptMatch ? scriptMatch[1] : '';

  // Strip style and script from HTML, add external refs
  let indexHtml = full
    .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="site.css">')
    .replace(/<script>[\s\S]*?<\/script>/, '<script src="site.js"><\/script>');

  dlBlob(indexHtml, 'index.html', 'text/html');
  setTimeout(() => dlBlob('/* Supersuite Export — site.css */\n' + siteCss, 'site.css', 'text/css'), 300);
  setTimeout(() => dlBlob('/* Supersuite Export — site.js */\n' + siteJs,   'site.js',  'text/javascript'), 600);
  hideExportModal();
  showToast('3 files downloaded: index.html + site.css + site.js ✓');
}

function dlBlob(content, name, type) {
  const b = new Blob([content], { type });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u; a.download = name; a.click();
  URL.revokeObjectURL(u);
}

// ═══════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// Welcome toast
setTimeout(() => showToast('Welcome! Ctrl+Z to undo · Click any block to edit'), 900);
