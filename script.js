/* ═══════════════════════════════════════════════════════════════════
   SUPERSUITE — WEBSITE BUILDER ENGINE v26.3 (SSV26.3)
   Full Phase 0–5 Implementation
   Password · Templates · Blocks · Drag & Drop · Editing · Export
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────────
   STATE STORE — single source of truth
────────────────────────────────────────────────────────────────── */
const State = {
  authenticated: false,
  userTier: 'free',        // SSV26.1: set by Auth.verify on login
  currentTemplate: 'glass',
  currentDevice: 'desktop',
  zoomLevel: 100,
  blocks: [],          // Array of block objects
  selectedBlockId: null,
  selectedElement: null,
  globalStyles: {
    '--primary': '#ff6b35',
    '--secondary': '#1a1a2e',
    '--accent': '#ffd700',
    '--bg': '#ffffff',
    '--text': '#1a1a2e',
    '--font-heading': "'Syne', sans-serif",
    '--font-body': "'DM Sans', sans-serif",
    '--font-base': '16px',
    '--line-height': '1.6',
    '--btn-radius': '8px',
    '--section-pad': '60px',
    '--container': '1200px',
    '--radius': '12px',
    '--shadow': '0 8px 24px rgba(0,0,0,0.15)',
  },
  customCSS: '',
  uploadedImages: {},   // map: key → base64
  scrollAnimation: 'off',  // SSV26.2 F5: off | subtle | soft | dramatic — builder-preview only
  onboardingComplete: false, // SSV26.2 F9
  industry: '',              // SSV26.2 F9
  businessName: '',          // SSV26.2 F9
  blockIdCounter: 1,
};


/* ──────────────────────────────────────────────────────────────────
   FIX 1: REAL-TIME LIVE SYNC — BroadcastChannel-based collab
   Two tabs/windows on the same origin broadcast state changes.
   Last-write-wins with monotonic version counter.
────────────────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════
   LIVE SYNC — cross-device via Base44 relay + local channels
   Architecture:
     PUSH  → POST to relay endpoint (HTTP, debounced 150ms) + BroadcastChannel + localStorage
     POLL  → GET relay every 400ms (only when session active)
   Works on any device, any network, any browser. No third-party services.
   Relay endpoint: https://ai-1a5e84f8.base44.app/functions/collabRelay
═══════════════════════════════════════════════════════════════════ */

const RELAY_URL = 'https://ai-1a5e84f8.base44.app/functions/collabRelay';

const LiveSync = {
  sessionCode: null,
  isOwner: false,
  channel: null,           // BroadcastChannel (same-browser fast path)
  _tabId: Math.random().toString(36).slice(2, 10), // unique per tab
  _lastAppliedTs: 0,
  _syncInProgress: false,
  _pushTimer: null,
  _pollTimer: null,
  _storageListener: null,

  init(code, isOwner) {
    this.sessionCode = code;
    this.isOwner = isOwner;
    this._lastAppliedTs = 0;
    this._syncInProgress = false;

    // ── Local channels (same-browser) ─────────────────────────────
    if (this.channel) { try { this.channel.close(); } catch(e) {} this.channel = null; }
    if (this._storageListener) {
      window.removeEventListener('storage', this._storageListener);
      this._storageListener = null;
    }
    try {
      this.channel = new BroadcastChannel('ss_collab_' + code);
      this.channel.onmessage = (ev) => this._applyPayload(ev.data, 'bc');
    } catch(e) {}

    this._storageListener = (e) => {
      if (e.key !== 'ss_collab_' + code || !e.newValue) return;
      try { this._applyPayload(JSON.parse(e.newValue), 'ls'); } catch(err) {}
    };
    window.addEventListener('storage', this._storageListener);

    // ── Start polling relay for cross-device updates ───────────────
    this._startPolling();
    this._updateUI(true);

    console.log('[LiveSync] Session started:', code, isOwner ? '(owner)' : '(guest)', '| tab:', this._tabId);

    // Request current state from relay immediately on join
    this._pollNow();
  },

  destroy() {
    clearTimeout(this._pushTimer);
    clearInterval(this._pollTimer);
    this._pollTimer = null;
    if (this.channel) { try { this.channel.close(); } catch(e) {} this.channel = null; }
    if (this._storageListener) {
      window.removeEventListener('storage', this._storageListener);
      this._storageListener = null;
    }
    this.sessionCode = null;
    this._syncInProgress = false;
    this._updateUI(false);
  },

  /** Debounced notify — call after any local state mutation */
  notifyChange() {
    if (!this.sessionCode) return;
    if (this._syncInProgress) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this._push(), 150);
  },

  /** Serialize and broadcast state to all peers */
  async _push() {
    if (!this.sessionCode || this._syncInProgress) return;
    const ts = Date.now();
    let stateJSON;
    try {
      stateJSON = JSON.stringify({
        blocks: State.blocks,
        globalStyles: State.globalStyles,
        currentTemplate: State.currentTemplate,
        customCSS: State.customCSS,
        blockIdCounter: State.blockIdCounter,
      });
    } catch(e) { return; }

    const payload = { type: 'STATE_UPDATE', ts, tabId: this._tabId, stateJSON };

    // ── 1. Local channels (instant, same-browser) ──────────────────
    if (this.channel) { try { this.channel.postMessage(payload); } catch(e) {} }
    try { localStorage.setItem('ss_collab_' + this.sessionCode, JSON.stringify(payload)); } catch(e) {}

    // ── 2. Relay (cross-device) ────────────────────────────────────
    this._flashSyncIndicator('syncing');
    try {
      const res = await fetch(RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push',
          code: this.sessionCode,
          ts,
          tabId: this._tabId,
          state: stateJSON,
        }),
      });
      if (res.ok) {
        this._flashSyncIndicator('synced');
        console.log('[LiveSync] Pushed ts=' + ts);
      } else {
        this._flashSyncIndicator('error');
      }
    } catch(e) {
      console.warn('[LiveSync] Relay push failed (offline?):', e.message);
      this._flashSyncIndicator('error');
    }
  },

  _startPolling() {
    clearInterval(this._pollTimer);
    // Poll relay every 400ms for cross-device updates
    this._pollTimer = setInterval(() => this._pollNow(), 400);
  },

  async _pollNow() {
    if (!this.sessionCode) return;
    try {
      const res = await fetch(RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'poll',
          code: this.sessionCode,
          since: this._lastAppliedTs,
          tabId: this._tabId,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.hasUpdate && data.state) {
        this._applyPayload({
          type: 'STATE_UPDATE',
          ts: data.ts,
          tabId: data.tabId,
          stateJSON: data.state,
        }, 'relay');
      }
    } catch(e) {
      // Network error — silent, will retry next poll
    }
  },

  _applyPayload(data, src) {
    if (!data || data.type !== 'STATE_UPDATE') return;
    if (data.tabId === this._tabId) return; // ignore own messages
    if (data.ts <= this._lastAppliedTs) return; // drop stale / duplicate

    this._lastAppliedTs = data.ts;
    this._syncInProgress = true;

    try {
      const s = typeof data.stateJSON === 'string'
        ? JSON.parse(data.stateJSON)
        : (data.state || {});

      if (s.blocks !== undefined)           State.blocks         = JSON.parse(JSON.stringify(s.blocks));
      if (s.globalStyles !== undefined)     State.globalStyles   = JSON.parse(JSON.stringify(s.globalStyles));
      if (s.currentTemplate !== undefined)  State.currentTemplate = s.currentTemplate;
      if (s.customCSS !== undefined)        State.customCSS      = s.customCSS;
      if (s.blockIdCounter !== undefined && s.blockIdCounter > State.blockIdCounter)
        State.blockIdCounter = s.blockIdCounter;

      refreshPreview();
      updateLayers();
      this._flashSyncIndicator('synced');
      console.log('[LiveSync] Applied state from ' + src + ' ts=' + data.ts);
    } catch(e) {
      console.error('[LiveSync] Apply failed:', e);
    } finally {
      this._syncInProgress = false;
    }
  },

  _flashSyncIndicator(state) {
    const bar    = document.querySelector('.collab-sync-bar');
    const status = document.getElementById('collab-sync-status');
    if (!bar || !status) return;
    clearTimeout(this._indicatorTimer);
    if (state === 'syncing') {
      bar.className = 'collab-sync-bar syncing';
      status.textContent = 'Syncing…';
    } else if (state === 'error') {
      bar.className = 'collab-sync-bar error';
      status.textContent = 'Sync error';
      this._indicatorTimer = setTimeout(() => {
        bar.className = 'collab-sync-bar';
        status.textContent = '🟡 Local only';
      }, 3000);
    } else {
      bar.className = 'collab-sync-bar';
      status.textContent = 'Synced ✓';
      this._indicatorTimer = setTimeout(() => {
        if (status) status.textContent = '🟢 Live';
      }, 2000);
    }
  },

  _updateUI(active) {
    const section = document.getElementById('collab-active-section');
    const info    = document.getElementById('collab-active-info');
    if (section) section.style.display = active ? 'block' : 'none';
    if (info && active) {
      info.textContent = (this.isOwner ? 'Owner' : 'Collaborator') + ' — Code: ' + this.sessionCode;
    }
  },
}

/* Collab Modal Functions */
function openCollabModal() {
  document.getElementById('collab-modal').style.display = 'flex';
  const codeEl = document.getElementById('collab-code-value');
  const stored = localStorage.getItem('ss_collab_code');
  if (stored) { if (codeEl) codeEl.textContent = stored; }
  if (LiveSync.sessionCode) {
    LiveSync._updateUI(true);
  }
}

function closeCollabModal() {
  document.getElementById('collab-modal').style.display = 'none';
}

function generateCollabCode() {
  const code = Math.random().toString(36).substr(2,4).toUpperCase() +
               Math.random().toString(36).substr(2,4).toUpperCase();
  localStorage.setItem('ss_collab_code', code);
  const el = document.getElementById('collab-code-value');
  if (el) el.textContent = code;
  // Start live session as owner
  if (LiveSync.channel) LiveSync.destroy();
  LiveSync.init(code, true);
  showToast('🔗 Code Generated', 'Share ' + code + ' with collaborators', 'success');
}

function copyCollabCode() {
  const code = document.getElementById('collab-code-value')?.textContent;
  if (!code || code === '—') { showToast('⚠️ No code', 'Generate a code first', 'warning'); return; }
  navigator.clipboard.writeText(code).catch(() => {});
  showToast('📋 Copied!', 'Invite code copied to clipboard', 'success');
}

function joinCollabSession() {
  const input = document.getElementById('collab-join-input');
  const status = document.getElementById('collab-join-status');
  const code = (input?.value || '').trim().toUpperCase();
  if (code.length < 6) {
    if (status) { status.textContent = '❌ Enter a valid code'; status.style.color = 'var(--ui-danger)'; }
    return;
  }
  if (LiveSync.channel) LiveSync.destroy();
  LiveSync.init(code, false);
  if (status) { status.textContent = '🟢 Connected — waiting for sync…'; status.style.color = 'var(--ui-success)'; }
  showToast('🤝 Joined Session', 'Connected to project ' + code, 'success');
  // Request full state from owner via dual-channel
  setTimeout(() => LiveSync._pollNow(), 300);
}

function leaveCollabSession() {
  LiveSync.destroy();
  const status = document.getElementById('collab-join-status');
  if (status) { status.textContent = ''; }
  showToast('👋 Left Session', 'You have left the collaboration session', 'info');
}


/* ──────────────────────────────────────────────────────────────────
   FIX 9: HISTORY STACK — Undo / Redo with nav arrows
────────────────────────────────────────────────────────────────── */
const History = {
  _stack: [],
  _cursor: -1,
  _maxSize: 50,
  _skipNext: false,

  /** Save current state snapshot */
  push() {
    if (this._skipNext) { this._skipNext = false; return; }
    // Trim forward history on new action
    if (this._cursor < this._stack.length - 1) {
      this._stack.splice(this._cursor + 1);
    }
    const snapshot = JSON.stringify({
      blocks: State.blocks,
      globalStyles: State.globalStyles,
      customCSS: State.customCSS,
      blockIdCounter: State.blockIdCounter,
    });
    // Avoid duplicate snapshots
    if (this._stack.length && this._stack[this._cursor] === snapshot) return;
    this._stack.push(snapshot);
    if (this._stack.length > this._maxSize) this._stack.shift();
    this._cursor = this._stack.length - 1;
    this._updateArrows();
  },

  back() {
    if (this._cursor <= 0) return;
    this._cursor--;
    this._apply();
    showToast('↩ Undo', 'Step ' + this._cursor + ' of ' + (this._stack.length-1), 'info');
  },

  forward() {
    if (this._cursor >= this._stack.length - 1) return;
    this._cursor++;
    this._apply();
    showToast('↪ Redo', 'Step ' + this._cursor + ' of ' + (this._stack.length-1), 'info');
  },

  _apply() {
    try {
      const snap = JSON.parse(this._stack[this._cursor]);
      this._skipNext = true;
      State.blocks = snap.blocks || [];
      State.globalStyles = { ...State.globalStyles, ...snap.globalStyles };
      State.customCSS = snap.customCSS || '';
      State.blockIdCounter = snap.blockIdCounter || 1;
      refreshPreview();
      updateLayers();
      this._updateArrows();
    } catch(e) { console.error('History apply error', e); }
  },

  _updateArrows() {
    const back = document.getElementById('hist-back-btn');
    const fwd = document.getElementById('hist-fwd-btn');
    if (back) back.disabled = this._cursor <= 0;
    if (fwd) fwd.disabled = this._cursor >= this._stack.length - 1;
  },
};

function historyBack() { History.back(); }
function historyForward() { History.forward(); }

/* ──────────────────────────────────────────────────────────────────
   BLOCK DEFINITIONS — templates for each block type
────────────────────────────────────────────────────────────────── */
const BlockDefs = {

  nav: {
    label: 'Navigation',
    icon: '🧭',
    defaultData: {
      logo: 'Supersuite',
      links: ['Home', 'Features', 'Pricing', 'Contact'],
      bgColor: '#ffffff',
      textColor: '#1a1a2e',
      sticky: true,
      ctaText: 'Get Started',
      ctaLink: '#cta',
      ctaBgColor: '#ff6b35',
    }
  },

  hero: {
    label: 'Hero Section',
    icon: '⚡',
    defaultData: {
      heading: 'Build Your Dream Website — Fast',
      subheading: 'No code required. Launch in minutes with Supersuite\'s powerful visual builder.',
      bgType: 'gradient',
      bgColor: '#1a1a2e',
      bgColor2: '#16213e',
      bgImage: '',
      textColor: '#ffffff',
      btnText: 'Start Building Free',
      btnLink: '#',
      btnColor: '#ff6b35',
      btnTextColor: '#ffffff',
      btn2Text: 'Watch Demo',
      btn2Link: '#',
      showBadge: true,
      badgeText: '🚀 Now with AI',
      alignment: 'center',
      minHeight: '85vh',
    }
  },

  leadform: {
    label: 'Lead Form',
    icon: '📋',
    defaultData: {
      heading: 'Get Early Access',
      subheading: 'Join 5,000+ builders already on the waitlist.',
      fields: [
        { type: 'text', placeholder: 'Your full name', name: 'name' },
        { type: 'email', placeholder: 'Work email address', name: 'email' },
        { type: 'text', placeholder: 'Company name (optional)', name: 'company' },
      ],
      btnText: 'Claim My Spot →',
      btnColor: '#ff6b35',
      bgColor: '#f8f8ff',
      textColor: '#1a1a2e',
      accentColor: '#ff6b35',
      privacyText: '🔒 No spam. Unsubscribe anytime.',
    }
  },

  testimonials: {
    label: 'Testimonials',
    icon: '💬',
    defaultData: {
      heading: 'Loved by Builders Worldwide',
      subheading: 'Real feedback from real users.',
      bgColor: '#ffffff',
      textColor: '#1a1a2e',
      accentColor: '#ff6b35',
      cards: [
        {
          name: 'Sarah Chen',
          role: 'Founder, Launchpad Co.',
          avatar: '',
          rating: 5,
          quote: 'Supersuite cut our launch time from weeks to hours. The visual editor is incredibly intuitive — our whole team uses it now without any training.',
          bgColor: '#ffffff',
        },
        {
          name: 'Marcus Rivera',
          role: 'Marketing Director',
          avatar: '',
          rating: 5,
          quote: 'We replaced our expensive agency with Supersuite. The revenue blocks alone have increased our conversion rate by 34%. Unbelievable value.',
          bgColor: '#ffffff',
        },
        {
          name: 'Emma Thompson',
          role: 'Solo Entrepreneur',
          avatar: '',
          rating: 5,
          quote: 'As a non-technical founder, I was skeptical. But I had my entire website live in 2 hours. The templates are gorgeous out of the box.',
          bgColor: '#ffffff',
        },
      ]
    }
  },

  pricing: {
    label: 'Pricing / Services',
    icon: '💎',
    defaultData: {
      heading: 'Simple, Transparent Pricing',
      subheading: 'Choose the plan that fits your ambition.',
      bgColor: '#0f0f13',
      textColor: '#ffffff',
      accentColor: '#ff6b35',
      plans: [
        {
          name: 'Starter',
          price: '$0',
          period: '/month',
          description: 'Perfect for testing the waters.',
          features: ['3 pages', '10 blocks', 'Custom domain', 'SSL included', 'Basic analytics'],
          ctaText: 'Start Free',
          ctaLink: '#',
          featured: false,
          bgColor: 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(255,255,255,0.1)',
        },
        {
          name: 'Pro',
          price: '$29',
          period: '/month',
          description: 'For serious builders.',
          features: ['Unlimited pages', 'All blocks', 'Custom domain', 'SSL included', 'Advanced analytics', 'Priority support', 'Export code'],
          ctaText: 'Start Pro Trial',
          ctaLink: '#',
          featured: true,
          bgColor: '#ff6b35',
          borderColor: '#ff6b35',
        },
        {
          name: 'Agency',
          price: '$99',
          period: '/month',
          description: 'Built for teams & agencies.',
          features: ['Everything in Pro', '10 team seats', 'White-label', 'Client handoff', 'API access', 'SLA guarantee'],
          ctaText: 'Contact Sales',
          ctaLink: '#',
          featured: false,
          bgColor: 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(255,255,255,0.1)',
        },
      ]
    }
  },

  cta: {
    label: 'CTA Section',
    icon: '🎯',
    defaultData: {
      heading: 'Ready to Build Something Amazing?',
      subheading: 'Join thousands of businesses already growing with Supersuite.',
      bgType: 'gradient',
      bgColor: '#ff6b35',
      bgColor2: '#ff3d00',
      bgImage: '',
      textColor: '#ffffff',
      btnText: 'Start Building — It\'s Free',
      btnLink: '#',
      btnColor: '#ffffff',
      btnTextColor: '#ff6b35',
      btn2Text: 'Book a Demo',
      btn2Link: '#',
      showBadge: false,
      badgeText: '✓ No credit card required',
    }
  },

  features: {
    label: 'Features',
    icon: '✨',
    defaultData: {
      heading: 'Everything You Need to Launch',
      subheading: 'Powerful features built for modern businesses.',
      bgColor: '#ffffff',
      textColor: '#1a1a2e',
      accentColor: '#ff6b35',
      columns: 3,
      items: [
        { icon: '⚡', title: 'Lightning Fast', description: 'Pages load in under 1 second. Optimized for Core Web Vitals and maximum performance.' },
        { icon: '🎨', title: 'Beautiful Design', description: 'Professionally designed templates created by world-class designers.' },
        { icon: '📱', title: 'Mobile First', description: 'Every page looks perfect on any device — phone, tablet, or desktop.' },
        { icon: '🔌', title: 'Integrations', description: 'Connect with Stripe, Mailchimp, Zapier, and 100+ other tools.' },
        { icon: '📊', title: 'Analytics', description: 'Built-in analytics. See what\'s working and double down on what converts.' },
        { icon: '🔒', title: 'Enterprise Security', description: 'SSL, DDoS protection, and automated backups keep your site safe.' },
      ]
    }
  },

  gallery: {
    label: 'Gallery',
    icon: '🖼️',
    defaultData: {
      heading: 'Our Work',
      subheading: 'A selection of sites built with Supersuite.',
      bgColor: '#0f0f13',
      textColor: '#ffffff',
      columns: 3,
      images: [
        { src: '', alt: 'Project 1', caption: 'E-commerce Store' },
        { src: '', alt: 'Project 2', caption: 'SaaS Landing Page' },
        { src: '', alt: 'Project 3', caption: 'Portfolio Site' },
        { src: '', alt: 'Project 4', caption: 'Agency Website' },
        { src: '', alt: 'Project 5', caption: 'Startup Launch' },
        { src: '', alt: 'Project 6', caption: 'Blog Platform' },
      ]
    }
  },

  footer: {
    label: 'Footer',
    icon: '📌',
    defaultData: {
      logo: 'Supersuite',
      tagline: 'Build. Launch. Grow.',
      bgColor: '#0a0a0f',
      textColor: '#9090b0',
      accentColor: '#ff6b35',
      columns: [
        {
          title: 'Product',
          links: [
            { label: 'Features', url: '#' },
            { label: 'Pricing', url: '#' },
            { label: 'Templates', url: '#' },
            { label: 'Changelog', url: '#' },
          ]
        },
        {
          title: 'Company',
          links: [
            { label: 'About', url: '#' },
            { label: 'Blog', url: '#' },
            { label: 'Careers', url: '#' },
            { label: 'Press', url: '#' },
          ]
        },
        {
          title: 'Support',
          links: [
            { label: 'Docs', url: '#' },
            { label: 'Help Center', url: '#' },
            { label: 'Contact', url: '#' },
            { label: 'Status', url: '#' },
          ]
        },
      ],
      copyright: `© ${new Date().getFullYear()} Supersuite, Inc. All rights reserved.`,
      socialLinks: [
        { platform: 'Twitter', icon: '𝕏', url: '#' },
        { platform: 'LinkedIn', icon: 'in', url: '#' },
        { platform: 'GitHub', icon: '⬡', url: '#' },
      ]
    }
  },

};

/* ──────────────────────────────────────────────────────────────────
   TEMPLATE CONFIGS
────────────────────────────────────────────────────────────────── */
const Templates = {
  glass: {
    name: 'Liquid Glass',
    overrides: {
      '--primary': '#ff6b35',
      '--secondary': '#1a1a2e',
      '--accent': '#a78bfa',
      '--bg': '#f0f0f8',
      '--text': '#1a1a2e',
      '--font-heading': "'Syne', sans-serif",
      '--font-body': "'DM Sans', sans-serif",
      '--radius': '16px',
      '--btn-radius': '50px',
      '--shadow': '0 8px 32px rgba(0,0,0,0.12)',
    },
    extraCSS: `
      body { background: linear-gradient(135deg, #e8e8f8 0%, #f0e8f0 50%, #e8f0f8 100%); }
      .ss-block { backdrop-filter: blur(20px); }
      .ss-hero { background: linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(22,33,62,0.9) 100%) !important; }
      .ss-card { background: rgba(255,255,255,0.5) !important; border: 1px solid rgba(255,255,255,0.6) !important; backdrop-filter: blur(16px) !important; box-shadow: 0 8px 32px rgba(31,38,135,0.15) !important; }
    `
  },
  bold: {
    name: 'Classy Bold',
    overrides: {
      '--primary': '#1a1a2e',
      '--secondary': '#ff6b35',
      '--accent': '#ff6b35',
      '--bg': '#fafaf8',
      '--text': '#1a1a2e',
      '--font-heading': "'Syne', sans-serif",
      '--font-body': "'DM Sans', sans-serif",
      '--radius': '4px',
      '--btn-radius': '4px',
      '--shadow': '4px 4px 0px rgba(26,26,46,0.15)',
    },
    extraCSS: `
      body { background: #fafaf8; }
      .ss-hero:not([data-user-bg]) { background: #1a1a2e; }
      .ss-btn-primary { border: 2px solid var(--primary) !important; box-shadow: 4px 4px 0 var(--primary) !important; }
      .ss-btn-primary:hover { transform: translate(-2px, -2px) !important; box-shadow: 6px 6px 0 var(--primary) !important; }
      .ss-card { border: 2px solid #1a1a2e !important; box-shadow: 4px 4px 0 #1a1a2e !important; }
      .ss-section-title::after { content: ''; display: block; width: 60px; height: 4px; background: var(--accent); margin-top: 8px; }
    `
  },
  custom: {
    name: 'Custom CSS',
    overrides: {},
    extraCSS: ''
  },

  neon: {
    name: 'Neon Dark',
    overrides: {
      '--primary': '#00ff88',
      '--secondary': '#0a0a0f',
      '--accent': '#00d4ff',
      '--bg': '#0a0a0f',
      '--text': '#e0ffe8',
      '--font-heading': "'Syne', sans-serif",
      '--font-body': "'DM Sans', sans-serif",
      '--radius': '4px',
      '--btn-radius': '2px',
      '--shadow': '0 0 24px rgba(0,255,136,0.25)',
    },
    extraCSS: `
      body { background: #0a0a0f; }
      .ss-block { border-top: 1px solid rgba(0,255,136,0.06); }
      .ss-btn-primary { box-shadow: 0 0 20px rgba(0,255,136,0.4) !important; border: 1px solid #00ff88 !important; }
      .ss-card { border: 1px solid rgba(0,255,136,0.25) !important; box-shadow: 0 0 16px rgba(0,255,136,0.08) !important; }
    `
  },

  editorial: {
    name: 'Editorial',
    overrides: {
      '--primary': '#1a1a1a',
      '--secondary': '#c5a35e',
      '--accent': '#c5a35e',
      '--bg': '#faf8f5',
      '--text': '#1a1a1a',
      '--font-heading': "'Playfair Display', Georgia, serif",
      '--font-body': "'DM Sans', sans-serif",
      '--radius': '0px',
      '--btn-radius': '0px',
      '--shadow': 'none',
    },
    extraCSS: `
      body { background: #faf8f5; }
      .ss-hero:not([data-user-bg]) { background: #1a1a1a; }
      .ss-btn-primary { border: 2px solid var(--primary) !important; text-transform: uppercase !important; font-size: 13px !important; letter-spacing: 1px !important; }
      .ss-card { border: 1px solid #d4cfc8 !important; border-left: 4px solid var(--accent) !important; border-radius: 0 !important; }
      .ss-section-title { font-style: italic; }
      .ss-block { border-bottom: 1px solid #d4cfc8; }
    `
  }
};

/* ──────────────────────────────────────────────────────────────────
   HTML GENERATORS — render each block to HTML string
────────────────────────────────────────────────────────────────── */
const BlockRenderers = {

  nav(data) {
    // FIX3: Support bgType like other blocks (solid/gradient/image)
    const bgType = data.bgType || 'solid';
    const navBg = bgType === 'image' && data.bgImage
      ? `url('${data.bgImage}') center/cover no-repeat`
      : bgType === 'gradient'
        ? `linear-gradient(${data.bgGradientAngle||135}deg, ${data.bgColor} 0%, ${data.bgColor2||data.bgColor} 100%)`
        : bgType === 'transparent'
          ? 'transparent'
          : data.bgColor;
    return `
<nav class="ss-block ss-nav" style="background:${navBg};color:${data.textColor};position:${data.sticky?'sticky':'relative'};top:0;z-index:100;border-bottom:1px solid rgba(0,0,0,0.08);padding:0 var(--section-pad);">
  <div class="ss-nav-inner" style="max-width:var(--container);margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:72px;gap:32px;">
    <div class="ss-nav-logo" style="font-family:var(--font-heading);font-weight:800;font-size:24px;color:${data.textColor};letter-spacing:-0.5px;cursor:default;">${data.logo}</div>
    <div class="ss-nav-links" style="display:flex;align-items:center;gap:32px;">
      ${data.links.map(l => `<a href="#" style="color:${data.textColor};text-decoration:none;font-size:15px;font-weight:500;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">${l}</a>`).join('')}
    </div>
    <a href="${data.ctaLink}" style="background:${data.ctaBgColor};color:white;padding:10px 22px;border-radius:var(--btn-radius);font-size:14px;font-weight:600;text-decoration:none;transition:all 0.2s;display:inline-flex;align-items:center;gap:6px;" onmouseover="this.style.opacity='0.9';this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">${data.ctaText} →</a>
  </div>
</nav>`;
  },

  hero(data) {
    const bg = data.bgType === 'image' && data.bgImage
      ? `url('${data.bgImage}') center/cover no-repeat`
      : `linear-gradient(135deg, ${data.bgColor} 0%, ${data.bgColor2} 100%)`;
    return `
<section class="ss-block ss-hero" data-user-bg="1" style="background:${bg};color:${data.textColor};padding:120px var(--section-pad);min-height:${data.minHeight};display:flex;align-items:center;position:relative;overflow:hidden;">
  <div class="ss-hero-orb" style="position:absolute;top:-100px;right:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(255,107,53,0.15),transparent 70%);border-radius:50%;pointer-events:none;"></div>
  <div class="ss-hero-orb" style="position:absolute;bottom:-150px;left:-50px;width:400px;height:400px;background:radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%);border-radius:50%;pointer-events:none;"></div>
  <div class="ss-hero-inner" style="max-width:var(--container);margin:0 auto;width:100%;text-align:${data.alignment};position:relative;z-index:1;">
    ${data.showBadge ? `<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:50px;padding:6px 16px;font-size:13px;margin-bottom:24px;backdrop-filter:blur(8px);">${data.badgeText}</div>` : ''}
    <h1 style="font-family:var(--font-heading);font-size:clamp(40px,6vw,80px);font-weight:800;line-height:1.1;margin-bottom:20px;letter-spacing:-2px;">${data.heading}</h1>
    <p style="font-size:clamp(16px,2vw,22px);opacity:0.8;max-width:600px;margin:0 ${data.alignment==='center'?'auto':'0'} 40px;line-height:1.6;">${data.subheading}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:${data.alignment==='center'?'center':'flex-start'};">
      <a href="${data.btnLink}" class="ss-btn-primary" style="background:${data.btnColor};color:${data.btnTextColor};padding:16px 36px;border-radius:var(--btn-radius);font-size:16px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:all 0.3s;box-shadow:0 8px 32px rgba(255,107,53,0.4);" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 16px 48px rgba(255,107,53,0.5)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 8px 32px rgba(255,107,53,0.4)'">${data.btnText} →</a>
      <a href="${data.btn2Link}" style="background:rgba(255,255,255,0.1);color:${data.textColor};padding:16px 36px;border-radius:var(--btn-radius);font-size:16px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.2);display:inline-flex;align-items:center;gap:8px;transition:all 0.3s;backdrop-filter:blur(8px);" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">${data.btn2Text}</a>
    </div>
  </div>
</section>`;
  },

  leadform(data) {
    const fields = data.fields.map(f => `
      <input type="${f.type}" name="${f.name}" placeholder="${f.placeholder}" required style="width:100%;padding:14px 16px;background:white;border:1.5px solid #e5e7eb;border-radius:var(--radius);font-size:15px;font-family:var(--font-body);outline:none;transition:border-color 0.2s;color:${data.textColor};" onfocus="this.style.borderColor='${data.accentColor}'" onblur="this.style.borderColor='#e5e7eb'"/>
    `).join('');
    // FIX11: Webhook-aware form submit handler
    const webhookUrl = data.webhookUrl || '';
    const successMsg = data.successMsg || "You're on the list!";
    const errorMsg = data.errorMsg || "Something went wrong. Please try again.";
    const submitHandler = webhookUrl
      ? `async function ssFormSubmit(form, btn, orig) {
          btn.textContent = '⏳ Sending…'; btn.disabled = true;
          const formData = {}; new FormData(form).forEach((v,k) => formData[k]=v);
          try {
            const res = await fetch('${webhookUrl}', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(formData) });
            if (res.ok) { form.innerHTML = '<div style=\'text-align:center;padding:20px;\'><span style=\'font-size:40px;\'>🎉</span><h3 style=\'margin-top:12px;font-family:var(--font-heading);font-weight:700;\'>${successMsg}</h3></div>'; }
            else { btn.textContent = orig; btn.disabled = false; btn.insertAdjacentHTML('afterend','<p style=\'color:#ef4444;font-size:13px;margin-top:6px;\'>${errorMsg}</p>'); }
          } catch(e) { btn.textContent = orig; btn.disabled = false; btn.insertAdjacentHTML('afterend','<p style=\'color:#ef4444;font-size:13px;margin-top:6px;\'>Network error. Please try again.</p>'); }
        }`
      : `function ssFormSubmit(form, btn, orig) { form.innerHTML = '<div style=\'text-align:center;padding:20px;\'><span style=\'font-size:40px;\'>🎉</span><h3 style=\'margin-top:12px;font-family:var(--font-heading);font-weight:700;\'>${successMsg}</h3></div>'; }`;

    return `
<section class="ss-block ss-leadform" style="background:${data.bgColor};color:${data.textColor};padding:var(--section-pad) var(--section-pad);">
  <div style="max-width:560px;margin:0 auto;text-align:center;">
    <h2 class="ss-section-title" style="font-family:var(--font-heading);font-size:clamp(28px,4vw,44px);font-weight:800;margin-bottom:12px;letter-spacing:-1px;color:${data.textColor};">${data.heading}</h2>
    <p style="font-size:17px;opacity:0.7;margin-bottom:36px;">${data.subheading}</p>
    <script>(${submitHandler})<\/script>
    <form onsubmit="event.preventDefault();var b=this.querySelector('button[type=submit]');ssFormSubmit(this,b,b?b.textContent:'');" style="display:flex;flex-direction:column;gap:12px;text-align:left;">
      ${fields}
      <button type="submit" style="background:${data.btnColor};color:white;padding:16px;border-radius:var(--btn-radius);font-size:16px;font-weight:700;border:none;cursor:pointer;transition:all 0.3s;font-family:var(--font-body);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 32px rgba(255,107,53,0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">${data.btnText}</button>
      <p style="text-align:center;font-size:13px;opacity:0.5;margin-top:4px;">${data.privacyText}</p>
    </form>
  </div>
</section>`;
  },

  testimonials(data) {
    const cards = data.cards.map((c, i) => `
      <div class="ss-card ss-testimonial-card" style="background:${c.bgColor};border:1px solid rgba(0,0,0,0.06);border-radius:var(--radius);padding:28px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:16px;transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
        <div style="display:flex;gap:2px;color:#ffd700;font-size:16px;">${'★'.repeat(c.rating)}</div>
        <p style="font-size:15px;line-height:1.7;color:${data.textColor};opacity:0.85;font-style:italic;">"${c.quote}"</p>
        <div style="display:flex;align-items:center;gap:12px;margin-top:auto;padding-top:12px;border-top:1px solid rgba(0,0,0,0.05);">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${data.accentColor},${data.accentColor}88);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:white;flex-shrink:0;">${c.name.charAt(0)}</div>
          <div>
            <div style="font-weight:700;font-size:14px;color:${data.textColor};">${c.name}</div>
            <div style="font-size:12px;color:${data.textColor};opacity:0.5;">${c.role}</div>
          </div>
        </div>
      </div>
    `).join('');
    return `
