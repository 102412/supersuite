/* ═══════════════════════════════════════════════════════
   SUPERSUITE script.js  —  All Phases 0 → 5+
   Phase 0: Gate, UI, Templates, Preview
   Phase 1: Revenue blocks, styling, block props
   Phase 2: Drag-to-reorder, move up/down, undo/redo
   Phase 3: Per-element styling, custom CSS, spacing
   Phase 4: Full block interactivity (FAQ accordion,
             form validation, animations, sliders)
   Phase 5: Export HTML / ZIP / Clipboard
   Bonus  : 7 block types, 5 templates, feature editing
═══════════════════════════════════════════════════════ */

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

// ─── Undo / Redo ─────────────────────────────
const history = [];
let historyIndex = -1;

function saveHistory() {
  const snap = JSON.stringify({ blocks: state.blocks, globalStyles: state.globalStyles, template: state.template, spacing: state.spacing, customCSS: state.customCSS });
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
  state.spacing = snap.spacing;
  state.customCSS = snap.customCSS;
  state.selectedBlockId = null;
  closeRightPanel();
  updateLayersList();
  updateStatusBar();
  updateUndoRedoBtns();
  renderPreview();
  showToast(historyIndex === 0 ? 'Undo: back to start' : 'History restored');
}

function updateUndoRedoBtns() {
  const u = document.getElementById('undo-btn');
  const r = document.getElementById('redo-btn');
  if (u) u.disabled = historyIndex <= 0;
  if (r) r.disabled = historyIndex >= history.length - 1;
  const el = document.getElementById('status-undo');
  if (el) el.textContent = history.length > 1 ? `${historyIndex + 1}/${history.length} states` : 'No history';
}

let blockIdCounter = 1;

// ═══════════════════════════════════════════════
//  PASSWORD GATE
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
    setTimeout(() => {
      err.style.opacity = '0';
      document.getElementById('gate-pw').style.borderColor = '';
    }, 3000);
  }
}

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
function initApp() {
  setupKeyboardShortcuts();
  applyTemplate('glass', document.querySelector('.template-card.active'), false);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if (e.key === 'Escape') { closeRightPanel(); }
  });
}

