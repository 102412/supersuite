// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
const state = {
  template: 'glass',
  blocks: [],
  selectedBlockId: null,
  globalStyles: {
    primaryColor: '#6366f1',
    secondaryColor: '#ec4899',
    bgColor: '#ffffff',
    textColor: '#111827',
    headingFont: "'Syne', sans-serif",
    bodyFont: "'DM Sans', sans-serif",
    btnStyle: 'rounded', // rounded | square | pill
  },
};

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
    document.getElementById('gate').style.opacity = '0';
    document.getElementById('gate').style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.getElementById('gate').style.display = 'none';
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
  applyTemplate('glass', document.querySelector('.template-card.active'));
}

// ═══════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════
function setPanelTab(btn, tab) {
  document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['templates','blocks','styles','layers'].forEach(t => {
    document.getElementById('tab-'+t).style.display = t === tab ? '' : 'none';
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
  wrap.className = 'preview-wrap ' + (size !== 'desktop' ? size : '');
}

// ═══════════════════════════════════════════════
//  TEMPLATES
// ═══════════════════════════════════════════════
const templates = {
  glass: {
    name: 'Liquid Glass',
    css: `
      body { background: linear-gradient(135deg, #f0f0f5 0%, #e8e8f0 100%); font-family: __BODY__; color: __TEXT__; margin: 0; }
      .ss-hero { background: rgba(255,255,255,0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.8); }
      .ss-section { background: rgba(255,255,255,0.45); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.5); }
      .ss-cta-section { background: linear-gradient(135deg, __PRIMARY__ee, __SECONDARY__cc); }
      .ss-btn { background: __PRIMARY__; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 24px __PRIMARY__55; letter-spacing: 0.03em; }
      .ss-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px __PRIMARY__77; }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.9); backdrop-filter: blur(8px); }
      .ss-card { background: rgba(255,255,255,0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); border-radius: 20px; }
      .ss-pricing-card { background: rgba(255,255,255,0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); border-radius: 20px; }
      .ss-pricing-card.featured { background: __PRIMARY__; color: #fff; border-color: transparent; }
    `
  },
  bold: {
    name: 'Classy Bold',
    css: `
      body { background: #0a0a0f; font-family: __BODY__; color: #f0f0f8; margin: 0; }
      .ss-hero { background: linear-gradient(180deg, #0a0a0f 0%, #111118 100%); border-bottom: 1px solid rgba(255,255,255,0.07); }
      .ss-section { background: #0d0d14; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .ss-cta-section { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__); }
      .ss-btn { background: transparent; border: 2px solid __PRIMARY__; border-radius: __BTN_RADIUS__; color: __PRIMARY__; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; letter-spacing: 0.05em; }
      .ss-btn:hover { background: __PRIMARY__; color: #fff; transform: translateY(-2px); }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #f0f0f8; }
      .ss-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
      .ss-pricing-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; color: #f0f0f8; }
      .ss-pricing-card.featured { background: __PRIMARY__; color: #fff; border-color: transparent; }
      .ss-heading { color: #ffffff !important; }
      .ss-subheading { color: rgba(255,255,255,0.6) !important; }
    `
  },
  custom: {
    name: 'Vivid Custom',
    css: `
      body { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); font-family: __BODY__; color: #fff; margin: 0; }
      .ss-hero { background: transparent; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .ss-section { background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.05); }
      .ss-cta-section { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__, #ff6b6b); }
      .ss-btn { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__); border: none; border-radius: __BTN_RADIUS__; color: #fff; padding: 14px 32px; font-family: __HEADING__; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 24px rgba(0,0,0,0.4); letter-spacing: 0.03em; }
      .ss-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 10px 40px __PRIMARY__66; }
      .ss-form input, .ss-form textarea { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; }
      .ss-card { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; color: #fff; }
      .ss-pricing-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; color: #fff; }
      .ss-pricing-card.featured { background: linear-gradient(135deg, __PRIMARY__, __SECONDARY__); border-color: transparent; }
      .ss-heading { color: #ffffff !important; }
      .ss-subheading { color: rgba(255,255,255,0.7) !important; }
    `
  }
};

function getBtnRadius() {
  const s = state.globalStyles.btnStyle;
  if (s === 'square') return '6px';
  if (s === 'pill') return '999px';
  return '12px';
}

function interpolateCSS(css) {
  return css
    .replace(/__PRIMARY__/g, state.globalStyles.primaryColor)
    .replace(/__SECONDARY__/g, state.globalStyles.secondaryColor)
    .replace(/__TEXT__/g, state.globalStyles.textColor)
    .replace(/__HEADING__/g, state.globalStyles.headingFont)
    .replace(/__BODY__/g, state.globalStyles.bodyFont)
    .replace(/__BTN_RADIUS__/g, getBtnRadius());
}

function applyTemplate(name, card) {
  state.template = name;
  if (card) {
    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
  }
  document.getElementById('status-template').textContent = 'Template: ' + templates[name].name;
  // Add default blocks if none exist
  if (state.blocks.length === 0) {
    addBlock('hero', false);
    addBlock('pricing', false);
    addBlock('cta', false);
  }
  renderPreview();
  showToast('Template applied: ' + templates[name].name);
}

// ═══════════════════════════════════════════════
//  BLOCKS
// ═══════════════════════════════════════════════
function createBlock(type) {
  const id = 'block_' + (blockIdCounter++);
  const defaults = {
    hero: {
      type: 'hero',
      label: 'Hero Section',
      icon: '🚀',
      heading: 'Build Your Dream Website',
      subheading: 'Fast, beautiful, and fully customizable. Start for free today.',
      btnText: 'Get Started Free',
      bgColor: '',
      textAlign: 'center',
    },
    lead: {
      type: 'lead',
      label: 'Lead Form',
      icon: '📬',
      heading: 'Stay in the Loop',
      subheading: 'Get exclusive updates, tips, and early access right in your inbox.',
      placeholder: 'Enter your email address',
      btnText: 'Subscribe Now',
      bgColor: '',
    },
    testimonials: {
      type: 'testimonials',
      label: 'Testimonials',
      icon: '💬',
      heading: 'What Our Customers Say',
      reviews: [
        { name: 'Sarah J.', role: 'Founder, Bloom Co.', text: 'Supersuite transformed our online presence. Our conversions went up 3x in the first month!', avatar: '👩‍💼' },
        { name: 'Marcus T.', role: 'Creative Director', text: 'I\'ve tried every website builder out there. Nothing comes close to this level of design quality.', avatar: '👨‍🎨' },
        { name: 'Priya K.', role: 'E-commerce Owner', text: 'Set up my entire store in a weekend. The templates are stunning and the export is clean code.', avatar: '👩‍💻' },
      ],
      bgColor: '',
    },
    pricing: {
      type: 'pricing',
      label: 'Pricing',
      icon: '💎',
      heading: 'Simple, Transparent Pricing',
      subheading: 'No hidden fees. Cancel anytime.',
      plans: [
        { name: 'Starter', price: '$0', period: '/mo', features: ['5 pages', '1 custom domain', 'Basic templates', 'SSL included'], featured: false, btn: 'Start Free' },
        { name: 'Pro', price: '$29', period: '/mo', features: ['Unlimited pages', '3 custom domains', 'All templates', 'Priority support', 'Analytics'], featured: true, btn: 'Get Pro' },
        { name: 'Business', price: '$79', period: '/mo', features: ['Everything in Pro', '10 domains', 'Team access', 'White label', 'API access'], featured: false, btn: 'Contact Sales' },
      ],
      bgColor: '',
    },
    cta: {
      type: 'cta',
      label: 'CTA Section',
      icon: '⚡',
      heading: 'Ready to Build Something Amazing?',
      subheading: 'Join thousands of creators who launched their dream site this week.',
      btnText: 'Start Building Free →',
      bgColor: '',
    },
  };
  return { id, ...defaults[type] };
}

function addBlock(type, render = true) {
  const block = createBlock(type);
  state.blocks.push(block);
  updateLayersList();
  updateStatusBar();
  if (render) {
    renderPreview();
    selectBlock(block.id);
    showToast(block.label + ' added!');
  }
}

function removeBlock(id) {
  state.blocks = state.blocks.filter(b => b.id !== id);
  if (state.selectedBlockId === id) {
    state.selectedBlockId = null;
    closeRightPanel();
  }
  updateLayersList();
  updateStatusBar();
  renderPreview();
  showToast('Block removed');
}

function selectBlock(id) {
  state.selectedBlockId = id;
  const block = state.blocks.find(b => b.id === id);
  if (!block) return;
  openRightPanel(block);
  updateLayersList();
  // Scroll to block in preview
  const frame = document.getElementById('preview-frame');
  if (frame.contentWindow) {
    frame.contentWindow.postMessage({ type: 'select', id }, '*');
  }
}

// ═══════════════════════════════════════════════
//  LAYERS PANEL
// ═══════════════════════════════════════════════
function updateLayersList() {
  const list = document.getElementById('layers-list');
  const empty = document.getElementById('layers-empty');
  const count = document.getElementById('layer-count');
  count.textContent = state.blocks.length + ' block' + (state.blocks.length !== 1 ? 's' : '');
  if (state.blocks.length === 0) {
    list.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = state.blocks.map((b, i) => `
    <div class="block-order-item ${b.id === state.selectedBlockId ? 'selected' : ''}" onclick="selectBlock('${b.id}')">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <span class="block-order-icon">${b.icon}</span>
      <span style="flex:1;font-size:12px;font-weight:500">${b.label}</span>
      <span style="color:var(--text3);font-size:10px">#${i+1}</span>
    </div>
  `).join('');
}

function updateStatusBar() {
  document.getElementById('status-blocks').textContent = state.blocks.length + ' block' + (state.blocks.length !== 1 ? 's' : '');
}

// ═══════════════════════════════════════════════
//  RIGHT PANEL (Block Properties)
// ═══════════════════════════════════════════════
function openRightPanel(block) {
  const panel = document.getElementById('right-panel');
  const content = document.getElementById('right-panel-content');
  const title = document.getElementById('rp-title');
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

function buildBlockProps(block) {
  let html = '';

  if (block.type === 'hero') {
    html = `
      <div class="prop-group">
        <div class="prop-group-title">Content</div>
        <div class="prop-row"><span class="prop-label">Heading</span><input class="prop-input" data-prop="heading" value="${esc(block.heading)}"></div>
        <div class="prop-row"><span class="prop-label">Subheading</span><textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea></div>
        <div class="prop-row"><span class="prop-label">Button</span><input class="prop-input" data-prop="btnText" value="${esc(block.btnText)}"></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">Appearance</div>
        <div class="prop-row">
          <span class="prop-label">Alignment</span>
          <select class="prop-input" data-prop="textAlign">
            <option value="left" ${block.textAlign==='left'?'selected':''}>Left</option>
            <option value="center" ${block.textAlign==='center'?'selected':''}>Center</option>
            <option value="right" ${block.textAlign==='right'?'selected':''}>Right</option>
          </select>
        </div>
      </div>
    `;
  } else if (block.type === 'lead') {
    html = `
      <div class="prop-group">
        <div class="prop-group-title">Content</div>
        <div class="prop-row"><span class="prop-label">Heading</span><input class="prop-input" data-prop="heading" value="${esc(block.heading)}"></div>
        <div class="prop-row"><span class="prop-label">Subheading</span><textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea></div>
        <div class="prop-row"><span class="prop-label">Placeholder</span><input class="prop-input" data-prop="placeholder" value="${esc(block.placeholder)}"></div>
        <div class="prop-row"><span class="prop-label">Button</span><input class="prop-input" data-prop="btnText" value="${esc(block.btnText)}"></div>
      </div>
    `;
  } else if (block.type === 'testimonials') {
    html = `
      <div class="prop-group">
        <div class="prop-group-title">Content</div>
        <div class="prop-row"><span class="prop-label">Heading</span><input class="prop-input" data-prop="heading" value="${esc(block.heading)}"></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">Reviews</div>
        ${block.reviews.map((r, i) => `
          <div style="background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:8px;border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">Review ${i+1}</div>
            <div class="prop-row"><span class="prop-label">Name</span><input class="prop-input" data-review="${i}" data-field="name" value="${esc(r.name)}"></div>
            <div class="prop-row"><span class="prop-label">Role</span><input class="prop-input" data-review="${i}" data-field="role" value="${esc(r.role)}"></div>
            <div class="prop-row"><span class="prop-label">Text</span><textarea class="prop-textarea" data-review="${i}" data-field="text">${esc(r.text)}</textarea></div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (block.type === 'pricing') {
    html = `
      <div class="prop-group">
        <div class="prop-group-title">Content</div>
        <div class="prop-row"><span class="prop-label">Heading</span><input class="prop-input" data-prop="heading" value="${esc(block.heading)}"></div>
        <div class="prop-row"><span class="prop-label">Subheading</span><input class="prop-input" data-prop="subheading" value="${esc(block.subheading)}"></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">Plans</div>
        ${block.plans.map((p, i) => `
          <div style="background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:8px;border:1px solid ${p.featured?'var(--accent)':'var(--border)'}">
            <div style="font-size:11px;color:${p.featured?'var(--accent2)':'var(--text3)'};margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">${p.featured?'⭐ ':''}Plan ${i+1}</div>
            <div class="prop-row"><span class="prop-label">Name</span><input class="prop-input" data-plan="${i}" data-field="name" value="${esc(p.name)}"></div>
            <div class="prop-row"><span class="prop-label">Price</span><input class="prop-input" data-plan="${i}" data-field="price" value="${esc(p.price)}"></div>
            <div class="prop-row"><span class="prop-label">Button</span><input class="prop-input" data-plan="${i}" data-field="btn" value="${esc(p.btn)}"></div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (block.type === 'cta') {
    html = `
      <div class="prop-group">
        <div class="prop-group-title">Content</div>
        <div class="prop-row"><span class="prop-label">Heading</span><input class="prop-input" data-prop="heading" value="${esc(block.heading)}"></div>
        <div class="prop-row"><span class="prop-label">Subheading</span><textarea class="prop-textarea" data-prop="subheading">${esc(block.subheading)}</textarea></div>
        <div class="prop-row"><span class="prop-label">Button</span><input class="prop-input" data-prop="btnText" value="${esc(block.btnText)}"></div>
      </div>
    `;
  }

  html += `<button class="delete-block-btn" onclick="removeBlock('${block.id}')">🗑 Remove Block</button>`;
  return html;
}

function attachPropListeners(block) {
  // Standard props
  document.querySelectorAll('[data-prop]').forEach(el => {
    el.addEventListener('input', () => {
      block[el.dataset.prop] = el.value;
      renderPreview();
    });
  });

  // Testimonial reviews
  document.querySelectorAll('[data-review]').forEach(el => {
    el.addEventListener('input', () => {
      block.reviews[+el.dataset.review][el.dataset.field] = el.value;
      renderPreview();
    });
  });

  // Pricing plans
  document.querySelectorAll('[data-plan]').forEach(el => {
    el.addEventListener('input', () => {
      block.plans[+el.dataset.plan][el.dataset.field] = el.value;
      renderPreview();
    });
  });
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════
//  GLOBAL STYLE UPDATES
// ═══════════════════════════════════════════════
function updateGlobalColor(key, value) {
  const map = { primary: 'primaryColor', secondary: 'secondaryColor', bg: 'bgColor', textColor: 'textColor' };
  state.globalStyles[map[key]] = value;
  const swatch = document.getElementById('swatch-' + key);
  if (swatch) swatch.style.background = value;
  renderPreview();
}

function updateGlobalFont(type, value) {
  if (type === 'heading') state.globalStyles.headingFont = value;
  else state.globalStyles.bodyFont = value;
  renderPreview();
}

function updateBtnStyle(style, el) {
  document.querySelectorAll('.btn-style-opt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  state.globalStyles.btnStyle = style;
  renderPreview();
}

// ═══════════════════════════════════════════════
//  RENDER PREVIEW
// ═══════════════════════════════════════════════
function renderPreview() {
  const html = buildSiteHTML();
  const frame = document.getElementById('preview-frame');
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  // Hide empty state
  document.getElementById('empty-state').style.display = state.blocks.length ? 'none' : '';
}

function buildSiteHTML() {
  const tpl = templates[state.template];
  const css = interpolateCSS(tpl.css);
  const blocksHTML = state.blocks.map(b => renderBlock(b)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500&family=Space+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { min-height: 100vh; }
  ${css}

  /* BASE BLOCK STYLES */
  .ss-block { padding: 80px 40px; transition: outline 0.2s; }
  .ss-block:hover { outline: 2px dashed rgba(99,102,241,0.3); outline-offset: -2px; }
  .ss-block.selected { outline: 2px solid #6366f1; outline-offset: -2px; }

  .ss-container { max-width: 1100px; margin: 0 auto; }

  .ss-heading {
    font-family: ${state.globalStyles.headingFont};
    font-size: clamp(32px, 5vw, 64px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin-bottom: 20px;
    color: ${state.globalStyles.textColor};
  }

  .ss-subheading {
    font-size: clamp(16px, 2vw, 20px);
    color: ${state.globalStyles.textColor}99;
    line-height: 1.6;
    max-width: 600px;
    margin-bottom: 36px;
  }

  .ss-form { max-width: 480px; }
  .ss-form input, .ss-form textarea {
    width: 100%;
    padding: 14px 18px;
    border-radius: 10px;
    font-size: 15px;
    font-family: ${state.globalStyles.bodyFont};
    outline: none;
    margin-bottom: 12px;
    transition: all 0.2s;
  }
  .ss-form input:focus, .ss-form textarea:focus { border-color: ${state.globalStyles.primaryColor} !important; box-shadow: 0 0 0 3px ${state.globalStyles.primaryColor}33; }

  .ss-testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
  .ss-card { padding: 28px; transition: transform 0.2s; }
  .ss-card:hover { transform: translateY(-4px); }
  .ss-avatar { font-size: 40px; margin-bottom: 16px; }
  .ss-reviewer { font-weight: 700; font-size: 15px; margin-bottom: 4px; font-family: ${state.globalStyles.headingFont}; }
  .ss-reviewer-role { font-size: 13px; opacity: 0.6; margin-bottom: 16px; }
  .ss-review-text { font-size: 15px; line-height: 1.7; opacity: 0.9; font-style: italic; }
  .ss-stars { color: #fbbf24; margin-bottom: 12px; font-size: 16px; }

  .ss-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; align-items: start; }
  .ss-pricing-card { padding: 36px 28px; transition: transform 0.2s; }
  .ss-pricing-card:hover { transform: translateY(-4px); }
  .ss-plan-name { font-family: ${state.globalStyles.headingFont}; font-size: 18px; font-weight: 700; margin-bottom: 12px; }
  .ss-plan-price { font-family: ${state.globalStyles.headingFont}; font-size: 48px; font-weight: 800; line-height: 1; letter-spacing: -2px; }
  .ss-plan-period { font-size: 16px; font-weight: 400; opacity: 0.6; }
  .ss-plan-features { list-style: none; margin: 24px 0; }
  .ss-plan-features li { padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.07); font-size: 14px; display: flex; align-items: center; gap: 8px; }
  .ss-pricing-card.featured .ss-plan-features li { border-bottom-color: rgba(255,255,255,0.15); }
  .ss-feature-check { color: #34d399; }
  .ss-pricing-card.featured .ss-feature-check { color: rgba(255,255,255,0.9); }

  .ss-cta-section { padding: 100px 40px; }
  .ss-cta-section .ss-heading { color: #fff !important; }
  .ss-cta-section .ss-subheading { color: rgba(255,255,255,0.8) !important; }
  .ss-cta-section .ss-btn { background: #fff !important; color: ${state.globalStyles.primaryColor} !important; }
  .ss-cta-section .ss-btn:hover { background: rgba(255,255,255,0.9) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important; }

  @media (max-width: 768px) {
    .ss-block { padding: 60px 24px; }
    .ss-pricing-grid { grid-template-columns: 1fr; }
    .ss-testimonials-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
${blocksHTML}
<script>
  document.querySelectorAll('.ss-block').forEach(b => {
    b.addEventListener('click', () => {
      parent.postMessage({ type: 'blockClick', id: b.dataset.id }, '*');
    });
  });
  window.addEventListener('message', e => {
    if (e.data.type === 'select') {
      document.querySelectorAll('.ss-block').forEach(b => b.classList.remove('selected'));
      const el = document.querySelector('[data-id="' + e.data.id + '"]');
      if (el) { el.classList.add('selected'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  });
<\/script>
</body>
</html>`;
}

function renderBlock(block) {
  const cls = `ss-block ${block.type === 'cta' ? 'ss-cta-section' : 'ss-section'} ${block.type === 'hero' ? 'ss-hero' : ''}`;

  if (block.type === 'hero') {
    return `<section class="${cls}" data-id="${block.id}" style="text-align:${block.textAlign}">
      <div class="ss-container" style="display:flex;flex-direction:column;align-items:${block.textAlign==='center'?'center':block.textAlign==='right'?'flex-end':'flex-start'}">
        <div class="ss-heading">${esc2(block.heading)}</div>
        <div class="ss-subheading">${esc2(block.subheading)}</div>
        <button class="ss-btn">${esc2(block.btnText)}</button>
      </div>
    </section>`;
  }

  if (block.type === 'lead') {
    return `<section class="${cls}" data-id="${block.id}">
      <div class="ss-container" style="display:flex;flex-direction:column;align-items:center;text-align:center">
        <div class="ss-heading">${esc2(block.heading)}</div>
        <div class="ss-subheading">${esc2(block.subheading)}</div>
        <div class="ss-form">
          <input type="email" placeholder="${esc2(block.placeholder)}">
          <button class="ss-btn" style="width:100%">${esc2(block.btnText)}</button>
        </div>
      </div>
    </section>`;
  }

  if (block.type === 'testimonials') {
    return `<section class="${cls}" data-id="${block.id}">
      <div class="ss-container">
        <div class="ss-heading" style="text-align:center;margin-bottom:48px">${esc2(block.heading)}</div>
        <div class="ss-testimonials-grid">
          ${block.reviews.map(r => `
            <div class="ss-card">
              <div class="ss-avatar">${r.avatar}</div>
              <div class="ss-stars">★★★★★</div>
              <div class="ss-review-text">"${esc2(r.text)}"</div>
              <div style="margin-top:20px">
                <div class="ss-reviewer">${esc2(r.name)}</div>
                <div class="ss-reviewer-role">${esc2(r.role)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>`;
  }

  if (block.type === 'pricing') {
    return `<section class="${cls}" data-id="${block.id}">
      <div class="ss-container">
        <div style="text-align:center;margin-bottom:48px">
          <div class="ss-heading">${esc2(block.heading)}</div>
          <div class="ss-subheading" style="margin:0 auto">${esc2(block.subheading)}</div>
        </div>
        <div class="ss-pricing-grid">
          ${block.plans.map(p => `
            <div class="ss-pricing-card ${p.featured ? 'featured' : ''}">
              <div class="ss-plan-name">${esc2(p.name)}</div>
              <div style="margin-bottom:24px">
                <span class="ss-plan-price">${esc2(p.price)}</span>
                <span class="ss-plan-period">${esc2(p.period)}</span>
              </div>
              <ul class="ss-plan-features">
                ${p.features.map(f => `<li><span class="ss-feature-check">✓</span>${esc2(f)}</li>`).join('')}
              </ul>
              <button class="ss-btn" style="width:100%">${esc2(p.btn)}</button>
            </div>
          `).join('')}
        </div>
      </div>
    </section>`;
  }

  if (block.type === 'cta') {
    return `<section class="${cls} ss-block" data-id="${block.id}">
      <div class="ss-container" style="display:flex;flex-direction:column;align-items:center;text-align:center">
        <div class="ss-heading">${esc2(block.heading)}</div>
        <div class="ss-subheading" style="margin:0 auto 36px">${esc2(block.subheading)}</div>
        <button class="ss-btn">${esc2(block.btnText)}</button>
      </div>
    </section>`;
  }

  return '';
}

function esc2(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════
//  POSTMESSAGE FROM IFRAME
// ═══════════════════════════════════════════════
window.addEventListener('message', e => {
  if (e.data.type === 'blockClick') {
    selectBlock(e.data.id);
    setPanelTab(document.querySelectorAll('.panel-tab')[3], 'layers');
    updateLayersList();
  }
});

// ═══════════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════════
function exportSite() {
  if (state.blocks.length === 0) {
    showToast('Add some blocks first!');
    return;
  }
  const html = buildSiteHTML();
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'supersuite-site.html';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Site exported successfully! ✓');
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