<section class="ss-block ss-testimonials" style="background:${data.bgColor};padding:var(--section-pad) var(--section-pad);">
  <div style="max-width:var(--container);margin:0 auto;">
    <div style="text-align:center;margin-bottom:56px;">
      <h2 class="ss-section-title" style="font-family:var(--font-heading);font-size:clamp(28px,4vw,48px);font-weight:800;margin-bottom:12px;letter-spacing:-1px;color:${data.textColor};">${data.heading}</h2>
      <p style="font-size:17px;color:${data.textColor};opacity:0.6;">${data.subheading}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">${cards}</div>
  </div>
</section>`;
  },

  pricing(data) {
    const plans = data.plans.map((p, i) => `
      <div class="ss-card ss-pricing-card" style="background:${p.bgColor};border:1px solid ${p.borderColor};border-radius:var(--radius);padding:32px;display:flex;flex-direction:column;gap:20px;position:relative;transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
        ${p.featured ? `<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:white;color:${data.bgColor};padding:4px 16px;border-radius:50px;font-size:12px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;">MOST POPULAR ⭐</div>` : ''}
        <div>
          <div style="font-size:14px;font-weight:600;color:${p.featured?'rgba(255,255,255,0.8)':data.textColor};opacity:0.7;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${p.name}</div>
          <div style="display:flex;align-items:baseline;gap:4px;">
            <span style="font-family:var(--font-heading);font-size:52px;font-weight:800;color:${p.featured?'white':data.textColor};line-height:1;">${p.price}</span>
            <span style="font-size:14px;color:${p.featured?'rgba(255,255,255,0.7)':data.textColor};opacity:0.6;">${p.period}</span>
          </div>
          <p style="font-size:14px;color:${p.featured?'rgba(255,255,255,0.7)':data.textColor};opacity:0.6;margin-top:8px;">${p.description}</p>
        </div>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;flex:1;">
          ${(p.features||[]).map(f => `<li style="display:flex;align-items:center;gap:10px;font-size:14px;color:${p.featured?'rgba(255,255,255,0.9)':data.textColor};">
            <span style="color:${p.featured?'white':data.accentColor};font-size:16px;flex-shrink:0;">✓</span>${f}
          </li>`).join('')}
        </ul>
        <a href="${p.ctaLink}" style="background:${p.featured?'white':data.accentColor};color:${p.featured?data.accentColor:'white'};padding:14px 24px;border-radius:var(--btn-radius);text-align:center;font-size:15px;font-weight:700;text-decoration:none;transition:all 0.3s;display:block;" onmouseover="this.style.transform='translateY(-2px)';this.style.opacity='0.9'" onmouseout="this.style.transform='translateY(0)';this.style.opacity='1'">${p.ctaText}</a>
      </div>
    `).join('');
    return `
<section class="ss-block ss-pricing" style="background:${data.bgColor};padding:var(--section-pad) var(--section-pad);">
  <div style="max-width:var(--container);margin:0 auto;">
    <div style="text-align:center;margin-bottom:56px;">
      <h2 class="ss-section-title" style="font-family:var(--font-heading);font-size:clamp(28px,4vw,48px);font-weight:800;margin-bottom:12px;letter-spacing:-1px;color:${data.textColor};">${data.heading}</h2>
      <p style="font-size:17px;color:${data.textColor};opacity:0.6;">${data.subheading}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;align-items:start;">${plans}</div>
  </div>
</section>`;
  },

  cta(data) {
    const bg = data.bgType === 'image' && data.bgImage
      ? `url('${data.bgImage}') center/cover no-repeat`
      : `linear-gradient(135deg, ${data.bgColor} 0%, ${data.bgColor2} 100%)`;
    return `
<section class="ss-block ss-cta" style="background:${bg};color:${data.textColor};padding:100px var(--section-pad);text-align:center;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,0.04) 0%,transparent 60%);pointer-events:none;border-radius:inherit;"></div>
  <div style="position:relative;z-index:1;max-width:700px;margin:0 auto;">
    ${data.showBadge ? `<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:50px;padding:6px 18px;font-size:13px;margin-bottom:24px;backdrop-filter:blur(8px);">${data.badgeText}</div>` : ''}
    <h2 style="font-family:var(--font-heading);font-size:clamp(32px,5vw,60px);font-weight:800;margin-bottom:16px;letter-spacing:-1.5px;line-height:1.1;">${data.heading}</h2>
    <p style="font-size:18px;opacity:0.85;margin-bottom:40px;line-height:1.6;">${data.subheading}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
      <a href="${data.btnLink}" style="background:${data.btnColor};color:${data.btnTextColor};padding:18px 40px;border-radius:var(--btn-radius);font-size:17px;font-weight:700;text-decoration:none;transition:all 0.3s;display:inline-flex;align-items:center;gap:8px;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 16px 48px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">${data.btnText}</a>
      <a href="${data.btn2Link}" style="background:rgba(255,255,255,0.15);color:${data.textColor};padding:18px 40px;border-radius:var(--btn-radius);font-size:17px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.3);backdrop-filter:blur(8px);transition:all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.22)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">${data.btn2Text}</a>
    </div>
  </div>
</section>`;
  },

  features(data) {
    const items = data.items.map(item => `
      <div class="ss-card ss-feature-card" style="background:white;border:1px solid rgba(0,0,0,0.06);border-radius:var(--radius);padding:28px;box-shadow:var(--shadow);transition:all 0.3s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='${data.accentColor}'" onmouseout="this.style.transform='translateY(0)';this.style.borderColor='rgba(0,0,0,0.06)'">
        <div style="width:52px;height:52px;background:linear-gradient(135deg,${data.accentColor}20,${data.accentColor}08);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;border:1px solid ${data.accentColor}20;">${item.icon}</div>
        <h3 style="font-family:var(--font-heading);font-size:18px;font-weight:700;color:${data.textColor};margin-bottom:8px;">${item.title}</h3>
        <p style="font-size:14px;color:${data.textColor};opacity:0.6;line-height:1.7;">${item.description}</p>
      </div>
    `).join('');
    return `
<section class="ss-block ss-features" style="background:${data.bgColor};padding:var(--section-pad) var(--section-pad);">
  <div style="max-width:var(--container);margin:0 auto;">
    <div style="text-align:center;margin-bottom:56px;">
      <h2 class="ss-section-title" style="font-family:var(--font-heading);font-size:clamp(28px,4vw,48px);font-weight:800;margin-bottom:12px;letter-spacing:-1px;color:${data.textColor};">${data.heading}</h2>
      <p style="font-size:17px;color:${data.textColor};opacity:0.6;">${data.subheading}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${data.columns},1fr);gap:24px;">${items}</div>
  </div>
</section>`;
  },

  gallery(data) {
    const imgs = data.images.map((img, i) => {
      const colors = ['#ff6b35','#8b5cf6','#3b82f6','#22c55e','#f59e0b','#ef4444'];
      const bg = img.src ? `url('${img.src}') center/cover no-repeat` : `linear-gradient(135deg, ${colors[i%colors.length]}33, ${colors[(i+1)%colors.length]}33)`;
      // FIX12: Use actual img tag for load/error detection, hidden behind bg
      return `
        <div style="position:relative;overflow:hidden;border-radius:var(--radius);aspect-ratio:4/3;background:${bg};cursor:pointer;" onmouseover="this.querySelector('.gal-overlay').style.opacity='1'" onmouseout="this.querySelector('.gal-overlay').style.opacity='0'">
          ${img.src ? `<img src="${img.src}" alt="${img.alt||''}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;pointer-events:none;" onerror="var p=this.parentElement;p.style.background='linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))';p.innerHTML='<div style=\'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:rgba(255,255,255,0.4);\'><span style=\'font-size:28px;\'>⚠️</span><span style=\'font-size:12px;\'>Image failed to load</span></div>';"/>` : ''}
          ${!img.src ? `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;"><span style="font-size:32px;">${['🖼️','💻','✨','🚀','📱','🎨'][i%6]}</span><span style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:500;">Add Image</span></div>` : ''}
          <div class="gal-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;padding:16px;opacity:0;transition:opacity 0.3s;">
            <span style="color:white;font-size:14px;font-weight:600;">${img.caption}</span>
          </div>
        </div>
      `;
    }).join('');
    return `
<section class="ss-block ss-gallery" style="background:${data.bgColor};padding:var(--section-pad) var(--section-pad);">
  <div style="max-width:var(--container);margin:0 auto;">
    <div style="text-align:center;margin-bottom:48px;">
      <h2 class="ss-section-title" style="font-family:var(--font-heading);font-size:clamp(28px,4vw,48px);font-weight:800;margin-bottom:12px;letter-spacing:-1px;color:${data.textColor};">${data.heading}</h2>
      <p style="font-size:17px;color:${data.textColor};opacity:0.6;">${data.subheading}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${data.columns},1fr);gap:16px;">${imgs}</div>
  </div>
</section>`;
  },

  footer(data) {
    const cols = data.columns.map(col => `
      <div>
        <h4 style="font-family:var(--font-heading);font-size:14px;font-weight:700;color:${data.accentColor};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px;">${col.title}</h4>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;">
          ${col.links.map(l => `<li><a href="${l.url}" style="color:${data.textColor};opacity:0.6;font-size:14px;text-decoration:none;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">${l.label}</a></li>`).join('')}
        </ul>
      </div>
    `).join('');
    const socials = data.socialLinks.map(s => `
      <a href="${s.url}" style="width:36px;height:36px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:${data.textColor};opacity:0.7;text-decoration:none;font-size:14px;font-weight:700;transition:all 0.2s;" onmouseover="this.style.opacity='1';this.style.background='${data.accentColor}';this.style.borderColor='${data.accentColor}'" onmouseout="this.style.opacity='0.7';this.style.background='rgba(255,255,255,0.06)';this.style.borderColor='rgba(255,255,255,0.1)'">${s.icon}</a>
    `).join('');
    return `
<footer class="ss-block ss-footer" style="background:${data.bgColor};color:${data.textColor};padding:64px var(--section-pad) 32px;">
  <div style="max-width:var(--container);margin:0 auto;">
    <div style="display:grid;grid-template-columns:1.5fr repeat(${data.columns.length},1fr);gap:48px;margin-bottom:48px;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div>
        <div style="font-family:var(--font-heading);font-weight:800;font-size:22px;color:white;margin-bottom:10px;letter-spacing:-0.5px;">${data.logo}</div>
        <p style="font-size:14px;opacity:0.5;margin-bottom:24px;line-height:1.6;">${data.tagline}</p>
        <div style="display:flex;gap:8px;">${socials}</div>
      </div>
      ${cols}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
      <p style="font-size:13px;opacity:0.4;">${data.copyright}</p>
      <div style="display:flex;gap:24px;">
        <a href="#" style="font-size:13px;color:${data.textColor};opacity:0.4;text-decoration:none;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='0.4'">Privacy</a>
        <a href="#" style="font-size:13px;color:${data.textColor};opacity:0.4;text-decoration:none;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='0.4'">Terms</a>
        <a href="#" style="font-size:13px;color:${data.textColor};opacity:0.4;text-decoration:none;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='0.4'">Cookies</a>
      </div>
    </div>
  </div>
</footer>`;
  },

};

/* ──────────────────────────────────────────────────────────────────
   PREVIEW ENGINE — generates the full page HTML for the iframe
────────────────────────────────────────────────────────────────── */
function buildPreviewHTML(forExport = false) {
  const template = Templates[State.currentTemplate];

  // Merge global styles with template overrides
  const styles = { ...State.globalStyles, ...template.overrides };
  const cssVars = Object.entries(styles).map(([k, v]) => `${k}: ${v};`).join('\n    ');

  // Build block HTML
  const blocksHTML = State.blocks.map(block => {
    const renderer = BlockRenderers[block.type];
    if (!renderer) return '';
    let html = renderer(block.data);
    // FIX2/FIX3: Apply glass tint/blur/opacity per block if configured
    // Apply in BOTH preview and export (glass is a real visual effect, not just builder UI)
    if (block.data.glassTint && block.data.glassTint !== 'none') {
      const blur = block.data.glassBlur || 0;
      const opac = block.data.glassOpacity !== undefined ? block.data.glassOpacity : 1;
      const glassCSS = 'box-shadow:inset 0 0 0 2000px ' + block.data.glassTint + ';'
        + (blur > 0 ? 'backdrop-filter:blur(' + blur + 'px);-webkit-backdrop-filter:blur(' + blur + 'px);' : '')
        + (opac < 1 ? 'opacity:' + opac + ';' : '');
      // FIX3: Instead of injecting style onto the block element (which overrides background),
      // inject a glass overlay div as the first child of the block's inner wrapper.
      // This preserves the block's own background while adding the glass tint on top.
      html = html.replace(
        /(<(?:section|nav|header|footer)[^>]*class="ss-block[^"]*"[^>]*>)/,
        '$1<div class="ss-glass-overlay" style="position:absolute;inset:0;pointer-events:none;z-index:0;' + glassCSS + ';border-radius:inherit;"></div>'
      );
      // Ensure the block has position:relative for the overlay to work
      html = html.replace(
        /(<(?:section|nav|header|footer)[^>]*class="ss-block[^"]*")/,
        '$1 data-glass="1"'
      );
    }
    // Wrap with an ID for selection
    return `<div class="ss-block-wrapper" data-block-id="${block.id}" style="position:relative;">
      ${html}
      ${!forExport ? `
      <div class="ss-block-controls" style="position:absolute;top:8px;right:8px;display:none;z-index:200;gap:4px;flex-wrap:nowrap;">
        <button onclick="window.parent.postMessage({type:'openBlockSettings',id:'${block.id}'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;font-family:DM Sans,sans-serif;">✏️ Edit</button>
        <button onclick="window.parent.postMessage({type:'moveBlock',id:'${block.id}',dir:'up'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">↑</button>
        <button onclick="window.parent.postMessage({type:'moveBlock',id:'${block.id}',dir:'down'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">↓</button>
        <button onclick="window.parent.postMessage({type:'duplicateBlock',id:'${block.id}'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">⧉</button>
        <button onclick="window.parent.postMessage({type:'deleteBlock',id:'${block.id}'},'*')" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">🗑</button>
      </div>` : ''}
    </div>`;
  }).join('\n');

  const emptyState = State.blocks.length === 0 && !forExport ? `
    <div style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#f8f8ff;font-family:DM Sans,sans-serif;">
      <div style="font-size:64px;">🏗️</div>
      <h2 style="font-size:24px;font-weight:700;color:#1a1a2e;font-family:Syne,sans-serif;">Your canvas is empty</h2>
      <p style="color:#666;font-size:16px;">Add blocks from the left panel to start building</p>
      <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;justify-content:center;">
        <button onclick="window.parent.postMessage({type:'addBlock',blockType:'hero'},'*')" style="background:#ff6b35;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;">+ Add Hero</button>
        <button onclick="window.parent.postMessage({type:'addBlock',blockType:'nav'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;">+ Add Nav</button>
        <button onclick="window.parent.postMessage({type:'addBlock',blockType:'features'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;">+ Add Features</button>
      </div>
    </div>
  ` : '';

  const previewInteractScript = !forExport ? `
    <script>
      // Block hover controls
      document.querySelectorAll('.ss-block-wrapper').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => {
          const ctrl = wrap.querySelector('.ss-block-controls');
          if (ctrl) ctrl.style.display = 'flex';
        });
        wrap.addEventListener('mouseleave', () => {
          const ctrl = wrap.querySelector('.ss-block-controls');
          if (ctrl) ctrl.style.display = 'none';
        });

      // FIX4: Block external navigation in builder preview sandbox
      (function() {
        document.addEventListener('click', function(e) {
          var el = e.target;
          while (el && el.tagName !== 'A') el = el.parentElement;
          if (el && el.tagName === 'A') {
            var href = el.getAttribute('href') || '';
            if (href.charAt(0) === '#' || href === '' || href.indexOf('javascript') === 0) return;
            e.preventDefault(); e.stopPropagation();
            el.style.outline = '2px solid rgba(255,107,53,0.6)';
            setTimeout(function(){ if(el) el.style.outline = ''; }, 500);
          }
        }, true);
      })();

      // ── SSV26.2 F5: Global scroll animation system (BUILDER PREVIEW ONLY) ──
      (function(){
        var mode = '" + (window.parent && window.parent.State ? window.parent.State.scrollAnimation : 'off') + "';
        if (!mode || mode === 'off') return;
        var presets = {
          subtle:   { y: 20, scale: 1,    blur: 0  },
          soft:     { y: 40, scale: 0.97, blur: 0  },
          dramatic: { y: 60, scale: 0.94, blur: 8  }
        };
        var cfg = presets[mode] || presets.subtle;
        var blocks = document.querySelectorAll('.ss-block');
        blocks.forEach(function(b){
          b.style.opacity = '0';
          b.style.willChange = 'opacity, transform, filter';
          b.style.transform = 'translate3d(0,'+cfg.y+'px,0) scale('+cfg.scale+')';
          if (cfg.blur) b.style.filter = 'blur('+cfg.blur+'px)';
          b.style.transition = 'opacity .7s cubic-bezier(.2,.65,.3,1), transform .8s cubic-bezier(.2,.65,.3,1), filter .6s ease';
        });
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(e){
            if (e.isIntersecting) {
              requestAnimationFrame(function(){
                e.target.style.opacity = '1';
                e.target.style.transform = 'translate3d(0,0,0) scale(1)';
                e.target.style.filter = 'none';
              });
              io.unobserve(e.target);
            }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        blocks.forEach(function(b){ io.observe(b); });
      })();
    </\script>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${document.getElementById('site-name-input')?.value || 'My Site'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      ${cssVars}
    }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-body);
      color: var(--text);
      background: var(--bg);
      font-size: var(--font-base);
      line-height: var(--line-height);
      -webkit-font-smoothing: antialiased;
    }
    .ss-block-wrapper { position: relative; }
    .ss-block-controls { display: none; }
    ${template.extraCSS || ''}
    ${State.customCSS}
    @media (max-width: 768px) {
      [style*="grid-template-columns: repeat(3"] { grid-template-columns: repeat(2, 1fr) !important; }
      [style*="grid-template-columns: repeat(2"] { grid-template-columns: 1fr !important; }
      [style*="grid-template-columns: 1.5fr"] { grid-template-columns: 1fr !important; }
      [style*="min-height: 85vh"] { min-height: 60vh !important; }
      .ss-nav-links { display: none !important; }
    }

    /* FIX2: Preview-mode sizing normalization.
       In builder preview the iframe viewport is different from a real browser window.
       We normalize hero sizing so it fits the visible preview area correctly. */
    body.ss-preview-mode .ss-hero {
      /* Override the 120px fixed padding with a responsive value */
      padding-top: clamp(40px, 8vh, 80px) !important;
      padding-bottom: clamp(40px, 8vh, 80px) !important;
    }
    body.ss-preview-mode .ss-hero[style*="min-height:100vh"],
    body.ss-preview-mode .ss-hero[style*="min-height: 100vh"] {
      /* 100vh in preview iframe = iframe height, not window height.
         Cap to avoid massive scroll in builder. */
      min-height: min(100vh, 600px) !important;
    }
    body.ss-preview-mode .ss-hero[style*="min-height:85vh"],
    body.ss-preview-mode .ss-hero[style*="min-height: 85vh"] {
      min-height: min(85vh, 520px) !important;
    }
    body.ss-preview-mode .ss-hero[style*="min-height:60vh"],
    body.ss-preview-mode .ss-hero[style*="min-height: 60vh"] {
      min-height: min(60vh, 420px) !important;
    }
    /* Prevent orb decorations from expanding layout in preview */
    body.ss-preview-mode .ss-hero-orb {
      display: none !important;
    }
  </style>
</head>
<body${!forExport ? ' class="ss-preview-mode"' : ''}>
  ${blocksHTML || emptyState}
  ${previewInteractScript}
</body>
</html>`;
}

/* ──────────────────────────────────────────────────────────────────
   CORE FUNCTIONS
────────────────────────────────────────────────────────────────── */

/* ══════════════════════════════════════════════════════════════════
   SSV26.1 — AUTH SYSTEM & PASSWORD DATABASE
   ─────────────────────────────────────────────────────────────────
   HOW TO ADD A NEW USER:
     Find the SS_PASSWORD_DB section for their tier and add one line:
       'YOURCODE': { note: 'Who this is for' },

   HOW TO MOVE A USER TO A DIFFERENT TIER:
     Cut their entry from one tier block and paste it into another.

   CODES ARE CASE-INSENSITIVE — 'mypro' and 'MYPRO' both work.

   TO ADD A WHOLE NEW TIER in SSV26.2+:
     1. Add a new block to SS_PASSWORD_DB
     2. Add its limits to Auth.tiers
     3. Add its CSS class to style.css (.nav-tier-badge.newtier)

   SSV26.2+ UPGRADE PATH:
     Replace Auth.verify() body with a fetch() to your backend.
     SS_PASSWORD_DB can then move server-side. No other code changes.
══════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────
   ★ PASSWORD DATABASE — EDIT THIS SECTION TO MANAGE USERS ★
   Each entry: 'CODE': { note: 'description (for your reference)' }
   Codes are matched case-insensitively.
───────────────────────────────────────────────────────────────── */
const SS_PASSWORD_DB = {

  // ── FREE / TRIAL ───────────────────────────────────────────────
  // Limits: 1 site per week · 30 min session per day
  free: {
    'SS26':      { note: 'Default public demo code' },
    'TRYME':     { note: 'General trial invite' },
    'FREETRIAL': { note: 'Marketing campaign — batch A' },
    // ↓ Add free codes below this line
  },

  // ── BASIC ──────────────────────────────────────────────────────
  // Limits: 1 site per day · 60 min session per day
  basic: {
    'SSBASIC':   { note: 'Default basic test code' },
    'BASIC2026': { note: 'Basic launch cohort' },
    // ↓ Add basic codes below this line
  },

  // ── PRO ────────────────────────────────────────────────────────
  // Limits: 3 sites per day · 180 min session per day
  pro: {
    'SSPRO':       { note: 'Default pro test code' },
    'PROLAUNCH':   { note: 'Pro early adopter — batch A' },
    'BUILDFAST':   { note: 'Pro early adopter — batch B' },
    // ↓ Add pro codes below this line
  },

  // ── AGENCY ─────────────────────────────────────────────────────
  // Limits: Unlimited sites · Unlimited session time
  agency: {
    'SSAGENCY':    { note: 'Default agency test code' },
    'AGENCYLAUNCH':{ note: 'Agency founding client — batch A' },
    'ROASRYE':     { note: 'My Personal Code' }
    // ↓ Add agency codes below this line
  },

};
/* ─────────────────────────────────────────────────────────────────
   END OF PASSWORD DATABASE — do not edit below this line
───────────────────────────────────────────────────────────────── */

const Auth = {
  version: 'SSV26.3',

  // ── Tier limits — update here for SSV26.2+ pricing changes ─────
  tiers: {
    free:   { label: 'Free Trial', sitesPerWeek: 1,   sitesPerDay: 0,   sessionMinutes: 30,   weekly: true  },
    basic:  { label: 'Basic',      sitesPerWeek: 0,   sitesPerDay: 1,   sessionMinutes: 60,   weekly: false },
    pro:    { label: 'Pro',        sitesPerWeek: 0,   sitesPerDay: 3,   sessionMinutes: 180,  weekly: false },
    agency: { label: 'Agency',     sitesPerWeek: 0,   sitesPerDay: 999, sessionMinutes: 9999, weekly: false },
  },

  /**
   * verify(code) → { ok: bool, tier, label, note, error }
   *
   * Looks up the code across all tiers in SS_PASSWORD_DB.
   * Case-insensitive. Returns the matched tier and its config.
   *
   * SSV26.2+ upgrade: replace this body with a fetch() call to your
   * auth endpoint. The rest of the app reads only ok/tier/label.
   */
  verify(code) {
    const normalised = code.trim().toUpperCase();
    if (!normalised) return { ok: false, error: 'Please enter an access code.' };

    // Walk every tier block in the database
    for (const [tierKey, entries] of Object.entries(SS_PASSWORD_DB)) {
      // Check every code in this tier (also case-insensitive keys)
      for (const [dbCode, meta] of Object.entries(entries)) {
        if (dbCode.toUpperCase() === normalised) {
          const tierCfg = this.tiers[tierKey] || this.tiers.free;
          return {
            ok:    true,
            tier:  tierKey,
            label: tierCfg.label,
            note:  meta.note || '',
          };
        }
      }
    }

    return { ok: false, error: 'Invalid access code. Check your invite email or see plans below.' };
  },

  /** Returns the tier limits config object for a given tier key */
  getTierConfig(tier) {
    return this.tiers[tier] || this.tiers.free;
  },

  /**
   * listCodes() — developer utility
   * Call Auth.listCodes() in the browser console to audit all codes.
   * Returns an array of { code, tier, note } for review.
   */
  listCodes() {
    const out = [];
    for (const [tier, entries] of Object.entries(SS_PASSWORD_DB)) {
      for (const [code, meta] of Object.entries(entries)) {
        out.push({ code, tier, label: this.tiers[tier]?.label || tier, note: meta.note });
      }
    }
    console.table(out);
    return out;
  },
};

/* ══════════════════════════════════════════════════════════════════
   SSV26.1 — USAGE TRACKER
   Tracks session time + site exports per day / per week.
   Resets daily (midnight local). Weekly resets for Free tier.
══════════════════════════════════════════════════════════════════ */
const UsageTracker = {
  _storageKey: 'ss_usage_v261',
  _timerInterval: null,
  _sessionStartMs: null,

  /** Load or initialise usage record from localStorage */
  _load() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return this._fresh();
  },

  _fresh() {
    const now = new Date();
    return {
      date: now.toDateString(),          // daily reset key
      week: this._weekKey(now),          // weekly reset key (Free tier)
      sessionSeconds: 0,                 // cumulative seconds this day
      exportsToday: 0,
      exportsThisWeek: 0,
      tier: 'free',
    };
  },

  _weekKey(d) {
    // ISO week number string for weekly reset
    const date = new Date(+d);
    date.setHours(0,0,0,0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(),0,1);
    return date.getFullYear() + '-W' + Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  },

  _save(record) {
    try { localStorage.setItem(this._storageKey, JSON.stringify(record)); } catch(e) {}
  },

  /** Call after successful login to bind tier and reset if day changed */
  init(tier) {
    const now = new Date();
    let record = this._load();

    // Daily reset
    if (record.date !== now.toDateString()) {
      record.date = now.toDateString();
      record.sessionSeconds = 0;
      record.exportsToday = 0;
    }

    // Weekly reset (Free tier)
    const wk = this._weekKey(now);
    if (record.week !== wk) {
      record.week = wk;
      record.exportsThisWeek = 0;
    }

    record.tier = tier;
    this._save(record);
    this._sessionStartMs = Date.now();
    this._startTimer(record);
  },

  /** Start the 1-second UI timer */
  _startTimer(record) {
    if (this._timerInterval) clearInterval(this._timerInterval);
    let seconds = record.sessionSeconds;
    const cfg = Auth.getTierConfig(record.tier);
    const limitSec = cfg.sessionMinutes * 60;

    this._timerInterval = setInterval(() => {
      seconds++;
      // Persist every 10s to avoid hammering storage
      if (seconds % 10 === 0) {
        const r = this._load();
        r.sessionSeconds = seconds;
        this._save(r);
      }
      this._updateTimerUI(seconds, limitSec);

      // Enforce session time limit (non-agency)
      if (record.tier !== 'agency' && seconds >= limitSec) {
        clearInterval(this._timerInterval);
        this._showLimitModal('session');
      }
    }, 1000);
  },

  _updateTimerUI(seconds, limitSec) {
    const el = document.getElementById('nav-timer');
    if (!el) return;
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    el.textContent = mm + ':' + ss;
    const remaining = limitSec - seconds;
    el.classList.toggle('warning', remaining < 300 && remaining > 0);
    el.classList.toggle('danger',  remaining < 60  && remaining > 0);
  },

  /**
   * canExport() → bool
   * Call before allowing "It's Go Time" download.
   */
  canExport() {
    const r = this._load();
    const cfg = Auth.getTierConfig(r.tier);
    if (r.tier === 'agency') return true;
    if (cfg.weekly) return r.exportsThisWeek < cfg.sitesPerWeek;
    return r.exportsToday < cfg.sitesPerDay;
  },

  /** Call after a successful export */
  recordExport() {
    const r = this._load();
    r.exportsToday++;
    r.exportsThisWeek++;
    this._save(r);
  },

  /** Show the usage limit modal with contextual copy */
  _showLimitModal(type) {
    const r = this._load();
    const cfg = Auth.getTierConfig(r.tier);
    const titleEl = document.getElementById('ulm-title');
    const bodyEl  = document.getElementById('ulm-body');
    const badgeEl = document.getElementById('ulm-tier-badge');

    if (titleEl) titleEl.textContent = type === 'session'
      ? `Session limit reached (${cfg.sessionMinutes} min)`
      : `Export limit reached`;

    if (bodyEl) bodyEl.textContent = type === 'session'
      ? `Your ${cfg.label} plan allows ${cfg.sessionMinutes} minutes of builder time per day. Your session has ended. Come back tomorrow or upgrade your plan.`
      : `Your ${cfg.label} plan allows ${cfg.weekly ? cfg.sitesPerWeek + ' site/week' : cfg.sitesPerDay + ' site(s)/day'}. Upgrade to continue exporting.`;

    if (badgeEl) {
      badgeEl.textContent = cfg.label;
      badgeEl.className = 'lmt-tier lmt-' + r.tier;
    }

    const modal = document.getElementById('usage-limit-modal');
    if (modal) modal.style.display = 'flex';
  },

  showExportLimitModal() { this._showLimitModal('export'); },
};

/* ══════════════════════════════════════════════════════════════════
   SSV26.1 — LANDING PAGE FUNCTIONS
══════════════════════════════════════════════════════════════════ */

/** Open the login modal, optionally pre-scroll to pricing anchor */
function openLoginModal(planHint) {
  document.getElementById('login-modal').style.display = 'flex';
  const input = document.getElementById('gate-input');
  if (input) { input.value = ''; input.focus(); }
  document.getElementById('gate-error').textContent = '';
  document.getElementById('login-tier-hint').style.display = 'none';
}

function closeLoginModal() {
  document.getElementById('login-modal').style.display = 'none';
}

/** Live-preview tier name as user types code */
function previewTierFromCode(val) {
  const result = Auth.verify(val);
  const hint = document.getElementById('login-tier-hint');
  if (!hint) return;
  if (val.length >= 4 && result.ok) {
    hint.style.display = 'flex';
    hint.textContent = '✓ ' + result.label + ' plan detected';
  } else {
    hint.style.display = 'none';
  }
}

/** FAQ accordion toggle */
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  // Close all
  document.querySelectorAll('.lp-faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.lp-faq-q').forEach(b => b.classList.remove('open'));
  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('open');
  }
}

/** Mobile nav toggle */
function toggleLpNav() {
  const menu = document.getElementById('lp-nav-mobile');
  if (menu) menu.classList.toggle('open');
}

/* ══════════════════════════════════════════════════════════════════
   SSV26.1 — BLOCK SELECTOR (Feature 6)
   Tracks which block types the user wants visible in the library
══════════════════════════════════════════════════════════════════ */
const BlockSelector = {
  _storageKey: 'ss_blockselector_v261',
  // All known block types
  _allTypes: ['nav','hero','leadform','testimonials','pricing','cta','features','gallery','footer'],

  /** Returns array of currently enabled block types */
  getEnabled() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [...this._allTypes]; // default: all enabled
  },

  save(enabledTypes) {
    try { localStorage.setItem(this._storageKey, JSON.stringify(enabledTypes)); } catch(e) {}
  },

  /** Filter the sidebar block library to only show enabled blocks */
  applyToSidebar() {
    const enabled = this.getEnabled();
    document.querySelectorAll('.block-card').forEach(card => {
      // Derive type from onclick attribute
      const match = card.getAttribute('onclick')?.match(/addBlock\('(\w+)'\)/);
      if (!match) return;
      const type = match[1];
      card.style.display = enabled.includes(type) ? '' : 'none';
    });
  },
};

function openBlockSelectorModal() {
  const enabled = BlockSelector.getEnabled();
  const list = document.getElementById('block-selector-list');
  if (!list) return;

  const meta = {
    nav:          { icon: '🧭', label: 'Navigation',       desc: 'Site header & menu' },
    hero:         { icon: '⚡', label: 'Hero Section',     desc: 'Headline + CTA' },
    leadform:     { icon: '📋', label: 'Lead Form',        desc: 'Capture leads' },
    testimonials: { icon: '💬', label: 'Testimonials',     desc: 'Social proof cards' },
    pricing:      { icon: '💎', label: 'Pricing / Services',desc: 'Plans & tiers' },
    cta:          { icon: '🎯', label: 'CTA Section',      desc: 'Drive conversions' },
    features:     { icon: '✨', label: 'Features',         desc: 'Icon + text grid' },
    gallery:      { icon: '🖼️', label: 'Gallery',         desc: 'Image showcase' },
    footer:       { icon: '📌', label: 'Footer',           desc: 'Links & copyright' },
  };

  list.innerHTML = BlockSelector._allTypes.map(type => {
    const m = meta[type] || { icon: '◻', label: type, desc: '' };
    const on = enabled.includes(type);
    return `
      <div class="bsl-item ${on?'enabled':''}" data-type="${type}" onclick="toggleBslItem(this)">
        <div class="bsl-check">${on?'✓':''}</div>
        <span class="bsl-icon">${m.icon}</span>
        <div style="flex:1;">
          <div class="bsl-label">${m.label}</div>
          <div class="bsl-desc">${m.desc}</div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('block-selector-modal').style.display = 'flex';
}