// ═══════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════
function setPanelTab(btn, tab) {
  document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['templates','blocks','styles','layers'].forEach(t => {
    const el = document.getElementById('tab-'+t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}

function setTopTab(btn, tab) {
  document.querySelectorAll('.topbar-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setSize(size, btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const wrap = document.getElementById('preview-wrap');
  wrap.className = 'preview-wrap' + (size !== 'desktop' ? ' ' + size : '');
}

// ═══════════════════════════════════════════════
//  TEMPLATES
// ═══════════════════════════════════════════════
const templates = {
  glass: {
    name: 'Liquid Glass',
    css: `
      body { background: linear-gradient(160deg, #f0f0f8 0%, #e4e4f0 100%); font-family: __BODY__; color: __TEXT__; margin:0; }
      .ss-nav { background: rgba(255,255,255,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.9); box-shadow: 0 1px 20px rgba(0,0,0,0.06); }
      .ss-hero { background: rgba(255,255,255,0.55); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.8); }
      .ss-section { background: rgba(255,255,255,0.4); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.5); }
      .ss-alt-section { background: rgba(255,255,255,0.6); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.5); }
      .ss-cta-section { background: linear-gradient(135deg, __PRIMARY__ee 0%, __SECONDARY__cc 100%); }
      .ss-btn { background: __PRIMARY__; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 24px __PRIMARY__55; letter-spacing: 0.03em; }
      .ss-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px __PRIMARY__88; }
      .ss-btn-outline { background: transparent; border: 2px solid __PRIMARY__; border-radius: __BTN_RADIUS__; color: __PRIMARY__; padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; }
      .ss-btn-outline:hover { background: __PRIMARY__; color: #fff; }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.75); border: 1.5px solid rgba(200,200,220,0.6); backdrop-filter: blur(8px); color: __TEXT__; }
      .ss-card { background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.85); border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
      .ss-pricing-card { background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.85); border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
      .ss-pricing-card.featured { background: __PRIMARY__; color: #fff; border-color: transparent; box-shadow: 0 20px 60px __PRIMARY__55; }
      .ss-faq-item { background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.8); border-radius: 12px; margin-bottom: 8px; backdrop-filter: blur(8px); overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
      .ss-faq-q:hover { background: rgba(255,255,255,0.4); }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: __TEXT__99; line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-feature-icon-wrap { background: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.9); border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
    `
  },
  bold: {
    name: 'Classy Bold',
    css: `
      body { background: #080810; font-family: __BODY__; color: #f0f0f8; margin: 0; }
      .ss-nav { background: rgba(8,8,16,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
      .ss-hero { background: linear-gradient(180deg, #0a0a12 0%, #0f0f1a 100%); border-bottom: 1px solid rgba(255,255,255,0.06); }
      .ss-section { background: #0b0b14; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .ss-alt-section { background: #0e0e18; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .ss-cta-section { background: linear-gradient(135deg, __PRIMARY__ 0%, __SECONDARY__ 100%); }
      .ss-btn { background: __PRIMARY__; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.3s; letter-spacing: 0.04em; box-shadow: 0 4px 20px __PRIMARY__44; }
      .ss-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 40px __PRIMARY__66; filter: brightness(1.1); }
      .ss-btn-outline { background: transparent; border: 2px solid rgba(255,255,255,0.2); border-radius: __BTN_RADIUS__; color: rgba(255,255,255,0.8); padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; }
      .ss-btn-outline:hover { border-color: rgba(255,255,255,0.6); color: #fff; }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #f0f0f8; }
      .ss-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; }
      .ss-pricing-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; color: #f0f0f8; }
      .ss-pricing-card.featured { background: __PRIMARY__; color: #fff; border-color: transparent; box-shadow: 0 20px 60px __PRIMARY__44; }
      .ss-faq-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
      .ss-faq-q:hover { background: rgba(255,255,255,0.04); }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: rgba(255,255,255,0.5); line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-heading { color: #ffffff !important; }
      .ss-subheading { color: rgba(255,255,255,0.5) !important; }
      .ss-feature-icon-wrap { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
    `
  },
  custom: {
    name: 'Vivid Custom',
    css: `
      body { background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); font-family: __BODY__; color: #fff; margin: 0; min-height: 100vh; }
      .ss-nav { background: rgba(15,12,41,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.08); }
      .ss-hero { background: transparent; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .ss-section { background: rgba(0,0,0,0.25); border-bottom: 1px solid rgba(255,255,255,0.05); }
      .ss-alt-section { background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.05); }
      .ss-cta-section { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__, #ff6b6b); }
      .ss-btn { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__); border: none; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 40px __PRIMARY__33; letter-spacing: 0.03em; }
      .ss-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 10px 40px __PRIMARY__66; }
      .ss-btn-outline { background: transparent; border: 2px solid rgba(255,255,255,0.3); border-radius: __BTN_RADIUS__; color: #fff; padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; }
      .ss-btn-outline:hover { border-color: rgba(255,255,255,0.7); }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.2); color: #fff; }
      .ss-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; color: #fff; backdrop-filter: blur(10px); }
      .ss-pricing-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; color: #fff; backdrop-filter: blur(10px); }
      .ss-pricing-card.featured { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__); border-color: transparent; box-shadow: 0 20px 60px __PRIMARY__55; }
      .ss-faq-item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
      .ss-faq-q:hover { background: rgba(255,255,255,0.05); }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: rgba(255,255,255,0.6); line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-heading { color: #ffffff !important; }
      .ss-subheading { color: rgba(255,255,255,0.65) !important; }
      .ss-feature-icon-wrap { background: linear-gradient(135deg, __PRIMARY__33, __SECONDARY__22); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
    `
  },
  neon: {
    name: 'Neon Noir',
    css: `
      body { background: #030308; font-family: __BODY__; color: #e0e0ff; margin: 0; }
      .ss-nav { background: rgba(3,3,8,0.95); backdrop-filter: blur(20px); border-bottom: 1px solid __PRIMARY__44; }
      .ss-hero { background: radial-gradient(ellipse at 50% 0%, __PRIMARY__15 0%, transparent 70%), #050510; border-bottom: 1px solid __PRIMARY__33; }
      .ss-section { background: #060612; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .ss-alt-section { background: radial-gradient(ellipse at 50% 50%, __SECONDARY__08 0%, transparent 70%), #06060f; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .ss-cta-section { background: linear-gradient(135deg, #080815, #0d0d20); border-top: 1px solid __PRIMARY__44; border-bottom: 1px solid __SECONDARY__44; }
      .ss-btn { background: transparent; border: 1.5px solid __PRIMARY__; border-radius: __BTN_RADIUS__; color: __PRIMARY__; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; letter-spacing: 0.05em; box-shadow: 0 0 20px __PRIMARY__22, inset 0 0 20px __PRIMARY__08; }
      .ss-btn:hover { background: __PRIMARY__18; box-shadow: 0 0 40px __PRIMARY__44, inset 0 0 20px __PRIMARY__15; transform: translateY(-1px); color: #fff; }
      .ss-btn-outline { background: transparent; border: 1px solid __SECONDARY__88; border-radius: __BTN_RADIUS__; color: __SECONDARY__; padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; box-shadow: 0 0 16px __SECONDARY__22; }
      .ss-btn-outline:hover { box-shadow: 0 0 30px __SECONDARY__44; }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.04); border: 1px solid __PRIMARY__44; color: #e0e0ff; }
      .ss-form input:focus, .ss-form textarea:focus { border-color: __PRIMARY__; box-shadow: 0 0 20px __PRIMARY__33; }
      .ss-card { background: rgba(255,255,255,0.02); border: 1px solid __PRIMARY__33; border-radius: 16px; color: #e0e0ff; box-shadow: 0 0 30px __PRIMARY__11; }
      .ss-pricing-card { background: rgba(255,255,255,0.02); border: 1px solid __PRIMARY__33; border-radius: 16px; color: #e0e0ff; }
      .ss-pricing-card.featured { background: transparent; border-color: __PRIMARY__; box-shadow: 0 0 60px __PRIMARY__33, inset 0 0 60px __PRIMARY__08; }
      .ss-faq-item { background: rgba(255,255,255,0.02); border: 1px solid __PRIMARY__33; border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
      .ss-faq-q:hover { background: __PRIMARY__0d; }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: rgba(224,224,255,0.5); line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-heading { color: #ffffff !important; text-shadow: 0 0 40px __PRIMARY__55; }
      .ss-subheading { color: rgba(224,224,255,0.5) !important; }
      .ss-feature-icon-wrap { background: transparent; border: 1px solid __PRIMARY__55; border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; box-shadow: 0 0 20px __PRIMARY__33; }
      .ss-plan-price { text-shadow: 0 0 30px __PRIMARY__88 !important; }
    `
  },
  clean: {
    name: 'Clean Light',
    css: `
      body { background: #ffffff; font-family: __BODY__; color: __TEXT__; margin: 0; }
      .ss-nav { background: #fff; border-bottom: 1px solid rgba(0,0,0,0.08); }
      .ss-hero { background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); }
      .ss-section { background: #f8f8fc; border-bottom: 1px solid rgba(0,0,0,0.05); }
      .ss-alt-section { background: #ffffff; border-bottom: 1px solid rgba(0,0,0,0.05); }
      .ss-cta-section { background: __TEXT__; }
      .ss-btn { background: __TEXT__; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.25s; letter-spacing: 0.03em; }
      .ss-btn:hover { background: __PRIMARY__; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
      .ss-btn-outline { background: transparent; border: 1.5px solid rgba(0,0,0,0.2); border-radius: __BTN_RADIUS__; color: __TEXT__; padding: 12px 28px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.25s; }
      .ss-btn-outline:hover { border-color: __TEXT__; }
      .ss-form input, .ss-form textarea { background: #f4f4f8; border: 1.5px solid rgba(0,0,0,0.1); color: __TEXT__; }
      .ss-card { background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.05); }
      .ss-pricing-card { background: #fff; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.05); }
      .ss-pricing-card.featured { background: __TEXT__; color: #fff; border-color: transparent; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
      .ss-faq-item { background: #fff; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
      .ss-faq-q { padding: 18px 22px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
      .ss-faq-q:hover { background: #f8f8fc; }
      .ss-faq-a { padding: 0 22px; max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; color: rgba(0,0,0,0.5); line-height: 1.7; font-size: 15px; }
      .ss-faq-a.open { max-height: 200px; padding: 0 22px 18px; }
      .ss-cta-section .ss-heading { color: #fff !important; }
      .ss-cta-section .ss-subheading { color: rgba(255,255,255,0.65) !important; }
      .ss-cta-section .ss-btn { background: #fff !important; color: __TEXT__ !important; }
      .ss-cta-section .ss-btn:hover { background: __PRIMARY__ !important; color: #fff !important; }
      .ss-feature-icon-wrap { background: #f4f4f8; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
    `
  }
};

function getSpacingPx() {
  if (state.spacing === 'compact') return '48px 40px';
  if (state.spacing === 'spacious') return '120px 40px';
  return '80px 40px';
}

function getBtnRadius() {
  const s = state.globalStyles.btnStyle;
  if (s === 'square') return '6px';
  if (s === 'pill') return '999px';
  return '12px';
}

function interpolateCSS(css) {
  return css
    .replace(/__PRIMARY__/g,   state.globalStyles.primaryColor)
    .replace(/__SECONDARY__/g, state.globalStyles.secondaryColor)
    .replace(/__TEXT__/g,      state.globalStyles.textColor)
    .replace(/__HEADING__/g,   state.globalStyles.headingFont)
    .replace(/__BODY__/g,      state.globalStyles.bodyFont)
    .replace(/__BTN_RADIUS__/g,getBtnRadius());
}

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

// ═══════════════════════════════════════════════
//  BLOCK DEFAULTS
// ═══════════════════════════════════════════════
function createBlock(type) {
  const id = 'block_' + (blockIdCounter++);
  const defaults = {
    hero: {
      type:'hero', label:'Hero Section', icon:'🚀',
      heading:'Build Your Dream Website',
      subheading:'Fast, beautiful, and fully customizable. Start for free today.',
      btnText:'Get Started Free', btn2Text:'See Examples',
      showBtn2: true,
      textAlign:'center',
      showBadge: true,
      badgeText:'🎉 New — Version 2.0 is here',
    },
    features: {
      type:'features', label:'Features', icon:'✨',
      heading:'Everything You Need to Succeed',
      subheading:'Powerful tools, intuitive design, real results.',
      items: [
        { icon:'⚡', title:'Lightning Fast', desc:'Built on modern infrastructure. Pages load in under 200ms, globally.' },
        { icon:'🎨', title:'Beautiful Design', desc:'Professionally designed templates that convert visitors into customers.' },
        { icon:'📊', title:'Analytics Built-in', desc:'Understand your audience with real-time insights and heatmaps.' },
        { icon:'🔒', title:'Enterprise Security', desc:'SSL, DDoS protection, and SOC2 compliance included on every plan.' },
        { icon:'🌍', title:'Global CDN', desc:'Your site delivered from 200+ edge locations worldwide.' },
        { icon:'🛠', title:'No-Code Editor', desc:'Build anything without writing a single line of code.' },
      ],
    },
    lead: {
      type:'lead', label:'Lead Form', icon:'📬',
      heading:'Stay in the Loop',
      subheading:'Get exclusive updates, tips, and early access right in your inbox.',
      fields: ['Name', 'Email address'],
      btnText:'Subscribe Now',
      successMsg:'🎉 You\'re in! Check your inbox.',
    },
    testimonials: {
      type:'testimonials', label:'Testimonials', icon:'💬',
      heading:'What Our Customers Say',
      subheading:'Trusted by thousands of creators and businesses worldwide.',
      reviews: [
        { name:'Sarah J.', role:'Founder, Bloom Co.', text:'Supersuite transformed our online presence. Our conversions went up 3x in the first month!', avatar:'👩‍💼', rating:5 },
        { name:'Marcus T.', role:'Creative Director', text:'I\'ve tried every website builder. Nothing comes close to this level of design quality.', avatar:'👨‍🎨', rating:5 },
        { name:'Priya K.', role:'E-commerce Owner', text:'Set up my entire store in a weekend. The export is clean, real code I actually own.', avatar:'👩‍💻', rating:5 },
      ],
    },
    pricing: {
      type:'pricing', label:'Pricing', icon:'💎',
      heading:'Simple, Transparent Pricing',
      subheading:'No hidden fees. Cancel anytime. Start for free.',
      showToggle: true,
      plans: [
        { name:'Starter', price:'$0', priceAnnual:'$0', period:'/mo', features:['5 pages','1 custom domain','Basic templates','SSL included','Email support'], featured:false, btn:'Start Free', badge:'' },
        { name:'Pro', price:'$29', priceAnnual:'$19', period:'/mo', features:['Unlimited pages','3 custom domains','All templates','Priority support','Analytics dashboard','Custom code'], featured:true, btn:'Get Pro', badge:'Most Popular' },
        { name:'Business', price:'$79', priceAnnual:'$59', period:'/mo', features:['Everything in Pro','10 domains','Team collaboration','White label','API access','Dedicated support'], featured:false, btn:'Contact Sales', badge:'' },
      ],
    },
    faq: {
      type:'faq', label:'FAQ', icon:'❓',
      heading:'Frequently Asked Questions',
      subheading:'Got questions? We\'ve got answers.',
      items: [
        { q:'Can I cancel anytime?', a:'Yes, absolutely. You can cancel your subscription at any time with no questions asked. You\'ll retain access until the end of your billing period.' },
        { q:'Do I own my website?', a:'100%. When you export, you get clean HTML, CSS, and JS that you own forever. No vendor lock-in, ever.' },
        { q:'Is there a free trial?', a:'Our Starter plan is free forever. For Pro features, you get a 14-day free trial with no credit card required.' },
        { q:'Can I use my own domain?', a:'Yes! You can connect any custom domain you own. We support both apex domains and subdomains.' },
      ],
    },
    cta: {
      type:'cta', label:'CTA Section', icon:'⚡',
      heading:'Ready to Build Something Amazing?',
      subheading:'Join 47,000+ creators who launched their dream site this week.',
      btnText:'Start Building Free →',
      btn2Text:'Schedule a Demo',
      showBtn2: true,
    },
  };
  return { id, ...defaults[type] };
}

// ═══════════════════════════════════════════════
//  BLOCK CRUD
// ═══════════════════════════════════════════════
function addBlock(type, render = true) {
  const block = createBlock(type);
  state.blocks.push(block);
  updateLayersList();
  updateStatusBar();
  if (render) {
    renderPreview();
    selectBlock(block.id);
    saveHistory();
    showToast(block.label + ' added!');
  }
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
//  LAYERS PANEL  (Phase 2 — drag to reorder)
// ═══════════════════════════════════════════════
let dragSrcId = null;

function updateLayersList() {
  const list  = document.getElementById('layers-list');
  const empty = document.getElementById('layers-empty');
  const count = document.getElementById('layer-count');
  if (!list) return;
  count.textContent = state.blocks.length + ' block' + (state.blocks.length !== 1 ? 's' : '');
  if (state.blocks.length === 0) { list.innerHTML = ''; empty.style.display=''; return; }
  empty.style.display = 'none';
  list.innerHTML = state.blocks.map((b,i) => `
    <div class="block-order-item ${b.id===state.selectedBlockId?'selected':''}"
         data-id="${b.id}" draggable="true" onclick="selectBlock('${b.id}')">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <span class="block-order-icon">${b.icon}</span>
      <span style="flex:1;font-size:11px;font-weight:500">${b.label}</span>
      <span style="color:var(--text3);font-size:10px">#${i+1}</span>
    </div>
  `).join('');

  // Drag events
  list.querySelectorAll('.block-order-item').forEach(el => {
    el.addEventListener('dragstart', e => {
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
      const fromIdx = state.blocks.findIndex(b => b.id === dragSrcId);
      const toIdx   = state.blocks.findIndex(b => b.id === el.dataset.id);
      const arr = [...state.blocks];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
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
//  RIGHT PANEL — BLOCK PROPERTIES  (Phase 1+3)
// ═══════════════════════════════════════════════
function openRightPanel(block) {
  const panel   = document.getElementById('right-panel');
  const content = document.getElementById('right-panel-content');
  const title   = document.getElementById('rp-title');
  panel.classList.remove('hidden');
  title.textContent = block.icon + ' ' + block.label;
  content.innerHTML = buildBlockProps(block);
  attachPropListeners(block);
}

function closeRightPanel() {
  document.getElementById('right-panel').classList.add('hidden');
  state.selectedBlockId = null;
  updateLayersList();
}

// ─── BUILD PROPS HTML ─────────────────────────
function buildBlockProps(block) {
  let h = '';

  // Move up/down controls (Phase 2)
  const idx = state.blocks.findIndex(b => b.id === block.id);
  h += `<div class="block-move-btns">
    <button class="move-btn" onclick="moveBlock('${block.id}',-1)" ${idx===0?'disabled style="opacity:.3"':''}>↑ Move Up</button>
    <button class="move-btn" onclick="moveBlock('${block.id}',1)"  ${idx===state.blocks.length-1?'disabled style="opacity:.3"':''}>↓ Move Down</button>
  </div>`;

  if (block.type === 'hero') {
    h += propGroup('Content', `
      ${propRow('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${propRow('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
      ${propRow('Button 1',   `<input class="prop-input" data-prop="btnText"   value="${esc(block.btnText)}">`)}
      ${propRow('Button 2',   `<input class="prop-input" data-prop="btn2Text"  value="${esc(block.btn2Text)}">`)}
      ${toggleRow('Show Button 2', 'showBtn2', block.showBtn2)}
      ${propRow('Badge Text', `<input class="prop-input" data-prop="badgeText" value="${esc(block.badgeText)}">`)}
      ${toggleRow('Show Badge', 'showBadge', block.showBadge)}
    `);
    h += propGroup('Appearance', `
      ${propRow('Alignment', `<select class="prop-input" data-prop="textAlign">
        <option value="left"   ${block.textAlign==='left'  ?'selected':''}>Left</option>
        <option value="center" ${block.textAlign==='center'?'selected':''}>Center</option>
        <option value="right"  ${block.textAlign==='right' ?'selected':''}>Right</option>
      </select>`)}
    `);
  }

  else if (block.type === 'features') {
    h += propGroup('Content', `
      ${propRow('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${propRow('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
    `);
    h += `<div class="prop-group">
      <div class="prop-group-title">Features <span style="font-weight:400;text-transform:none;letter-spacing:0">(${block.items.length})</span></div>`;
    block.items.forEach((item, i) => {
      h += `<div class="nested-card">
        <div class="nested-card-header">Feature ${i+1}
          <button class="mini-btn danger" onclick="removeFeatureItem('${block.id}',${i})">Remove</button>
        </div>
        ${propRow('Icon',  `<input class="prop-input" data-fitem="${i}" data-field="icon"  value="${esc(item.icon)}">`)}
        ${propRow('Title', `<input class="prop-input" data-fitem="${i}" data-field="title" value="${esc(item.title)}">`)}
        ${propRow('Desc',  `<textarea class="prop-textarea" data-fitem="${i}" data-field="desc">${esc(item.desc)}</textarea>`)}
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addFeatureItem('${block.id}')">+ Add Feature</button></div>`;
  }

  else if (block.type === 'lead') {
    h += propGroup('Content', `
      ${propRow('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${propRow('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
      ${propRow('Button',     `<input class="prop-input" data-prop="btnText"    value="${esc(block.btnText)}">`)}
      ${propRow('Success Msg',`<input class="prop-input" data-prop="successMsg" value="${esc(block.successMsg)}">`)}
    `);
    h += `<div class="prop-group">
      <div class="prop-group-title">Form Fields</div>`;
    block.fields.forEach((f, i) => {
      h += `<div class="feature-row">
        <input class="feature-input" data-field-idx="${i}" value="${esc(f)}" placeholder="Field label">
        <button class="remove-feature-btn" onclick="removeFormField('${block.id}',${i})">✕</button>
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addFormField('${block.id}')">+ Add Field</button></div>`;
  }

  else if (block.type === 'testimonials') {
    h += propGroup('Content', `
      ${propRow('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${propRow('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
    `);
    h += `<div class="prop-group"><div class="prop-group-title">Reviews (${block.reviews.length})</div>`;
    block.reviews.forEach((r, i) => {
      h += `<div class="nested-card">
        <div class="nested-card-header">Review ${i+1}
          <button class="mini-btn danger" onclick="removeReview('${block.id}',${i})">Remove</button>
        </div>
        ${propRow('Name',   `<input class="prop-input" data-review="${i}" data-field="name"   value="${esc(r.name)}">`)}
        ${propRow('Role',   `<input class="prop-input" data-review="${i}" data-field="role"   value="${esc(r.role)}">`)}
        ${propRow('Avatar', `<input class="prop-input" data-review="${i}" data-field="avatar" value="${esc(r.avatar)}" style="width:60px;flex:0">&nbsp;<span style="font-size:24px">${r.avatar}</span>`)}
        ${propRow('Text',   `<textarea class="prop-textarea" data-review="${i}" data-field="text">${esc(r.text)}</textarea>`)}
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addReview('${block.id}')">+ Add Review</button></div>`;
  }

  else if (block.type === 'pricing') {
    h += propGroup('Content', `
      ${propRow('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${propRow('Subheading', `<input class="prop-input" data-prop="subheading" value="${esc(block.subheading)}">`)}
      ${toggleRow('Annual Toggle', 'showToggle', block.showToggle)}
    `);
    h += `<div class="prop-group"><div class="prop-group-title">Plans (${block.plans.length})</div>`;
    block.plans.forEach((p, i) => {
      h += `<div class="nested-card ${p.featured?'featured-card':''}">
        <div class="nested-card-header ${p.featured?'featured-header':''}">${p.featured?'⭐ ':''}Plan ${i+1}
          <div style="display:flex;gap:4px">
            <button class="mini-btn" onclick="toggleFeaturedPlan('${block.id}',${i})">${p.featured?'Unfeature':'Feature'}</button>
            <button class="mini-btn danger" onclick="removePlan('${block.id}',${i})">Remove</button>
          </div>
        </div>
        ${propRow('Name',         `<input class="prop-input" data-plan="${i}" data-field="name"         value="${esc(p.name)}">`)}
        ${propRow('Price/mo',     `<input class="prop-input" data-plan="${i}" data-field="price"        value="${esc(p.price)}">`)}
        ${propRow('Price/yr',     `<input class="prop-input" data-plan="${i}" data-field="priceAnnual"  value="${esc(p.priceAnnual)}">`)}
        ${propRow('Badge',        `<input class="prop-input" data-plan="${i}" data-field="badge"        value="${esc(p.badge)}">`)}
        ${propRow('Button',       `<input class="prop-input" data-plan="${i}" data-field="btn"          value="${esc(p.btn)}">`)}
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px">Features</div>
        ${p.features.map((f,fi) => `
          <div class="feature-row">
            <input class="feature-input" data-plan="${i}" data-feat="${fi}" value="${esc(f)}">
            <button class="remove-feature-btn" onclick="removePlanFeature('${block.id}',${i},${fi})">✕</button>
          </div>
        `).join('')}
        <button class="add-item-btn" onclick="addPlanFeature('${block.id}',${i})">+ Add Feature</button>
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addPlan('${block.id}')">+ Add Plan</button></div>`;
  }

  else if (block.type === 'faq') {
    h += propGroup('Content', `
      ${propRow('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${propRow('Subheading', `<input class="prop-input" data-prop="subheading" value="${esc(block.subheading)}">`)}
    `);
    h += `<div class="prop-group"><div class="prop-group-title">FAQ Items (${block.items.length})</div>`;
    block.items.forEach((item, i) => {
      h += `<div class="nested-card">
        <div class="nested-card-header">Item ${i+1}
          <button class="mini-btn danger" onclick="removeFAQ('${block.id}',${i})">Remove</button>
        </div>
        ${propRow('Question', `<input class="prop-input" data-faq="${i}" data-field="q" value="${esc(item.q)}">`)}
        ${propRow('Answer',   `<textarea class="prop-textarea" data-faq="${i}" data-field="a">${esc(item.a)}</textarea>`)}
      </div>`;
    });
    h += `<button class="add-item-btn" onclick="addFAQ('${block.id}')">+ Add FAQ</button></div>`;
  }

  else if (block.type === 'cta') {
    h += propGroup('Content', `
      ${propRow('Heading',    `<input class="prop-input" data-prop="heading"    value="${esc(block.heading)}">`)}
      ${propRow('Subheading', `<textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea>`)}
      ${propRow('Button 1',   `<input class="prop-input" data-prop="btnText"   value="${esc(block.btnText)}">`)}
      ${propRow('Button 2',   `<input class="prop-input" data-prop="btn2Text"  value="${esc(block.btn2Text)}">`)}
      ${toggleRow('Show Button 2', 'showBtn2', block.showBtn2)}
    `);
  }

  h += `<button class="delete-block-btn" onclick="removeBlock('${block.id}')">🗑 Remove This Block</button>`;
  return h;
}

// ─── Prop helpers ────────────────────────────
function propGroup(title, inner) {
  return `<div class="prop-group"><div class="prop-group-title">${title}</div>${inner}</div>`;
}
function propRow(label, input) {
  return `<div class="prop-row"><span class="prop-label">${label}</span>${input}</div>`;
}
function toggleRow(label, prop, val) {
  return `<div class="toggle-row">
    <span class="toggle-label">${label}</span>
    <div class="toggle ${val?'on':''}" data-toggle="${prop}" onclick="handleToggle(this,'${prop}')"></div>
  </div>`;
}

function handleToggle(el, prop) {
  el.classList.toggle('on');
  const val = el.classList.contains('on');
  const block = state.blocks.find(b => b.id === state.selectedBlockId);
  if (block) { block[prop] = val; renderPreview(); saveHistory(); }
}

// ═══════════════════════════════════════════════
//  PROP LISTENERS
// ═══════════════════════════════════════════════
function attachPropListeners(block) {
  const rp = document.getElementById('right-panel-content');

  rp.querySelectorAll('[data-prop]').forEach(el => {
    el.addEventListener('input', () => { block[el.dataset.prop] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });

  rp.querySelectorAll('[data-review]').forEach(el => {
    el.addEventListener('input', () => { block.reviews[+el.dataset.review][el.dataset.field] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });

  rp.querySelectorAll('[data-plan]').forEach(el => {
    if (el.dataset.feat !== undefined) {
      el.addEventListener('input', () => { block.plans[+el.dataset.plan].features[+el.dataset.feat] = el.value; renderPreview(); });
    } else {
      el.addEventListener('input', () => { block.plans[+el.dataset.plan][el.dataset.field] = el.value; renderPreview(); });
    }
    el.addEventListener('change', () => saveHistory());
  });

  rp.querySelectorAll('[data-fitem]').forEach(el => {
    el.addEventListener('input', () => { block.items[+el.dataset.fitem][el.dataset.field] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });

  rp.querySelectorAll('[data-faq]').forEach(el => {
    el.addEventListener('input', () => { block.items[+el.dataset.faq][el.dataset.field] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });

  rp.querySelectorAll('[data-field-idx]').forEach(el => {
    el.addEventListener('input', () => { block.fields[+el.dataset.fieldIdx] = el.value; renderPreview(); });
    el.addEventListener('change', () => saveHistory());
  });
}

// ─── Block mutation helpers ───────────────────
function refreshPanel() {
  const block = state.blocks.find(b => b.id === state.selectedBlockId);
  if (block) { openRightPanel(block); }
}

function addReview(blockId) {
  const b = state.blocks.find(x => x.id === blockId);
  b.reviews.push({ name:'New Reviewer', role:'Their Role', text:'This product is fantastic.', avatar:'👤', rating:5 });
  renderPreview(); saveHistory(); refreshPanel();
}
function removeReview(blockId, i) {
  const b = state.blocks.find(x => x.id === blockId);
  b.reviews.splice(i, 1); renderPreview(); saveHistory(); refreshPanel();
}

function addPlan(blockId) {
  const b = state.blocks.find(x => x.id === blockId);
  b.plans.push({ name:'New Plan', price:'$49', priceAnnual:'$39', period:'/mo', features:['Feature 1','Feature 2'], featured:false, btn:'Get Started', badge:'' });
  renderPreview(); saveHistory(); refreshPanel();
}
function removePlan(blockId, i) {
  const b = state.blocks.find(x => x.id === blockId);
  b.plans.splice(i, 1); renderPreview(); saveHistory(); refreshPanel();
}
function toggleFeaturedPlan(blockId, i) {
  const b = state.blocks.find(x => x.id === blockId);
  b.plans.forEach((p,j) => p.featured = j === i ? !p.featured : false);
  renderPreview(); saveHistory(); refreshPanel();
}
function addPlanFeature(blockId, planIdx) {
  const b = state.blocks.find(x => x.id === blockId);
  b.plans[planIdx].features.push('New feature');
  renderPreview(); saveHistory(); refreshPanel();
}
function removePlanFeature(blockId, planIdx, featIdx) {
  const b = state.blocks.find(x => x.id === blockId);
  b.plans[planIdx].features.splice(featIdx, 1);
  renderPreview(); saveHistory(); refreshPanel();
}

function addFeatureItem(blockId) {
  const b = state.blocks.find(x => x.id === blockId);
  b.items.push({ icon:'🌟', title:'New Feature', desc:'Describe this feature briefly.' });
  renderPreview(); saveHistory(); refreshPanel();
}
function removeFeatureItem(blockId, i) {
  const b = state.blocks.find(x => x.id === blockId);
  b.items.splice(i, 1); renderPreview(); saveHistory(); refreshPanel();
}

function addFAQ(blockId) {
  const b = state.blocks.find(x => x.id === blockId);
  b.items.push({ q:'Your question here?', a:'Your detailed answer goes here.' });
  renderPreview(); saveHistory(); refreshPanel();
}
function removeFAQ(blockId, i) {
  const b = state.blocks.find(x => x.id === blockId);
  b.items.splice(i, 1); renderPreview(); saveHistory(); refreshPanel();
}

function addFormField(blockId) {
  const b = state.blocks.find(x => x.id === blockId);
  b.fields.push('New field');
  renderPreview(); saveHistory(); refreshPanel();
}
function removeFormField(blockId, i) {
  const b = state.blocks.find(x => x.id === blockId);
  b.fields.splice(i, 1); renderPreview(); saveHistory(); refreshPanel();
}

// ═══════════════════════════════════════════════
//  GLOBAL STYLE UPDATES  (Phase 3)
// ═══════════════════════════════════════════════
function updateGlobalColor(key, value) {
  const map = { primary:'primaryColor', secondary:'secondaryColor', bg:'bgColor', textColor:'textColor' };
  state.globalStyles[map[key]] = value;
  const sw = document.getElementById('swatch-'+key);
  if (sw) sw.style.background = value;
  const hx = document.getElementById('hex-'+key);
  if (hx) hx.textContent = value;
  renderPreview();
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

function updateSpacing(val) {
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
//  BUILD SITE HTML  (Phase 4 — full interactivity)
// ═══════════════════════════════════════════════
function buildSiteHTML() {
  const tpl = templates[state.template];
  const css = interpolateCSS(tpl.css);
  const sp  = getSpacingPx();
  const blocksHTML = state.blocks.map(b => renderBlock(b, sp)).join('\n');
  const gfonts = encodeURIComponent('family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500&family=Space+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?${gfonts}&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh}
${css}

.ss-block{padding:${sp};transition:outline .15s}
.ss-block:hover{outline:2px dashed rgba(99,102,241,.25);outline-offset:-3px;cursor:pointer}
.ss-block.selected{outline:2px solid ${state.globalStyles.primaryColor};outline-offset:-3px}
.ss-container{max-width:1080px;margin:0 auto}

.ss-badge{display:inline-flex;align-items:center;gap:6px;
  background:${state.globalStyles.primaryColor}18;
  border:1px solid ${state.globalStyles.primaryColor}44;
  border-radius:999px;padding:6px 14px;
  font-size:13px;font-weight:600;color:${state.globalStyles.primaryColor};
  margin-bottom:24px;letter-spacing:.01em}

.ss-heading{
  font-family:${state.globalStyles.headingFont};
  font-size:clamp(32px,5vw,68px);font-weight:800;line-height:1.05;
  letter-spacing:-.025em;margin-bottom:20px;
  color:${state.globalStyles.textColor}}

.ss-subheading{
  font-size:clamp(16px,2vw,20px);
  color:${state.globalStyles.textColor}88;
  line-height:1.65;max-width:600px;margin-bottom:36px}

.ss-btn-group{display:flex;gap:12px;flex-wrap:wrap}

.ss-form{max-width:500px;width:100%}
.ss-form input,.ss-form textarea{
  display:block;width:100%;
  padding:14px 18px;border-radius:10px;
  font-size:15px;font-family:${state.globalStyles.bodyFont};
  outline:none;margin-bottom:12px;transition:all .2s}
.ss-form input:focus,.ss-form textarea:focus{
  border-color:${state.globalStyles.primaryColor}!important;
  box-shadow:0 0 0 3px ${state.globalStyles.primaryColor}33}
.ss-form-success{display:none;text-align:center;padding:20px;
  font-size:18px;font-weight:600;color:${state.globalStyles.primaryColor}}

.ss-features-grid{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px;margin-top:48px}
.ss-feature-item{padding:28px}
.ss-feature-title{font-family:${state.globalStyles.headingFont};font-size:18px;font-weight:700;margin-bottom:10px;color:${state.globalStyles.textColor}}
.ss-feature-desc{font-size:15px;line-height:1.65;color:${state.globalStyles.textColor}88}

.ss-testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.ss-card{padding:28px;transition:transform .2s,box-shadow .2s}
.ss-card:hover{transform:translateY(-5px)}
.ss-avatar{font-size:42px;margin-bottom:16px}
.ss-stars{color:#fbbf24;margin-bottom:12px;font-size:16px;letter-spacing:2px}
.ss-review-text{font-size:15px;line-height:1.72;opacity:.9;font-style:italic}
.ss-reviewer{font-weight:700;font-size:15px;margin-bottom:3px;font-family:${state.globalStyles.headingFont};color:${state.globalStyles.textColor}}
.ss-reviewer-role{font-size:12px;opacity:.55;margin-bottom:0}

.ss-pricing-annual-wrap{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:44px}
.ss-toggle-pill{width:48px;height:26px;background:${state.globalStyles.primaryColor};border-radius:13px;cursor:pointer;position:relative;transition:background .2s;border:none}
.ss-toggle-pill::after{content:'';position:absolute;width:18px;height:18px;background:#fff;border-radius:50%;top:4px;left:26px;transition:left .2s}
.ss-toggle-pill.monthly::after{left:4px}
.ss-toggle-lbl{font-size:14px;font-weight:500;opacity:.7;cursor:pointer}
.ss-toggle-lbl.active{opacity:1;font-weight:700}
.ss-pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;align-items:start}
.ss-pricing-card{padding:36px 28px;transition:transform .25s,box-shadow .25s}
.ss-pricing-card:hover{transform:translateY(-5px)}
.ss-plan-badge{display:inline-block;background:rgba(255,255,255,.2);border-radius:999px;padding:3px 12px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px}
.ss-plan-name{font-family:${state.globalStyles.headingFont};font-size:18px;font-weight:700;margin-bottom:12px}
.ss-plan-price{font-family:${state.globalStyles.headingFont};font-size:54px;font-weight:800;line-height:1;letter-spacing:-3px}
.ss-plan-period{font-size:16px;font-weight:400;opacity:.55}
.ss-plan-features{list-style:none;margin:24px 0}
.ss-plan-features li{padding:9px 0;border-bottom:1px solid rgba(128,128,128,.12);font-size:14px;display:flex;align-items:center;gap:9px;line-height:1.4}
.ss-pricing-card.featured .ss-plan-features li{border-bottom-color:rgba(255,255,255,.15)}
.ss-feature-check{color:#34d399;font-size:14px;flex-shrink:0}
.ss-pricing-card.featured .ss-feature-check{color:rgba(255,255,255,.9)}

.ss-faq-arrow{transition:transform .3s;display:inline-block;font-style:normal}
.ss-faq-item.open .ss-faq-arrow{transform:rotate(180deg)}

.ss-cta-block{padding:${sp}}
.ss-cta-block .ss-heading{color:#fff!important}
.ss-cta-block .ss-subheading{color:rgba(255,255,255,.75)!important;margin:0 auto 36px}
.ss-cta-block .ss-btn{background:#fff!important;color:${state.globalStyles.primaryColor}!important}
.ss-cta-block .ss-btn:hover{background:rgba(255,255,255,.9)!important;box-shadow:0 10px 30px rgba(0,0,0,.2)!important}

/* Scroll animations */
@keyframes ssSlideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.ss-animate{opacity:0}
.ss-animate.visible{animation:ssSlideUp .6s cubic-bezier(.16,1,.3,1) forwards}

@media(max-width:768px){
  .ss-block,.ss-cta-block{padding:56px 22px}
  .ss-pricing-grid,.ss-testimonials-grid,.ss-features-grid{grid-template-columns:1fr}
  .ss-btn-group{flex-direction:column;align-items:flex-start}
}

${state.customCSS}
</style>
</head>
<body>
${blocksHTML}
<script>
// Block click → select in builder
document.querySelectorAll('.ss-block,.ss-cta-block').forEach(b=>{
  b.addEventListener('click',()=>parent.postMessage({type:'blockClick',id:b.dataset.id},'*'));
});

// Select highlight
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
    const isOpen=item.classList.contains('open');
    document.querySelectorAll('.ss-faq-item').forEach(i=>{i.classList.remove('open');i.querySelector('.ss-faq-a').classList.remove('open');});
    if(!isOpen){item.classList.add('open');a.classList.add('open');}
  });
});

// Pricing annual toggle
const toggleBtn=document.getElementById('pricing-toggle');
const toggleYrLbl=document.getElementById('toggle-annual');
const toggleMoLbl=document.getElementById('toggle-monthly');
if(toggleBtn){
  let isAnnual=false;
  toggleBtn.addEventListener('click',()=>{
    isAnnual=!isAnnual;
    toggleBtn.classList.toggle('monthly',!isAnnual);
    if(toggleYrLbl)toggleYrLbl.classList.toggle('active',isAnnual);
    if(toggleMoLbl)toggleMoLbl.classList.toggle('active',!isAnnual);
    document.querySelectorAll('[data-price-mo]').forEach(el=>{
      el.textContent=isAnnual?el.dataset.priceAnnual:el.dataset.priceMo;
    });
  });
}

// Form submit
document.querySelectorAll('.ss-lead-form').forEach(form=>{
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const success=form.querySelector('.ss-form-success');
    const fields=form.querySelector('.ss-form-fields');
    if(fields)fields.style.display='none';
    if(success)success.style.display='block';
  });
});

// Scroll animations
const obs=new IntersectionObserver(entries=>{
  entries.forEach(en=>{if(en.isIntersecting)en.target.classList.add('visible');});
},{threshold:.12});
document.querySelectorAll('.ss-animate').forEach(el=>obs.observe(el));
<\/script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════
//  RENDER BLOCKS  (Phase 1+4)
// ═══════════════════════════════════════════════
function renderBlock(block, sp) {
  const align = block.textAlign || 'center';
  const alignItems = align==='center'?'center':align==='right'?'flex-end':'flex-start';

  if (block.type === 'hero') {
    return `<section class="ss-block ss-hero" data-id="${block.id}" style="text-align:${align}">
  <div class="ss-container" style="display:flex;flex-direction:column;align-items:${alignItems}">
    ${block.showBadge ? `<div class="ss-badge ss-animate">${esc2(block.badgeText)}</div>` : ''}
    <div class="ss-heading ss-animate" style="animation-delay:.05s">${esc2(block.heading)}</div>
    <div class="ss-subheading ss-animate" style="animation-delay:.12s">${esc2(block.subheading)}</div>
    <div class="ss-btn-group ss-animate" style="animation-delay:.2s;justify-content:${alignItems}">
      <button class="ss-btn">${esc2(block.btnText)}</button>
      ${block.showBtn2 ? `<button class="ss-btn-outline">${esc2(block.btn2Text)}</button>` : ''}
    </div>
  </div>
</section>`;
  }

  if (block.type === 'features') {
    return `<section class="ss-block ss-alt-section" data-id="${block.id}">
  <div class="ss-container">
    <div style="text-align:center">
      <div class="ss-heading ss-animate">${esc2(block.heading)}</div>
      <div class="ss-subheading ss-animate" style="margin:0 auto;animation-delay:.08s">${esc2(block.subheading)}</div>
    </div>
    <div class="ss-features-grid">
      ${block.items.map((item,i) => `
        <div class="ss-card ss-animate" style="animation-delay:${.05*(i%3)}s">
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
        ${block.fields.map(f => `<input type="text" placeholder="${esc2(f)}" required>`).join('')}
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
      ${block.reviews.map((r,i) => `
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
    const hasToggle = block.showToggle;
    return `<section class="ss-block ss-alt-section" data-id="${block.id}">
  <div class="ss-container">
    <div style="text-align:center;margin-bottom:${hasToggle?'0':'48px'}">
      <div class="ss-heading ss-animate">${esc2(block.heading)}</div>
      <div class="ss-subheading ss-animate" style="margin:0 auto;animation-delay:.08s">${esc2(block.subheading)}</div>
    </div>
    ${hasToggle ? `
    <div class="ss-pricing-annual-wrap ss-animate" style="animation-delay:.15s">
      <span class="ss-toggle-lbl active" id="toggle-monthly">Monthly</span>
      <button class="ss-toggle-pill monthly" id="pricing-toggle" aria-label="Toggle billing"></button>
      <span class="ss-toggle-lbl" id="toggle-annual">Annual <span style="color:#34d399;font-size:12px;font-weight:700">Save 35%</span></span>
    </div>` : ''}
    <div class="ss-pricing-grid">
      ${block.plans.map((p,i) => `
        <div class="ss-pricing-card ${p.featured?'featured':''} ss-animate" style="animation-delay:${i*.07}s">
          ${p.badge ? `<div class="ss-plan-badge">${esc2(p.badge)}</div>` : ''}
          <div class="ss-plan-name">${esc2(p.name)}</div>
          <div style="margin-bottom:8px">
            <span class="ss-plan-price" data-price-mo="${esc2(p.price)}" data-price-annual="${esc2(p.priceAnnual)}">${esc2(p.price)}</span>
            <span class="ss-plan-period">${esc2(p.period)}</span>
          </div>
          <ul class="ss-plan-features">
            ${p.features.map(f => `<li><span class="ss-feature-check">✓</span>${esc2(f)}</li>`).join('')}
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
    ${block.items.map((item,i) => `
      <div class="ss-faq-item ss-animate" style="animation-delay:${i*.05}s">
        <div class="ss-faq-q">${esc2(item.q)} <i class="ss-faq-arrow">▾</i></div>
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
      ${block.showBtn2 ? `<button class="ss-btn-outline" style="border-color:rgba(255,255,255,.4);color:#fff">${esc2(block.btn2Text)}</button>` : ''}
    </div>
  </div>
</section>`;
  }

  return '';
}

function esc2(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════
//  POSTMESSAGE FROM IFRAME
// ═══════════════════════════════════════════════
window.addEventListener('message', e => {
  if (e.data.type === 'blockClick') {
    selectBlock(e.data.id);
    // Switch to layers tab to show selection
    const layersTab = document.querySelectorAll('.panel-tab')[3];
    if (layersTab) setPanelTab(layersTab, 'layers');
    updateLayersList();
  }
});

// ═══════════════════════════════════════════════
//  EXPORT  (Phase 5)
// ═══════════════════════════════════════════════
function showExportModal() {
  if (state.blocks.length === 0) { showToast('Add some blocks first!'); return; }
  document.getElementById('export-modal').classList.remove('hidden');
}
function hideExportModal() {
  document.getElementById('export-modal').classList.add('hidden');
}

// Close modal on overlay click
document.getElementById('export-modal').addEventListener('click', function(e) {
  if (e.target === this) hideExportModal();
});

function exportHTML() {
  const html = buildSiteHTML();
  downloadBlob(html, 'supersuite-site.html', 'text/html');
  hideExportModal();
  showToast('HTML exported! ✓');
}

function copyHTMLToClipboard() {
  const html = buildSiteHTML();
  navigator.clipboard.writeText(html).then(() => {
    hideExportModal();
    showToast('HTML copied to clipboard! ✓');
  }).catch(() => showToast('Copy failed — try the download option'));
}

// Phase 5: Export as ZIP with separate HTML + CSS + JS
function exportZip() {
  const tpl = templates[state.template];
  const css = interpolateCSS(tpl.css);
  const sp  = getSpacingPx();
  const blocksHTML = state.blocks.map(b => renderBlock(b, sp)).join('\n');
  const gfonts = encodeURIComponent('family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500&family=Space+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400');

  // site.css
  const siteCss = `/* Supersuite Export — site.css */\n${css}\n\n.ss-block{padding:${sp}}\n.ss-container{max-width:1080px;margin:0 auto}\n.ss-badge{display:inline-flex;align-items:center;gap:6px;background:${state.globalStyles.primaryColor}18;border:1px solid ${state.globalStyles.primaryColor}44;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;color:${state.globalStyles.primaryColor};margin-bottom:24px}\n.ss-heading{font-family:${state.globalStyles.headingFont};font-size:clamp(32px,5vw,68px);font-weight:800;line-height:1.05;letter-spacing:-.025em;margin-bottom:20px;color:${state.globalStyles.textColor}}\n.ss-subheading{font-size:clamp(16px,2vw,20px);color:${state.globalStyles.textColor}88;line-height:1.65;max-width:600px;margin-bottom:36px}\n.ss-btn-group{display:flex;gap:12px;flex-wrap:wrap}\n${state.customCSS}`;

  // site.js
  const siteJs = `/* Supersuite Export — site.js */
document.querySelectorAll('.ss-faq-q').forEach(q=>{
  q.addEventListener('click',()=>{
    const item=q.parentElement;
    const a=item.querySelector('.ss-faq-a');
    const isOpen=item.classList.contains('open');
    document.querySelectorAll('.ss-faq-item').forEach(i=>{i.classList.remove('open');i.querySelector('.ss-faq-a').classList.remove('open');});
    if(!isOpen){item.classList.add('open');a.classList.add('open');}
  });
});
const toggleBtn=document.getElementById('pricing-toggle');
if(toggleBtn){
  let isAnnual=false;
  toggleBtn.addEventListener('click',()=>{
    isAnnual=!isAnnual;
    toggleBtn.classList.toggle('monthly',!isAnnual);
    ['toggle-annual','toggle-monthly'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.toggle('active',id==='toggle-annual'?isAnnual:!isAnnual);});
    document.querySelectorAll('[data-price-mo]').forEach(el=>{el.textContent=isAnnual?el.dataset.priceAnnual:el.dataset.priceMo;});
  });
}
document.querySelectorAll('.ss-lead-form').forEach(form=>{
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const success=form.querySelector('.ss-form-success');
    const fields=form.querySelector('.ss-form-fields');
    if(fields)fields.style.display='none';
    if(success)success.style.display='block';
  });
});
const obs=new IntersectionObserver(entries=>{entries.forEach(en=>{if(en.isIntersecting)en.target.classList.add('visible');});},{threshold:.12});
document.querySelectorAll('.ss-animate').forEach(el=>obs.observe(el));
`;

  // index.html (lean)
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Supersuite Site</title>
<link href="https://fonts.googleapis.com/css2?${gfonts}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css">
</head>
<body>
${blocksHTML}
<script src="site.js"><\/script>
</body>
</html>`;

  // Build a minimal ZIP manually using BlobBuilder approach
  // We'll use a simple zip-like multi-file download since JSZip isn't loaded
  // Instead: download each file, then notify
  downloadBlob(indexHtml, 'index.html', 'text/html');
  setTimeout(() => downloadBlob(siteCss, 'site.css', 'text/css'), 300);
  setTimeout(() => downloadBlob(siteJs,  'site.js',  'text/javascript'), 600);
  hideExportModal();
  showToast('3 files downloaded: index.html + site.css + site.js ✓');
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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

// Keyboard shortcut hint on load
setTimeout(() => showToast('Welcome back! Ctrl+Z to undo, Ctrl+Y to redo'), 800);