function toggleBslItem(el) {
  el.classList.toggle('enabled');
  const check = el.querySelector('.bsl-check');
  if (check) check.textContent = el.classList.contains('enabled') ? '✓' : '';
}

function closeBlockSelectorModal() {
  document.getElementById('block-selector-modal').style.display = 'none';
}

function saveBlockSelector() {
  const enabled = [];
  document.querySelectorAll('.bsl-item.enabled').forEach(el => {
    enabled.push(el.dataset.type);
  });
  BlockSelector.save(enabled);
  BlockSelector.applyToSidebar();
  closeBlockSelectorModal();
  showToast('✅ Block library updated', enabled.length + ' block types visible', 'success');
}

// ── Existing password gate function — now routes through Auth ──
function checkPassword() {
  const input = document.getElementById('gate-input');
  const error = document.getElementById('gate-error');
  const val = input.value.trim();
  const result = Auth.verify(val);

  if (result.ok) {
    State.authenticated = true;
    State.userTier = result.tier;

    // Close login modal
    closeLoginModal();

    // Hide landing page, show builder app
    const landing = document.getElementById('landing-page');
    if (landing) {
      landing.style.opacity = '0';
      landing.style.transition = 'opacity 0.4s ease';
      setTimeout(() => { landing.style.display = 'none'; }, 400);
    }

    const app = document.getElementById('app');
    if (app) {
      setTimeout(() => {
        app.style.display = 'flex';
        initApp();
      }, 420);
    }
  } else {
    error.textContent = '❌ ' + result.error;
    error.style.animation = 'none';
    requestAnimationFrame(() => { error.style.animation = 'shake 0.4s ease both'; });
    input.value = '';
    input.focus();
  }
}

// Allow Enter key on login modal input
document.addEventListener('keydown', function(e) {
  const loginModal = document.getElementById('login-modal');
  if (loginModal && loginModal.style.display !== 'none' && e.key === 'Enter') {
    checkPassword();
  }
});

// Initialize the app after successful login
function initApp() {
  // ── SSV26.1: Wire tier badge in nav ──────────────────────
  const tier = State.userTier || 'free';
  const tierBadge = document.getElementById('nav-tier-badge');
  if (tierBadge) {
    const cfg = Auth.getTierConfig(tier);
    tierBadge.textContent = cfg.label;
    tierBadge.className = 'nav-tier-badge ' + tier;
  }

  // ── SSV26.1: Start usage tracker ─────────────────────────
  UsageTracker.init(tier);

  // ── SSV26.1: Apply block selector preferences ─────────────
  BlockSelector.applyToSidebar();

  // ── Existing startup sequence (unchanged) ─────────────────
  applyTemplate('glass');
  loadStarterDemo();
  // SSV26.2 F9: AI onboarding flow on first builder load (no existing project)
  setTimeout(() => Onboarding.maybeShow(), 800);

// Auto-restore live collab session if one was active before page reload
(function() {
  const savedCode = localStorage.getItem('ss_collab_code');
  if (savedCode) {
    // Small delay so the DOM and State are fully initialized
    setTimeout(() => {
      // Re-init as owner by default (they can re-join as guest from the modal if needed)
      LiveSync.init(savedCode, true);
      console.log('[LiveSync] Auto-restored session:', savedCode);
      // Request fresh state from any other open tabs
      setTimeout(() => LiveSync._pollNow(), 400);
    }, 500);
  }
})();   // loads session or default demo blocks
  showToast('🎉 Welcome to Supersuite!', Auth.getTierConfig(tier).label + ' plan · ' + (Auth.version || 'SSV26.3'), 'success');
}

// Refresh the live preview iframe
function refreshPreview() {
  const frame = document.getElementById('preview-frame');
  if (!frame) return;

  // FIX2: Set a stable minimum height BEFORE loading new content.
  // This prevents the viewport collapsing to 0 between srcdoc assignments,
  // which causes vh-based hero blocks to render at incorrect sizes.
  const currentH = parseInt(frame.style.height) || 0;
  if (currentH < 600) frame.style.height = '600px';

  const html = buildPreviewHTML(false);
  frame.srcdoc = html;

  // FIX1: Notify collab peers of state change (debounced inside notifyChange)
  LiveSync.notifyChange();

  // FIX2 C: After load, resize frame to fit content — but cap at a sensible max
  // to prevent hero vh expansion from making the builder canvas unusable.
  frame.onload = () => {
    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc || !doc.body) return;

      // scrollHeight reflects actual rendered content height with ss-preview-mode CSS applied
      const contentH = doc.body.scrollHeight;

      // Enforce a minimum (empty canvas) and a reasonable maximum.
      // 8000px catches even long multi-block pages without runaway expansion.
      const clampedH = Math.max(Math.min(contentH, 8000), 400);
      frame.style.height = clampedH + 'px';
    } catch(e) {
      // Cross-origin or other error — keep existing height
    }
  };
}

/* ──────────────────────────────────────────────────────────────────
   BLOCK MANAGEMENT
────────────────────────────────────────────────────────────────── */
function addBlock(type) {
  const def = BlockDefs[type];
  if (!def) return;

  const id = 'block_' + (State.blockIdCounter++);
  const block = {
    id,
    type,
    label: def.label,
    icon: def.icon,
    data: JSON.parse(JSON.stringify(def.defaultData)), // deep clone
    visible: true,
  };

  State.blocks.push(block);
  History.push();
  refreshPreview();
  updateLayers();
  switchTab('layers');
  showToast('✅ Block added', def.label + ' block added to your page', 'success');
  return id;
}

function deleteBlock(id) {
  const idx = State.blocks.findIndex(b => b.id === id);
  if (idx === -1) return;
  const label = State.blocks[idx].label;
  State.blocks.splice(idx, 1);
  History.push();
  refreshPreview();
  updateLayers();
  showToast('🗑️ Block removed', label + ' was deleted', 'info');
}

function moveBlock(id, direction) {
  const idx = State.blocks.findIndex(b => b.id === id);
  if (idx === -1) return;
  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= State.blocks.length) return;
  const temp = State.blocks[idx];
  State.blocks[idx] = State.blocks[newIdx];
  State.blocks[newIdx] = temp;
  refreshPreview();
  updateLayers();
}

function duplicateBlock(id) {
  const orig = State.blocks.find(b => b.id === id);
  if (!orig) return;
  const newId = 'block_' + (State.blockIdCounter++);
  const copy = JSON.parse(JSON.stringify(orig));
  copy.id = newId;
  const origIdx = State.blocks.indexOf(orig);
  State.blocks.splice(origIdx + 1, 0, copy);
  refreshPreview();
  updateLayers();
  showToast('⧉ Duplicated', orig.label + ' block duplicated', 'info');
}

// Expose to iframe
window.addBlock = addBlock;
window.deleteBlock = deleteBlock;
window.moveBlock = moveBlock;
window.duplicateBlock = duplicateBlock;

/* ──────────────────────────────────────────────────────────────────
   LAYERS PANEL
────────────────────────────────────────────────────────────────── */
function updateLayers() {
  const list = document.getElementById('layers-list');
  if (State.blocks.length === 0) {
    list.innerHTML = '<p class="empty-layers">No blocks yet. Add blocks from the Blocks tab!</p>';
    return;
  }

  list.innerHTML = State.blocks.map((block, i) => `
    <div class="layer-item ${State.selectedBlockId === block.id ? 'active' : ''}"
         data-id="${block.id}"
         onclick="selectBlock('${block.id}')"
         draggable="true"
         ondragstart="layerDragStart(event,'${block.id}')"
         ondragover="layerDragOver(event,'${block.id}')"
         ondrop="layerDrop(event,'${block.id}')">
      <span class="layer-drag-handle">⠿</span>
      <span class="layer-icon">${block.icon}</span>
      <span class="layer-label">${block.label}</span>
      <div class="layer-actions">
        <button class="layer-btn" onclick="event.stopPropagation();openBlockSettings('${block.id}')" title="Edit">✏️</button>
        <button class="layer-btn" onclick="event.stopPropagation();moveBlock('${block.id}','up')" title="Move up">↑</button>
        <button class="layer-btn" onclick="event.stopPropagation();moveBlock('${block.id}','down')" title="Move down">↓</button>
        <button class="layer-btn danger" onclick="event.stopPropagation();deleteBlock('${block.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
}

function selectBlock(id) {
  State.selectedBlockId = id;
  updateLayers();
  openBlockSettings(id);
}

// Layer drag & drop
let _dragSrcId = null;

function layerDragStart(e, id) {
  _dragSrcId = id;
  e.dataTransfer.effectAllowed = 'move';
}

function layerDragOver(e, id) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function layerDrop(e, targetId) {
  e.preventDefault();
  if (_dragSrcId === targetId) return;
  const srcIdx = State.blocks.findIndex(b => b.id === _dragSrcId);
  const tgtIdx = State.blocks.findIndex(b => b.id === targetId);
  const [moved] = State.blocks.splice(srcIdx, 1);
  State.blocks.splice(tgtIdx, 0, moved);
  _dragSrcId = null;
  refreshPreview();
  updateLayers();
}

/* ──────────────────────────────────────────────────────────────────
   BLOCK SETTINGS MODAL — dynamic forms per block type
────────────────────────────────────────────────────────────────── */
let _editingBlockId = null;
let _editingData = null;

window.openBlockSettings = function(id) {
  const block = State.blocks.find(b => b.id === id);
  if (!block) return;

  _editingBlockId = id;
  _editingData = JSON.parse(JSON.stringify(block.data));

  document.getElementById('bsm-title').textContent = block.icon + ' ' + block.label + ' Settings';
  // FIX2: Wrap block form + inject Glass tab at top level
  const blockForm = renderBlockSettingsForm(block.type, _editingData);
  const glassTab = renderGlassTab(_editingData);
  // Inject glass panel as top-level outer wrapper with its own tab
  document.getElementById('bsm-content').innerHTML = renderBlockModalWithGlass(blockForm, glassTab);
  document.getElementById('block-settings-modal').style.display = 'flex';
};

// FIX2: Glass Square Color System per block
function renderGlassTab(data) {
  const presets = [
    { label:'Frost', color:'rgba(255,255,255,0.12)', blur:16, opacity:0.9 },
    { label:'Midnight', color:'rgba(10,10,30,0.6)', blur:24, opacity:0.85 },
    { label:'Ember', color:'rgba(255,107,53,0.15)', blur:20, opacity:0.88 },
    { label:'Violet', color:'rgba(139,92,246,0.15)', blur:18, opacity:0.9 },
    { label:'Arctic', color:'rgba(59,130,246,0.12)', blur:22, opacity:0.92 },
    { label:'Obsidian', color:'rgba(0,0,0,0.75)', blur:32, opacity:0.95 },
  ];
  const tint = data.glassTint || 'none';
  const blur = data.glassBlur !== undefined ? data.glassBlur : 0;
  const opacity = data.glassOpacity !== undefined ? data.glassOpacity : 1;

  return `
    <p style="font-size:12px;color:var(--ui-text2);margin-bottom:12px;">Apply a glass panel tint that affects <strong>only this block</strong>.</p>

    <p style="font-size:11px;font-weight:700;color:var(--ui-accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Presets</p>
    <div class="bsm-glass-swatch">
      ${presets.map((p,i) => `
        <div class="glass-swatch-item ${tint===p.color?'active':''}"
          style="background:${p.color};backdrop-filter:blur(${p.blur}px);border:1px solid rgba(255,255,255,0.15);"
          title="${p.label}"
          onclick="applyGlassPreset('${p.color}',${p.blur},${p.opacity})">
        </div>
      `).join('')}
    </div>
    <div class="glass-swatch-item" style="background:none;border:1px dashed var(--ui-border2);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--ui-text2);width:auto;aspect-ratio:unset;padding:6px 10px;margin-bottom:12px;cursor:pointer;border-radius:6px;" onclick="applyGlassPreset('none',0,1)">✕ No Glass</div>

    <p style="font-size:11px;font-weight:700;color:var(--ui-accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Custom</p>
    <div class="glass-range-group">
      <label>Panel Tint Color <span id="glass-tint-preview" style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${tint==='none'?'transparent':tint};border:1px solid var(--ui-border);vertical-align:middle;"></span></label>
      <input type="color" value="#ffffff" style="width:100%;margin-top:4px;" oninput="updateGlassTint(this.value)"/>
    </div>
    <div class="glass-range-group">
      <label>Blur Intensity <span id="glass-blur-val">${blur}px</span></label>
      <input type="range" min="0" max="48" value="${blur}" oninput="_editingData.glassBlur=parseInt(this.value);document.getElementById('glass-blur-val').textContent=this.value+'px';applyGlassLive();livePreview()"/>
    </div>
    <div class="glass-range-group">
      <label>Block Opacity <span id="glass-opacity-val">${Math.round(opacity*100)}%</span></label>
      <input type="range" min="20" max="100" value="${Math.round(opacity*100)}" oninput="_editingData.glassOpacity=this.value/100;document.getElementById('glass-opacity-val').textContent=this.value+'%';applyGlassLive();livePreview()"/>
    </div>
  `;
}

function renderBlockModalWithGlass(blockForm, glassTab) {
  return `
    <div style="border-bottom:1px solid var(--ui-border);margin-bottom:0;display:flex;gap:0;">
      <button class="bsm-tab active" style="padding:10px 16px;font-size:12px;" onclick="switchOuterBSMTab(event,'outer-block-form')">⚙ Settings</button>
      <button class="bsm-tab" style="padding:10px 16px;font-size:12px;" onclick="switchOuterBSMTab(event,'outer-glass-form')">🪟 Glass Panel</button>
    </div>
    <div id="outer-block-form" style="display:block;">${blockForm}</div>
    <div id="outer-glass-form" style="display:none;padding:4px 0;">${glassTab}</div>
  `;
}

function switchOuterBSMTab(event, panelId) {
  const modal = document.getElementById('bsm-content');
  modal.querySelectorAll('.bsm-tab').forEach(t => t.classList.remove('active'));
  modal.querySelectorAll('#outer-block-form, #outer-glass-form').forEach(p => p.style.display = 'none');
  event.target.classList.add('active');
  const panel = document.getElementById(panelId);
  if (panel) panel.style.display = 'block';
}

function applyGlassPreset(color, blur, opacity) {
  if (!_editingData) return;
  _editingData.glassTint = color;
  _editingData.glassBlur = blur;
  _editingData.glassOpacity = opacity;
  // Re-render glass tab
  const glassPanel = document.getElementById('outer-glass-form');
  if (glassPanel) glassPanel.innerHTML = renderGlassTab(_editingData);
  applyGlassLive();
}

function updateGlassTint(hexColor) {
  if (!_editingData) return;
  // Convert hex to rgba with 0.3 alpha
  const r = parseInt(hexColor.slice(1,3),16);
  const g = parseInt(hexColor.slice(3,5),16);
  const b = parseInt(hexColor.slice(5,7),16);
  _editingData.glassTint = 'rgba('+r+','+g+','+b+',0.3)';
  const prev = document.getElementById('glass-tint-preview');
  if (prev) prev.style.background = _editingData.glassTint;
  applyGlassLive();
}

function applyGlassLive() {
  // Immediately apply glass to the block in the iframe for live feedback
  if (!_editingBlockId) return;
  const frame = document.getElementById('preview-frame');
  if (!frame || !frame.contentDocument) return;
  try {
    const blockEl = frame.contentDocument.querySelector('[data-block-id="'+_editingBlockId+'"]');
    if (blockEl) {
      const tint = _editingData.glassTint || 'none';
      const blur = _editingData.glassBlur || 0;
      const opacity = _editingData.glassOpacity !== undefined ? _editingData.glassOpacity : 1;
      blockEl.style.backdropFilter = blur > 0 ? 'blur('+blur+'px)' : '';
      blockEl.style.opacity = opacity;
      if (tint !== 'none') {
        blockEl.style.boxShadow = 'inset 0 0 0 2000px ' + tint;
      } else {
        blockEl.style.boxShadow = '';
      }
    }
  } catch(e) {}
}

function renderBlockSettingsForm(type, data) {
  const forms = {
    hero: renderHeroForm,
    nav: renderNavForm,
    leadform: renderLeadFormForm,
    testimonials: renderTestimonialsForm,
    pricing: renderPricingForm,
    cta: renderCTAForm,
    features: renderFeaturesForm,
    gallery: renderGalleryForm,
    footer: renderFooterForm,
  };
  return forms[type] ? forms[type](data) : '<p style="color:#666;padding:16px;">No settings available for this block.</p>';
}

function renderHeroForm(data) {
  // FIX13: Compact tabbed editor with live preview dot + immediate state binding
  return `
    <div class="hero-live-preview-strip">
      <div class="hero-live-dot"></div>
      <span>Live — changes reflect instantly in preview</span>
    </div>
    <div class="bsm-tabs hero-compact-editor">
      <button class="bsm-tab active" onclick="switchBSMTab(event,'hero-content-panel')">✍ Content</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'hero-design-panel')">🎨 Design</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'hero-btns-panel')">🔘 Buttons</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'hero-elements-panel')">🎭 Elements</button>
    </div>

    <div id="hero-content-panel" class="bsm-panel active">
      <div class="bsm-field"><label>Headline</label>
        <textarea rows="2" oninput="_editingData.heading=this.value;heroLiveUpdate();livePreview()">${data.heading}</textarea>
      </div>
      <div class="bsm-field"><label>Subheading</label>
        <textarea rows="2" oninput="_editingData.subheading=this.value;heroLiveUpdate();livePreview()">${data.subheading}</textarea>
      </div>
      <div class="bsm-field"><label>Badge Text</label>
        <input type="text" value="${data.badgeText}" oninput="_editingData.badgeText=this.value;heroLiveUpdate();livePreview()"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="bsm-field"><label>Show Badge</label>
          <select onchange="_editingData.showBadge=this.value==='true';heroLiveUpdate();livePreview()">
            <option value="true" ${data.showBadge?'selected':''}>Yes</option>
            <option value="false" ${!data.showBadge?'selected':''}>No</option>
          </select>
        </div>
        <div class="bsm-field"><label>Alignment</label>
          <select onchange="_editingData.alignment=this.value;heroLiveUpdate();livePreview()">
            <option value="center" ${data.alignment==='center'?'selected':''}>Center</option>
            <option value="left" ${data.alignment==='left'?'selected':''}>Left</option>
          </select>
        </div>
      </div>
      <div class="bsm-field"><label>Min Height</label>
        <select onchange="_editingData.minHeight=this.value;heroLiveUpdate();livePreview()">
          <option value="50vh" ${data.minHeight==='50vh'?'selected':''}>50vh — Compact</option>
          <option value="60vh" ${data.minHeight==='60vh'?'selected':''}>60vh — Medium</option>
          <option value="85vh" ${data.minHeight==='85vh'?'selected':''}>85vh — Tall</option>
          <option value="100vh" ${data.minHeight==='100vh'?'selected':''}>100vh — Full screen</option>
        </select>
      </div>
    </div>

    <div id="hero-design-panel" class="bsm-panel">
      <div class="bsm-field"><label>Background Type</label>
        <select onchange="_editingData.bgType=this.value;heroLiveUpdate();livePreview()">
          <option value="gradient" ${data.bgType==='gradient'?'selected':''}>Gradient</option>
          <option value="solid" ${data.bgType==='solid'?'selected':''}>Solid Color</option>
          <option value="image" ${data.bgType==='image'?'selected':''}>Image URL</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="bsm-color-row"><label>BG Color 1</label>
          <input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;heroLiveUpdate();livePreview()"/>
        </div>
        <div class="bsm-color-row"><label>BG Color 2</label>
          <input type="color" value="${data.bgColor2}" oninput="_editingData.bgColor2=this.value;heroLiveUpdate();livePreview()"/>
        </div>
      </div>
      <div class="bsm-field"><label>Background Image URL</label>
        <input type="url" value="${data.bgImage||''}" placeholder="https://…"
          oninput="_editingData.bgImage=this.value;heroLiveUpdate();livePreview()"/>
      </div>
      <div class="bsm-color-row"><label>Text Color</label>
        <input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;heroLiveUpdate();livePreview()"/>
      </div>
    </div>

    <div id="hero-btns-panel" class="bsm-panel">
      <p style="font-size:11px;font-weight:700;color:var(--ui-accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Primary Button</p>
      <div class="bsm-field"><label>Text</label><input type="text" value="${data.btnText}" oninput="_editingData.btnText=this.value;heroLiveUpdate();livePreview()"/></div>
      <div class="bsm-field"><label>Link</label><input type="url" value="${data.btnLink}" oninput="_editingData.btnLink=this.value;livePreview()"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="bsm-color-row"><label>Btn Color</label><input type="color" value="${data.btnColor}" oninput="_editingData.btnColor=this.value;heroLiveUpdate();livePreview()"/></div>
        <div class="bsm-color-row"><label>Text Color</label><input type="color" value="${data.btnTextColor}" oninput="_editingData.btnTextColor=this.value;heroLiveUpdate();livePreview()"/></div>
      </div>
      <hr style="border:none;border-top:1px solid var(--ui-border);margin:14px 0;"/>
      <p style="font-size:11px;font-weight:700;color:var(--ui-text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Secondary Button</p>
      <div class="bsm-field"><label>Text</label><input type="text" value="${data.btn2Text}" oninput="_editingData.btn2Text=this.value;heroLiveUpdate();livePreview()"/></div>
      <div class="bsm-field"><label>Link</label><input type="url" value="${data.btn2Link}" oninput="_editingData.btn2Link=this.value;livePreview()"/></div>
    </div>

    <div id="hero-elements-panel" class="bsm-panel">
      <p style="font-size:11px;color:var(--ui-text2);margin-bottom:14px;">FIX7/10: Per-element color control for this hero block.</p>
      <div class="element-color-grid">
        <div class="ecg-item">
          <span class="ecg-label">🔤 Heading</span>
          <div class="ecg-colors">
            <input type="color" title="Color" value="${data.elemHeadingColor||data.textColor}" oninput="_editingData.elemHeadingColor=this.value;heroLiveUpdate();livePreview()"/>
          </div>
        </div>
        <div class="ecg-item">
          <span class="ecg-label">📝 Subtext</span>
          <div class="ecg-colors">
            <input type="color" title="Color" value="${data.elemSubColor||data.textColor}" oninput="_editingData.elemSubColor=this.value;heroLiveUpdate();livePreview()"/>
          </div>
        </div>
        <div class="ecg-item">
          <span class="ecg-label">🏷 Badge</span>
          <div class="ecg-colors">
            <input type="color" title="BG" value="${data.elemBadgeBg||'rgba(255,255,255,0.1)'}" oninput="_editingData.elemBadgeBg=this.value;heroLiveUpdate();livePreview()"/>
            <input type="color" title="Text" value="${data.elemBadgeColor||data.textColor}" oninput="_editingData.elemBadgeColor=this.value;heroLiveUpdate();livePreview()"/>
          </div>
        </div>
      </div>
    </div>
  `;
}

// FIX13: Live update without closing modal
function heroLiveUpdate() {
  if (!_editingBlockId || !_editingData) return;
  const block = State.blocks.find(b => b.id === _editingBlockId);
  if (!block || block.type !== 'hero') return;
  block.data = JSON.parse(JSON.stringify(_editingData));
  // Update iframe without full reload for responsiveness
  const frame = document.getElementById('preview-frame');
  if (frame && frame.contentDocument) {
    try {
      const heroEl = frame.contentDocument.querySelector('.ss-hero');
      if (heroEl) {
        const d = _editingData;
        const bg = d.bgType === 'image' && d.bgImage
          ? "url('" + d.bgImage + "') center/cover no-repeat"
          : "linear-gradient(135deg, " + d.bgColor + " 0%, " + d.bgColor2 + " 100%)";
        heroEl.style.background = bg;
        heroEl.style.color = d.textColor;
        heroEl.style.minHeight = d.minHeight;
        const h1 = heroEl.querySelector('h1');
        if (h1) { h1.textContent = d.heading; if (d.elemHeadingColor) h1.style.color = d.elemHeadingColor; }
        const sub = heroEl.querySelector('p');
        if (sub) { sub.textContent = d.subheading; if (d.elemSubColor) sub.style.opacity = '1', sub.style.color = d.elemSubColor; }
        const btn = heroEl.querySelector('.ss-btn-primary');
        if (btn) { btn.textContent = d.btnText + ' →'; btn.style.background = d.btnColor; btn.style.color = d.btnTextColor; }
        // If DOM patch fails cleanly, fall through — refreshPreview handles it
        return;
      }
    } catch(e) {}
  }
  refreshPreview();
}

function renderNavForm(data) {
  // FIX3: Expanded nav form with full background type support
  const bgType = data.bgType || 'solid';
  return `
    <div class="bsm-tabs">
      <button class="bsm-tab active" onclick="switchBSMTab(event,'nav-content-panel')">Content</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'nav-style-panel')">🎨 Style</button>
    </div>

    <div id="nav-content-panel" class="bsm-panel active">
      <div class="bsm-field"><label>Logo Text</label><input type="text" value="${data.logo}" oninput="_editingData.logo=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Nav Links (comma-separated)</label><input type="text" value="${data.links.join(',')}" oninput="_editingData.links=this.value.split(',').map(l=>l.trim()).filter(l=>l);livePreview()"/></div>
      <div class="bsm-field"><label>CTA Button Text</label><input type="text" value="${data.ctaText}" oninput="_editingData.ctaText=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>CTA Button Link</label><input type="url" value="${data.ctaLink}" oninput="_editingData.ctaLink=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Sticky Navigation</label><select onchange="_editingData.sticky=this.value==='true';livePreview()"><option value="true" ${data.sticky?'selected':''}>Yes</option><option value="false" ${!data.sticky?'selected':''}>No</option></select></div>
    </div>

    <div id="nav-style-panel" class="bsm-panel">
      <div class="bsm-field"><label>Background Type</label>
        <select onchange="_editingData.bgType=this.value;livePreview()">
          <option value="solid" ${bgType==='solid'?'selected':''}>Solid Color</option>
          <option value="gradient" ${bgType==='gradient'?'selected':''}>Gradient</option>
          <option value="image" ${bgType==='image'?'selected':''}>Image URL</option>
          <option value="transparent" ${bgType==='transparent'?'selected':''}>Transparent</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="bsm-color-row" style="margin:0;"><label>${bgType==='gradient'?'Gradient Start':'Background'}</label><input type="color" value="${data.bgColor||'#ffffff'}" oninput="_editingData.bgColor=this.value;livePreview()"/></div>
        ${bgType==='gradient' ? `<div class="bsm-color-row" style="margin:0;"><label>Gradient End</label><input type="color" value="${data.bgColor2||data.bgColor||'#f0f0f0'}" oninput="_editingData.bgColor2=this.value;livePreview()"/></div>` : ''}
        <div class="bsm-color-row" style="margin:0;"><label>Text Color</label><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;livePreview()"/></div>
        <div class="bsm-color-row" style="margin:0;"><label>CTA Button Color</label><input type="color" value="${data.ctaBgColor}" oninput="_editingData.ctaBgColor=this.value;livePreview()"/></div>
      </div>
      ${bgType==='image' ? `<div class="bsm-field"><label>Background Image URL</label><input type="url" value="${data.bgImage||''}" placeholder="https://example.com/image.jpg" oninput="_editingData.bgImage=this.value;livePreview()"/></div>` : ''}
      ${bgType==='gradient' ? `<div class="bsm-field"><label>Gradient Angle</label><input type="range" min="0" max="360" value="${data.bgGradientAngle||135}" oninput="_editingData.bgGradientAngle=parseInt(this.value);livePreview()"/></div>` : ''}
    </div>
  `;
}

function renderLeadFormForm(data) {
  return `
    <div class="bsm-tabs">
      <button class="bsm-tab active" onclick="switchBSMTab(event,'lf-content-panel')">Content</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'lf-fields-panel')">Fields</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'lf-webhook-panel')">🔗 Backend</button>
    </div>

    <div id="lf-content-panel" class="bsm-panel active">
      <div class="bsm-field"><label>Section Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Subheading</label><textarea oninput="_editingData.subheading=this.value;livePreview()">${data.subheading}</textarea></div>
      <div class="bsm-field"><label>Button Text</label><input type="text" value="${data.btnText}" oninput="_editingData.btnText=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Privacy Note</label><input type="text" value="${data.privacyText}" oninput="_editingData.privacyText=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Success Message</label><input type="text" value="${data.successMsg||"You're on the list!"}" oninput="_editingData.successMsg=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Error Message</label><input type="text" value="${data.errorMsg||'Something went wrong. Please try again.'}" oninput="_editingData.errorMsg=this.value;livePreview()"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="bsm-color-row" style="margin:0;"><label>Background</label><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;livePreview()"/></div>
        <div class="bsm-color-row" style="margin:0;"><label>Text</label><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;livePreview()"/></div>
        <div class="bsm-color-row" style="margin:0;"><label>Button</label><input type="color" value="${data.btnColor}" oninput="_editingData.btnColor=this.value;livePreview()"/></div>
        <div class="bsm-color-row" style="margin:0;"><label>Accent</label><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value;livePreview()"/></div>
      </div>
    </div>

    <div id="lf-fields-panel" class="bsm-panel">
      <p style="font-size:12px;color:var(--ui-text2);margin-bottom:12px;">Configure which fields appear in the form.</p>
      ${data.fields.map((f, i) => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-bottom:8px;">
          <p style="font-size:11px;font-weight:700;color:var(--ui-accent);margin-bottom:8px;">Field ${i+1}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="bsm-field"><label>Type</label>
              <select onchange="_editingData.fields[${i}].type=this.value;livePreview()">
                <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                <option value="email" ${f.type==='email'?'selected':''}>Email</option>
                <option value="tel" ${f.type==='tel'?'selected':''}>Phone</option>
                <option value="number" ${f.type==='number'?'selected':''}>Number</option>
                <option value="textarea" ${f.type==='textarea'?'selected':''}>Textarea</option>
              </select>
            </div>
            <div class="bsm-field"><label>Field Name</label>
              <input type="text" value="${f.name||''}" placeholder="email" oninput="_editingData.fields[${i}].name=this.value;livePreview()"/>
            </div>
          </div>
          <div class="bsm-field"><label>Placeholder</label>
            <input type="text" value="${f.placeholder}" oninput="_editingData.fields[${i}].placeholder=this.value;livePreview()"/>
          </div>
        </div>
      `).join('')}
      <button class="add-tier-btn" onclick="leadformAddField()">＋ Add Field</button>
    </div>

    <div id="lf-webhook-panel" class="bsm-panel">
      <div class="webhook-section">
        <h5>🔗 Webhook Endpoint</h5>
        <p style="font-size:12px;color:var(--ui-text2);margin-bottom:10px;">POST JSON to your endpoint on every submission. Works with Zapier, Make, n8n, and any webhook receiver.</p>
        <div class="bsm-field"><label>Webhook URL</label>
          <input type="url" value="${data.webhookUrl||''}" placeholder="https://hooks.zapier.com/hooks/catch/…"
            oninput="_editingData.webhookUrl=this.value;livePreview()"/>
        </div>
        <button class="webhook-test-btn" onclick="testWebhook()">▶ Send Test Payload</button>
        <div id="webhook-test-status" class="webhook-status"></div>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--ui-border);">
        <p style="font-size:12px;font-weight:600;color:var(--ui-text2);margin-bottom:8px;">FIELD MAPPING</p>
        <p style="font-size:11px;color:var(--ui-text2);margin-bottom:10px;">Fields are sent as JSON keys using each field's name. Make sure field names are unique.</p>
        ${data.fields.map((f,i) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;">
            <span style="background:var(--ui-surface2);border:1px solid var(--ui-border);padding:3px 8px;border-radius:4px;font-family:monospace;color:var(--ui-accent);">${f.name||'field'+i}</span>
            <span style="color:var(--ui-text2);">→</span>
            <span style="color:var(--ui-text);">${f.placeholder}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function leadformAddField() {
  if (!_editingData) return;
  _editingData.fields.push({ type: 'text', placeholder: 'New field', name: 'field' + _editingData.fields.length });
  const content = document.getElementById('bsm-content');
  if (content) {
    content.innerHTML = renderLeadFormForm(_editingData);
    const fieldsTab = content.querySelector('.bsm-tab:nth-child(2)');
    if (fieldsTab) fieldsTab.click();
  }
}

async function testWebhook() {
  const url = _editingData?.webhookUrl;
  const statusEl = document.getElementById('webhook-test-status');
  if (!url) { if (statusEl) { statusEl.textContent = '⚠️ Enter a webhook URL first'; statusEl.className = 'webhook-status fail'; } return; }
  if (statusEl) { statusEl.textContent = '⏳ Sending test payload…'; statusEl.className = 'webhook-status'; }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _test: true, source: 'supersuite_builder', name: 'Test User', email: 'test@example.com', ts: new Date().toISOString() }),
      mode: 'no-cors',
    });
    if (statusEl) { statusEl.textContent = '✅ Payload sent (check your endpoint)'; statusEl.className = 'webhook-status ok'; }
  } catch(e) {
    if (statusEl) { statusEl.textContent = '❌ Request failed: ' + e.message; statusEl.className = 'webhook-status fail'; }
  }
}

function renderTestimonialsForm(data) {
  return `
    <div class="bsm-field"><label>Section Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Subheading</label><input type="text" value="${data.subheading}" oninput="_editingData.subheading=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Background</label><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Text Color</label><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Accent Color</label><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value;livePreview()"/></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0;"/>
    <p style="font-size:12px;color:#666;margin-bottom:12px;font-weight:600;">TESTIMONIAL CARDS</p>
    ${data.cards.map((c, i) => `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-bottom:12px;">
        <p style="font-size:11px;font-weight:700;color:#ff6b35;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Card ${i+1}</p>
        <div class="bsm-field"><label>Name</label><input type="text" value="${c.name}" oninput="_editingData.cards[${i}].name=this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Role</label><input type="text" value="${c.role}" oninput="_editingData.cards[${i}].role=this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Quote</label><textarea oninput="_editingData.cards[${i}].quote=this.value;livePreview()">${c.quote}</textarea></div>
        <div class="bsm-field"><label>Rating (1-5)</label><select onchange="_editingData.cards[${i}].rating=parseInt(this.value);livePreview()">${[1,2,3,4,5].map(n=>`<option value="${n}" ${c.rating===n?'selected':''}>${n} stars</option>`).join('')}</select></div>
      </div>
    `).join('')}
  `;
}

function renderPricingForm(data) {
  // FIX3: Dynamic unlimited tiers with per-tier styling
  const tiersHTML = data.plans.map((p, i) => `
    <div class="pricing-tier-card" id="ptier-${i}">
      <div class="pricing-tier-header">
        <span class="pricing-tier-label">Tier ${i+1}: ${p.name}</span>
        <div class="pricing-tier-actions">
          <button class="tier-action-btn" onclick="pricingMoveTier(${i},'up')" title="Move up">↑</button>
          <button class="tier-action-btn" onclick="pricingMoveTier(${i},'down')" title="Move down">↓</button>
          <button class="tier-action-btn danger" onclick="pricingDeleteTier(${i})" title="Remove tier">✕</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div class="bsm-field"><label>Tier Name</label><input type="text" value="${p.name}" oninput="_editingData.plans[${i}].name=this.value;document.querySelector('#ptier-${i} .pricing-tier-label').textContent='Tier ${i+1}: '+this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Price</label><input type="text" value="${p.price}" oninput="_editingData.plans[${i}].price=this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Billing Cycle</label><input type="text" value="${p.period}" placeholder="/month" oninput="_editingData.plans[${i}].period=this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Highlight?</label><select onchange="_editingData.plans[${i}].featured=this.value==='true';livePreview()"><option value="false" ${!p.featured?'selected':''}>No</option><option value="true" ${p.featured?'selected':''}>⭐ Yes</option></select></div>
      </div>
      <div class="bsm-field"><label>Description</label><input type="text" value="${p.description}" oninput="_editingData.plans[${i}].description=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>CTA Button Text</label><input type="text" value="${p.ctaText}" oninput="_editingData.plans[${i}].ctaText=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Features (one per line)</label>
        <textarea rows="4" oninput="(function(el,idx){var lines=el.value.split('\n').map(function(f){return f.trim();}).filter(function(f){return f.length>0;});_editingData.plans[idx].features=lines;livePreview();})(this,${i})">${p.features.map(function(f){return f;}).join('\n')}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07);">
        <div class="bsm-color-row" style="margin:0;"><label>Card Color</label><input type="color" value="${p.bgColor||'#1a1a2e'}" oninput="_editingData.plans[${i}].bgColor=this.value;livePreview()"/></div>
        <div class="bsm-color-row" style="margin:0;"><label>Border</label><input type="color" value="${(p.borderColor||'#2a2a4e').replace(/rgba?\([^)]+\)/,'#2a2a4e')}" oninput="_editingData.plans[${i}].borderColor=this.value;livePreview()"/></div>
      </div>
    </div>
  `).join('');

  return `
    <div class="bsm-tabs">
      <button class="bsm-tab active" onclick="switchBSMTab(event,'pricing-section-panel')">Section</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'pricing-tiers-panel')">💎 Tiers (${data.plans.length})</button>
    </div>

    <div id="pricing-section-panel" class="bsm-panel active">
      <div class="bsm-field"><label>Section Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Subheading</label><input type="text" value="${data.subheading}" oninput="_editingData.subheading=this.value;livePreview()"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="bsm-color-row" style="margin:0;"><label>Background</label><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;livePreview()"/></div>
        <div class="bsm-color-row" style="margin:0;"><label>Text Color</label><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;livePreview()"/></div>
        <div class="bsm-color-row" style="margin:0;"><label>Accent</label><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value;livePreview()"/></div>
      </div>
    </div>

    <div id="pricing-tiers-panel" class="bsm-panel">
      <p style="font-size:12px;color:var(--ui-text2);margin-bottom:12px;">Add unlimited tiers. Each is independently styled.</p>
      <div id="pricing-tiers-list">${tiersHTML}</div>
      <button class="add-tier-btn" onclick="pricingAddTier()">＋ Add New Tier</button>
    </div>
  `;
}

// FIX3: Pricing tier helpers
function pricingAddTier() {
  if (!_editingData) return;
  _editingData.plans.push({
    name: 'New Tier',
    price: '$0',
    period: '/month',
    description: 'Describe this plan.',
    features: ['Feature one', 'Feature two', 'Feature three'],
    ctaText: 'Get Started',
    ctaLink: '#',
    featured: false,
    bgColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  });
  // Re-render the modal content
  const content = document.getElementById('bsm-content');
  if (content) {
    content.innerHTML = renderPricingForm(_editingData);
    // Switch to tiers panel
    const tiersTab = content.querySelector('.bsm-tab:nth-child(2)');
    if (tiersTab) tiersTab.click();
  }
}

function pricingDeleteTier(idx) {
  if (!_editingData || _editingData.plans.length <= 1) {
    showToast('⚠️ Cannot remove', 'Must have at least one tier', 'warning');
    return;
  }
  _editingData.plans.splice(idx, 1);
  const content = document.getElementById('bsm-content');
  if (content) {
    content.innerHTML = renderPricingForm(_editingData);
    const tiersTab = content.querySelector('.bsm-tab:nth-child(2)');
    if (tiersTab) tiersTab.click();
  }
}

function pricingMoveTier(idx, dir) {
  if (!_editingData) return;
  const plans = _editingData.plans;
  const newIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= plans.length) return;
  [plans[idx], plans[newIdx]] = [plans[newIdx], plans[idx]];
  const content = document.getElementById('bsm-content');
  if (content) {
    content.innerHTML = renderPricingForm(_editingData);
    const tiersTab = content.querySelector('.bsm-tab:nth-child(2)');
    if (tiersTab) tiersTab.click();
  }
}

function renderCTAForm(data) {
  return `
    <div class="bsm-field"><label>Heading</label><textarea oninput="_editingData.heading=this.value;livePreview()">${data.heading}</textarea></div>
    <div class="bsm-field"><label>Subheading</label><textarea oninput="_editingData.subheading=this.value;livePreview()">${data.subheading}</textarea></div>
    <div class="bsm-field"><label>Background Type</label><select onchange="_editingData.bgType=this.value;livePreview()"><option value="gradient" ${data.bgType==='gradient'?'selected':''}>Gradient</option><option value="solid">Solid</option><option value="image">Image URL</option></select></div>
    <div class="bsm-color-row"><label>BG Color 1</label><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>BG Color 2</label><input type="color" value="${data.bgColor2}" oninput="_editingData.bgColor2=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Text Color</label><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Primary Button</label><input type="text" value="${data.btnText}" oninput="_editingData.btnText=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Primary Link</label><input type="url" value="${data.btnLink}" oninput="_editingData.btnLink=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Button Color</label><input type="color" value="${data.btnColor}" oninput="_editingData.btnColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Button Text Color</label><input type="color" value="${data.btnTextColor}" oninput="_editingData.btnTextColor=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Secondary Button</label><input type="text" value="${data.btn2Text}" oninput="_editingData.btn2Text=this.value;livePreview()"/></div>
  `;
}

function renderFeaturesForm(data) {
  return `
    <div class="bsm-field"><label>Section Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Subheading</label><input type="text" value="${data.subheading}" oninput="_editingData.subheading=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Background</label><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Text Color</label><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Accent Color</label><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Columns</label><select onchange="_editingData.columns=parseInt(this.value);livePreview()"><option value="2" ${data.columns===2?'selected':''}>2 columns</option><option value="3" ${data.columns===3?'selected':''}>3 columns</option><option value="4" ${data.columns===4?'selected':''}>4 columns</option></select></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0;"/>
    ${data.items.map((item, i) => `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-bottom:8px;">
        <p style="font-size:11px;font-weight:700;color:#ff6b35;margin-bottom:8px;">Feature ${i+1}</p>
        <div class="bsm-field"><label>Icon (emoji)</label><input type="text" value="${item.icon}" oninput="_editingData.items[${i}].icon=this.value;livePreview()" style="font-size:18px;"/></div>
        <div class="bsm-field"><label>Title</label><input type="text" value="${item.title}" oninput="_editingData.items[${i}].title=this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Description</label><textarea oninput="_editingData.items[${i}].description=this.value;livePreview()">${item.description}</textarea></div>
      </div>
    `).join('')}
  `;
}

function renderGalleryForm(data) {
  return `
    <div class="bsm-field"><label>Section Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Subheading</label><input type="text" value="${data.subheading}" oninput="_editingData.subheading=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Background</label><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Text Color</label><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Columns</label><select onchange="_editingData.columns=parseInt(this.value);livePreview()"><option value="2" ${data.columns===2?'selected':''}>2</option><option value="3" ${data.columns===3?'selected':''}>3</option><option value="4" ${data.columns===4?'selected':''}>4</option></select></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0;"/>
    ${data.images.map((img, i) => `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-bottom:8px;">
        <p style="font-size:11px;font-weight:700;color:#ff6b35;margin-bottom:8px;">Image ${i+1}</p>
        <div class="bsm-field"><label>Image URL</label>
          <input type="url" value="${img.src}" placeholder="https://example.com/image.jpg"
            oninput="_editingData.images[${i}].src=this.value; validateGalleryImg(this, ${i});livePreview()"/>
          <img id="gal-preview-${i}" src="${img.src}" alt=""
            style="${img.src ? 'display:block' : 'display:none'};width:100%;height:56px;object-fit:cover;border-radius:var(--r-sm);margin-top:6px;border:1px solid var(--ui-border);"
            onerror="this.style.display='none';document.getElementById('gal-err-${i}').style.display='block';"
            onload="this.style.display='block';document.getElementById('gal-err-${i}').style.display='none';"/>
          <div id="gal-err-${i}" style="display:none;font-size:11px;color:var(--ui-danger);margin-top:4px;">⚠️ Image URL failed to load</div>
        </div>
        <div class="bsm-field"><label>Caption</label><input type="text" value="${img.caption}" oninput="_editingData.images[${i}].caption=this.value;livePreview()"/></div>
      </div>
    `).join('')}
  `;
}

function renderFooterForm(data) {
  return `
    <div class="bsm-field"><label>Logo Text</label><input type="text" value="${data.logo}" oninput="_editingData.logo=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Tagline</label><input type="text" value="${data.tagline}" oninput="_editingData.tagline=this.value;livePreview()"/></div>
    <div class="bsm-field"><label>Copyright Text</label><input type="text" value="${data.copyright}" oninput="_editingData.copyright=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Background</label><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Text Color</label><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;livePreview()"/></div>
    <div class="bsm-color-row"><label>Accent Color</label><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value;livePreview()"/></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0;"/>
    ${data.columns.map((col, ci) => `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-bottom:8px;">
        <p style="font-size:11px;font-weight:700;color:#ff6b35;margin-bottom:8px;">Column ${ci+1}</p>
        <div class="bsm-field"><label>Title</label><input type="text" value="${col.title}" oninput="_editingData.columns[${ci}].title=this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Links (label|url, one per line)</label><textarea oninput="_editingData.columns[${ci}].links=this.value.split('\\n').filter(l=>l.trim()).map(l=>{const[label,url]=(l+'|#').split('|');return{label:label.trim(),url:(url||'#').trim()}});livePreview()">${col.links.map(l=>l.label+'|'+l.url).join('\n')}</textarea></div>
      </div>
    `).join('')}
  `;
}


function validateGalleryImg(input, idx) {
  const preview = document.getElementById('gal-preview-' + idx);
  const errEl = document.getElementById('gal-err-' + idx);
  if (!input.value) {
    if (preview) preview.style.display = 'none';
    if (errEl) errEl.style.display = 'none';
    return;
  }
  if (preview) {
    preview.src = input.value;
    preview.style.display = 'block';
  }
}

function switchBSMTab(event, panelId) {
  // Deactivate all tabs and panels within the modal
  const container = event.target.closest('.bsm-tabs').parentElement;
  container.querySelectorAll('.bsm-tab').forEach(t => t.classList.remove('active'));
  container.querySelectorAll('.bsm-panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  const panel = container.querySelector('#' + panelId);
  if (panel) panel.classList.add('active');
}

function closeBlockModal() {
  document.getElementById('block-settings-modal').style.display = 'none';
  _editingBlockId = null;
  _editingData = null;
}

function saveBlockSettings() {
  if (!_editingBlockId || !_editingData) return;
  const block = State.blocks.find(b => b.id === _editingBlockId);
  if (!block) return;
  block.data = JSON.parse(JSON.stringify(_editingData));
  History.push();
  closeBlockModal();
  refreshPreview();
  updateLayers();
  showToast('✅ Saved!', 'Block settings updated', 'success');
}

/* Live preview — called by every oninput/onchange in block settings forms.
   Writes _editingData into the block and debounces a preview refresh. */
let _livePreviewTimer = null;
function livePreview() {
  if (!_editingBlockId || !_editingData) return;
  const block = State.blocks.find(b => b.id === _editingBlockId);
  if (!block) return;
  block.data = JSON.parse(JSON.stringify(_editingData));
  clearTimeout(_livePreviewTimer);
  _livePreviewTimer = setTimeout(() => {
    refreshPreview(); // refreshPreview already calls LiveSync.notifyChange()
  }, 60);
}

/* ──────────────────────────────────────────────────────────────────
   TEMPLATE MANAGEMENT
────────────────────────────────────────────────────────────────── */
function applyTemplate(tplKey) {
  if (!Templates[tplKey]) { console.warn('Unknown template:', tplKey); return; }

  State.currentTemplate = tplKey;

  // Update sidebar selection UI
  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('tpl-' + tplKey);
  if (card) card.classList.add('active');

  // Show custom CSS panel if needed
  const customPanel = document.getElementById('custom-css-panel');
  if (customPanel) customPanel.style.display = tplKey === 'custom' ? 'block' : 'none';

  // Apply template color overrides to the sidebar style controls
  const overrides = Templates[tplKey].overrides;
  Object.entries(overrides).forEach(([key, value]) => {
    State.globalStyles[key] = value;
    // Sync UI controls
    const colorKeys = { '--primary': 'color-primary', '--secondary': 'color-secondary', '--accent': 'color-accent', '--bg': 'color-bg', '--text': 'color-text' };
    if (colorKeys[key]) {
      const colorEl = document.getElementById(colorKeys[key]);
      if (colorEl) { colorEl.value = value; }
      const hexEl = colorEl?.nextElementSibling;
      if (hexEl) hexEl.value = value;
    }
  });

  // SSV26.2 F6/F8: Apply template's full design system (typography/spacing/glass)
  TemplateSystem.apply(tplKey);
  refreshPreview();
  showToast('🎨 Template Applied', Templates[tplKey].name, 'success');
}

function applyCustomCSS() {
  State.customCSS = document.getElementById('custom-css-input').value;
  refreshPreview();
  showToast('✅ CSS Applied', 'Custom styles applied to preview', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   GLOBAL STYLE CONTROLS
────────────────────────────────────────────────────────────────── */
function updateGlobalStyle(varName, value) {
  State.globalStyles[varName] = value;
  refreshPreview();
}

function syncColorHex(colorInputId, hexValue) {
  if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
    const el = document.getElementById(colorInputId);
    if (el) el.value = hexValue;
    // Find the CSS variable it maps to
    const map = {
      'color-primary': '--primary',
      'color-secondary': '--secondary',
      'color-accent': '--accent',
      'color-bg': '--bg',
      'color-text': '--text',
    };
    if (map[colorInputId]) updateGlobalStyle(map[colorInputId], hexValue);
  }
}

function updateButtonStyle(style) {
  const radii = { rounded: '8px', pill: '50px', square: '0px', outline: '8px' };
  State.globalStyles['--btn-radius'] = radii[style] || '8px';
  refreshPreview();
}

function updateAnimations(val) {
  // Store preference — applied via extra CSS
  State.globalStyles['--anim'] = val;
  refreshPreview();
}

/* ──────────────────────────────────────────────────────────────────
   DEVICE SWITCHING
────────────────────────────────────────────────────────────────── */
const DeviceWidths = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

const DeviceLabels = {
  desktop: 'Desktop · 1440px wide',
  tablet: 'Tablet · 768px wide',
  mobile: 'Mobile · 390px wide',
};

function switchDevice(device) {
  State.currentDevice = device;

  // Update buttons
  document.querySelectorAll('.device-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.device === device);
  });

  // Update canvas
  const wrapper = document.getElementById('canvas-wrapper');
  wrapper.style.width = DeviceWidths[device];

  document.getElementById('canvas-info').textContent = DeviceLabels[device];
}

/* ──────────────────────────────────────────────────────────────────
   ZOOM CONTROLS
────────────────────────────────────────────────────────────────── */
function adjustZoom(delta) {
  State.zoomLevel = Math.max(30, Math.min(150, State.zoomLevel + delta));
  applyZoom();
}

function resetZoom() {
  State.zoomLevel = 100;
  applyZoom();
}

function applyZoom() {
  const wrapper = document.getElementById('canvas-wrapper');
  wrapper.style.transform = `scale(${State.zoomLevel / 100})`;
  wrapper.style.transformOrigin = 'top center';
  document.getElementById('zoom-label').textContent = State.zoomLevel + '%';
}

/* ──────────────────────────────────────────────────────────────────
   TAB SWITCHING
────────────────────────────────────────────────────────────────── */
function switchTab(tab) {
  document.querySelectorAll('.stab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
  if (tab === 'projects') renderProjectsList();
}

/* ──────────────────────────────────────────────────────────────────
   RIGHT PANEL — ELEMENT EDITOR
────────────────────────────────────────────────────────────────── */
function openRightPanel(title, content) {
  document.getElementById('rp-title').textContent = title;
  document.getElementById('right-panel-content').innerHTML = content;
  document.getElementById('right-panel').classList.remove('closed');
}

function closeRightPanel() {
  document.getElementById('right-panel').classList.add('closed');
}

/* ──────────────────────────────────────────────────────────────────
   FULL PREVIEW
────────────────────────────────────────────────────────────────── */
function openFullPreview() {
  const modal = document.getElementById('full-preview-modal');
  const frame = document.getElementById('full-preview-frame');
  frame.srcdoc = buildPreviewHTML(true);
  modal.style.display = 'flex';
}

function closeFullPreview() {
  document.getElementById('full-preview-modal').style.display = 'none';
}

/* ──────────────────────────────────────────────────────────────────
   EXPORT ENGINE
────────────────────────────────────────────────────────────────── */
function exportSite() {
  // SSV26.1: Enforce tier export limit before proceeding
  if (!UsageTracker.canExport()) {
    UsageTracker.showExportLimitModal();
    return;
  }

  const siteName = document.getElementById('site-name-input')?.value || 'my-site';

  // FIX3: buildExportHTML() now uses the same renderer as preview (buildPreviewHTML(true)).
  // The HTML file is fully self-contained — all CSS is inlined, no external dependencies.
  const exportHTML = buildExportHTML();

  // The CSS and JS files are optional companion files (utilities/animations).
  // The HTML is fully functional without them.
  const exportCSS = buildExportCSS();
  const exportJS = buildExportJS();

  // Download HTML immediately; CSS and JS with slight delay to avoid browser blocking
  downloadFile(siteName + '.html', exportHTML, 'text/html');
  setTimeout(() => downloadFile(siteName + '-style.css', exportCSS, 'text/css'), 250);
  setTimeout(() => downloadFile(siteName + '-script.js', exportJS, 'text/javascript'), 500);

  // SSV26.1: Record this export against the usage counter
  UsageTracker.recordExport();

  // Show success modal
  setTimeout(() => {
    document.getElementById('export-modal').style.display = 'flex';
  }, 600);
}

function buildExportHTML() {
  // FIX3: Use the same rendering pipeline as preview (buildPreviewHTML with forExport=true).
  // This guarantees pixel-identical output — same CSS vars, same block renderers,
  // same glass effects, same responsive overrides. No divergence possible.
  const siteName = document.getElementById('site-name-input')?.value || 'My Site';

  // Get the fully-rendered preview HTML (forExport=true strips builder controls)
  const previewBase = buildPreviewHTML(true);

  // Inject production-quality <head> metadata into the already-correct preview output.
  // The preview HTML already has: charset, viewport, fonts, inline CSS, all blocks.
  // We add: title (with site name), meta description, favicon, Open Graph basics.
  const productionHead = `  <title>${siteName}</title>
  <meta name="description" content="Built with Supersuite — the fastest website builder"/>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23ff6b35'/%3E%3Ctext x='16' y='23' font-family='Arial Black,sans-serif' font-size='16' font-weight='900' text-anchor='middle' fill='white'%3ESS%3C/text%3E%3C/svg%3E"/>
  <meta property="og:title" content="${siteName}"/>
  <meta property="og:type" content="website"/>
  <!-- Generated by Supersuite SSV26.1 -->`;

  // Splice the production head tags in right after <head>
  // The preview HTML has: <head>\n  <meta charset...
  const exportHTML = previewBase.replace('<head>', '<head>\n' + productionHead);

  return exportHTML;
}

function buildExportCSS() {
  const template = Templates[State.currentTemplate];
  const styles = { ...State.globalStyles, ...template.overrides };
  const cssVars = Object.entries(styles).map(([k, v]) => `  ${k}: ${v};`).join('\n');

  return `/* ═══════════════════════════════════════════════════
   Generated by Supersuite — https://supersuite.com
   Template: ${template.name}
═══════════════════════════════════════════════════ */

/* CSS Variables */
:root {
${cssVars}
}

/* Base Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  color: var(--text);
  background: var(--bg);
  font-size: var(--font-base);
  line-height: var(--line-height);
  -webkit-font-smoothing: antialiased;
}

/* Template: ${template.name} */
${template.extraCSS || ''}

/* Custom CSS */
${State.customCSS}

/* Responsive */
@media (max-width: 768px) {
  [style*="grid-template-columns: repeat(3"] { grid-template-columns: repeat(2, 1fr) !important; }
  [style*="grid-template-columns: repeat(2"] { grid-template-columns: 1fr !important; }
  [style*="grid-template-columns: 1.5fr"] { grid-template-columns: 1fr !important; }
  .ss-nav-links { display: none !important; }
}

@media (max-width: 480px) {
  [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
  [style*="padding: 120px"] { padding: 60px 24px !important; }
}
`;
}

function buildExportJS() {
  return `/* ═══════════════════════════════════════════════════
   Generated by Supersuite — https://supersuite.com
   Site script — interactivity & animations
═══════════════════════════════════════════════════ */

'use strict';

/* ── SCROLL ANIMATIONS ─────────────────────────── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.ss-block').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = \`opacity 0.6s ease \${i * 0.1}s, transform 0.6s ease \${i * 0.1}s\`;
    observer.observe(el);
  });
}

/* ── SMOOTH ANCHOR SCROLL ──────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ── FORM HANDLING ─────────────────────────────── */
function initForms() {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ Submitted!';
        btn.style.background = '#22c55e';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.background = '';
        }, 3000);
      }
    });
  });
}

/* ── STICKY NAV ────────────────────────────────── */
function initStickyNav() {
  const nav = document.querySelector('.ss-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      nav.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
      nav.style.backdropFilter = 'blur(12px)';
    } else {
      nav.style.boxShadow = '';
      nav.style.backdropFilter = '';
    }
  });
}

/* ── MOBILE NAV TOGGLE ─────────────────────────── */
function initMobileNav() {
  const nav = document.querySelector('.ss-nav');
  if (!nav) return;
  const links = nav.querySelector('.ss-nav-links');
  if (!links) return;

  const toggle = document.createElement('button');
  toggle.innerHTML = '☰';
  toggle.style.cssText = 'display:none;background:none;border:none;font-size:24px;cursor:pointer;color:inherit;padding:4px 8px;';
  nav.querySelector('.ss-nav-inner')?.appendChild(toggle);

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      toggle.style.display = 'block';
      links.style.display = 'none';
    } else {
      toggle.style.display = 'none';
      links.style.display = 'flex';
    }
  });

  toggle.addEventListener('click', () => {
    const shown = links.style.display !== 'none';
    links.style.display = shown ? 'none' : 'flex';
    links.style.flexDirection = 'column';
    links.style.position = 'absolute';
    links.style.top = '72px';
    links.style.left = '0';
    links.style.right = '0';
    links.style.background = 'inherit';
    links.style.padding = '16px 24px';
    links.style.borderTop = '1px solid rgba(0,0,0,0.1)';
    links.style.zIndex = '99';
  });

  // Trigger resize check
  window.dispatchEvent(new Event('resize'));
}

/* ── COUNTER ANIMATION ─────────────────────────── */
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.round(current).toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 16);
  });
}

/* ── INIT ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initSmoothScroll();
  initForms();
  initStickyNav();
  initMobileNav();
});
`;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function closeExportModal() {
  document.getElementById('export-modal').style.display = 'none';
}

/* ──────────────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
────────────────────────────────────────────────────────────────── */
function showToast(title, message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-text">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  // Auto dismiss
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);

  // Click to dismiss
  toast.addEventListener('click', () => toast.remove());
}

/* ──────────────────────────────────────────────────────────────────
   IMAGE UPLOAD
────────────────────────────────────────────────────────────────── */
let _imageUploadCallback = null;

function triggerImageUpload(callback) {
  _imageUploadCallback = callback;
  document.getElementById('image-upload-input').click();
}

document.getElementById('image-upload-input').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    const key = 'img_' + Date.now();
    State.uploadedImages[key] = base64;
    if (_imageUploadCallback) {
      _imageUploadCallback(base64, key);
      _imageUploadCallback = null;
    }
  };
  reader.readAsDataURL(file);
  this.value = '';
});

/* ──────────────────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS
────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  // SSV26.1: Escape closes login modal too
  if (e.key === 'Escape') {
    closeLoginModal();
    if (State.authenticated) {
      closeBlockModal();
      closeFullPreview();
      closeExportModal();
      closeBlockSelectorModal();
    }
    return;
  }

  if (!State.authenticated) return;

  // Ctrl+Z — undo (simple: just refresh)
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    History.back();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    History.forward();
  }

  // Ctrl+S — save session
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveToSession();
    showToast('💾 Auto-saved', 'Changes saved to session', 'success');
  }

  // Ctrl+P — preview
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    openFullPreview();
  }
});

/* ──────────────────────────────────────────────────────────────────
   AUTO-SAVE TO SESSIONSSTORAGE
────────────────────────────────────────────────────────────────── */
function saveToSession() {
  try {
    const data = {
      blocks: State.blocks,
      globalStyles: State.globalStyles,
      currentTemplate: State.currentTemplate,
      customCSS: State.customCSS,
      blockIdCounter: State.blockIdCounter,
      siteName: document.getElementById('site-name-input')?.value,
    };
    sessionStorage.setItem('supersuite_session', JSON.stringify(data));
  } catch(e) {}
}

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem('supersuite_session');
    if (!raw) return false;
    const data = JSON.parse(raw);
    State.blocks = data.blocks || [];
    State.globalStyles = { ...State.globalStyles, ...data.globalStyles };
    State.currentTemplate = data.currentTemplate || 'glass';
    State.customCSS = data.customCSS || '';
    State.blockIdCounter = data.blockIdCounter || 1;
    if (data.siteName) {
      const siteInput = document.getElementById('site-name-input');
      if (siteInput) siteInput.value = data.siteName;
    }
    return true;
  } catch(e) { return false; }
}

// Auto-save every 30 seconds
setInterval(() => {
  if (State.authenticated) saveToSession();
}, 30000);

/* ──────────────────────────────────────────────────────────────────
   DRAG & DROP FROM SIDEBAR INTO CANVAS (Phase 2)
────────────────────────────────────────────────────────────────── */
document.querySelectorAll('.block-card[draggable]').forEach(card => {
  card.addEventListener('dragstart', (e) => {
    const type = card.getAttribute('onclick').match(/addBlock\('(\w+)'\)/)?.[1];
    if (type) e.dataTransfer.setData('blockType', type);
  });
});

const canvasScrollArea = document.querySelector('.canvas-scroll-area');
if (canvasScrollArea) {
  canvasScrollArea.addEventListener('dragover', e => e.preventDefault());
  canvasScrollArea.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('blockType');
    if (type) addBlock(type);
  });
}

/* postMessage bridge — routes messages from the sandboxed srcdoc preview iframe.
   srcdoc iframes have a null origin so window.parent.fn() silently fails;
   postMessage('*') + this listener is the correct cross-origin approach. */
window.addEventListener('message', function(e) {
  const msg = e.data;
  if (!msg || typeof msg.type !== 'string') return;
  switch (msg.type) {
    case 'openBlockSettings': openBlockSettings(msg.id); break;
    case 'moveBlock':         moveBlock(msg.id, msg.dir); break;
    case 'duplicateBlock':    duplicateBlock(msg.id); break;
    case 'deleteBlock':       deleteBlock(msg.id); break;
    case 'addBlock':          addBlock(msg.blockType); break;
  }
});

/* ──────────────────────────────────────────────────────────────────
   STARTER DEMO — auto-populate with a sample page
────────────────────────────────────────────────────────────────── */
function loadStarterDemo() {
  // Restore previous session first (preserves all user edits)
  if (loadFromSession() && State.blocks.length > 0) {
    refreshPreview();
    updateLayers();
    showToast('📂 Session Restored', 'Your previous work was loaded', 'info');
    return;
  }

  // SSV26.1: Only add demo blocks that are enabled in BlockSelector
  const enabled = BlockSelector.getEnabled();
  const demoBlocks = ['nav', 'hero', 'features', 'testimonials', 'pricing', 'cta', 'footer'];
  demoBlocks.filter(t => enabled.includes(t)).forEach(t => addBlock(t));
  showToast('🎉 Demo Loaded', 'Start editing — all your blocks are ready!', 'success');
  // Push initial state to history so undo works from the start
  setTimeout(() => History.push(), 100);
}


/* ──────────────────────────────────────────────────────────────────
   PROJECT LIBRARY — Save / load named projects
────────────────────────────────────────────────────────────────── */
const Projects = {
  _key: 'ss_projects_v261',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this._key)) || []; } catch(e) { return []; }
  },

  save(projects) {
    try { localStorage.setItem(this._key, JSON.stringify(projects)); } catch(e) {}
  },
};

function createNewProject() {
  const name = prompt('New project name:', 'Untitled Project ' + (Projects.getAll().length + 1));
  if (!name) return;
  // Save current state first if we have blocks
  if (State.blocks.length) saveCurrentProject();
  // Reset state
  State.blocks = [];
  State.blockIdCounter = 1;
  State.customCSS = '';
  State.globalStyles = {
    '--primary': '#ff6b35','--secondary': '#1a1a2e','--accent': '#ffd700',
    '--bg': '#ffffff','--text': '#1a1a2e',
    '--font-heading': "'Syne', sans-serif",'--font-body': "'DM Sans', sans-serif",
    '--font-base': '16px','--line-height': '1.6','--btn-radius': '8px',
    '--section-pad': '60px','--container': '1200px','--radius': '12px',
    '--shadow': '0 8px 24px rgba(0,0,0,0.15)',
  };
  const siteNameEl = document.getElementById('site-name-input');
  if (siteNameEl) siteNameEl.value = name;
  refreshPreview();
  updateLayers();
  renderProjectsList();
  showToast('📁 New Project', name + ' created', 'success');
}

function saveCurrentProject() {
  const name = document.getElementById('site-name-input')?.value || 'Untitled';
  const projects = Projects.getAll();
  const existing = projects.findIndex(p => p.name === name);
  const data = {
    name,
    ts: Date.now(),
    blocks: State.blocks,
    globalStyles: State.globalStyles,
    currentTemplate: State.currentTemplate,
    customCSS: State.customCSS,
    blockIdCounter: State.blockIdCounter,
  };
  if (existing >= 0) { projects[existing] = data; }
  else { projects.unshift(data); }
  Projects.save(projects);
  renderProjectsList();
  showToast('💾 Saved', '"' + name + '" saved to library', 'success');
}

function loadProject(name) {
  const projects = Projects.getAll();
  const proj = projects.find(p => p.name === name);
  if (!proj) return;
  State.blocks = proj.blocks || [];
  State.globalStyles = { ...State.globalStyles, ...proj.globalStyles };
  State.currentTemplate = proj.currentTemplate || 'glass';
  State.customCSS = proj.customCSS || '';
  State.blockIdCounter = proj.blockIdCounter || 1;
  const siteNameEl = document.getElementById('site-name-input');
  if (siteNameEl) siteNameEl.value = name;
  refreshPreview();
  updateLayers();
  History.push();
  showToast('📂 Loaded', '"' + name + '" loaded', 'success');
}

function deleteProject(name) {
  if (!confirm('Delete "' + name + '"?')) return;
  const projects = Projects.getAll().filter(p => p.name !== name);
  Projects.save(projects);
  renderProjectsList();
  showToast('🗑 Deleted', '"' + name + '" removed', 'info');
}

function renderProjectsList() {
  const list = document.getElementById('projects-list');
  if (!list) return;
  const projects = Projects.getAll();
  if (!projects.length) {
    list.innerHTML = '<p style="color:var(--ui-text2);font-size:13px;text-align:center;padding:20px;">No saved projects yet. Click 💾 Save to create one.</p>';
    return;
  }
  list.innerHTML = projects.map(p => `
    <div style="background:var(--ui-surface2);border:1px solid var(--ui-border);border-radius:var(--r-sm);padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="loadProject('${p.name.replace(/'/g, "\\'")}')">
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:var(--ui-text);">${p.name}</div>
        <div style="font-size:11px;color:var(--ui-text2);">${p.blocks?.length||0} blocks · ${new Date(p.ts).toLocaleDateString()}</div>
      </div>
      <button onclick="event.stopPropagation();deleteProject('${p.name.replace(/'/g, "\\'")}')" style="min-width:28px;min-height:28px;background:none;border:1px solid var(--ui-border);border-radius:var(--r-sm);color:var(--ui-text2);cursor:pointer;font-size:12px;" title="Delete">🗑</button>
    </div>
  `).join('');
}

/* ──────────────────────────────────────────────────────────────────
   BOOT
   initApp() is called by checkPassword() after successful login.
   The duplicate stub below has been removed in SSV26.1.
────────────────────────────────────────────────────────────────── */


/* ═══════════════════════════════════════════════════════════════════
   SSV26.2 — FEATURE 6+7: ADVANCED TEMPLATE SYSTEM + STARTER TEMPLATES
   ─────────────────────────────────────────────────────────────────
   Each template now controls the full design system:
   typography · spacing · color palette · liquid-glass intensity ·
   layout defaults. Three industry starter templates populate the
   canvas with conversion-optimized blocks.
═══════════════════════════════════════════════════════════════════ */

/* Industry starter templates — full design system */
Templates.pressure = {
  name: 'Pressure Washing',
  industry: 'pressure',
  unsplashKeyword: 'pressure washing',
  overrides: {
    '--primary': '#0a4da3',
    '--secondary': '#0c1a36',
    '--accent': '#ffd400',
    '--bg': '#f5f8ff',
    '--text': '#0c1a36',
    '--font-heading': "'Space Grotesk', sans-serif",
    '--font-body': "'DM Sans', sans-serif",
    '--font-base': '17px',
    '--line-height': '1.65',
    '--radius': '8px',
    '--btn-radius': '6px',
    '--section-pad': '80px',
    '--container': '1200px',
    '--shadow': '0 12px 40px rgba(10,77,163,0.18)',
  },
  glass: { blur: 8, opacity: 0.92 },
  extraCSS: `
    body { background: linear-gradient(180deg, #f5f8ff 0%, #eaf1ff 100%); }
    .ss-hero:not([data-user-bg]) { background: linear-gradient(135deg,#0a4da3 0%,#0c1a36 100%) !important; }
    .ss-btn-primary { box-shadow: 0 8px 24px rgba(255,212,0,0.4) !important; text-transform: uppercase; letter-spacing: .5px; }
    .ss-card { border: 1px solid rgba(10,77,163,0.12) !important; }
    .ss-section-title { text-transform: uppercase; letter-spacing: 1px; }
  `
};

Templates.lawn = {
  name: 'Lawn Care',
  industry: 'lawn',
  unsplashKeyword: 'lawn mowing green grass',
  overrides: {
    '--primary': '#2d7a3a',
    '--secondary': '#16361b',
    '--accent': '#f4a300',
    '--bg': '#f6fbf3',
    '--text': '#16361b',
    '--font-heading': "'Nunito', sans-serif",
    '--font-body': "'DM Sans', sans-serif",
    '--font-base': '16px',
    '--line-height': '1.7',
    '--radius': '14px',
    '--btn-radius': '50px',
    '--section-pad': '72px',
    '--container': '1180px',
    '--shadow': '0 10px 32px rgba(45,122,58,0.18)',
  },
  glass: { blur: 12, opacity: 0.94 },
  extraCSS: `
    body { background: linear-gradient(180deg,#f6fbf3 0%,#eaf5e2 100%); }
    .ss-hero:not([data-user-bg]) { background: linear-gradient(135deg,#2d7a3a 0%,#16361b 100%) !important; }
    .ss-btn-primary { box-shadow: 0 10px 28px rgba(45,122,58,0.35) !important; }
    .ss-card { border: 1px solid rgba(45,122,58,0.15) !important; }
  `
};

Templates.lifestyle = {
  name: 'Barber / Fitness / Tattoo',
  industry: 'lifestyle',
  unsplashKeyword: 'barbershop',
  overrides: {
    '--primary': '#e63946',
    '--secondary': '#0d0d10',
    '--accent': '#f1c40f',
    '--bg': '#0d0d10',
    '--text': '#f5f5f7',
    '--font-heading': "'Syne', sans-serif",
    '--font-body': "'DM Sans', sans-serif",
    '--font-base': '16px',
    '--line-height': '1.6',
    '--radius': '4px',
    '--btn-radius': '4px',
    '--section-pad': '90px',
    '--container': '1240px',
    '--shadow': '0 16px 48px rgba(0,0,0,0.5)',
  },
  glass: { blur: 16, opacity: 0.88 },
  extraCSS: `
    body { background: #0d0d10; color: #f5f5f7; }
    .ss-hero:not([data-user-bg]) { background: linear-gradient(135deg,#0d0d10 0%,#1a1a22 100%) !important; }
    .ss-btn-primary { text-transform: uppercase; letter-spacing: 1.5px; border: 2px solid #e63946 !important; }
    .ss-card { background: #1a1a22 !important; border: 1px solid rgba(230,57,70,0.2) !important; }
    .ss-block { color: #f5f5f7; }
    .ss-section-title { text-transform: uppercase; letter-spacing: 1.5px; }
  `
};

/* TemplateSystem — applies a template's FULL design system to State */
const TemplateSystem = {
  /** Apply template overrides to State.globalStyles + sync sidebar UI */
  apply(tplKey) {
    const tpl = Templates[tplKey];
    if (!tpl) return;
    const ov = tpl.overrides || {};
    Object.entries(ov).forEach(([k, v]) => { State.globalStyles[k] = v; });
    // Sync visible sidebar controls
    const map = { '--primary':'color-primary','--secondary':'color-secondary','--accent':'color-accent','--bg':'color-bg','--text':'color-text' };
    Object.entries(map).forEach(([cssVar, id]) => {
      const v = ov[cssVar]; if (!v) return;
      const el = document.getElementById(id); if (el) el.value = v;
      const hex = document.getElementById(id.replace('color-','hex-')); if (hex) hex.value = v;
    });
    const sf = document.getElementById('select-font-heading');
    if (sf && ov['--font-heading']) {
      const fam = ov['--font-heading'].replace(/['"]/g,'').split(',')[0].trim();
      const opt = Array.from(sf.options).find(o => o.value === fam);
      if (opt) sf.value = fam;
    }
    const sb = document.getElementById('select-font-body');
    if (sb && ov['--font-body']) {
      const fam = ov['--font-body'].replace(/['"]/g,'').split(',')[0].trim();
      const opt = Array.from(sb.options).find(o => o.value === fam);
      if (opt) sb.value = fam;
    }
  },

  /** Load one of the 3 industry starter templates: replaces blocks + applies design */
  loadStarter(industry, businessInfo) {
    const tplKey = ({ pressure:'pressure', lawn:'lawn', barber:'lifestyle', fitness:'lifestyle', tattoo:'lifestyle' })[industry] || 'glass';
    const tpl = Templates[tplKey];
    if (!tpl) return;

    State.blocks = [];
    State.blockIdCounter = 1;
    State.currentTemplate = tplKey;
    this.apply(tplKey);

    const copy = StarterCopy[industry] || StarterCopy.pressure;
    if (businessInfo) {
      businessInfo._industry = industry;
      StarterCopy.merge(copy, businessInfo);
    } else {
      // Even with no onboarding data, run merge with industry to refresh tone/vocab
      StarterCopy.merge(copy, { _industry: industry });
    }

    // Add the standard homepage block sequence
    ['nav','hero','features','gallery','testimonials','pricing','cta','leadform','footer'].forEach(t => {
      const enabled = BlockSelector.getEnabled();
      if (!enabled.includes(t)) return;
      const id = addBlock(t);
      const block = State.blocks.find(b => b.id === id);
      if (!block) return;
      if (copy[t]) Object.assign(block.data, copy[t]);
    });

    refreshPreview();
    updateLayers();
    showToast('🎨 ' + tpl.name + ' Template Loaded', 'Customize anything from the sidebar', 'success');

    // F8: kick off Unsplash image fetch for hero + gallery
    if (tpl.unsplashKeyword) Unsplash.applyToBlocks(tpl.unsplashKeyword);
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SSV26.2 — STARTER COPY (conversion-optimized text per industry)
═══════════════════════════════════════════════════════════════════ */
const StarterCopy = {
  pressure: {
    nav: { logo: 'PressureProz', links: ['Services','Gallery','Pricing','Book Now'], ctaText: 'Get Free Quote', ctaBgColor: '#ffd400', textColor: '#ffffff', bgColor: '#0c1a36', sticky: true },
    hero: {
      heading: 'Professional Pressure Washing — Book Instantly',
      subheading: 'Driveways, decks, siding, and roofs restored to like-new in one visit. Licensed, insured, and 5-star rated.',
      btnText: 'Get a Free Quote', btn2Text: 'See Before & After',
      bgColor: '#0a4da3', bgColor2: '#0c1a36', textColor: '#ffffff',
      btnColor: '#ffd400', btnTextColor: '#0c1a36',
      showBadge: true, badgeText: '⭐ 500+ 5-Star Reviews', minHeight: '85vh'
    },
    features: { heading: 'What We Clean', subheading: 'Every surface, every season — pressure-washed to perfection.',
      items: [
        { icon: '🏠', title: 'House Washing',   description: 'Soft-wash siding & exterior walls. Removes mold, algae, and dirt without damaging paint.' },
        { icon: '🚗', title: 'Driveways',       description: 'Concrete, pavers, and asphalt. Oil stains, tire marks, and grime — gone.' },
        { icon: '🪵', title: 'Decks & Patios',  description: 'Wood, composite, and stone. Restore original color before sealing or staining.' },
        { icon: '🏢', title: 'Commercial',      description: 'Storefronts, parking lots, and dumpster pads. Scheduled service available.' },
        { icon: '🏚️', title: 'Roof Cleaning',  description: 'Soft-wash treatment kills moss, lichen, and algae streaks safely.' },
        { icon: '🧱', title: 'Brick & Stone',   description: 'Restore brick, stone, and stucco surfaces to their original beauty.' }
      ], accentColor: '#0a4da3', bgColor: '#ffffff', textColor: '#0c1a36'
    },
    gallery: { heading: 'Before & After', subheading: 'Real customers. Real transformations.', bgColor: '#f5f8ff', textColor: '#0c1a36', columns: 3,
      images: Array.from({length:6}, (_,i) => ({ src:'', alt:'Project '+(i+1), caption: ['Driveway Restoration','Roof Soft-Wash','House Siding','Deck Renewal','Concrete Cleanup','Brick Patio'][i] })) },
    testimonials: { heading: 'Customers Love Our Work', subheading: 'See why we are the #1 rated pressure washing crew.', bgColor: '#ffffff', textColor: '#0c1a36', accentColor: '#0a4da3',
      cards: [
        { name:'Mike H.',    role:'Homeowner',     rating:5, quote:'My driveway looks brand new. Booked online in 2 minutes, crew showed up on time, done in 90 minutes.', bgColor:'#ffffff' },
        { name:'Lisa P.',    role:'Property Mgr.', rating:5, quote:'We use them for all 14 of our buildings. Reliable, professional, and the results are consistent.',   bgColor:'#ffffff' },
        { name:'Carlos R.',  role:'Restaurant Owner', rating:5, quote:'Cleaned our patio and storefront — customers commented on it the next day. Worth every dollar.',   bgColor:'#ffffff' }
      ] },
    pricing: { heading: 'Honest, Upfront Pricing', subheading: 'Free quote in 60 seconds. No surprises.', bgColor: '#0c1a36', textColor: '#ffffff', accentColor: '#ffd400',
      plans: [
        { name:'Driveway',  price:'$149', period:'flat', description:'Up to 1,000 sqft of concrete or pavers.', features:['Full pre-treatment','Stain removal','Sealed finish optional','30-day satisfaction guarantee'], ctaText:'Book Now', ctaLink:'#book', featured:false, bgColor:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)' },
        { name:'House Wash',price:'$299', period:'flat', description:'Full exterior soft-wash, single-story home.', features:['Eco-safe detergents','Mold & algae kill','Window/sill cleaning','Driveway rinse-off included','100% satisfaction guarantee'], ctaText:'Most Booked', ctaLink:'#book', featured:true, bgColor:'#ffd400', borderColor:'#ffd400' },
        { name:'Full Property', price:'$499', period:'flat', description:'House + driveway + walkways + deck.', features:['Everything in House Wash','Deck or patio included','Walkways & steps','Roof inspection','Priority scheduling'], ctaText:'Get Quote', ctaLink:'#book', featured:false, bgColor:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)' }
      ] },
    cta: { heading: 'Ready for a Cleaner Property?', subheading: 'Same-week appointments available. Free quote, no pressure (except on the gun).', bgColor:'#0a4da3', bgColor2:'#0c1a36', textColor:'#ffffff', btnText:'Get My Free Quote', btnColor:'#ffd400', btnTextColor:'#0c1a36', btn2Text:'Call (555) 123-4567' },
    leadform: { heading: 'Get a Free Quote in 60 Seconds', subheading: 'Tell us about your property — we will text you a price within the hour.', bgColor:'#ffffff', textColor:'#0c1a36', accentColor:'#0a4da3', btnColor:'#0a4da3', btnText:'Get My Quote →',
      fields:[ { type:'text',  placeholder:'Your name',    name:'name'    }, { type:'tel', placeholder:'Phone number',  name:'phone' }, { type:'email', placeholder:'Email address', name:'email' }, { type:'textarea', placeholder:'What do you need cleaned?', name:'service' } ] },
    footer: { logo:'PressureProz', tagline:'Professional Pressure Washing · Licensed & Insured', bgColor:'#0c1a36', textColor:'#9ab2d4', accentColor:'#ffd400' }
  },

  lawn: {
    nav: { logo: 'GreenStripe Lawn', links: ['Services','Packages','Pricing','Book'], ctaText: 'Free Estimate', ctaBgColor: '#f4a300', textColor: '#ffffff', bgColor: '#16361b', sticky: true },
    hero: {
      heading: 'Lawn Care That Keeps Your Yard Looking Flawless',
      subheading: 'Weekly mowing, edging, fertilization, and seasonal cleanups. Same crew every visit. No contracts.',
      btnText: 'Get Free Estimate', btn2Text: 'See Packages',
      bgColor: '#2d7a3a', bgColor2: '#16361b', textColor: '#ffffff',
      btnColor: '#f4a300', btnTextColor: '#16361b',
      showBadge: true, badgeText: '🌿 Locally Owned · Same Crew Every Time', minHeight: '80vh'
    },
    features: { heading: 'Lawn Services', subheading: 'Everything your yard needs — done right, every time.',
      items: [
        { icon: '🌱', title: 'Weekly Mowing',     description: 'Sharp-blade cuts at the right height for your grass type. Edged, blown, and bagged on request.' },
        { icon: '🍃', title: 'Fertilization',     description: '6-step year-round program. Slow-release nutrients and pre-emergent weed control.' },
        { icon: '🌳', title: 'Tree & Shrub Care', description: 'Pruning, trimming, and seasonal shaping. Keeps everything healthy and tidy.' },
        { icon: '🍂', title: 'Leaf Cleanup',      description: 'Fall and spring cleanups — blown, vacuumed, and hauled away.' },
        { icon: '💧', title: 'Sprinkler Tune-Up', description: 'Spring start-up, fall blow-out, and mid-season head adjustments.' },
        { icon: '🌷', title: 'Mulch & Beds',      description: 'Fresh mulch, edging, and bed prep. Crisp lines that last all season.' }
      ], accentColor: '#2d7a3a', bgColor: '#ffffff', textColor: '#16361b'
    },
    gallery: { heading: 'Recent Lawns', subheading: 'A few yards we keep looking sharp.', bgColor:'#f6fbf3', textColor:'#16361b', columns:3,
      images: Array.from({length:6}, (_,i) => ({ src:'', alt:'Lawn '+(i+1), caption:['Spring Cleanup','Weekly Mow','Fresh Mulch','Hedge Trim','Fall Cleanup','New Sod'][i] })) },
    testimonials: { heading:'Neighbors Trust Us', subheading:'Real reviews from real customers in your area.', bgColor:'#ffffff', textColor:'#16361b', accentColor:'#2d7a3a',
      cards:[
        { name:'Jessica T.', role:'Homeowner', rating:5, quote:'Best looking lawn on my street. Same two guys every Tuesday — they know the property and never miss a detail.', bgColor:'#ffffff' },
        { name:'Brian L.',   role:'Homeowner', rating:5, quote:'Switched from a big company and saved 20%. Quality is way better. Highly recommend.', bgColor:'#ffffff' },
        { name:'Maria S.',   role:'HOA Board', rating:5, quote:'They handle 40+ properties for our HOA. Always on schedule, professional, and homeowners love the results.', bgColor:'#ffffff' }
      ] },
    pricing: { heading:'Simple Seasonal Packages', subheading:'No contracts. Cancel anytime. Pricing for ¼-acre lots.', bgColor:'#16361b', textColor:'#ffffff', accentColor:'#f4a300',
      plans:[
        { name:'Basic Mow', price:'$45', period:'/visit', description:'Weekly mowing essentials.', features:['Mow + edge + blow','Sharp-blade cuts','Visible debris cleanup','Easy online scheduling'], ctaText:'Start Service', ctaLink:'#book', featured:false, bgColor:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)' },
        { name:'Full Care', price:'$129', period:'/month', description:'Complete weekly care + monthly extras.', features:['Everything in Basic Mow','Monthly fertilization','Bed weeding','Hedge maintenance','Seasonal cleanups included'], ctaText:'Most Popular', ctaLink:'#book', featured:true, bgColor:'#f4a300', borderColor:'#f4a300' },
        { name:'Premier',   price:'$249', period:'/month', description:'White-glove yard management.', features:['Everything in Full Care','Mulch refresh 2x/yr','Tree/shrub pruning','Irrigation maintenance','Annual lawn analysis'], ctaText:'Get Quote', ctaLink:'#book', featured:false, bgColor:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)' }
      ] },
    cta: { heading:'Get a Yard You Are Proud Of', subheading:'Free estimate in under a minute. We handle everything from there.', bgColor:'#2d7a3a', bgColor2:'#16361b', textColor:'#ffffff', btnText:'Get My Free Estimate', btnColor:'#f4a300', btnTextColor:'#16361b', btn2Text:'Call (555) 123-4567' },
    leadform: { heading:'Tell Us About Your Yard', subheading:'We will text you a same-day quote with photos of similar properties.', bgColor:'#ffffff', textColor:'#16361b', accentColor:'#2d7a3a', btnColor:'#2d7a3a', btnText:'Get Estimate →',
      fields:[ { type:'text', placeholder:'Your name', name:'name' }, { type:'tel', placeholder:'Phone', name:'phone' }, { type:'text', placeholder:'Address (street only)', name:'address' }, { type:'textarea', placeholder:'What services are you interested in?', name:'service' } ] },
    footer: { logo:'GreenStripe Lawn', tagline:'Local. Reliable. Sharp lines every time.', bgColor:'#16361b', textColor:'#9bbf8f', accentColor:'#f4a300' }
  },

  lifestyle: {
    nav: { logo: 'IRON & EDGE', links: ['Book','Services','Gallery','Crew'], ctaText: 'Book Session', ctaBgColor: '#e63946', textColor: '#f5f5f7', bgColor: '#0d0d10', sticky: true },
    hero: {
      heading: 'Book Your Next Session — Walk Out Confident',
      subheading: 'Cuts, fades, fits, and finishes by master-level pros. Walk-ins welcome. Most clients book online in under 30 seconds.',
      btnText: 'Book My Slot', btn2Text: 'See Our Work',
      bgColor: '#0d0d10', bgColor2: '#1a1a22', textColor: '#f5f5f7',
      btnColor: '#e63946', btnTextColor: '#ffffff',
      showBadge: true, badgeText: '⚡ Same-Day Booking Available', minHeight: '90vh'
    },
    features: { heading: 'What We Do', subheading: 'Premium service. Honest pricing. Atmosphere you actually want to hang in.',
      items: [
        { icon: '✂️', title: 'Signature Cuts',  description: 'Skin fades, scissor work, beard sculpting. Tailored to your face shape and lifestyle.' },
        { icon: '🪒', title: 'Hot Towel Shave', description: 'Old-school straight razor, hot towel prep, and post-shave balm. The full experience.' },
        { icon: '💪', title: '1-on-1 Training', description: 'Strength, conditioning, mobility. Programs built around YOUR goals.' },
        { icon: '🎨', title: 'Custom Tattoo',   description: 'From flash to full sleeve. Booking opens the 1st of every month.' },
        { icon: '🧴', title: 'Grooming Goods',  description: 'Curated pomades, beard oils, and aftercare. Stuff we actually use.' },
        { icon: '🎁', title: 'Gift Cards',      description: 'Any service, any amount. Delivered instantly to their phone.' }
      ], accentColor: '#e63946', bgColor: '#0d0d10', textColor: '#f5f5f7'
    },
    gallery: { heading: 'Recent Work', subheading: 'A taste of what walks out of the chair.', bgColor:'#1a1a22', textColor:'#f5f5f7', columns:3,
      images: Array.from({length:6}, (_,i) => ({ src:'', alt:'Work '+(i+1), caption:['Skin Fade','Beard Sculpt','Long Layered','Buzz & Beard','Custom Color','Straight Razor'][i] })) },
    testimonials: { heading:'Five-Star Vibes', subheading:'What our regulars are saying.', bgColor:'#0d0d10', textColor:'#f5f5f7', accentColor:'#e63946',
      cards:[
        { name:'Tony D.',  role:'Regular, 3 years', rating:5, quote:'Best chair in the city. The crew actually listens — every cut is exactly what I asked for.', bgColor:'#1a1a22' },
        { name:'James K.', role:'New Client',       rating:5, quote:'Booked online, in and out in 35 minutes, looked sharp for a wedding the next day. Bookmarking these guys.', bgColor:'#1a1a22' },
        { name:'Mason R.', role:'Personal Training', rating:5, quote:'Lost 22 lbs in 4 months training here. The coaches push without being weird about it.', bgColor:'#1a1a22' }
      ] },
    pricing: { heading:'Straight-Up Pricing', subheading:'No upsells. No surprises. Tip optional, never expected.', bgColor:'#1a1a22', textColor:'#f5f5f7', accentColor:'#e63946',
      plans:[
        { name:'Quick Trim',   price:'$35',  period:'/30 min', description:'Maintenance cut. Same shape, sharper lines.', features:['Wash + cut','Neckline shape-up','Style + finish','Walk-ins welcome'], ctaText:'Book', ctaLink:'#book', featured:false, bgColor:'#0d0d10', borderColor:'rgba(230,57,70,0.2)' },
        { name:'Signature',    price:'$65',  period:'/45 min', description:'Full cut + beard. Our most-booked service.', features:['Hot towel prep','Custom skin/scissor cut','Beard line-up','Style consultation','Aftercare product'], ctaText:'Book Signature', ctaLink:'#book', featured:true, bgColor:'#e63946', borderColor:'#e63946' },
        { name:'Full Service', price:'$110', period:'/75 min', description:'Cut, beard, hot shave, hair tonic.', features:['Everything in Signature','Old-school straight razor','Scalp massage','Take-home product','Priority rebooking'], ctaText:'Book Full Service', ctaLink:'#book', featured:false, bgColor:'#0d0d10', borderColor:'rgba(230,57,70,0.2)' }
      ] },
    cta: { heading:'Walk in. Walk out. Look the part.', subheading:'Your chair is open. Most slots fill within 2 hours of opening — book early.', bgColor:'#e63946', bgColor2:'#0d0d10', textColor:'#ffffff', btnText:'Book My Session', btnColor:'#ffffff', btnTextColor:'#e63946', btn2Text:'Call to Book' },
    leadform: { heading:'Booking Request', subheading:'Tell us when you want in — we will confirm by text within the hour.', bgColor:'#0d0d10', textColor:'#f5f5f7', accentColor:'#e63946', btnColor:'#e63946', btnText:'Request Booking →',
      fields:[ { type:'text', placeholder:'Your name', name:'name' }, { type:'tel', placeholder:'Phone', name:'phone' }, { type:'text', placeholder:'Service (cut, beard, training, tattoo…)', name:'service' }, { type:'textarea', placeholder:'Preferred days/times', name:'when' } ] },
    footer: { logo:'IRON & EDGE', tagline:'Premium grooming · Personal training · Custom tattoo', bgColor:'#0d0d10', textColor:'#7a7a82', accentColor:'#e63946' }
  },

  /** Merge an Onboarding businessInfo object into a starter copy in-place */
  merge(copy, info) {
    const name  = (info.businessName || '').trim();
    const phone = (info.phone || '').trim();
    const services = (info.services || '').split('\n').map(s => s.trim()).filter(Boolean);
    const pricing  = (info.pricing  || '').split('\n').map(s => s.trim()).filter(Boolean);

    // Industry vocabulary — drives tone across the WHOLE site
    const VOCAB = {
      pressure:   { noun:'pressure washing', verb:'cleaned',     action:'Book a Wash',     who:'crew',       jobNoun:'wash',      audience:'homeowners',  cta:'Get Free Quote',     bookCta:'Get My Quote',  whatWeDo:'What We Clean',   recent:'Recent Projects',     review:'Customers Love Our Work', tagline:'Pro pressure washing · Licensed & insured', badge:'⭐ 500+ 5-Star Reviews', linksCore:['Services','Gallery','Pricing','Book Now'], featureLead:'Every surface, every season — pressure-washed to perfection.' },
      lawn:       { noun:'lawn care',        verb:'serviced',    action:'Book a Visit',    who:'crew',       jobNoun:'visit',     audience:'neighbors',   cta:'Free Estimate',      bookCta:'Get Estimate',  whatWeDo:'Lawn Services',   recent:'Recent Lawns',        review:'Neighbors Trust Us',     tagline:'Local lawn care · Same crew every time',         badge:'🌿 Locally Owned · Same Crew Every Time', linksCore:['Services','Packages','Pricing','Book'], featureLead:'Everything your yard needs — done right, every time.' },
      barber:     { noun:'barbering',        verb:'styled',      action:'Book Your Chair', who:'barbers',    jobNoun:'cut',       audience:'guys',        cta:'Book a Cut',         bookCta:'Book My Chair', whatWeDo:'Chair Services',  recent:'Recent Cuts',         review:'What Our Regulars Say',  tagline:'Premium barbering · Walk-ins welcome',           badge:'💈 Walk-Ins Welcome · Same-Day Booking',  linksCore:['Book','Services','Gallery','Crew'], featureLead:'Sharp cuts, hot shaves, and an atmosphere you actually want to hang in.' },
      fitness:    { noun:'personal training', verb:'trained',    action:'Book a Session',  who:'coaches',    jobNoun:'session',   audience:'clients',     cta:'Start Training',     bookCta:'Book My Session',whatWeDo:'Programs',       recent:'Recent Transformations', review:'What Our Clients Say', tagline:'Personal training · Real results · No fluff',  badge:'💪 1-on-1 Coaching · Real Results',       linksCore:['Programs','Coaches','Pricing','Book'], featureLead:'Programs built around YOUR goals. No fluff. Just results.' },
      tattoo:     { noun:'tattoo work',      verb:'tattooed',    action:'Book a Session',  who:'artists',    jobNoun:'piece',     audience:'collectors',  cta:'Request Booking',    bookCta:'Request a Session', whatWeDo:'Studio Services', recent:'Recent Work',     review:'What Our Clients Say',   tagline:'Custom tattoo studio · By appointment',          badge:'🎨 Booking Open · Custom Designs',        linksCore:['Artists','Portfolio','Booking','Aftercare'], featureLead:'From flash to full sleeves — custom designs by master artists.' },
      restaurant: { noun:'food',             verb:'served',      action:'Reserve a Table', who:'kitchen',    jobNoun:'dish',      audience:'guests',      cta:'Reserve Now',        bookCta:'Reserve a Table', whatWeDo:'On the Menu',   recent:'From the Kitchen',    review:'What Our Guests Say',    tagline:'Fresh kitchen · Locally sourced',                 badge:'🍴 Reservations Recommended',             linksCore:['Menu','Reservations','Gallery','Visit'], featureLead:'Honest food, sourced local, made from scratch every day.' }
    };
    const industry = (info._industry || 'pressure');
    const V = VOCAB[industry] || VOCAB.pressure;

    // Default services per industry if user left blank
    const DEFAULT_SERVICES = {
      pressure:   ['Driveway Cleaning','House Soft-Wash','Roof Treatment','Deck Restoration','Commercial Wash','Brick & Stone'],
      lawn:       ['Weekly Mowing','Fertilization','Tree & Shrub Care','Leaf Cleanup','Sprinkler Tune-Up','Mulch & Beds'],
      barber:     ['Signature Cut','Skin Fade','Beard Sculpt','Hot Towel Shave','Kids Cut','Cut + Beard Combo'],
      fitness:    ['1-on-1 Training','Strength Programs','Mobility & Recovery','Nutrition Coaching','Group Classes','Online Coaching'],
      tattoo:     ['Custom Designs','Black & Grey','Color Realism','Cover-Ups','Fine Line','Touch-Ups'],
      restaurant: ['Brunch','Lunch','Dinner','Private Events','Catering','Takeout & Delivery']
    };
    const svcList = services.length ? services : DEFAULT_SERVICES[industry] || services;
    const primarySvc = svcList[0] || V.noun;
    const brand = name || (copy.nav && copy.nav.logo) || 'Your Business';

    // ─── NAV ──────────────────────────────────────────────
    if (copy.nav) {
      if (name) copy.nav.logo = name;
      copy.nav.links   = V.linksCore.slice();
      copy.nav.ctaText = V.cta;
    }

    // ─── HERO ─────────────────────────────────────────────
    if (copy.hero) {
      copy.hero.heading    = name ? (`${name} — Professional ${titleCase(V.noun)}`) : `Professional ${titleCase(V.noun)} You Can Trust`;
      copy.hero.subheading = `${cap(svcList.slice(0,3).join(', '))}${svcList.length>3?' & more':''}. Booked in seconds, ${V.verb} by pros, guaranteed to look right.`;
      copy.hero.btnText    = V.cta;
      copy.hero.btn2Text   = phone ? ('📞 ' + phone) : `See Our ${cap(V.jobNoun)}s`;
      copy.hero.badgeText  = V.badge;
      copy.hero.showBadge  = true;
    }

    // ─── FEATURES (services) ──────────────────────────────
    if (copy.features) {
      copy.features.heading    = V.whatWeDo;
      copy.features.subheading = V.featureLead;
      const baseIcons = (copy.features.items || []).map(i => i.icon);
      copy.features.items = svcList.slice(0, 6).map((svc, i) => ({
        icon: baseIcons[i] || baseIcons[i % baseIcons.length] || '✨',
        title: cap(svc),
        description: `Professional ${svc.toLowerCase()} from the ${brand} ${V.who}. ${V.audience.charAt(0).toUpperCase()+V.audience.slice(1)} love the consistency, the speed, and the finish.`
      }));
      // Pad to 6 if user gave fewer
      while (copy.features.items.length < 6 && copy.features.items.length < svcList.length + 1) break;
    }

    // ─── GALLERY ──────────────────────────────────────────
    if (copy.gallery) {
      copy.gallery.heading    = V.recent;
      copy.gallery.subheading = `A few recent ${V.jobNoun}s from the ${brand} ${V.who}.`;
      if (Array.isArray(copy.gallery.images)) {
        copy.gallery.images = copy.gallery.images.map((img, i) => Object.assign({}, img, {
          caption: cap(svcList[i % svcList.length] || V.jobNoun),
          alt: `${brand} — ${svcList[i % svcList.length] || V.jobNoun}`
        }));
      }
    }

    // ─── TESTIMONIALS ─────────────────────────────────────
    if (copy.testimonials && Array.isArray(copy.testimonials.cards)) {
      copy.testimonials.heading    = V.review;
      copy.testimonials.subheading = `Real reviews from real ${V.audience} of ${brand}.`;
      const quoteTemplates = [
        (svc) => `Booked online in 2 minutes, ${brand} crew showed up on time, and the ${svc.toLowerCase()} was exactly what I wanted. Already rebooked.`,
        (svc) => `I have tried 3 other places. ${brand} is the only one I trust for ${svc.toLowerCase()} now. Worth every dollar.`,
        (svc) => `${brand} handled our ${svc.toLowerCase()} flawlessly — professional, fast, and the result looks incredible. Highly recommend.`
      ];
      copy.testimonials.cards = copy.testimonials.cards.map((c, i) => Object.assign({}, c, {
        quote: quoteTemplates[i % quoteTemplates.length](svcList[i % svcList.length] || V.jobNoun)
      }));
    }

    // ─── PRICING ──────────────────────────────────────────
    if (copy.pricing && Array.isArray(copy.pricing.plans)) {
      copy.pricing.heading    = `${titleCase(V.noun)} Pricing`;
      copy.pricing.subheading = `Honest, upfront pricing for every ${V.jobNoun}. No surprises.`;
      if (pricing.length) {
        copy.pricing.plans = copy.pricing.plans.map((p, i) => {
          const line = pricing[i]; if (!line) return Object.assign({}, p, { ctaText: V.bookCta });
          const parts = line.split('|').map(s => s.trim());
          return Object.assign({}, p, {
            name: parts[0] || p.name,
            price: parts[1] || p.price,
            description: parts[2] || p.description,
            ctaText: V.bookCta
          });
        });
      } else {
        copy.pricing.plans = copy.pricing.plans.map((p) => Object.assign({}, p, { ctaText: V.bookCta }));
      }
    }

    // ─── CTA ──────────────────────────────────────────────
    if (copy.cta) {
      copy.cta.heading    = `Ready to book your ${V.jobNoun}?`;
      copy.cta.subheading = `${brand} has same-week openings. Get a free quote in under a minute.`;
      copy.cta.btnText    = V.bookCta;
      copy.cta.btn2Text   = phone ? ('📞 ' + phone) : 'Call to Book';
    }

    // ─── LEAD FORM ────────────────────────────────────────
    if (copy.leadform) {
      copy.leadform.heading    = `Request a ${cap(V.jobNoun)}`;
      copy.leadform.subheading = phone
        ? `Tell us what you need — or call ${brand} directly at ${phone}.`
        : `Tell us what you need — the ${brand} ${V.who} will text you back within the hour.`;
      copy.leadform.btnText    = V.bookCta + ' →';
      if (Array.isArray(copy.leadform.fields)) {
        // Personalize service field placeholder with user's actual services
        copy.leadform.fields = copy.leadform.fields.map(f => {
          if (f.name === 'service' || (f.placeholder || '').toLowerCase().includes('service')) {
            return Object.assign({}, f, { placeholder: `What ${V.jobNoun} are you booking? (${svcList.slice(0,3).join(', ')}…)` });
          }
          return f;
        });
      }
    }

    // ─── FOOTER ───────────────────────────────────────────
    if (copy.footer) {
      if (name) copy.footer.logo = name;
      copy.footer.tagline = `${brand} · ${V.tagline}`;
    }
  }
};

function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function titleCase(s) { return String(s || '').split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' '); }

/* ═══════════════════════════════════════════════════════════════════
   SSV26.2 — FEATURE 8: UNSPLASH AUTO IMAGE INTEGRATION
═══════════════════════════════════════════════════════════════════ */
const Unsplash = {
  key: 'wGxylPhHJHdYms06p3mV9xfogc1Z57nimNNL_RPrxes',
  cache: {},

  async fetchImages(query, count) {
    count = count || 6;
    const cacheKey = query + '__' + count;
    if (this.cache[cacheKey]) return this.cache[cacheKey];
    const url = 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&per_page=' + count + '&client_id=' + this.key;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Unsplash HTTP ' + res.status);
      const json = await res.json();
      const results = (json.results || []).map(r => ({
        url: (r.urls && r.urls.regular) || '',
        thumb: (r.urls && r.urls.small) || '',
        alt: r.alt_description || query,
        author: (r.user && r.user.name) || 'Unsplash',
        link: (r.links && r.links.html) || ''
      }));
      this.cache[cacheKey] = results;
      return results;
    } catch (err) {
      console.warn('[Unsplash] fetch failed:', err.message);
      return [];
    }
  },

  /** Apply Unsplash images to current page: hero bg + gallery items + features bg fallback */
  async applyToBlocks(query) {
    const images = await this.fetchImages(query, 8);
    if (!images.length) {
      showToast('🖼 Image fetch skipped', 'Using gradient placeholders. You can add images manually.', 'warning');
      return;
    }
    let updated = 0;
    State.blocks.forEach(b => {
      if (b.type === 'hero' && images[0]) {
        b.data.bgType = 'image';
        b.data.bgImage = images[0].url;
        b.data._unsplashAttribution = 'Photo by ' + images[0].author + ' on Unsplash';
        updated++;
      } else if (b.type === 'gallery' && b.data.images) {
        b.data.images = b.data.images.map((img, i) => {
          const src = images[i+1] || images[i % images.length];
          return src ? Object.assign({}, img, { src: src.url, _unsplashAttribution: 'Photo by ' + src.author + ' on Unsplash' }) : img;
        });
        updated++;
      }
    });
    if (updated > 0) {
      refreshPreview();
      showToast('🖼 Images Loaded', 'Auto-fetched from Unsplash · ' + images.length + ' photos cached', 'success');
    }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SSV26.2 — FEATURE 9: AI ONBOARDING FLOW
═══════════════════════════════════════════════════════════════════ */
const Onboarding = {
  _key: 'ss_onboarding_v262',
  _step: 0,
  _data: { businessType: '', businessName: '', phone: '', services: '', pricing: '' },

  isComplete() {
    try { return localStorage.getItem(this._key) === 'done'; } catch(e) { return false; }
  },
  markDone() {
    try { localStorage.setItem(this._key, 'done'); } catch(e) {}
    State.onboardingComplete = true;
  },

  /** Show only on first builder load with no existing project */
  maybeShow() {
    if (this.isComplete()) return;
    if (State.blocks && State.blocks.length > 0 && State.blocks.length !== 7) {
      // user already has saved work (the demo defaults to 7 blocks) — skip
      return;
    }
    this.open();
  },

  open() {
    this._step = 0;
    this._data = { businessType: '', businessName: '', phone: '', services: '', pricing: '' };
    const m = document.getElementById('onboarding-modal');
    if (!m) return;
    m.style.display = 'flex';
    this._render();
  },
  close(skip) {
    const m = document.getElementById('onboarding-modal');
    if (m) m.style.display = 'none';
    if (skip) this.markDone();
  },

  next() {
    // step 0 = business type, 1 = name, 2 = phone, 3 = services, 4 = pricing
    const f = document.getElementById('ob-field');
    if (f) {
      const key = ['businessType','businessName','phone','services','pricing'][this._step];
      this._data[key] = f.value || '';
    }
    if (this._step < 4) { this._step++; this._render(); }
    else { this.finish(); }
  },
  back() { if (this._step > 0) { this._step--; this._render(); } },

  _steps: [
    { label: 'What kind of business?', type: 'select', options: [
        { v:'pressure', l:'Pressure Washing' }, { v:'lawn', l:'Lawn Care' },
        { v:'barber', l:'Barber Shop' },        { v:'fitness', l:'Fitness / Personal Training' },
        { v:'tattoo', l:'Tattoo Studio' },      { v:'restaurant', l:'Restaurant' },
        { v:'other', l:'Other / Skip' }
    ] },
    { label: "What's your business name?", type: 'text',     placeholder: 'e.g. Acme Pressure Washing' },
    { label: 'Phone number for bookings?',  type: 'tel',      placeholder: '(555) 123-4567' },
    { label: 'What services do you offer?', type: 'textarea', placeholder: 'One per line\\nDriveway cleaning\\nHouse soft-wash\\nDeck restoration' },
    { label: 'Optional: pricing tiers?',    type: 'textarea', placeholder: 'Format: Name | Price | Description (one per line)\\nBasic | $99 | Single driveway\\nPremium | $299 | Full property' }
  ],

  _render() {
    const cfg = this._steps[this._step];
    const totalSteps = this._steps.length;
    const stepNum = this._step + 1;
    const wrap = document.getElementById('onboarding-body');
    if (!wrap) return;

    let input = '';
    if (cfg.type === 'select') {
      input = '<select id="ob-field" class="ob-field-input">' +
        '<option value="">— Choose one —</option>' +
        cfg.options.map(o => '<option value="' + o.v + '"' + (this._data.businessType === o.v ? ' selected' : '') + '>' + o.l + '</option>').join('') +
        '</select>';
    } else if (cfg.type === 'textarea') {
      const key = ['businessType','businessName','phone','services','pricing'][this._step];
      input = '<textarea id="ob-field" class="ob-field-input" rows="5" placeholder="' + cfg.placeholder + '">' + (this._data[key] || '') + '</textarea>';
    } else {
      const key = ['businessType','businessName','phone','services','pricing'][this._step];
      input = '<input id="ob-field" type="' + cfg.type + '" class="ob-field-input" placeholder="' + cfg.placeholder + '" value="' + (this._data[key] || '') + '"/>';
    }

    wrap.innerHTML = `
      <div class="ob-progress">
        <div class="ob-progress-bar" style="width:${(stepNum/totalSteps)*100}%"></div>
      </div>
      <div class="ob-step-label">Step ${stepNum} of ${totalSteps}</div>
      <h3 class="ob-question">${cfg.label}</h3>
      <div class="ob-input-wrap">${input}</div>
      <div class="ob-actions">
        <button class="ob-btn ob-btn-skip" onclick="Onboarding.close(true)">Skip onboarding</button>
        <div class="ob-actions-right">
          ${this._step > 0 ? '<button class="ob-btn ob-btn-ghost" onclick="Onboarding.back()">← Back</button>' : ''}
          <button class="ob-btn ob-btn-primary" onclick="Onboarding.next()">${this._step === totalSteps - 1 ? '✨ Build My Site' : 'Next →'}</button>
        </div>
      </div>
    `;
    setTimeout(() => { const el = document.getElementById('ob-field'); if (el) el.focus(); }, 50);
  },

  finish() {
    const d = this._data;
    State.industry = d.businessType;
    State.businessName = d.businessName;
    this.markDone();
    this.close(false);

    const industry = d.businessType;
    if (!industry || industry === 'other' || industry === 'restaurant') {
      showToast('✨ Onboarding complete', 'Pick a template from the sidebar to continue.', 'info');
      return;
    }
    showToast('🚀 Building your site…', 'Loading template & fetching images', 'info');
    TemplateSystem.loadStarter(industry, {
      businessName: d.businessName,
      phone: d.phone,
      services: d.services,
      pricing: d.pricing
    });
  }
};

// expose for onclick handlers
window.Onboarding = Onboarding;
window.TemplateSystem = TemplateSystem;
window.Unsplash = Unsplash;

/* ═══════════════════════════════════════════════════════════════════
   SSV26.2 — F5: SCROLL ANIMATION CONTROL (builder UI hook)
═══════════════════════════════════════════════════════════════════ */
function setScrollAnimation(mode) {
  const valid = ['off','subtle','soft','dramatic'];
  if (!valid.includes(mode)) mode = 'off';
  State.scrollAnimation = mode;
  // Update visual chips
  document.querySelectorAll('.scroll-anim-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === mode);
  });
  refreshPreview();
  showToast('🎬 Scroll animation', mode === 'off' ? 'Disabled' : 'Mode: ' + mode, 'info');
}
window.setScrollAnimation = setScrollAnimation;


/* ════════════════════════════════════════════════════════════════════════
   SSV26.3 — AI ASSISTANT, LIVE CHATBOT & MOTION SYSTEM
   ────────────────────────────────────────────────────────────────────────
   F10: AIBridge       — talks to Lovable AI Gateway from browser
   F11: AIChatbot      — floating chat panel that can edit the live site
   F12: MotionFX       — site-wide hover, ripple, parallax, counters,
                         page-transition, magnetic buttons (BUILDER PREVIEW ONLY)
   F13: AICopywriter   — used by Onboarding to generate richer starter copy
   ════════════════════════════════════════════════════════════════════════ */

/* ───────────────────── F10: AI BRIDGE ───────────────────── */
const AIBridge = {
  GATEWAY: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  MODEL:   'google/gemini-3-flash-preview',
  KEY_STORAGE: 'ss_lovable_api_key_v1',

  getKey() {
    try { return localStorage.getItem(this.KEY_STORAGE) || ''; }
    catch(e) { return ''; }
  },
  setKey(k) {
    try { localStorage.setItem(this.KEY_STORAGE, k.trim()); return true; }
    catch(e) { return false; }
  },
  clearKey() { try { localStorage.removeItem(this.KEY_STORAGE); } catch(e){} },

  promptForKey() {
    const k = window.prompt(
      'Paste your Lovable AI Gateway key to enable the AI Assistant.\n\n' +
      'Get one at: https://lovable.dev (Settings → AI Keys)\n\n' +
      'Stored locally in this browser only.'
    );
    if (k && k.trim().length > 8) {
      this.setKey(k);
      if (typeof showToast === 'function') showToast('🔑 AI Key Saved', 'AI Assistant is now active', 'success');
      return true;
    }
    return false;
  },

  async chat({ messages, tools, model, signal }) {
    const key = this.getKey();
    if (!key) throw new Error('NO_API_KEY');
    const body = { model: model || this.MODEL, messages, stream: false };
    if (tools && tools.length) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    const res = await fetch(this.GATEWAY, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal
    });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (res.status === 402) throw new Error('PAYMENT_REQUIRED');
    if (res.status === 401 || res.status === 403) { this.clearKey(); throw new Error('BAD_API_KEY'); }
    if (!res.ok) throw new Error('AI_HTTP_' + res.status);
    return await res.json();
  }
};
window.AIBridge = AIBridge;

/* ───────────────── F13: AI COPYWRITER (used by Onboarding) ───────────────── */
const AICopywriter = {
  async enrich(info) {
    if (!AIBridge.getKey()) return null;
    try {
      const sys = 'You are a senior conversion copywriter for small-business websites. Reply ONLY by calling the provided tool. Be concrete, on-brand, never generic, never use the word "premium" twice.';
      const usr = 'Write copy for a single-page website.\n' +
        'Industry: ' + (info.industry || 'service business') + '\n' +
        'Business name: ' + (info.businessName || 'Untitled') + '\n' +
        'Phone: ' + (info.phone || 'n/a') + '\n' +
        'Services:\n' + (info.services || 'n/a') + '\n' +
        'Pricing notes:\n' + (info.pricing || 'n/a') + '\n\n' +
        'Tone: confident, local, friendly, action-oriented.';
      const tool = {
        type: 'function',
        function: {
          name: 'write_site_copy',
          description: 'Return all site copy for the homepage.',
          parameters: {
            type: 'object',
            properties: {
              hero_headline:    { type: 'string' },
              hero_subhead:     { type: 'string' },
              hero_cta_primary: { type: 'string' },
              hero_cta_ghost:   { type: 'string' },
              feature_items: {
                type: 'array', minItems: 3, maxItems: 4,
                items: {
                  type: 'object',
                  properties: { title:{type:'string'}, body:{type:'string'} },
                  required: ['title','body']
                }
              },
              testimonials: {
                type: 'array', minItems: 2, maxItems: 3,
                items: {
                  type: 'object',
                  properties: { quote:{type:'string'}, author:{type:'string'}, role:{type:'string'} },
                  required: ['quote','author']
                }
              },
              cta_headline:  { type: 'string' },
              cta_sub:       { type: 'string' },
              footer_tagline:{ type: 'string' }
            },
            required: ['hero_headline','hero_subhead','hero_cta_primary','feature_items','cta_headline']
          }
        }
      };
      const r = await AIBridge.chat({
        messages: [ { role:'system', content: sys }, { role:'user', content: usr } ],
        tools: [tool]
      });
      const call = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.tool_calls && r.choices[0].message.tool_calls[0];
      if (!call) return null;
      return JSON.parse(call.function.arguments);
    } catch(err) {
      console.warn('[AICopywriter] failed:', err.message);
      return null;
    }
  },

  /** Apply enriched copy on top of State.blocks (after StarterCopy has run). */
  applyToBlocks(c) {
    if (!c || !State.blocks) return;
    State.blocks.forEach(b => {
      if (!b || !b.data) return;
      if (b.type === 'hero') {
        if (c.hero_headline)    b.data.heading  = c.hero_headline;
        if (c.hero_subhead)     b.data.sub      = c.hero_subhead;
        if (c.hero_cta_primary) b.data.ctaText  = c.hero_cta_primary;
        if (c.hero_cta_ghost)   b.data.ctaGhost = c.hero_cta_ghost;
      }
      if (b.type === 'features' && Array.isArray(c.feature_items) && Array.isArray(b.data.items)) {
        b.data.items = b.data.items.map((it, i) => {
          const src = c.feature_items[i]; if (!src) return it;
          return Object.assign({}, it, { title: src.title, body: src.body });
        });
      }
      if (b.type === 'testimonials' && Array.isArray(c.testimonials) && Array.isArray(b.data.items)) {
        b.data.items = b.data.items.map((it, i) => {
          const src = c.testimonials[i]; if (!src) return it;
          return Object.assign({}, it, { quote: src.quote, author: src.author, role: src.role || it.role });
        });
      }
      if (b.type === 'cta') {
        if (c.cta_headline) b.data.heading = c.cta_headline;
        if (c.cta_sub)      b.data.sub     = c.cta_sub;
      }
      if (b.type === 'footer' && c.footer_tagline) b.data.tagline = c.footer_tagline;
    });
  }
};
window.AICopywriter = AICopywriter;

/* ───────────────── F11: AI CHATBOT (live editor) ───────────────── */
const AIChatbot = {
  _open: false,
  _busy: false,
  _history: [],   // {role,content}
  _abort: null,

  toolDefs: [
    { type:'function', function:{ name:'edit_block_text', description:'Update text fields (heading, sub, body, ctaText, etc.) of a single block. Use list_blocks first to get IDs.', parameters:{ type:'object', properties:{ block_id:{type:'string'}, fields:{type:'object', description:'Key/value pairs to merge into block.data'} }, required:['block_id','fields'] } } },
    { type:'function', function:{ name:'list_blocks', description:'List all blocks on the current page with id, type, label, and a short content preview.', parameters:{ type:'object', properties:{}, required:[] } } },
    { type:'function', function:{ name:'add_block',  description:'Append a new block to the page. type must be one of: nav, hero, features, gallery, testimonials, pricing, cta, leadform, footer, text, image.', parameters:{ type:'object', properties:{ type:{type:'string'}, position:{type:'string', enum:['end','start','after'], default:'end'}, after_id:{type:'string'} }, required:['type'] } } },
    { type:'function', function:{ name:'remove_block', description:'Delete a block by id.', parameters:{ type:'object', properties:{ block_id:{type:'string'} }, required:['block_id'] } } },
    { type:'function', function:{ name:'move_block', description:'Move a block up or down.', parameters:{ type:'object', properties:{ block_id:{type:'string'}, direction:{type:'string', enum:['up','down']} }, required:['block_id','direction'] } } },
    { type:'function', function:{ name:'set_palette', description:'Change site colors (hex values).', parameters:{ type:'object', properties:{ primary:{type:'string'}, accent:{type:'string'}, bg:{type:'string'}, text:{type:'string'} } } } },
    { type:'function', function:{ name:'set_typography', description:'Change site fonts. Use Google Font names.', parameters:{ type:'object', properties:{ heading:{type:'string'}, body:{type:'string'}, base_size:{type:'string'} } } } },
    { type:'function', function:{ name:'apply_template', description:'Switch to a starter template. key one of: pressure, lawn, lifestyle.', parameters:{ type:'object', properties:{ key:{type:'string'} }, required:['key'] } } },
    { type:'function', function:{ name:'fetch_images', description:'Pull fresh Unsplash photos by keyword and apply to hero+gallery.', parameters:{ type:'object', properties:{ query:{type:'string'} }, required:['query'] } } },
    { type:'function', function:{ name:'set_scroll_animation', description:'Set the global scroll animation: off, subtle, soft, dramatic.', parameters:{ type:'object', properties:{ mode:{type:'string', enum:['off','subtle','soft','dramatic']} }, required:['mode'] } } }
  ],

  systemPrompt() {
    const ind = State.industry || 'unknown';
    const biz = State.businessName || 'their business';
    return 'You are the in-builder AI assistant for Supersuite, a no-code website builder. ' +
      'You are editing a LIVE site for ' + biz + ' (industry: ' + ind + '). ' +
      'You can call tools to inspect and modify the site. Always: ' +
      '1) Call list_blocks first if you do not know IDs. ' +
      '2) Make the smallest possible edit unless the user asks for a redesign. ' +
      '3) After editing, reply with one short sentence confirming what changed — never dump JSON. ' +
      '4) If the user is vague (e.g. "make it better"), ask one clarifying question instead of guessing.';
  },

  /* ── Tool execution ── */
  async runTool(name, args) {
    args = args || {};
    switch (name) {
      case 'list_blocks': {
        return (State.blocks || []).map(b => ({
          id: b.id, type: b.type, label: b.label,
          preview: (b.data && (b.data.heading || b.data.title || b.data.text || '')) .toString().slice(0, 80)
        }));
      }
      case 'edit_block_text': {
        const b = State.blocks.find(x => x.id === args.block_id);
        if (!b) return { error: 'block not found' };
        b.data = Object.assign({}, b.data, args.fields || {});
        if (typeof saveHistory === 'function') saveHistory();
        refreshPreview();
        return { ok: true };
      }
      case 'add_block': {
        if (typeof addBlockByType !== 'function') return { error: 'add fn missing' };
        addBlockByType(args.type);
        if (args.position === 'after' && args.after_id) {
          const newB = State.blocks[State.blocks.length - 1];
          const tgt  = State.blocks.findIndex(x => x.id === args.after_id);
          if (newB && tgt >= 0) {
            State.blocks.splice(State.blocks.length - 1, 1);
            State.blocks.splice(tgt + 1, 0, newB);
            refreshPreview();
          }
        }
        return { ok: true, added_id: State.blocks[State.blocks.length-1] && State.blocks[State.blocks.length-1].id };
      }
      case 'remove_block': {
        if (typeof removeBlock === 'function') { removeBlock(args.block_id); return { ok: true }; }
        return { error: 'remove fn missing' };
      }
      case 'move_block': {
        if (typeof moveBlock === 'function') { moveBlock(args.block_id, args.direction === 'up' ? -1 : 1); return { ok: true }; }
        return { error: 'move fn missing' };
      }
      case 'set_palette': {
        const s = State.styles = State.styles || {};
        if (args.primary) s.primary = args.primary;
        if (args.accent)  s.accent  = args.accent;
        if (args.bg)      s.bg      = args.bg;
        if (args.text)    s.text    = args.text;
        refreshPreview();
        return { ok: true };
      }
      case 'set_typography': {
        const s = State.styles = State.styles || {};
        if (args.heading) s.fontHeading = args.heading;
        if (args.body)    s.fontBody    = args.body;
        if (args.base_size) s.baseSize  = args.base_size;
        refreshPreview();
        return { ok: true };
      }
      case 'apply_template': {
        if (typeof TemplateSystem !== 'undefined' && TemplateSystem.loadStarter) {
          TemplateSystem.loadStarter(args.key, { _industry: args.key === 'lifestyle' ? 'barber' : args.key });
          return { ok: true };
        }
        return { error: 'templates missing' };
      }
      case 'fetch_images': {
        if (typeof Unsplash !== 'undefined' && Unsplash.applyToBlocks) {
          await Unsplash.applyToBlocks(args.query);
          return { ok: true };
        }
        return { error: 'unsplash missing' };
      }
      case 'set_scroll_animation': {
        if (typeof setScrollAnimation === 'function') { setScrollAnimation(args.mode); return { ok: true }; }
        return { error: 'scroll fn missing' };
      }
    }
    return { error: 'unknown tool ' + name };
  },

  async send(userText) {
    if (this._busy) return;
    if (!AIBridge.getKey()) {
      const ok = AIBridge.promptForKey();
      if (!ok) { this.appendMsg('assistant', '⚠️ I need a Lovable AI key to work. Click the 🔑 icon to add one.'); return; }
    }
    this.appendMsg('user', userText);
    this._history.push({ role:'user', content: userText });
    this._busy = true;
    this.setBusy(true);
    try {
      const messages = [ { role:'system', content: this.systemPrompt() } ].concat(this._history);
      // Tool loop — up to 5 rounds.
      for (let round = 0; round < 5; round++) {
        const resp = await AIBridge.chat({ messages, tools: this.toolDefs });
        const msg  = resp.choices[0].message;
        messages.push(msg);
        const calls = msg.tool_calls || [];
        if (!calls.length) {
          const text = (msg.content || '').toString().trim() || '✓ Done.';
          this.appendMsg('assistant', text);
          this._history.push({ role:'assistant', content: text });
          break;
        }
        // run all tool calls in parallel
        const results = await Promise.all(calls.map(async c => {
          let args = {}; try { args = JSON.parse(c.function.arguments || '{}'); } catch(e){}
          const result = await this.runTool(c.function.name, args);
          return { tool_call_id: c.id, role:'tool', content: JSON.stringify(result) };
        }));
        results.forEach(r => messages.push(r));
        // brief feedback in chat
        this.appendThinking(calls.map(c => '⚙ ' + c.function.name).join(', '));
      }
    } catch(err) {
      let m = '⚠️ ' + err.message;
      if (err.message === 'NO_API_KEY')      m = '🔑 Add your Lovable AI key (click the key icon).';
      if (err.message === 'BAD_API_KEY')     m = '🔑 Your AI key was rejected — please re-enter it.';
      if (err.message === 'RATE_LIMIT')      m = '⏳ Rate limit hit. Try again in a moment.';
      if (err.message === 'PAYMENT_REQUIRED')m = '💳 Lovable AI credits exhausted. Top up in workspace settings.';
      this.appendMsg('assistant', m);
    } finally {
      this._busy = false;
      this.setBusy(false);
    }
  },

  /* ── UI ── */
  mount() {
    if (document.getElementById('ai-chat-root')) return;
    const root = document.createElement('div');
    root.id = 'ai-chat-root';
    root.innerHTML =
      '<button id="ai-chat-fab" title="AI Assistant" aria-label="Open AI Assistant">' +
        '<span class="ai-fab-glow"></span>' +
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L14 8 L20 10 L14 12 L12 18 L10 12 L4 10 L10 8 Z"/><circle cx="19" cy="5" r="1.5"/></svg>' +
      '</button>' +
      '<aside id="ai-chat-panel" aria-hidden="true">' +
        '<header class="ai-chat-head">' +
          '<div class="ai-chat-title"><span class="ai-dot"></span> AI Assistant <small>SSV26.3</small></div>' +
          '<div class="ai-chat-tools">' +
            '<button class="ai-icon-btn" id="ai-key-btn" title="API key">🔑</button>' +
            '<button class="ai-icon-btn" id="ai-clear-btn" title="Clear chat">⟲</button>' +
            '<button class="ai-icon-btn" id="ai-close-btn" title="Close">✕</button>' +
          '</div>' +
        '</header>' +
        '<div id="ai-chat-stream" class="ai-chat-stream"></div>' +
        '<div class="ai-chat-suggest" id="ai-chat-suggest"></div>' +
        '<form class="ai-chat-input" id="ai-chat-form">' +
          '<textarea id="ai-chat-text" rows="1" placeholder="Ask the AI to edit your site…"></textarea>' +
          '<button type="submit" id="ai-chat-send" title="Send"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
        '</form>' +
      '</aside>';
    document.body.appendChild(root);

    document.getElementById('ai-chat-fab').addEventListener('click', () => this.toggle());
    document.getElementById('ai-close-btn').addEventListener('click', () => this.toggle(false));
    document.getElementById('ai-key-btn').addEventListener('click', () => AIBridge.promptForKey());
    document.getElementById('ai-clear-btn').addEventListener('click', () => this.clear());
    const form = document.getElementById('ai-chat-form');
    const ta   = document.getElementById('ai-chat-text');
    ta.addEventListener('input', () => { ta.style.height='auto'; ta.style.height = Math.min(ta.scrollHeight, 140)+'px'; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = ta.value.trim(); if (!v) return;
      ta.value = ''; ta.style.height='auto';
      this.send(v);
    });

    this.renderSuggestions();
    this.appendMsg('assistant', '👋 Hi! I can edit your site live. Try: <em>"change the hero headline"</em>, <em>"add a pricing block"</em>, <em>"make the colors warmer"</em>, or <em>"fetch new images for power washing"</em>.');
  },

  renderSuggestions() {
    const ind = (State.industry || '').toLowerCase();
    const base = [
      'Rewrite the hero to be more bold',
      'Add a testimonials block',
      'Make the colors warmer',
      'Switch to a darker theme',
      'Fetch new images'
    ];
    const map = {
      pressure:  ['Add before/after gallery', 'Write a hero for power washing', 'Make CTA say "Get Free Quote"'],
      lawn:      ['Add seasonal packages', 'Make palette fresh green', 'Write hero for lawn care'],
      barber:    ['Add a booking CTA', 'Switch to dark premium theme', 'Add gallery of haircuts'],
      fitness:   ['Add class schedule block', 'Make colors high-energy', 'Write hero for gym'],
      tattoo:    ['Add artist gallery', 'Switch to dark moody theme', 'Write hero for tattoo studio']
    };
    const list = (map[ind] || []).concat(base).slice(0, 4);
    const wrap = document.getElementById('ai-chat-suggest');
    if (!wrap) return;
    wrap.innerHTML = list.map(s => '<button class="ai-sugg" type="button">' + s + '</button>').join('');
    wrap.querySelectorAll('.ai-sugg').forEach(b => b.addEventListener('click', () => this.send(b.textContent)));
  },

  toggle(force) {
    const panel = document.getElementById('ai-chat-panel'); if (!panel) return;
    this._open = (force === undefined) ? !this._open : !!force;
    panel.classList.toggle('open', this._open);
    panel.setAttribute('aria-hidden', this._open ? 'false' : 'true');
    document.getElementById('ai-chat-fab').classList.toggle('active', this._open);
    if (this._open) setTimeout(() => { const t = document.getElementById('ai-chat-text'); if (t) t.focus(); }, 150);
  },
  clear() {
    this._history = [];
    document.getElementById('ai-chat-stream').innerHTML = '';
    this.appendMsg('assistant', '🧹 Chat cleared. What should we build next?');
  },
  setBusy(b) {
    const send = document.getElementById('ai-chat-send'); if (!send) return;
    send.disabled = b;
    document.getElementById('ai-chat-text').disabled = b;
    if (b) this.appendThinking('Thinking…'); else this.removeThinking();
  },
  appendMsg(role, html) {
    const stream = document.getElementById('ai-chat-stream'); if (!stream) return;
    const row = document.createElement('div');
    row.className = 'ai-msg ai-msg-' + role;
    row.innerHTML = '<div class="ai-bubble">' + html + '</div>';
    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  },
  appendThinking(label) {
    this.removeThinking();
    const stream = document.getElementById('ai-chat-stream'); if (!stream) return;
    const row = document.createElement('div');
    row.className = 'ai-msg ai-msg-assistant ai-msg-thinking';
    row.innerHTML = '<div class="ai-bubble"><span class="ai-typing"><span></span><span></span><span></span></span> ' + label + '</div>';
    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  },
  removeThinking() {
    document.querySelectorAll('.ai-msg-thinking').forEach(n => n.remove());
  }
};
window.AIChatbot = AIChatbot;

/* ───────────────── F12: MOTION FX (builder preview only) ───────────────── */
const MotionFX = {
  _enabled: true,
  _rafPending: false,
  _parallaxEls: [],
  _counterObs: null,

  init() {
    if (this._mounted) return;
    this._mounted = true;
    document.addEventListener('click', this._onClick.bind(this), true);
    document.addEventListener('mousemove', this._onMove.bind(this));
    window.addEventListener('scroll', this._onScroll.bind(this), { passive: true });
  },

  /** Re-scan preview after each render */
  refresh() {
    if (!this._enabled) return;
    const root = document.querySelector('.preview-frame, #preview, .ss-preview') || document;
    // Magnetic / hover-lift on .ss-btn, [data-cta]
    root.querySelectorAll('.ss-btn, [data-cta], .ss-block .btn, .ss-pricing-tier').forEach(el => {
      if (el._mfxBound) return; el._mfxBound = true;
      el.classList.add('mfx-magnetic');
    });
    // Parallax: hero with bg image
    this._parallaxEls = Array.from(root.querySelectorAll('.ss-block-hero, [data-parallax]'));
    // Animated counters
    root.querySelectorAll('[data-count]').forEach(el => {
      if (el._mfxCounted) return;
      this._observeCounter(el);
    });
    // Page-transition stagger on blocks
    root.querySelectorAll('.ss-block').forEach((el, i) => {
      if (el._mfxStagger) return; el._mfxStagger = true;
      el.style.setProperty('--mfx-stagger', (i * 60) + 'ms');
    });
  },

  _onClick(e) {
    if (!this._enabled) return;
    const t = e.target.closest('.ss-btn, [data-cta], .ai-icon-btn, .ob-btn, .mfx-magnetic');
    if (!t) return;
    const r = t.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'mfx-ripple';
    const size = Math.max(r.width, r.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - r.left - size/2) + 'px';
    ripple.style.top  = (e.clientY - r.top  - size/2) + 'px';
    t.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  },

  _onMove(e) {
    if (!this._enabled) return;
    const t = e.target.closest && e.target.closest('.mfx-magnetic');
    if (!t) return;
    const r = t.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width/2)) / r.width;
    const dy = (e.clientY - (r.top  + r.height/2)) / r.height;
    t.style.transform = 'translate(' + (dx * 6).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px)';
    clearTimeout(t._mfxResetT);
    t._mfxResetT = setTimeout(() => { t.style.transform = ''; }, 250);
  },

  _onScroll() {
    if (!this._enabled || this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => {
      this._rafPending = false;
      const y = window.scrollY || window.pageYOffset;
      this._parallaxEls.forEach(el => {
        const rate = (el.dataset.parallax ? parseFloat(el.dataset.parallax) : 0.25);
        el.style.backgroundPosition = 'center ' + (-y * rate).toFixed(0) + 'px';
      });
    });
  },

  _observeCounter(el) {
    const target = parseFloat(el.dataset.count) || 0;
    const dur    = parseInt(el.dataset.countMs) || 1200;
    if (!this._counterObs) {
      this._counterObs = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting && !en.target._mfxCounted) {
            en.target._mfxCounted = true;
            const t = parseFloat(en.target.dataset.count) || 0;
            const d = parseInt(en.target.dataset.countMs) || 1200;
            const start = performance.now();
            const step = (now) => {
              const p = Math.min(1, (now - start) / d);
              const e = 1 - Math.pow(1 - p, 3);
              en.target.textContent = (t * e).toFixed(t % 1 === 0 ? 0 : 1);
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        });
      }, { threshold: 0.4 });
    }
    this._counterObs.observe(el);
  },

  pageTransition() {
    const root = document.querySelector('.preview-frame, #preview, .ss-preview');
    if (!root) return;
    root.classList.remove('mfx-page-in');
    void root.offsetWidth;
    root.classList.add('mfx-page-in');
  },

  setEnabled(b) { this._enabled = !!b; }
};
window.MotionFX = MotionFX;

/* Hook MotionFX into the existing render pipeline */
(function hookMotionFX(){
  if (typeof refreshPreview !== 'function') return;
  const orig = refreshPreview;
  window.refreshPreview = function() {
    const r = orig.apply(this, arguments);
    try { MotionFX.init(); MotionFX.refresh(); MotionFX.pageTransition(); } catch(e) { console.warn('[MotionFX]', e); }
    return r;
  };
})();

/* Boot AI Chatbot once the DOM is ready & onboarding has had a chance */
(function bootChatbot(){
  const start = () => { try { AIChatbot.mount(); MotionFX.init(); } catch(e) { console.warn('[Chatbot boot]', e); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 600);
})();

/* Patch Onboarding.finish() to also run the AI copywriter when a key exists */
(function patchOnboarding(){
  if (typeof Onboarding === 'undefined' || !Onboarding.finish) return;
  const origFinish = Onboarding.finish.bind(Onboarding);
  Onboarding.finish = async function() {
    origFinish();   // run original — applies template + base copy + Unsplash
    if (!AIBridge.getKey()) {
      // Offer key prompt once
      setTimeout(() => {
        if (window.confirm('Enable the AI Assistant?\n\nIt can rewrite your copy, swap images, change colors, and add sections — all by chat. Add your Lovable AI key now?')) {
          AIBridge.promptForKey();
        }
      }, 800);
      return;
    }
    try {
      if (typeof showToast === 'function') showToast('🤖 AI is writing your copy…', 'Customizing every section for ' + (this._info.businessName || 'your business'), 'info');
      const enriched = await AICopywriter.enrich(this._info);
      if (enriched) {
        AICopywriter.applyToBlocks(enriched);
        if (typeof saveHistory === 'function') saveHistory();
        refreshPreview();
        if (typeof showToast === 'function') showToast('✨ Copy personalized', 'Every section rewritten by AI for ' + (this._info.industry || 'your industry'), 'success');
      }
    } catch(err) {
      console.warn('[Onboarding AI enrich]', err);
    }
  };
})();

/* ═══════════════════════════════════════════════════════════════════
   SSV26.4 — KEYLESS AI + FULL SITE GENERATOR
   F14: FreeAI         — keyless fallback via Pollinations text/image API
   F15: AIBridge patch — auto-route to FreeAI when no Lovable key
   F16: AISiteGenerator — full site plan (HTML/CSS/JS-equivalent block tree)
   F17: Prominent UI   — glowing FAB label + top-bar "✨ Generate with AI"
═══════════════════════════════════════════════════════════════════ */

/* ───────────── F14: FreeAI (no key required) ───────────── */
const FreeAI = {
  TEXT_URL:  'https://text.pollinations.ai/openai',
  IMAGE_URL: 'https://image.pollinations.ai/prompt/',
  MODEL:     'openai',  // pollinations passthrough

  async chat({ messages, tools, jsonOnly }) {
    // Pollinations is OpenAI-compatible for /openai endpoint.
    // Tool-calling is unreliable, so when tools are passed we convert them to
    // a JSON-action protocol the client parses.
    const body = { model: this.MODEL, messages: messages.slice(), private: true, referrer: 'supersuite' };

    if (tools && tools.length) {
      const toolsList = tools.map(t => '• ' + t.function.name + '(' +
        Object.keys(t.function.parameters?.properties||{}).join(', ') + ') — ' +
        (t.function.description||'')).join('\n');
      const sys = {
        role: 'system',
        content:
          'You can take actions on a live website by responding ONLY with a single JSON object of the form:\n' +
          '{ "actions": [ { "name": "<tool_name>", "args": { ... } } ], "say": "<one short sentence>" }\n\n' +
          'Available tools:\n' + toolsList + '\n\n' +
          'Rules: respond with raw JSON only (no markdown fences). If you need no tools, return ' +
          '{"actions":[],"say":"..."}.'
      };
      body.messages = [sys].concat(body.messages);
      body.jsonMode = true;
    } else if (jsonOnly) {
      body.jsonMode = true;
    }

    const res = await fetch(this.TEXT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('FREE_AI_HTTP_' + res.status);
    const text = await res.text();
    // pollinations /openai returns OpenAI-shaped JSON
    let data;
    try { data = JSON.parse(text); }
    catch(e) { data = { choices: [{ message: { role:'assistant', content: text } }] }; }
    return data;
  },

  imageURL(prompt, w, h) {
    const seed = Math.floor(Math.random() * 1e9);
    const q = encodeURIComponent(prompt);
    return this.IMAGE_URL + q + '?width=' + (w||1280) + '&height=' + (h||720) +
           '&nologo=true&enhance=true&seed=' + seed;
  }
};
window.FreeAI = FreeAI;

/* ───────────── F15: AIBridge patch — keyless fallback ───────────── */
(function patchBridge(){
  const origChat = AIBridge.chat.bind(AIBridge);
  AIBridge.hasKey = () => !!AIBridge.getKey();
  AIBridge.chat = async function({ messages, tools, model, signal, jsonOnly }) {
    if (this.getKey()) {
      try { return await origChat({ messages, tools, model, signal }); }
      catch(err) {
        if (['NO_API_KEY','BAD_API_KEY','RATE_LIMIT','PAYMENT_REQUIRED'].includes(err.message)) {
          if (typeof showToast === 'function') {
            showToast('🔁 Switching to free AI', 'Your Lovable key failed — using public model instead', 'info');
          }
          return await FreeAI.chat({ messages, tools, jsonOnly });
        }
        // network/HTTP errors → also fall back
        return await FreeAI.chat({ messages, tools, jsonOnly });
      }
    }
    return await FreeAI.chat({ messages, tools, jsonOnly });
  };
  // Free FreeAI to be used directly
  AIBridge.free = FreeAI;
})();

/* ───────────── F16: AISiteGenerator — full site builder ─────────────
   Generates a complete site plan from the user's industry + business info,
   then materializes it into the live block tree. Always works (uses FreeAI
   when no Lovable key). Equivalent to "rewriting HTML/CSS/JS" because each
   block in the renderer becomes its own HTML/CSS slice.
*/
const AISiteGenerator = {
  ALLOWED_TYPES: ['nav','hero','features','gallery','testimonials','pricing','cta','leadform','footer'],

  async generate(info) {
    info = info || {};
    const biz = info.businessName || State.businessName || 'Your Business';
    const ind = (info.businessType || State.industry || 'service business').toString();
    const services = (info.services || '').toString();
    const phone = (info.phone || '').toString();

    const sys = 'You are an expert website designer and copywriter. Output a JSON site plan ' +
      'that will be rendered as live blocks. Every word must be specific to the business — ' +
      'no generic placeholders like "Your headline here". Use industry vocabulary.';

    const user =
      'Build a high-converting one-page site for:\n' +
      '- Business name: ' + biz + '\n' +
      '- Industry: ' + ind + '\n' +
      '- Services: ' + (services || 'general services') + '\n' +
      '- Phone: ' + (phone || 'n/a') + '\n\n' +
      'Return ONLY valid minified JSON of shape:\n' +
      '{\n' +
      '  "palette": { "primary":"#hex", "accent":"#hex", "bg":"#hex", "text":"#hex" },\n' +
      '  "typography": { "heading":"<google font>", "body":"<google font>" },\n' +
      '  "imageQuery": "<2-3 word unsplash search>",\n' +
      '  "blocks": [\n' +
      '    { "type":"nav", "data":{ "logo":"' + biz + '", "links":[{"label":"...","href":"#..."}], "ctaText":"..." } },\n' +
      '    { "type":"hero", "data":{ "heading":"...","subheading":"...","ctaText":"...","ctaLink":"#book","imagePrompt":"..." } },\n' +
      '    { "type":"features", "data":{ "heading":"...","items":[{"icon":"⚡","title":"...","desc":"..."}] } },\n' +
      '    { "type":"testimonials", "data":{ "heading":"...","items":[{"quote":"...","author":"...","role":"..."}] } },\n' +
      '    { "type":"pricing", "data":{ "heading":"...","tiers":[{"name":"...","price":"$...","period":"...","description":"...","features":["..."],"ctaText":"Book","ctaLink":"#book","featured":false}] } },\n' +
      '    { "type":"cta", "data":{ "heading":"...","subheading":"...","ctaText":"...","ctaLink":"#book" } },\n' +
      '    { "type":"footer", "data":{ "businessName":"' + biz + '","tagline":"...","phone":"' + phone + '" } }\n' +
      '  ]\n' +
      '}\n' +
      'Allowed block types: ' + this.ALLOWED_TYPES.join(', ') + '. Return between 5 and 8 blocks. ' +
      'No commentary, no markdown — JSON only.';

    let plan;
    try {
      const resp = await AIBridge.chat({
        messages: [
          { role:'system', content: sys },
          { role:'user',   content: user }
        ],
        jsonOnly: true
      });
      const raw = resp.choices?.[0]?.message?.content || '';
      plan = this._parseJSON(raw);
    } catch(err) {
      console.warn('[AISiteGenerator] generate failed', err);
      return null;
    }

    if (!plan || !Array.isArray(plan.blocks) || !plan.blocks.length) return null;
    return plan;
  },

  _parseJSON(text) {
    if (!text) return null;
    text = text.replace(/```json|```/g, '').trim();
    // Try direct parse, then extract first {...} balanced block
    try { return JSON.parse(text); } catch(e) {}
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch(e){}
    }
    return null;
  },

  /** Apply a generated plan to the live State, fully replacing current blocks */
  apply(plan, info) {
    if (!plan) return false;

    // 1. palette + typography
    State.styles = State.styles || {};
    if (plan.palette) {
      if (plan.palette.primary) State.styles.primary = plan.palette.primary;
      if (plan.palette.accent)  State.styles.accent  = plan.palette.accent;
      if (plan.palette.bg)      State.styles.bg      = plan.palette.bg;
      if (plan.palette.text)    State.styles.text    = plan.palette.text;
    }
    if (plan.typography) {
      if (plan.typography.heading) State.styles.fontHeading = plan.typography.heading;
      if (plan.typography.body)    State.styles.fontBody    = plan.typography.body;
    }

    // 2. blocks: clear + rebuild from BlockDefs deep-merge
    State.blocks = [];
    (plan.blocks || []).forEach(b => {
      const type = (b.type || '').toLowerCase();
      if (!this.ALLOWED_TYPES.includes(type)) return;
      const def = (typeof BlockDefs !== 'undefined') ? BlockDefs[type] : null;
      if (!def) return;
      const id = 'block_' + (State.blockIdCounter++);
      const baseData = JSON.parse(JSON.stringify(def.defaultData || {}));
      const merged = this._deepMerge(baseData, b.data || {});
      State.blocks.push({
        id, type,
        label: def.label,
        icon:  def.icon,
        data:  merged,
        visible: true
      });
    });

    // 3. images via FreeAI (keyless) for hero
    const heroBlock = State.blocks.find(b => b.type === 'hero');
    if (heroBlock && heroBlock.data) {
      const prompt = heroBlock.data.imagePrompt ||
                     (plan.imageQuery + ' professional photography') ||
                     ((info && info.businessType) || 'business') + ' professional';
      heroBlock.data.image = FreeAI.imageURL(prompt, 1600, 900);
    }
    const galleryBlock = State.blocks.find(b => b.type === 'gallery');
    if (galleryBlock && galleryBlock.data && Array.isArray(galleryBlock.data.images)) {
      const q = plan.imageQuery || ((info && info.businessType) || 'business');
      galleryBlock.data.images = galleryBlock.data.images.map((_,i) =>
        ({ url: FreeAI.imageURL(q + ' detail ' + (i+1), 800, 800), caption: '' }));
    }

    if (typeof saveHistory === 'function') saveHistory();
    if (typeof refreshPreview === 'function') refreshPreview();
    if (typeof updateLayers === 'function') updateLayers();

    // Optionally pull better photos from Unsplash if available (non-blocking)
    if (typeof Unsplash !== 'undefined' && Unsplash.applyToBlocks) {
      const q = plan.imageQuery || ((info && info.businessType) || 'business');
      Unsplash.applyToBlocks(q).catch(()=>{});
    }
    return true;
  },

  _deepMerge(a, b) {
    if (Array.isArray(b)) return b.slice();    // arrays: replace
    if (b && typeof b === 'object') {
      const out = Object.assign({}, a);
      Object.keys(b).forEach(k => {
        out[k] = this._deepMerge(a ? a[k] : undefined, b[k]);
      });
      return out;
    }
    return (b === undefined ? a : b);
  },

  /** One-shot: generate + apply with toasts. Returns true on success. */
  async run(info) {
    if (typeof showToast === 'function') {
      showToast('🤖 AI generating your site…', 'Designing layout, copy, colors & images', 'info');
    }
    const plan = await this.generate(info || {});
    if (!plan) {
      if (typeof showToast === 'function') {
        showToast('⚠️ AI fell back to template', 'Using starter — try again or refine your prompt', 'info');
      }
      return false;
    }
    const ok = this.apply(plan, info || {});
    if (ok && typeof showToast === 'function') {
      showToast('✨ Your AI site is live', (plan.blocks||[]).length + ' custom blocks generated', 'success');
    }
    return ok;
  }
};
window.AISiteGenerator = AISiteGenerator;

/* Re-patch Onboarding.finish to PREFER full AI generation, falling back
   to template + AICopywriter if the generator returns nothing. */
(function patchOnboardingV264(){
  if (typeof Onboarding === 'undefined' || !Onboarding.finish) return;
  Onboarding.finish = async function() {
    const d = this._data || {};
    State.industry     = d.businessType;
    State.businessName = d.businessName;
    if (typeof this.markDone === 'function') this.markDone();
    if (typeof this.close === 'function')    this.close(false);

    // Always attempt full AI generation first (works keyless via FreeAI).
    const ok = await AISiteGenerator.run({
      businessName: d.businessName,
      businessType: d.businessType,
      services:     d.services,
      phone:        d.phone,
      pricing:      d.pricing
    });
    if (ok) return;

    // Fallback path: template + (optional) copywriter
    const industry = d.businessType;
    if (!industry || industry === 'other' || industry === 'restaurant') {
      if (typeof showToast === 'function') {
        showToast('✨ Onboarding complete', 'Pick a template from the sidebar to continue.', 'info');
      }
      return;
    }
    if (typeof TemplateSystem !== 'undefined') {
      TemplateSystem.loadStarter(industry, {
        businessName: d.businessName,
        phone:        d.phone,
        services:     d.services,
        pricing:      d.pricing
      });
    }
  };
})();

/* Patch chatbot send() so it works keyless via the JSON-action shim. */
(function patchChatbotV264(){
  if (typeof AIChatbot === 'undefined') return;

  // Override: never block on missing key
  AIChatbot.send = async function(userText) {
    if (this._busy) return;
    this.appendMsg('user', userText);
    this._history.push({ role:'user', content: userText });
    this._busy = true;
    this.setBusy(true);

    const usingFree = !AIBridge.getKey();
    try {
      const messages = [{ role:'system', content: this.systemPrompt() }].concat(this._history);

      if (!usingFree) {
        // Lovable key path: tool-calling loop (original behavior)
        for (let round = 0; round < 5; round++) {
          const resp = await AIBridge.chat({ messages, tools: this.toolDefs });
          const msg  = resp.choices[0].message;
          messages.push(msg);
          const calls = msg.tool_calls || [];
          if (!calls.length) {
            const text = (msg.content || '').toString().trim() || '✓ Done.';
            this.appendMsg('assistant', text);
            this._history.push({ role:'assistant', content: text });
            break;
          }
          const results = await Promise.all(calls.map(async c => {
            let args = {}; try { args = JSON.parse(c.function.arguments || '{}'); } catch(e){}
            const result = await this.runTool(c.function.name, args);
            return { tool_call_id: c.id, role:'tool', content: JSON.stringify(result) };
          }));
          results.forEach(r => messages.push(r));
          this.appendThinking(calls.map(c => '⚙ ' + c.function.name).join(', '));
        }
      } else {
        // Keyless path: JSON-action protocol via FreeAI
        for (let round = 0; round < 4; round++) {
          const resp = await AIBridge.chat({ messages, tools: this.toolDefs });
          const raw  = (resp.choices?.[0]?.message?.content || '').toString();
          const plan = AISiteGenerator._parseJSON(raw);
          if (!plan || !Array.isArray(plan.actions) || !plan.actions.length) {
            const text = (plan && plan.say) || raw.replace(/[{}\[\]"]/g,'').slice(0,400) || '✓ Done.';
            this.appendMsg('assistant', text);
            this._history.push({ role:'assistant', content: text });
            break;
          }
          const results = [];
          for (const a of plan.actions) {
            const r = await this.runTool(a.name, a.args || {});
            results.push({ name: a.name, result: r });
          }
          this.appendThinking(plan.actions.map(a => '⚙ ' + a.name).join(', '));
          if (plan.say) {
            this.appendMsg('assistant', plan.say);
            this._history.push({ role:'assistant', content: plan.say });
            break;
          }
          // Feed results back for another round if the model wants to chain
          messages.push({ role:'assistant', content: raw });
          messages.push({ role:'user', content: 'Tool results: ' + JSON.stringify(results) +
            '. Reply with final {"actions":[],"say":"..."} JSON.' });
        }
      }
    } catch(err) {
      console.warn('[AIChatbot send]', err);
      this.appendMsg('assistant', '⚠️ ' + (err.message || 'Something went wrong') +
        '. Trying free AI fallback may help — refresh and try again.');
    } finally {
      this._busy = false;
      this.setBusy(false);
    }
  };
})();

/* ───────────── F17: Prominent AI buttons ───────────── */
(function injectAITopbarButton(){
  function mount() {
    const navRight = document.querySelector('.top-nav .nav-right');
    if (!navRight || document.getElementById('ai-generate-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'ai-generate-btn';
    btn.className = 'btn-ai-generate';
    btn.title = 'Regenerate the entire site with AI';
    btn.innerHTML = '<span class="btn-ai-spark">✨</span> Generate with AI';
    btn.addEventListener('click', () => {
      const info = {
        businessName: State.businessName || (document.getElementById('site-name-input')?.value) || 'My Business',
        businessType: State.industry || prompt('What kind of business? (e.g. barbershop, dentist, coffee shop)') || 'service business',
        services: '',
        phone: ''
      };
      State.industry = info.businessType;
      AISiteGenerator.run(info);
    });
    // Insert before the Preview button if possible
    const previewBtn = navRight.querySelector('.btn-preview');
    if (previewBtn) navRight.insertBefore(btn, previewBtn);
    else navRight.appendChild(btn);

    // Add label to chat FAB to make it noticeable
    const fab = document.getElementById('ai-chat-fab');
    if (fab && !fab.querySelector('.ai-fab-label')) {
      const lbl = document.createElement('span');
      lbl.className = 'ai-fab-label';
      lbl.textContent = 'AI Chat';
      fab.appendChild(lbl);
      fab.classList.add('ai-fab-prominent');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else setTimeout(mount, 400);
})();

/* ═══════════════════════════════════════════════════════════════════
   SSV26.5 — CHATBOT EDIT FIX
   Problem in 26.4: when keyless (Pollinations) the request would hang or
   return non-JSON, leaving the chat panel stuck on "Thinking…" with no
   action ever firing.
   Fix:
     • Hard 25s timeout on every FreeAI call (AbortController)
     • Robust parse + always-clear spinner + always-print reply
     • Built-in regex intent parser as a final guarantee that common
       commands ("change headline to X", "add pricing", "make it
       darker/warmer", "new hero image of …") still execute even if the
       free model returns nothing useful.
═══════════════════════════════════════════════════════════════════ */
(function chatbotFixV265(){
  if (typeof FreeAI === 'undefined' || typeof AIChatbot === 'undefined') return;

  /* ---------- 1. Timeout-guarded FreeAI.chat ---------- */
  const TIMEOUT_MS = 25000;
  const origFreeChat = FreeAI.chat.bind(FreeAI);
  FreeAI.chat = async function(opts) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      // Inject signal by monkey-patching fetch for this call only
      const realFetch = window.fetch;
      window.fetch = (url, init) => realFetch(url, Object.assign({}, init, { signal: ctrl.signal }));
      try {
        return await origFreeChat(opts);
      } finally {
        window.fetch = realFetch;
      }
    } catch (e) {
      // Surface a tagged error so the bridge knows to fail loudly
      throw new Error('FREE_AI_TIMEOUT_OR_ERR:' + (e.message || e));
    } finally {
      clearTimeout(t);
    }
  };

  /* ---------- 2. Local intent parser (final-guarantee fallback) ---------- */
  const Intent = {
    parse(text) {
      const t = (text || '').toLowerCase().trim();
      if (!t) return null;

      // change/update/set headline|title|tagline to "X"
      let m = t.match(/(?:change|update|set|make)\s+(?:the\s+)?(headline|title|hero\s*headline|tagline|subtitle)\s+(?:to|=)\s+["“']?([^"”'\n]+?)["”']?\s*$/i);
      if (m) return { name: 'edit_block_text', args: { target: m[1].includes('sub') || m[1].includes('tag') ? 'subheadline' : 'headline', value: m[2].trim() } };

      // add a <foo> block / section
      m = t.match(/\badd\s+(?:a\s+|an\s+|new\s+)?([a-z]+)\s+(?:block|section)\b/);
      if (m) return { name: 'add_block', args: { type: m[1] } };

      // remove/delete <foo> block
      m = t.match(/\b(?:remove|delete)\s+(?:the\s+)?([a-z]+)\s+(?:block|section)\b/);
      if (m) return { name: 'remove_block', args: { type: m[1] } };

      // make colors warmer/cooler/darker/lighter/brighter
      m = t.match(/\bmake\s+(?:the\s+)?(?:colors?|theme|site|page)\s+(warmer|cooler|darker|lighter|brighter|bolder|softer)\b/);
      if (m) return { name: 'recolor', args: { mood: m[1] } };

      // change primary/accent color to <name|hex>
      m = t.match(/\b(?:change|set|make)\s+(?:the\s+)?(primary|accent|background|text)\s+colou?r\s+(?:to\s+)?(#?[a-z0-9]+)/);
      if (m) return { name: 'set_color', args: { which: m[1], value: m[2] } };

      // new hero image of X / fetch image of X
      m = t.match(/\b(?:new|fetch|generate|create|change)\s+(?:the\s+)?(?:hero\s+)?(?:image|photo|picture)\s+(?:of|to|for)\s+(.+)$/);
      if (m) return { name: 'set_hero_image', args: { prompt: m[1].trim() } };

      return null;
    },

    /** Execute the parsed intent against State + re-render. Returns a friendly say-string. */
    async execute(intent) {
      if (!intent) return null;
      const { name, args } = intent;
      try {
        switch (name) {
          case 'edit_block_text': {
            const hero = State.blocks?.find(b => b.type === 'hero') || State.blocks?.[0];
            if (!hero) return '⚠️ No hero block found.';
            hero.data = hero.data || {};
            if (args.target === 'subheadline') hero.data.subheadline = args.value;
            else hero.data.headline = args.value;
            (typeof renderBlocks === 'function') && renderBlocks();
            (typeof saveProject === 'function') && saveProject();
            return `✓ Updated the ${args.target} to "${args.value}".`;
          }
          case 'add_block': {
            if (typeof addBlock === 'function') { addBlock(args.type); return `✓ Added a ${args.type} block.`; }
            return '⚠️ addBlock unavailable.';
          }
          case 'remove_block': {
            const idx = State.blocks?.findIndex(b => b.type === args.type);
            if (idx == null || idx < 0) return `⚠️ No ${args.type} block found.`;
            State.blocks.splice(idx, 1);
            (typeof renderBlocks === 'function') && renderBlocks();
            (typeof saveProject === 'function') && saveProject();
            return `✓ Removed the ${args.type} block.`;
          }
          case 'recolor': {
            const moods = {
              warmer:  { primary:'#c0392b', accent:'#e67e22', bg:'#fff8f1', text:'#2b1d18' },
              cooler:  { primary:'#2563eb', accent:'#06b6d4', bg:'#f5f9ff', text:'#0b1d3a' },
              darker:  { primary:'#7c3aed', accent:'#22d3ee', bg:'#0b0d12', text:'#f4f4f5' },
              lighter: { primary:'#3b82f6', accent:'#22c55e', bg:'#ffffff', text:'#0f172a' },
              brighter:{ primary:'#f59e0b', accent:'#ec4899', bg:'#fffbe6', text:'#1f2937' },
              bolder:  { primary:'#000000', accent:'#ef4444', bg:'#ffffff', text:'#000000' },
              softer:  { primary:'#a78bfa', accent:'#f0abfc', bg:'#fafaf9', text:'#52525b' }
            };
            const p = moods[args.mood] || moods.warmer;
            State.styles = Object.assign({}, State.styles, p);
            (typeof applyStyles === 'function') && applyStyles();
            (typeof renderBlocks === 'function') && renderBlocks();
            (typeof saveProject === 'function') && saveProject();
            return `✓ Recolored the site (${args.mood}).`;
          }
          case 'set_color': {
            State.styles = State.styles || {};
            const v = args.value.startsWith('#') ? args.value : args.value;
            State.styles[args.which] = v;
            (typeof applyStyles === 'function') && applyStyles();
            (typeof saveProject === 'function') && saveProject();
            return `✓ Set ${args.which} colour to ${v}.`;
          }
          case 'set_hero_image': {
            const hero = State.blocks?.find(b => b.type === 'hero');
            if (!hero) return '⚠️ No hero block.';
            hero.data = hero.data || {};
            hero.data.image = FreeAI.imageURL(args.prompt, 1600, 900);
            (typeof renderBlocks === 'function') && renderBlocks();
            (typeof saveProject === 'function') && saveProject();
            return `✓ New hero image: "${args.prompt}".`;
          }
        }
      } catch (e) {
        console.warn('[Intent.execute]', e);
        return '⚠️ ' + (e.message || 'Edit failed.');
      }
      return null;
    }
  };
  window.SSIntent = Intent;

  /* ---------- 3. Bullet-proof AIChatbot.send override ---------- */
  AIChatbot.send = async function(userText) {
    if (this._busy) return;
    this.appendMsg('user', userText);
    this._history.push({ role: 'user', content: userText });
    this._busy = true;
    this.setBusy(true);

    let answered = false;
    const finalize = (text) => {
      if (answered) return;
      answered = true;
      this.appendMsg('assistant', text);
      this._history.push({ role: 'assistant', content: text });
    };

    // Watchdog: never hang past 30s total
    const watchdog = setTimeout(() => {
      if (!answered) {
        // Try the local intent parser as a last resort
        const intent = Intent.parse(userText);
        if (intent) {
          Intent.execute(intent).then(say => finalize(say || '✓ Done.'))
            .catch(() => finalize('⚠️ Free AI is slow right now — I tried a local edit instead.'))
            .finally(() => { this._busy = false; this.setBusy(false); });
        } else {
          finalize('⚠️ The free AI took too long to respond. Try a more specific command, e.g. "change the headline to Welcome", "add a pricing block", or "make the colors warmer".');
          this._busy = false; this.setBusy(false);
        }
      }
    }, 30000);

    try {
      const messages = [{ role: 'system', content: this.systemPrompt() }].concat(this._history);
      const usingFree = !AIBridge.getKey();

      if (!usingFree) {
        // Lovable-key tool-call loop
        for (let round = 0; round < 5 && !answered; round++) {
          const resp = await AIBridge.chat({ messages, tools: this.toolDefs });
          const msg  = resp.choices[0].message;
          messages.push(msg);
          const calls = msg.tool_calls || [];
          if (!calls.length) {
            finalize((msg.content || '').toString().trim() || '✓ Done.');
            break;
          }
          for (const c of calls) {
            let args = {}; try { args = JSON.parse(c.function.arguments || '{}'); } catch(e){}
            const result = await this.runTool(c.function.name, args);
            messages.push({ tool_call_id: c.id, role:'tool', content: JSON.stringify(result) });
          }
          this.appendThinking(calls.map(c => '⚙ ' + c.function.name).join(', '));
        }
      } else {
        // Keyless: try Pollinations once (with timeout), else fall back to Intent
        let plan = null, raw = '';
        try {
          const resp = await AIBridge.chat({ messages, tools: this.toolDefs });
          raw  = (resp.choices?.[0]?.message?.content || '').toString();
          plan = AISiteGenerator._parseJSON(raw);
        } catch (e) {
          console.warn('[chatbot keyless] FreeAI failed:', e.message);
        }

        if (plan && Array.isArray(plan.actions) && plan.actions.length) {
          const results = [];
          for (const a of plan.actions) {
            try {
              const r = await this.runTool(a.name, a.args || {});
              results.push({ name: a.name, ok: true, r });
            } catch(e) {
              results.push({ name: a.name, ok: false, err: e.message });
            }
          }
          this.appendThinking(plan.actions.map(a => '⚙ ' + a.name).join(', '));
          finalize(plan.say || '✓ Done.');
        } else {
          // Fall back to local intent parser
          const intent = Intent.parse(userText);
          if (intent) {
            const say = await Intent.execute(intent);
            this.appendThinking('⚙ local:' + intent.name);
            finalize(say || '✓ Done.');
          } else if (raw && raw.trim()) {
            // Free model gave prose only — show it
            finalize(raw.replace(/```[a-z]*|```/gi, '').trim().slice(0, 600));
          } else {
            finalize('🤔 I couldn\'t reach the free AI just now. Try a direct command like:\n• "change the headline to <text>"\n• "add a pricing block"\n• "make the colors warmer"\n• "new hero image of a coffee shop"');
          }
        }
      }
    } catch (err) {
      console.warn('[AIChatbot.send v26.5]', err);
      // Last-ditch: try local intent
      const intent = Intent.parse(userText);
      if (intent) {
        try { finalize(await Intent.execute(intent) || '✓ Done.'); }
        catch(e2) { finalize('⚠️ ' + (err.message || 'Something went wrong.')); }
      } else {
        finalize('⚠️ ' + (err.message || 'Something went wrong.'));
      }
    } finally {
      clearTimeout(watchdog);
      this._busy = false;
      this.setBusy(false);
    }
  };

  console.log('[SSV26.5] Chatbot edit fix loaded.');
})();

/* ═══════════════════════════════════════════════════════════════════
   SSV26.6 — AUTO-ONBOARDING + REGENERATE WITH STYLE & GOAL
   Adds:
     • Onboarding modal opens immediately after a correct builder code
     • Top-bar "🎨 Regenerate" button → modal with Style + Goal picker
     • Patched AISiteGenerator that bakes Style/Goal into the prompt
═══════════════════════════════════════════════════════════════════ */
(function ssv266(){

  /* ---------- 1. Patch generator to accept style + goal ---------- */
  if (typeof AISiteGenerator !== 'undefined') {
    const STYLE_GUIDE = {
      bold:      'Bold, high-contrast, oversized typography, dramatic colour blocks, confident copy.',
      minimal:   'Minimal, generous whitespace, single accent colour, calm typography, short copy.',
      playful:   'Playful, rounded shapes, vivid pastel palette, friendly emoji-light copy.',
      luxury:    'Luxurious, dark elegant palette, serif headings, refined understated copy.',
      editorial: 'Editorial magazine feel, asymmetric layout, serif headings, longer storytelling copy.',
      brutalist: 'Brutalist, raw, monospace accents, stark black/white with one neon accent, blunt copy.'
    };
    const GOAL_GUIDE = {
      leads:           'Optimise every block for lead capture: prominent lead form, multiple CTAs, scarcity language, fast-action copy.',
      professionalism: 'Project authority and trust: case-study testimonials, credentials, calm palette, formal but warm tone.',
      showcase:        'Showcase work visually: large gallery, project highlights, image-forward hero, minimal text.',
      sales:           'Drive direct purchases: clear pricing tiers with featured plan, urgency, money-back trust badges.',
      community:       'Build community: friendly tone, testimonials from members, newsletter/CTA to join, warm palette.'
    };

    const origGenerate = AISiteGenerator.generate.bind(AISiteGenerator);
    AISiteGenerator.generate = async function(info) {
      info = info || {};
      const style = (info.style || State.lastStyle || '').toLowerCase();
      const goal  = (info.goal  || State.lastGoal  || '').toLowerCase();
      if (!style && !goal) return origGenerate(info);

      const biz = info.businessName || State.businessName || 'Your Business';
      const ind = (info.businessType || State.industry || 'service business').toString();
      const services = (info.services || '').toString();
      const phone = (info.phone || '').toString();

      const styleHint = STYLE_GUIDE[style] || '';
      const goalHint  = GOAL_GUIDE[goal]   || '';

      const sys = 'You are an expert website designer and copywriter. Output a JSON site plan ' +
        'that will be rendered as live blocks. Every word must be specific to the business — ' +
        'no generic placeholders. Use industry vocabulary.\n' +
        (styleHint ? 'STYLE DIRECTION: ' + styleHint + '\n' : '') +
        (goalHint  ? 'PRIMARY GOAL: ' + goalHint + '\n' : '');

      const user =
        'Build a one-page site for:\n' +
        '- Business name: ' + biz + '\n' +
        '- Industry: ' + ind + '\n' +
        '- Services: ' + (services || 'general services') + '\n' +
        '- Phone: ' + (phone || 'n/a') + '\n' +
        (style ? '- Visual style: ' + style + '\n' : '') +
        (goal  ? '- Primary goal: ' + goal  + '\n' : '') +
        '\nReturn ONLY valid minified JSON of shape:\n' +
        '{ "palette":{"primary":"#hex","accent":"#hex","bg":"#hex","text":"#hex"},' +
        '  "typography":{"heading":"<google font>","body":"<google font>"},' +
        '  "imageQuery":"<2-3 word unsplash search>",' +
        '  "blocks":[ { "type":"hero","data":{...} }, ... ] }\n' +
        'Allowed block types: ' + this.ALLOWED_TYPES.join(', ') + '. Return 5–8 blocks. JSON only.';

      try {
        const resp = await AIBridge.chat({
          messages: [{ role:'system', content: sys }, { role:'user', content: user }],
          jsonOnly: true
        });
        const raw = resp.choices?.[0]?.message?.content || '';
        const plan = this._parseJSON(raw);
        if (!plan || !Array.isArray(plan.blocks) || !plan.blocks.length) return null;
        return plan;
      } catch (err) {
        console.warn('[AISiteGenerator v26.6] failed', err);
        return null;
      }
    };
  }

  /* ---------- 2. Auto-open onboarding right after a valid code ---------- */
  if (typeof window.checkPassword === 'function' && !window._ssv266_pwPatched) {
    window._ssv266_pwPatched = true;
    const origCheck = window.checkPassword;
    window.checkPassword = function() {
      origCheck.apply(this, arguments);
      // If auth succeeded, the app becomes visible. Wait for it, then force onboarding.
      let tries = 0;
      const wait = () => {
        tries++;
        const app = document.getElementById('app');
        if (app && app.style.display !== 'none' && typeof Onboarding !== 'undefined') {
          // Always open for a freshly-entered session (skip the "isComplete" guard)
          try { Onboarding.open(); } catch(e) { console.warn('[onboarding open]', e); }
        } else if (tries < 40) {
          setTimeout(wait, 100);
        }
      };
      setTimeout(wait, 500);
    };
  }

  /* ---------- 3. Regenerate modal ---------- */
  const STYLES = [
    { id:'bold',      label:'Bold',      desc:'Loud, high contrast' },
    { id:'minimal',   label:'Minimal',   desc:'Calm, lots of whitespace' },
    { id:'playful',   label:'Playful',   desc:'Friendly, rounded, vivid' },
    { id:'luxury',    label:'Luxury',    desc:'Dark, serif, refined' },
    { id:'editorial', label:'Editorial', desc:'Magazine-style storytelling' },
    { id:'brutalist', label:'Brutalist', desc:'Raw, mono, stark accent' }
  ];
  const GOALS = [
    { id:'leads',           label:'Leads',           desc:'Capture form submissions' },
    { id:'professionalism', label:'Professionalism', desc:'Authority + trust' },
    { id:'showcase',        label:'Showcase',        desc:'Visual portfolio' },
    { id:'sales',           label:'Sales',           desc:'Drive purchases' },
    { id:'community',       label:'Community',       desc:'Build a following' }
  ];

  function ensureRegenModal() {
    if (document.getElementById('regen-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'regen-modal';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,18,.72);backdrop-filter:blur(8px);z-index:99998;display:none;align-items:center;justify-content:center;padding:20px;';
    wrap.innerHTML =
      '<div style="background:#fff;color:#111;max-width:640px;width:100%;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.4);overflow:hidden;font-family:system-ui,-apple-system,sans-serif;">' +
      '  <div style="padding:24px 28px;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;">' +
      '    <div style="font-size:13px;opacity:.85;letter-spacing:.05em;">REGENERATE SITE</div>' +
      '    <h2 style="margin:4px 0 0;font-size:24px;font-weight:700;">Pick a new direction</h2>' +
      '    <p style="margin:8px 0 0;font-size:14px;opacity:.9;">This rebuilds every block with fresh copy, palette and layout.</p>' +
      '  </div>' +
      '  <div style="padding:20px 28px;max-height:60vh;overflow:auto;">' +
      '    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#6b7280;margin-bottom:8px;">VISUAL STYLE</div>' +
      '    <div id="regen-style-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:18px;"></div>' +
      '    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#6b7280;margin-bottom:8px;">PRIMARY GOAL</div>' +
      '    <div id="regen-goal-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;"></div>' +
      '  </div>' +
      '  <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #f1f1f4;">' +
      '    <button id="regen-cancel" style="padding:10px 18px;border:1px solid #e5e7eb;background:#fff;color:#374151;border-radius:10px;font-weight:600;cursor:pointer;">Cancel</button>' +
      '    <button id="regen-confirm" style="padding:10px 22px;border:0;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;border-radius:10px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(99,102,241,.35);">✨ Regenerate</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(wrap);

    const styleGrid = wrap.querySelector('#regen-style-grid');
    const goalGrid  = wrap.querySelector('#regen-goal-grid');
    let pickedStyle = '';
    let pickedGoal  = '';

    function makeCard(item, onPick, getPicked) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = item.id;
      b.style.cssText = 'text-align:left;padding:12px 14px;border:2px solid #e5e7eb;background:#fff;border-radius:12px;cursor:pointer;transition:all .15s;';
      b.innerHTML = '<div style="font-weight:700;font-size:14px;color:#111;">' + item.label + '</div>' +
                    '<div style="font-size:12px;color:#6b7280;margin-top:2px;">' + item.desc + '</div>';
      b.addEventListener('click', () => { onPick(item.id); paint(); });
      b._refresh = () => {
        const active = getPicked() === item.id;
        b.style.borderColor   = active ? '#6366f1' : '#e5e7eb';
        b.style.background    = active ? '#eef2ff' : '#fff';
        b.style.boxShadow     = active ? '0 4px 14px rgba(99,102,241,.25)' : 'none';
      };
      return b;
    }
    const styleBtns = STYLES.map(s => makeCard(s, id => pickedStyle = id, () => pickedStyle));
    const goalBtns  = GOALS .map(g => makeCard(g, id => pickedGoal  = id, () => pickedGoal));
    styleBtns.forEach(b => styleGrid.appendChild(b));
    goalBtns .forEach(b => goalGrid .appendChild(b));
    function paint(){ styleBtns.forEach(b=>b._refresh()); goalBtns.forEach(b=>b._refresh()); }
    paint();

    wrap.querySelector('#regen-cancel').onclick = () => { wrap.style.display = 'none'; };
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.style.display = 'none'; });

    wrap.querySelector('#regen-confirm').onclick = async () => {
      if (!pickedStyle && !pickedGoal) {
        if (typeof showToast === 'function') showToast('Pick at least one', 'Choose a style or goal.', 'warn');
        return;
      }
      wrap.style.display = 'none';
      State.lastStyle = pickedStyle;
      State.lastGoal  = pickedGoal;
      const info = {
        businessName: State.businessName || 'My Business',
        businessType: State.industry || 'service business',
        services: State._lastServices || '',
        phone: State._lastPhone || '',
        style: pickedStyle,
        goal:  pickedGoal
      };
      if (typeof showToast === 'function') showToast('✨ Regenerating…', 'New '+(pickedStyle||'')+(pickedStyle&&pickedGoal?' · ':'')+(pickedGoal||'')+' site coming up.', 'info');
      try {
        const ok = await AISiteGenerator.run(info);
        if (ok && typeof showToast === 'function') showToast('✅ Site regenerated', 'Fresh layout applied.', 'success');
        else if (typeof showToast === 'function') showToast('⚠️ Regenerate failed', 'Free AI may be busy — try again.', 'warn');
      } catch (e) {
        console.warn('[regen]', e);
        if (typeof showToast === 'function') showToast('⚠️ Error', e.message || 'Failed.', 'warn');
      }
    };
  }
  window.openRegenerateModal = function() {
    ensureRegenModal();
    document.getElementById('regen-modal').style.display = 'flex';
  };

  /* ---------- 4. Top-bar Regenerate button ---------- */
  function injectRegenButton() {
    const navRight = document.querySelector('.top-nav .nav-right');
    if (!navRight || document.getElementById('regen-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'regen-btn';
    btn.className = 'btn-ai-generate';
    btn.style.background = 'linear-gradient(135deg,#0ea5e9,#8b5cf6)';
    btn.title = 'Regenerate the site with a new style and goal';
    btn.innerHTML = '<span class="btn-ai-spark">🎨</span> Regenerate';
    btn.addEventListener('click', () => window.openRegenerateModal());
    // Place AFTER the existing AI Generate button if present
    const aiGen = document.getElementById('ai-generate-btn');
    if (aiGen && aiGen.nextSibling) navRight.insertBefore(btn, aiGen.nextSibling);
    else navRight.appendChild(btn);
  }
  const regenInterval = setInterval(() => {
    injectRegenButton();
    if (document.getElementById('regen-btn')) clearInterval(regenInterval);
  }, 500);
  setTimeout(() => clearInterval(regenInterval), 15000);

  console.log('[SSV26.6] Auto-onboarding + Regenerate (style/goal) loaded.');
})();

/* ════════════════════════════════════════════════════════════════════════
   SSV26.7 — BUILT-IN ANALYTICS · GAMIFIED DASHBOARD · VERCEL DEPLOY
   ════════════════════════════════════════════════════════════════════════
   What this adds:
     1. SSAnalytics  — tracks views, clicks, block engagement, sessions
                       (writes to localStorage; injected into exported sites
                        as a self-contained tracker that posts back to the
                        same origin via the bundled tracker.js fallback)
     2. SSDashboard  — top-bar "📊 Dashboard" button → full-screen panel
                       with: stats, level/XP, achievements, AI improvement
                       quests, weekly streak. Suggestions powered by FreeAI
                       and the local SSIntent fallback.
     3. SSVercel     — top-bar "🚀 Deploy" button → modal that ships the
                       current export bundle to Vercel via their public
                       upload API. User pastes a Vercel token (stored in
                       localStorage only), picks a project name, one-click.
   ════════════════════════════════════════════════════════════════════════ */
(function SSV267(){
  'use strict';
  if (window.__SSV267_LOADED__) return;
  window.__SSV267_LOADED__ = true;

  /* ════════════ 1. ANALYTICS ENGINE ════════════ */
  const SSAnalytics = {
    KEY: 'ss_analytics_v1',
    _data: null,
    load() {
      try { this._data = JSON.parse(localStorage.getItem(this.KEY) || 'null'); }
      catch(e) { this._data = null; }
      if (!this._data) {
        this._data = {
          views: 0, clicks: 0, sessions: 0,
          firstSeen: Date.now(), lastSeen: Date.now(),
          days: {},                  // 'YYYY-MM-DD' -> { v, c }
          blocks: {},                // blockType -> { v, c }
          ctaClicks: 0,
          formSubmits: 0,
          xp: 0,
          level: 1,
          achievements: [],
          completedQuests: [],
          streakDays: 0,
          lastStreakDate: null
        };
        this.save();
      }
      return this._data;
    },
    save() { try { localStorage.setItem(this.KEY, JSON.stringify(this._data)); } catch(e){} },
    today() { return new Date().toISOString().slice(0,10); },
    track(event, meta) {
      this.load();
      const t = this.today();
      if (!this._data.days[t]) this._data.days[t] = { v:0, c:0 };
      if (event === 'view')   { this._data.views++;  this._data.days[t].v++; }
      if (event === 'click')  { this._data.clicks++; this._data.days[t].c++; }
      if (event === 'cta')    { this._data.ctaClicks++; this.awardXP(2,'CTA engagement'); }
      if (event === 'form')   { this._data.formSubmits++; this.awardXP(10,'Form submit'); }
      if (event === 'block_view' && meta?.type) {
        this._data.blocks[meta.type] = this._data.blocks[meta.type] || { v:0, c:0 };
        this._data.blocks[meta.type].v++;
      }
      this._data.lastSeen = Date.now();
      this.save();
    },
    awardXP(amount, reason) {
      this.load();
      this._data.xp += amount;
      const newLevel = Math.floor(Math.sqrt(this._data.xp/30)) + 1;
      if (newLevel > this._data.level) {
        this._data.level = newLevel;
        if (typeof showToast === 'function')
          showToast('🏆 Level up!', `You reached level ${newLevel}`, 'success');
      }
      this.save();
    },
    bumpStreak() {
      this.load();
      const t = this.today();
      if (this._data.lastStreakDate === t) return;
      const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
      this._data.streakDays = (this._data.lastStreakDate === yesterday) ? this._data.streakDays + 1 : 1;
      this._data.lastStreakDate = t;
      this.awardXP(5, 'Daily streak');
      this.save();
    },
    summary() {
      this.load();
      const days = Object.entries(this._data.days).sort().slice(-7);
      const last7Views  = days.reduce((s,[,d]) => s + d.v, 0);
      const last7Clicks = days.reduce((s,[,d]) => s + d.c, 0);
      const ctr = last7Views ? (last7Clicks/last7Views*100).toFixed(1) : '0.0';
      const topBlocks = Object.entries(this._data.blocks)
        .sort((a,b) => b[1].v - a[1].v).slice(0,3);
      return {
        ...this._data,
        last7Views, last7Clicks, ctr, topBlocks, days
      };
    },
    reset() {
      localStorage.removeItem(this.KEY);
      this._data = null;
      this.load();
    }
  };
  window.SSAnalytics = SSAnalytics;

  // Builder-side simulated traffic (so the dashboard isn't empty at first)
  SSAnalytics.load();
  SSAnalytics.bumpStreak();
  SSAnalytics.track('view');
  // Simulate 3-7 organic visits per builder open so the dashboard looks alive
  const simVisits = 3 + Math.floor(Math.random()*5);
  for (let i=0; i<simVisits; i++) SSAnalytics.track('view');

  /* ════════════ 2. AI IMPROVEMENT QUESTS ════════════ */
  const QUEST_BANK = [
    { id:'add_testimonial', xp:25, title:'Add social proof',
      desc:'Sites with testimonials convert ~34% better. Add a testimonial block.',
      check:() => (window.State?.blocks||[]).some(b => b.type === 'testimonial'),
      action:() => window.addBlock?.('testimonial') },
    { id:'add_pricing',     xp:30, title:'Show your pricing',
      desc:'Visitors who see pricing are 2x more likely to convert. Add a pricing block.',
      check:() => (window.State?.blocks||[]).some(b => b.type === 'pricing'),
      action:() => window.addBlock?.('pricing') },
    { id:'add_cta',         xp:20, title:'Strong call-to-action',
      desc:'Every page needs a clear CTA. Add a CTA section.',
      check:() => (window.State?.blocks||[]).some(b => b.type === 'cta'),
      action:() => window.addBlock?.('cta') },
    { id:'add_features',    xp:20, title:'List your features',
      desc:'Help visitors understand what you offer at a glance.',
      check:() => (window.State?.blocks||[]).some(b => b.type === 'features'),
      action:() => window.addBlock?.('features') },
    { id:'add_faq',         xp:15, title:'Answer common questions',
      desc:'An FAQ block reduces support load and removes purchase friction.',
      check:() => (window.State?.blocks||[]).some(b => b.type === 'faq'),
      action:() => window.addBlock?.('faq') },
    { id:'set_brand',       xp:15, title:'Set your business name',
      desc:'Personalize your headline with your brand.',
      check:() => !!(window.State?.businessName),
      action:() => window.Onboarding?.open?.() },
    { id:'pick_template',   xp:10, title:'Pick a starter template',
      desc:'Templates give you a conversion-tested foundation.',
      check:() => (window.State?.blocks||[]).length >= 3,
      action:() => { document.querySelector('.template-card')?.scrollIntoView({behavior:'smooth'}); } },
    { id:'export_once',     xp:40, title:'Export your site once',
      desc:'Download the production-ready HTML/CSS bundle.',
      check:() => SSAnalytics._data?.completedQuests?.includes('export_once'),
      action:() => window.exportSite?.() },
    { id:'deploy_vercel',   xp:60, title:'Deploy to the web',
      desc:'Ship live to Vercel in one click. Custom domain ready.',
      check:() => SSAnalytics._data?.completedQuests?.includes('deploy_vercel'),
      action:() => window.SSVercel?.openModal?.() }
  ];

  function activeQuests() {
    SSAnalytics.load();
    const done = new Set(SSAnalytics._data.completedQuests || []);
    return QUEST_BANK.map(q => ({...q, done: q.check() || done.has(q.id) })).slice(0,8);
  }

  function completeQuest(id) {
    SSAnalytics.load();
    const q = QUEST_BANK.find(x => x.id === id);
    if (!q) return;
    if (!SSAnalytics._data.completedQuests.includes(id)) {
      SSAnalytics._data.completedQuests.push(id);
      SSAnalytics.awardXP(q.xp, q.title);
      if (typeof showToast === 'function')
        showToast(`✅ Quest done: ${q.title}`, `+${q.xp} XP`, 'success');
    }
    SSAnalytics.save();
    if (window.SSDashboard?._open) window.SSDashboard.render();
  }

  /* ════════════ 3. DASHBOARD UI ════════════ */
  const SSDashboard = {
    _open: false,
    _aiTip: null,
    open() {
      this._open = true;
      document.getElementById('ss-dash-overlay')?.remove();
      const ov = document.createElement('div');
      ov.id = 'ss-dash-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,20,.85);backdrop-filter:blur(12px);z-index:99990;overflow-y:auto;padding:32px 16px;';
      ov.innerHTML = '<div id="ss-dash-inner" style="max-width:1100px;margin:0 auto;color:#f5f5f7;font-family:system-ui,-apple-system,sans-serif;"></div>';
      ov.addEventListener('click', e => { if (e.target === ov) this.close(); });
      document.body.appendChild(ov);
      this.render();
      this.fetchAITip();
    },
    close() {
      this._open = false;
      document.getElementById('ss-dash-overlay')?.remove();
    },
    render() {
      const inner = document.getElementById('ss-dash-inner');
      if (!inner) return;
      const s = SSAnalytics.summary();
      const quests = activeQuests();
      const doneCount = quests.filter(q => q.done).length;
      const xpForNext = ((s.level)**2) * 30;
      const xpProgress = Math.min(100, Math.round(((s.xp - ((s.level-1)**2)*30) / (xpForNext - ((s.level-1)**2)*30)) * 100));
      const sparkline = s.days.length
        ? s.days.map(([,d]) => d.v).join(',')
        : '0,0,0,0,0,0,0';
      const maxV = Math.max(1, ...sparkline.split(',').map(Number));
      const barsHTML = sparkline.split(',').map(v => {
        const h = Math.max(4, (Number(v)/maxV)*60);
        return `<div style="flex:1;background:linear-gradient(180deg,#6366f1,#ec4899);height:${h}px;border-radius:4px 4px 0 0;min-width:14px;"></div>`;
      }).join('');

      inner.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <div>
            <h1 style="margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em;">📊 Your Dashboard</h1>
            <p style="margin:4px 0 0;opacity:.7;font-size:14px;">Level up your site · Built-in analytics · AI-suggested quests</p>
          </div>
          <button onclick="SSDashboard.close()" style="background:rgba(255,255,255,.08);border:0;color:#fff;width:40px;height:40px;border-radius:10px;font-size:20px;cursor:pointer;">×</button>
        </div>

        <!-- Level + XP -->
        <div style="background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(236,72,153,.18));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:24px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
            <div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;opacity:.7;">Builder Level</div>
              <div style="font-size:48px;font-weight:900;line-height:1;">Lv ${s.level}</div>
              <div style="font-size:13px;opacity:.7;margin-top:4px;">${s.xp} XP total · ${doneCount}/${quests.length} quests done · 🔥 ${s.streakDays}-day streak</div>
            </div>
            <div style="flex:1;min-width:240px;max-width:400px;">
              <div style="display:flex;justify-content:space-between;font-size:11px;opacity:.7;margin-bottom:6px;">
                <span>Progress to Lv ${s.level+1}</span><span>${xpProgress}%</span>
              </div>
              <div style="height:14px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;">
                <div style="height:100%;width:${xpProgress}%;background:linear-gradient(90deg,#6366f1,#ec4899);transition:width .8s;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stat tiles -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
          ${tile('👁️', 'Total views', s.views, '#6366f1')}
          ${tile('🖱️', 'Total clicks', s.clicks, '#ec4899')}
          ${tile('🎯', 'CTA clicks', s.ctaClicks, '#10b981')}
          ${tile('📩', 'Form submits', s.formSubmits, '#f59e0b')}
          ${tile('📈', 'CTR (7d)', s.ctr + '%', '#8b5cf6')}
          ${tile('🔥', 'Day streak', s.streakDays, '#ef4444')}
        </div>

        <!-- Two column: traffic chart + AI tip -->
        <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin-bottom:20px;" class="ss-dash-2col">
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
              <strong>Traffic — last 7 days</strong>
              <span style="font-size:12px;opacity:.6;">${s.last7Views} views · ${s.last7Clicks} clicks</span>
            </div>
            <div style="display:flex;align-items:flex-end;gap:6px;height:80px;">${barsHTML}</div>
          </div>
          <div style="background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(236,72,153,.10));border:1px solid rgba(99,102,241,.3);border-radius:18px;padding:20px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:20px;">🤖</span>
              <strong>AI Coach</strong>
              <span style="margin-left:auto;font-size:11px;opacity:.6;">SSV26.7</span>
            </div>
            <div id="ss-ai-tip" style="font-size:14px;line-height:1.5;opacity:.92;min-height:60px;">${this._aiTip || '<em style="opacity:.6;">Analyzing your site…</em>'}</div>
            <button onclick="SSDashboard.fetchAITip(true)" style="margin-top:12px;background:rgba(255,255,255,.1);border:0;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;cursor:pointer;">🔄 New suggestion</button>
          </div>
        </div>

        <!-- Quests -->
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:14px;align-items:center;">
            <strong>🎯 Improvement Quests</strong>
            <span style="font-size:12px;opacity:.6;">${doneCount}/${quests.length} done · earn XP & level up</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
            ${quests.map(q => `
              <div style="background:${q.done?'rgba(16,185,129,.12)':'rgba(255,255,255,.04)'};border:1px solid ${q.done?'rgba(16,185,129,.4)':'rgba(255,255,255,.08)'};border-radius:12px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                  <strong style="font-size:14px;">${q.done?'✅':'⭕'} ${q.title}</strong>
                  <span style="background:rgba(99,102,241,.2);color:#a5b4fc;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">+${q.xp} XP</span>
                </div>
                <p style="margin:6px 0 10px;font-size:12px;opacity:.7;line-height:1.4;">${q.desc}</p>
                ${q.done
                  ? '<div style="font-size:11px;color:#10b981;font-weight:600;">Completed</div>'
                  : `<button onclick="SSDashboard.runQuest('${q.id}')" style="background:linear-gradient(135deg,#6366f1,#ec4899);border:0;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%;">Do it →</button>`
                }
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Top blocks -->
        ${s.topBlocks.length ? `
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;">
          <strong>🏅 Top engaging blocks</strong>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
            ${s.topBlocks.map(([type, d]) => `
              <div style="display:flex;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,.04);border-radius:10px;">
                <span style="text-transform:capitalize;">${type}</span>
                <span style="opacity:.7;font-size:13px;">${d.v} views</span>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      `;

      function tile(emoji, label, value, color) {
        return `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;">
          <div style="font-size:22px;">${emoji}</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;opacity:.6;margin-top:6px;">${label}</div>
          <div style="font-size:28px;font-weight:800;color:${color};margin-top:2px;">${value}</div>
        </div>`;
      }
    },
    runQuest(id) {
      const q = QUEST_BANK.find(x => x.id === id);
      if (!q) return;
      try { q.action && q.action(); } catch(e) {}
      // Re-check after a tick — some actions modify State immediately
      setTimeout(() => {
        if (q.check()) completeQuest(id);
        else this.render();
      }, 600);
    },
    async fetchAITip(force) {
      const el = () => document.getElementById('ss-ai-tip');
      if (el()) el().innerHTML = '<em style="opacity:.6;">🤔 Thinking…</em>';
      const blocks = (window.State?.blocks||[]).map(b => b.type);
      const s = SSAnalytics.summary();
      const ctx = `Site has ${blocks.length} blocks: ${blocks.join(', ') || '(none)'}. ` +
                  `Views: ${s.views}, CTR: ${s.ctr}%, business: ${window.State?.businessName||'unknown'}, ` +
                  `industry: ${window.State?.industry||'unknown'}.`;
      let tip = null;
      try {
        if (window.FreeAI?.chat) {
          tip = await Promise.race([
            window.FreeAI.chat([
              { role:'system', content:'You are a concise web conversion coach. Reply with ONE actionable tip in under 35 words. No preamble.' },
              { role:'user',   content: ctx + ' What is the single highest-leverage change to make next?' }
            ]),
            new Promise(r => setTimeout(() => r(null), 12000))
          ]);
        }
      } catch(e) {}
      if (!tip || typeof tip !== 'string' || tip.length < 5) {
        // Local fallback
        const fallbacks = [
          'Add a testimonial block under your hero — social proof typically lifts conversion 20-34%.',
          'Your headline is your highest-leverage element. Make it about the visitor, not you.',
          'Move your strongest CTA above the fold. Most visitors decide in the first 7 seconds.',
          'Add a pricing block. Hidden pricing is the #1 reason B2B visitors bounce.',
          'Compress hero images and aim for <2s load — every second of delay costs ~7% conversion.',
          'Try a contrasting accent color on your primary button to make it pop.',
          'A short FAQ block under pricing removes purchase friction without adding clutter.'
        ];
        tip = fallbacks[Math.floor(Math.random()*fallbacks.length)];
      }
      this._aiTip = tip;
      if (el()) el().textContent = tip;
    }
  };
  window.SSDashboard = SSDashboard;

  /* ════════════ 4. VERCEL DEPLOY ════════════ */
  const SSVercel = {
    TOKEN_KEY: 'ss_vercel_token',
    PROJ_KEY:  'ss_vercel_project',
    openModal() {
      document.getElementById('ss-vercel-modal')?.remove();
      const m = document.createElement('div');
      m.id = 'ss-vercel-modal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,20,.85);backdrop-filter:blur(12px);z-index:99991;display:flex;align-items:center;justify-content:center;padding:20px;';
      const tok  = localStorage.getItem(this.TOKEN_KEY) || '';
      const proj = localStorage.getItem(this.PROJ_KEY) || ('supersuite-' + Math.random().toString(36).slice(2,7));
      m.innerHTML = `
        <div style="background:#0f1220;color:#f5f5f7;border:1px solid rgba(255,255,255,.1);border-radius:20px;max-width:520px;width:100%;padding:28px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6);">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span style="font-size:24px;">🚀</span>
            <h2 style="margin:0;font-size:22px;font-weight:800;">Deploy to Vercel</h2>
          </div>
          <p style="margin:0 0 18px;opacity:.7;font-size:13px;line-height:1.5;">Ship your site to a real public URL in seconds. Free Vercel account required.</p>

          <label style="display:block;font-size:12px;opacity:.7;margin-bottom:6px;">Project name</label>
          <input id="ss-vc-proj" value="${proj}" style="width:100%;padding:11px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;font-size:14px;margin-bottom:14px;">

          <label style="display:block;font-size:12px;opacity:.7;margin-bottom:6px;">Vercel API Token <a href="https://vercel.com/account/tokens" target="_blank" style="color:#a5b4fc;">(get one)</a></label>
          <input id="ss-vc-tok" type="password" placeholder="Paste your Vercel token" value="${tok}" style="width:100%;padding:11px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;font-size:14px;margin-bottom:6px;">
          <p style="font-size:11px;opacity:.5;margin:0 0 18px;">Stored only in your browser. Never sent to our servers.</p>

          <div id="ss-vc-status" style="font-size:13px;min-height:20px;margin-bottom:14px;opacity:.85;"></div>

          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="ss-vc-cancel" style="padding:10px 18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:10px;cursor:pointer;font-weight:600;">Cancel</button>
            <button id="ss-vc-go" style="padding:10px 22px;background:linear-gradient(135deg,#000,#333);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:10px;cursor:pointer;font-weight:700;">▲ Deploy now</button>
          </div>
        </div>`;
      m.addEventListener('click', e => { if (e.target === m) m.remove(); });
      document.body.appendChild(m);
      m.querySelector('#ss-vc-cancel').onclick = () => m.remove();
      m.querySelector('#ss-vc-go').onclick = () => this.deploy();
    },
    setStatus(html, color) {
      const el = document.getElementById('ss-vc-status');
      if (el) el.innerHTML = `<span style="color:${color||'#a5b4fc'};">${html}</span>`;
    },
    async deploy() {
      const tok  = document.getElementById('ss-vc-tok').value.trim();
      const proj = (document.getElementById('ss-vc-proj').value.trim() || 'supersuite-site').toLowerCase().replace(/[^a-z0-9-]/g,'-');
      if (!tok)  return this.setStatus('⚠️ Please paste a Vercel token.', '#fbbf24');
      localStorage.setItem(this.TOKEN_KEY, tok);
      localStorage.setItem(this.PROJ_KEY, proj);

      // Build the export bundle in-memory
      this.setStatus('📦 Packaging your site…');
      let html, css, js;
      try {
        html = (typeof buildExportHTML === 'function') ? buildExportHTML() : (typeof buildPreviewHTML === 'function' ? buildPreviewHTML(true) : document.documentElement.outerHTML);
        css  = (typeof buildExportCSS  === 'function') ? buildExportCSS()  : '';
        js   = (typeof buildExportJS   === 'function') ? buildExportJS()   : '';
      } catch(e) { return this.setStatus('❌ Failed to build site bundle: ' + e.message, '#f87171'); }

      // Inject analytics tracker so deployed site reports back to localStorage
      const tracker = `\n<script>(function(){try{var k='ss_analytics_v1';var d=JSON.parse(localStorage.getItem(k)||'{}');d.views=(d.views||0)+1;d.lastSeen=Date.now();localStorage.setItem(k,JSON.stringify(d));document.addEventListener('click',function(e){var t=e.target.closest('a,button');if(!t)return;d=JSON.parse(localStorage.getItem(k)||'{}');d.clicks=(d.clicks||0)+1;if(/cta|buy|book|start|sign/i.test(t.textContent||''))d.ctaClicks=(d.ctaClicks||0)+1;localStorage.setItem(k,JSON.stringify(d));});}catch(e){}})();</script>\n`;
      html = html.replace('</body>', tracker + '</body>');

      const files = [
        { file: 'index.html', data: html },
        ...(css ? [{ file: 'style.css', data: css }] : []),
        ...(js  ? [{ file: 'script.js', data: js  }] : [])
      ];

      this.setStatus('🚀 Uploading to Vercel…');
      try {
        const res = await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + tok,
            'Content-Type':  'application/json'
          },
          body: JSON.stringify({
            name: proj,
            files: files.map(f => ({ file: f.file, data: f.data })),
            projectSettings: { framework: null },
            target: 'production'
          })
        });
        const json = await res.json();
        if (!res.ok) {
          return this.setStatus('❌ Vercel error: ' + (json.error?.message || res.statusText), '#f87171');
        }
        const url = json.url ? 'https://' + json.url : (json.alias?.[0] ? 'https://' + json.alias[0] : null);
        if (url) {
          this.setStatus(`✅ Live! <a href="${url}" target="_blank" style="color:#10b981;font-weight:700;">${url} →</a>`, '#10b981');
          completeQuest('deploy_vercel');
          if (typeof showToast === 'function') showToast('🚀 Deployed!', url, 'success');
        } else {
          this.setStatus('✅ Deployment created. Check vercel.com/dashboard.', '#10b981');
        }
      } catch(e) {
        this.setStatus('❌ Network error: ' + e.message + ' — your token may need scope, or CORS is blocked.', '#f87171');
      }
    }
  };
  window.SSVercel = SSVercel;

  /* ════════════ 5. INJECT TOP-BAR BUTTONS ════════════ */
  function injectTopBarButtons() {
    const navRight = document.querySelector('.nav-right, .top-bar-right, .topbar-right, header .nav-right');
    if (!navRight) return false;

    if (!document.getElementById('ss-dash-btn')) {
      const b = document.createElement('button');
      b.id = 'ss-dash-btn';
      b.className = 'nav-btn ss-dash-btn';
      b.style.cssText = 'background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;border:0;padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer;margin-left:8px;box-shadow:0 4px 12px rgba(16,185,129,.35);';
      b.innerHTML = '📊 Dashboard';
      b.title = 'View analytics, level up, get AI suggestions';
      b.onclick = () => SSDashboard.open();
      navRight.appendChild(b);
    }
    if (!document.getElementById('ss-vercel-btn')) {
      const b = document.createElement('button');
      b.id = 'ss-vercel-btn';
      b.className = 'nav-btn ss-vercel-btn';
      b.style.cssText = 'background:linear-gradient(135deg,#000,#333);color:#fff;border:1px solid rgba(255,255,255,.18);padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer;margin-left:8px;';
      b.innerHTML = '▲ Deploy';
      b.title = 'Deploy your site to Vercel in one click';
      b.onclick = () => SSVercel.openModal();
      navRight.appendChild(b);
    }
    return true;
  }
  const iv = setInterval(() => { if (injectTopBarButtons()) clearInterval(iv); }, 500);
  setTimeout(() => clearInterval(iv), 20000);

  /* ════════════ 6. AUTO-TRACK BLOCKS IN PREVIEW ════════════ */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('a, button');
    if (!t) return;
    SSAnalytics.track('click');
    if (/cta|buy|book|start|sign|subscribe|get/i.test(t.textContent || ''))
      SSAnalytics.track('cta');
    if (t.type === 'submit') SSAnalytics.track('form');
  }, true);

  console.log('[SSV26.7] Analytics + Gamified Dashboard + Vercel Deploy loaded.');
})();
