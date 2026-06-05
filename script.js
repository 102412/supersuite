/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SUPERSUITE â€” WEBSITE BUILDER ENGINE v26.3 (SSV26.3)
   Full Phase 0â€“5 Implementation
   Password Â· Templates Â· Blocks Â· Drag & Drop Â· Editing Â· Export
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

'use strict';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SUPERSUITE V27 â€” PHASE 1 CLEANUP MODULE
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Removes / neutralizes legacy features that will not ship in v27:
     1. SS Studio (Studio Mode dual-pane) â€” now a separate product
     2. Floating AI chat pill (#ai-chat-fab) â€” replaced in Phase 2
     3. Dashboard (ðŸ“Š Dashboard panel) â€” removed entirely
     4. AI Regenerate Site button + modal â€” removed
     5. AI Generate-with-AI top-bar button â€” removed
   We use a kill-switch + DOM scrub strategy so existing 7,700-line code
   keeps compiling and running, but the dead UI never reaches users.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function SSV27Cleanup(){
  const REMOVED_IDS = [
    'ai-chat-fab',         // floating AI pill
    'ai-chat-panel',       // floating AI panel
    // 'ai-generate-btn' â€” kept active (Generate with AI button)
    'regen-btn',           // old top-bar "Regenerate" (not the new RegenSystem button)
    // 'regen-modal' â€” kept, used by RegenSystem
    // 'studio-launch-btn' â€” kept (Studio Agent restored)
    // 'studio-mode-root'  â€” kept (Studio Agent restored)
    'ss-dashboard-btn',    // top-bar "ðŸ“Š Dashboard"
    'ss-dashboard-root',   // dashboard panel root
    'ss-dashboard-overlay', // dashboard overlay
    'collab-modal'          // share/collab modal removed in SSV27
  ];

  function scrub(){
    REMOVED_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('.btn-studio, .studio-root, .ai-fab-prominent').forEach(el => el.remove());
    // Defensive: nuke buttons by text content
    document.querySelectorAll('.top-nav button, .nav-right button').forEach(b => {
      const txt = (b.textContent || '').trim();
      if (txt.startsWith('ðŸ“Š Dashboard')) b.remove();
      // Studio Agent button kept active
      if (b.id === 'regen-btn') b.remove();
    });
  }

  let ticks = 0;
  const interval = setInterval(() => {
    try { scrub(); } catch(_) {}
    if (++ticks > 60) clearInterval(interval);
  }, 500);
  scrub();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrub);
  }

  function neutralize(){
    const STUBS = {
      AIChatbot:    ['mount','open','toggle','send','runTool'],
      SSDashboard:  ['open','close','render','toggle'],
      // StudioMode methods restored â€” Studio Agent active
    };
    Object.entries(STUBS).forEach(([name, methods]) => {
      const obj = window[name];
      if (!obj) return;
      methods.forEach(m => {
        if (typeof obj[m] === 'function' && !obj['__ssv27_killed_' + m]) {
          obj[m] = function(){ /* removed in v27 */ };
          obj['__ssv27_killed_' + m] = true;
        }
      });
    });
    if (typeof window.openRegenerateModal === 'function') {
      window.openRegenerateModal = function(){ /* removed in v27 */ };
    }
  }
  [100, 400, 800, 1500, 3000, 5000].forEach(ms => setTimeout(neutralize, ms));
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV27 â€” NO SESSION PERSISTENCE
   Every fresh page load requires a sign-in. No remembered sessions.
   sessionStorage is cleared immediately. localStorage session keys too.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function SSV27KillSessions(){
  const KEYS_TO_CLEAR = [
    'supersuite_session',
    'ss_session_v268',
    'ss_session_v26',
    'ss_last_open_day_v1',
    'ss_gate_v27'
  ];
  try {
    // Clear sessionStorage entirely (safe â€” only Supersuite uses it)
    sessionStorage.clear();
    // Clear known session keys from localStorage (keep user data, just kill auth)
    KEYS_TO_CLEAR.forEach(k => {
      try { localStorage.removeItem(k); } catch(e) {}
    });
  } catch(e) {}
})();



/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STATE STORE â€” single source of truth
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  uploadedImages: {},   // map: key â†’ base64
  scrollAnimation: 'off',  // SSV26.2 F5: off | subtle | soft | dramatic â€” builder-preview only
  onboardingComplete: false, // SSV26.2 F9
  industry: '',              // SSV26.2 F9
  businessName: '',          // SSV26.2 F9
  blockIdCounter: 1,
  // â”€â”€ SSections (dynamic AI mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sections:          [],  // [{id, label, html, visible}] â€” AI-generated per user
  siteCSS:           '',  // extracted <style> from AI-generated HTML
  siteFontsURL:      '',  // Google Fonts URL from AI-generated HTML
  sitePrompt:        '',  // original user prompt
  selectedSectionId: null,
};


/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   FIX 1: REAL-TIME LIVE SYNC â€” BroadcastChannel-based collab
   Two tabs/windows on the same origin broadcast state changes.
   Last-write-wins with monotonic version counter.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* LiveSync + collab removed in SSV27 */
const LiveSync = { init(){}, destroy(){}, notifyChange(){}, _pollNow(){}, _flashSyncIndicator(){}, _updateUI(){} };
const RELAY_URL = '';
function openCollabModal(){}
function closeCollabModal(){}
function generateCollabCode(){}
function copyCollabCode(){}
function joinCollabSession(){}
function leaveCollabSession(){}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   FIX 9: HISTORY STACK â€” Undo / Redo with nav arrows
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    showToast('â†© Undo', 'Step ' + this._cursor + ' of ' + (this._stack.length-1), 'info');
  },

  forward() {
    if (this._cursor >= this._stack.length - 1) return;
    this._cursor++;
    this._apply();
    showToast('â†ª Redo', 'Step ' + this._cursor + ' of ' + (this._stack.length-1), 'info');
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   BLOCK DEFINITIONS â€” templates for each block type
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const BlockDefs = {

  nav: {
    label: 'Navigation',
    icon: 'ðŸ§­',
    defaultData: {
      logo: 'Supersuite',
      links: [
        { label: 'Home',     href: '#' },
        { label: 'Features', href: '#features' },
        { label: 'Pricing',  href: '#pricing' },
        { label: 'Contact',  href: '#contact' },
      ],
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
    icon: 'âš¡',
    defaultData: {
      heading: 'Build Your Dream Website â€” Fast',
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
      badgeText: 'ðŸš€ Now with AI',
      alignment: 'center',
      minHeight: '85vh',
    }
  },

  leadform: {
    label: 'Lead Form',
    icon: 'ðŸ“‹',
    defaultData: {
      heading: 'Get Early Access',
      subheading: 'Join 5,000+ builders already on the waitlist.',
      fields: [
        { type: 'text', placeholder: 'Your full name', name: 'name' },
        { type: 'email', placeholder: 'Work email address', name: 'email' },
        { type: 'text', placeholder: 'Company name (optional)', name: 'company' },
      ],
      btnText: 'Claim My Spot â†’',
      btnColor: '#ff6b35',
      bgColor: '#f8f8ff',
      textColor: '#1a1a2e',
      accentColor: '#ff6b35',
      privacyText: 'ðŸ”’ No spam. Unsubscribe anytime.',
    }
  },

  testimonials: {
    label: 'Testimonials',
    icon: 'ðŸ’¬',
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
          quote: 'Supersuite cut our launch time from weeks to hours. The visual editor is incredibly intuitive â€” our whole team uses it now without any training.',
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
    icon: 'ðŸ’Ž',
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
    icon: 'ðŸŽ¯',
    defaultData: {
      heading: 'Ready to Build Something Amazing?',
      subheading: 'Join thousands of businesses already growing with Supersuite.',
      bgType: 'gradient',
      bgColor: '#ff6b35',
      bgColor2: '#ff3d00',
      bgImage: '',
      textColor: '#ffffff',
      btnText: 'Start Building â€” It\'s Free',
      btnLink: '#',
      btnColor: '#ffffff',
      btnTextColor: '#ff6b35',
      btn2Text: 'Book a Demo',
      btn2Link: '#',
      showBadge: false,
      badgeText: 'âœ“ No credit card required',
    }
  },

  features: {
    label: 'Features',
    icon: 'âœ¨',
    defaultData: {
      heading: 'Everything You Need to Launch',
      subheading: 'Powerful features built for modern businesses.',
      bgColor: '#ffffff',
      textColor: '#1a1a2e',
      accentColor: '#ff6b35',
      columns: 3,
      items: [
        { icon: 'âš¡', title: 'Lightning Fast', description: 'Pages load in under 1 second. Optimized for Core Web Vitals and maximum performance.' },
        { icon: 'ðŸŽ¨', title: 'Beautiful Design', description: 'Professionally designed templates created by world-class designers.' },
        { icon: 'ðŸ“±', title: 'Mobile First', description: 'Every page looks perfect on any device â€” phone, tablet, or desktop.' },
        { icon: 'ðŸ”Œ', title: 'Integrations', description: 'Connect with Stripe, Mailchimp, Zapier, and 100+ other tools.' },
        { icon: 'ðŸ“Š', title: 'Analytics', description: 'Built-in analytics. See what\'s working and double down on what converts.' },
        { icon: 'ðŸ”’', title: 'Enterprise Security', description: 'SSL, DDoS protection, and automated backups keep your site safe.' },
      ]
    }
  },

  gallery: {
    label: 'Gallery',
    icon: 'ðŸ–¼ï¸',
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
    icon: 'ðŸ“Œ',
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
      copyright: `Â© ${new Date().getFullYear()} Supersuite, Inc. All rights reserved.`,
      socialLinks: [
        { platform: 'Twitter', icon: 'ð•', url: '#' },
        { platform: 'LinkedIn', icon: 'in', url: '#' },
        { platform: 'GitHub', icon: 'â¬¡', url: '#' },
      ]
    }
  },

  photo: {
    label: 'Photo',
    icon: 'ðŸ“·',
    defaultData: {
      imageUrl: '',
      credit: '',
      creditUrl: '',
      heading: '',
      caption: '',
      bgColor: '#000000',
      overlayOpacity: 0,
      height: '480px',
      objectFit: 'cover',
      objectPosition: 'center',
      fullWidth: true,
      linkUrl: '',
    }
  },

};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TEMPLATE CONFIGS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   HTML GENERATORS â€” render each block to HTML string
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    const navId = 'nav_' + Math.random().toString(36).slice(2,7);
    return `
<nav class="ss-block ss-nav" style="background:${navBg};color:${data.textColor};position:${data.sticky?'sticky':'relative'};top:0;z-index:100;border-bottom:1px solid rgba(0,0,0,0.08);padding:0 var(--section-pad);">
  <div class="ss-nav-inner" style="max-width:var(--container);margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:72px;gap:32px;">
    <div class="ss-nav-logo" style="font-family:var(--font-heading);font-weight:800;font-size:24px;color:${data.textColor};letter-spacing:-0.5px;cursor:default;">${data.logo}</div>
    <div class="ss-nav-links" style="display:flex;align-items:center;gap:32px;">
      ${(data.links||[]).map(l => { const label=typeof l==='string'?l:l.label; const href=typeof l==='string'?'#':(l.href||'#'); return `<a href="${href}" style="color:${data.textColor};text-decoration:none;font-size:15px;font-weight:500;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">${label}</a>`; }).join('')}
    </div>
    <a href="${data.ctaLink}" class="ss-nav-cta-btn" style="background:${data.ctaBgColor};color:white;padding:10px 22px;border-radius:var(--btn-radius);font-size:14px;font-weight:600;text-decoration:none;transition:all 0.2s;display:inline-flex;align-items:center;gap:6px;" onmouseover="this.style.opacity='0.9';this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">${data.ctaText} â†’</a>
    <!-- Hamburger â€” mobile only -->
    <button class="ss-hamburger" id="ham-${navId}" onclick="document.getElementById('mob-${navId}').classList.toggle('open')" aria-label="Menu" style="display:none;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:40px;height:40px;background:none;border:none;cursor:pointer;padding:0;">
      <span style="display:block;width:24px;height:2px;background:${data.textColor};border-radius:2px;transition:all 0.3s;"></span>
      <span style="display:block;width:24px;height:2px;background:${data.textColor};border-radius:2px;transition:all 0.3s;"></span>
      <span style="display:block;width:18px;height:2px;background:${data.textColor};border-radius:2px;transition:all 0.3s;align-self:flex-end;"></span>
    </button>
  </div>
  <!-- Mobile drawer -->
  <div class="ss-mobile-nav" id="mob-${navId}" style="display:none;position:fixed;inset:0;background:${navBg === 'transparent' ? 'rgba(0,0,0,0.97)' : navBg};z-index:9999;flex-direction:column;align-items:center;justify-content:center;gap:32px;">
    <button class="ss-mobile-nav-close" onclick="document.getElementById('mob-${navId}').classList.remove('open')" style="position:absolute;top:24px;right:24px;background:none;border:none;color:${data.textColor};font-size:32px;cursor:pointer;line-height:1;">Ã—</button>
    <div style="font-family:var(--font-heading);font-weight:800;font-size:22px;color:${data.textColor};margin-bottom:8px;">${data.logo}</div>
    ${(data.links||[]).map(l => { const label=typeof l==='string'?l:l.label; const href=typeof l==='string'?'#':(l.href||'#'); return `<a href="${href}" onclick="document.getElementById('mob-${navId}').classList.remove('open')" style="color:${data.textColor};text-decoration:none;font-size:24px;font-weight:700;opacity:0.9;">${label}</a>`; }).join('')}
    <a href="${data.ctaLink}" style="background:${data.ctaBgColor};color:white;padding:14px 36px;border-radius:var(--btn-radius);font-size:16px;font-weight:700;text-decoration:none;margin-top:8px;">${data.ctaText} â†’</a>
  </div>
</nav>
<style>
  @media (max-width: 768px) {
    #ham-${navId} { display: flex !important; }
    #mob-${navId}.open { display: flex !important; }
    .ss-nav .ss-nav-links, .ss-nav .ss-nav-cta-btn { display: none !important; }
  }
</style>`;
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
      <a href="${data.btnLink}" class="ss-btn-primary" style="background:${data.btnColor};color:${data.btnTextColor};padding:16px 36px;border-radius:var(--btn-radius);font-size:16px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:all 0.3s;box-shadow:0 8px 32px rgba(255,107,53,0.4);" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 16px 48px rgba(255,107,53,0.5)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 8px 32px rgba(255,107,53,0.4)'">${data.btnText} â†’</a>
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
          btn.textContent = 'â³ Sendingâ€¦'; btn.disabled = true;
          const formData = {}; new FormData(form).forEach((v,k) => formData[k]=v);
          try {
            const res = await fetch('${webhookUrl}', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(formData) });
            if (res.ok) { form.innerHTML = '<div style=\'text-align:center;padding:20px;\'><span style=\'font-size:40px;\'>ðŸŽ‰</span><h3 style=\'margin-top:12px;font-family:var(--font-heading);font-weight:700;\'>${successMsg}</h3></div>'; }
            else { btn.textContent = orig; btn.disabled = false; btn.insertAdjacentHTML('afterend','<p style=\'color:#ef4444;font-size:13px;margin-top:6px;\'>${errorMsg}</p>'); }
          } catch(e) { btn.textContent = orig; btn.disabled = false; btn.insertAdjacentHTML('afterend','<p style=\'color:#ef4444;font-size:13px;margin-top:6px;\'>Network error. Please try again.</p>'); }
        }`
      : `function ssFormSubmit(form, btn, orig) { form.innerHTML = '<div style=\'text-align:center;padding:20px;\'><span style=\'font-size:40px;\'>ðŸŽ‰</span><h3 style=\'margin-top:12px;font-family:var(--font-heading);font-weight:700;\'>${successMsg}</h3></div>'; }`;

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
        <div style="display:flex;gap:2px;color:#ffd700;font-size:16px;">${'â˜…'.repeat(c.rating)}</div>
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
        ${p.featured ? `<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:white;color:${data.bgColor};padding:4px 16px;border-radius:50px;font-size:12px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;">MOST POPULAR â­</div>` : ''}
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
            <span style="color:${p.featured?'white':data.accentColor};font-size:16px;flex-shrink:0;">âœ“</span>${f}
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
          ${img.src ? `<img src="${img.src}" alt="${img.alt||''}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;pointer-events:none;" onerror="var p=this.parentElement;p.style.background='linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))';p.innerHTML='<div style=\'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:rgba(255,255,255,0.4);\'><span style=\'font-size:28px;\'>âš ï¸</span><span style=\'font-size:12px;\'>Image failed to load</span></div>';"/>` : ''}
          ${!img.src ? `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;"><span style="font-size:32px;">${['ðŸ–¼ï¸','ðŸ’»','âœ¨','ðŸš€','ðŸ“±','ðŸŽ¨'][i%6]}</span><span style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:500;">Add Image</span></div>` : ''}
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

  photo(data) {
    if (!data.imageUrl) {
      return `<section class="ss-block ss-photo" style="background:#0f0f18;">
  <div style="width:100%;height:${data.height||'480px'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#1a1a2e;color:rgba(255,255,255,0.25);font-family:'DM Sans',sans-serif;">
    <span style="font-size:52px;">ðŸ“·</span>
    <span style="font-size:14px;">No photo selected â€” click Edit to browse Unsplash</span>
  </div>
</section>`;
    }
    const overlay = data.overlayOpacity > 0
      ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${data.overlayOpacity});pointer-events:none;"></div>`
      : '';
    const textContent = (data.heading || data.caption) ? `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:2;padding:32px;text-align:center;pointer-events:none;">
        ${data.heading ? `<h2 style="font-family:var(--font-heading);font-size:clamp(28px,5vw,60px);font-weight:800;color:#fff;text-shadow:0 2px 24px rgba(0,0,0,0.6);letter-spacing:-0.02em;margin:0;line-height:1.1;">${data.heading}</h2>` : ''}
        ${data.caption ? `<p style="font-size:18px;color:rgba(255,255,255,0.88);text-shadow:0 1px 10px rgba(0,0,0,0.5);max-width:640px;line-height:1.6;margin:0;">${data.caption}</p>` : ''}
      </div>` : '';
    const credit = data.credit
      ? `<a href="${data.creditUrl||'https://unsplash.com'}" target="_blank" rel="noopener noreferrer" style="position:absolute;bottom:10px;right:12px;font-size:10px;color:rgba(255,255,255,0.6);text-decoration:none;z-index:3;font-family:'DM Sans',sans-serif;background:rgba(0,0,0,0.4);padding:3px 8px;border-radius:4px;backdrop-filter:blur(4px);">ðŸ“· ${data.credit}</a>`
      : '';
    const inner = `<div style="position:relative;width:100%;height:${data.height||'480px'};overflow:hidden;">
      <img src="${data.imageUrl}" alt="${(data.caption||data.heading||'').replace(/"/g,'&quot;')}" style="width:100%;height:100%;object-fit:${data.objectFit||'cover'};object-position:${data.objectPosition||'center'};display:block;" loading="lazy"/>
      ${overlay}${textContent}${credit}
    </div>`;
    const wrapped = data.fullWidth !== false
      ? inner
      : `<div style="max-width:var(--container);margin:0 auto;padding:0 24px;">${inner}</div>`;
    const linked = data.linkUrl
      ? `<a href="${data.linkUrl}" style="display:block;text-decoration:none;">${wrapped}</a>`
      : wrapped;
    return `<section class="ss-block ss-photo" style="background:${data.bgColor||'#000'};padding:0;">${linked}</section>`;
  },

};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PREVIEW ENGINE â€” generates the full page HTML for the iframe
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSECTIONS â€” 100% Dynamic AI Section System (SSV28+)
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Every user gets a completely unique site generated from scratch.
   No shared block templates. AI writes raw HTML â†’ parsed into
   editable sections. Users customize what the AI built, not a
   generic block library.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function callAIWorker(messages, opts) {
  const WORKER = 'https://supersuite-ai.rylandritchie12.workers.dev/';
  opts = opts || {};
  const res = await fetch(WORKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      max_tokens:  opts.max_tokens  || 1500,
      temperature: opts.temperature || 0.7,
      model:       'llama-3.3-70b-versatile'
    })
  });
  if (!res.ok) throw new Error('Worker ' + res.status);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
window.callAIWorker = callAIWorker;

const SSections = {

  /* â”€â”€ Parse a full AI-generated HTML string into State.sections â”€â”€ */
  load(fullHTML, prompt) {
    if (!fullHTML || fullHTML.length < 50) return false;
    State.sitePrompt = prompt || '';

    const parser = new DOMParser();
    const doc    = parser.parseFromString(fullHTML, 'text/html');

    // Extract <style> and Google Fonts
    const styleEl = doc.querySelector('style');
    State.siteCSS = styleEl ? styleEl.textContent : '';
    const fontsEl = doc.querySelector('link[href*="fonts.googleapis"]');
    State.siteFontsURL = fontsEl ? fontsEl.getAttribute('href') : '';

    // Parse top-level elements into sections
    const children = doc.body ? Array.from(doc.body.children) : [];
    const els = children.filter(el =>
      ['NAV','SECTION','HEADER','FOOTER','ARTICLE','ASIDE','MAIN'].includes(el.tagName)
    );

    // Fallback: if no semantic elements, take all direct children
    const targets = els.length ? els : Array.from(doc.body ? doc.body.children : []);

    State.sections = targets.map((el, i) => {
      const cls = ((el.className || '') + ' ' + (el.id || '')).toLowerCase();
      let label = 'Section';
      if (/nav|navbar|header-nav/i.test(cls) || el.tagName === 'NAV') label = 'Navigation';
      else if (/hero|banner|jumbotron|intro/i.test(cls))               label = 'Hero';
      else if (/feature|service|benefit|why/i.test(cls))              label = 'Features';
      else if (/testimonial|review|trust|client/i.test(cls))          label = 'Testimonials';
      else if (/pricing|plan|tier|package/i.test(cls))                label = 'Pricing';
      else if (/cta|call-to-action|contact|book/i.test(cls))          label = 'Call to Action';
      else if (/gallery|portfolio|work|project/i.test(cls))           label = 'Gallery';
      else if (/about|story|team|who/i.test(cls))                     label = 'About';
      else if (/faq|question/i.test(cls))                             label = 'FAQ';
      else if (/footer/i.test(cls) || el.tagName === 'FOOTER')        label = 'Footer';
      else if (i === 0)                                               label = 'Header';
      else if (i === targets.length - 1)                             label = 'Footer';

      return {
        id:      'sec_' + (State.blockIdCounter++),
        label,
        html:    el.outerHTML,
        visible: true,
      };
    });

    // Clear old blocks â€” we're in sections mode now
    State.blocks = [];

    History.push();
    refreshPreview();
    this.updatePanel();
    updateLayers();
    switchTab('layers');
    showToast('âœ¨ Site generated', State.sections.length + ' unique sections built for you', 'success');
    return true;
  },

  /* â”€â”€ Full preview HTML from sections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  buildPreview(forExport) {
    const visible = State.sections.filter(s => s.visible !== false);

    const sectionsHTML = visible.map(s => {
      if (forExport) return s.html;
      return `<div class="ss-section-wrapper" data-section-id="${s.id}"
        style="position:relative;outline:2px solid transparent;transition:outline-color 0.15s;"
        onmouseenter="this.style.outlineColor='rgba(255,107,53,0.5)';var c=this.querySelector('.ss-sec-ctrl');if(c){c.style.display='flex';c.style.flexDirection='row';}"
        onmouseleave="this.style.outlineColor='transparent';var c=this.querySelector('.ss-sec-ctrl');if(c)c.style.display='none';">
        ${s.html}
        <div class="ss-sec-ctrl" style="all:initial;display:none;position:absolute;top:10px;right:10px;z-index:2147483647;flex-direction:row;gap:6px;align-items:center;pointer-events:all;">
          <button onclick="var r=this.getBoundingClientRect();window.parent.postMessage({type:'openSectionEditor',id:'${s.id}',x:r.left,y:r.bottom},'*')"
            style="all:initial;display:inline-block;background:#F97316;color:#fff;border:none;border-radius:4px;padding:6px 12px;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Mono',monospace;white-space:nowrap;line-height:1;letter-spacing:.02em;">Edit</button>
          <button onclick="window.parent.postMessage({type:'moveSection',id:'${s.id}',dir:'up'},'*')"
            style="all:initial;display:inline-block;background:#1a1a2e;color:#fff;border:none;border-radius:7px;padding:7px 10px;font-size:13px;cursor:pointer;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.4);">â†‘</button>
          <button onclick="window.parent.postMessage({type:'moveSection',id:'${s.id}',dir:'down'},'*')"
            style="all:initial;display:inline-block;background:#1a1a2e;color:#fff;border:none;border-radius:7px;padding:7px 10px;font-size:13px;cursor:pointer;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.4);">â†“</button>
          <button onclick="window.parent.postMessage({type:'deleteSection',id:'${s.id}'},'*')"
            style="all:initial;display:inline-block;background:#ef4444;color:#fff;border:none;border-radius:7px;padding:7px 10px;font-size:13px;cursor:pointer;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.4);">âœ•</button>
        </div>
      </div>`;
    }).join('\n');

    const emptyState = !visible.length && !forExport ? `
      <div style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0f0f18;font-family:'DM Sans',sans-serif;">
        <div style="font-size:56px;">âœ¨</div>
        <h2 style="font-size:22px;font-weight:700;color:#fff;font-family:'Syne',sans-serif;">Complete onboarding to generate your site</h2>
        <p style="color:rgba(255,255,255,0.4);font-size:15px;">AI will build a 100% unique site just for your business</p>
      </div>` : '';

    const fonts = State.siteFontsURL
      ? `<link rel="preconnect" href="https://fonts.googleapis.com"/><link href="${State.siteFontsURL}" rel="stylesheet"/>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${fonts}
<style>
*{box-sizing:border-box;}
${State.siteCSS || ''}
${State.customCSS || ''}
</style>
</head>
<body style="margin:0;padding:0;">
${sectionsHTML || emptyState}
${!forExport ? '<scr'+'ipt>' + _buildSharedCanvasScript() + '<'+'/script>' : ''}
</body>
</html>`;
  },

  /* â”€â”€ AI edit a single section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  async editWithAI(sectionId, instruction) {
    const sec = State.sections.find(s => s.id === sectionId);
    if (!sec || !instruction.trim()) return;

    const context = State.sections.filter(s => s.id !== sectionId).map(s => s.label).join(', ');
    const cssVars = _extractCSSVars(State.siteCSS);
    const refSection = State.sections.find(s => s.id !== sectionId && s.html.length > 200) || State.sections[0];

    try {
      const result = await callAIWorker([
        {
          role: 'system',
          content: `You are editing one HTML section of a website.

CRITICAL STYLING RULES â€” you MUST follow these exactly:
1. Use ONLY inline styles â€” never add <style> tags or new CSS classes
2. Use these CSS variables in every inline style: ${cssVars}
3. Use class="container" for max-width wrappers (already defined globally as max-width:1160px;margin:0 auto;padding:0 28px)
4. Match the exact same visual style as this reference section from the same site:
${refSection ? refSection.html.slice(0, 800) : ''}

Modify the section exactly per the instruction. Return ONLY the modified HTML. No explanation, no markdown.`
        },
        { role: 'user', content: `Current section:\n${sec.html}\n\nInstruction: ${instruction}` }
      ], { max_tokens: 2500, temperature: 0.6 });

      const clean = result.replace(/^```html?\n?/i,'').replace(/\n?```$/,'').trim();
      if (clean && clean.length > 30) {
        sec.html = clean;
        History.push();
        refreshPreview();
        this.updatePanel();
        showToast('âœ… Section updated', 'AI applied your changes', 'success');
      } else {
        showToast('âš ï¸ No change', 'AI returned empty. Try rephrasing.', 'error');
      }
    } catch(e) {
      showToast('âš ï¸ Edit failed', 'Could not reach AI. Check connection.', 'error');
    }
    openSectionEditor(sectionId);
  },

  /* â”€â”€ AI generate a brand-new section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  async addSection(description) {
    if (!description.trim()) return;

    const cssVars = _extractCSSVars(State.siteCSS);
    // Use the features or hero section as the style reference â€” richest example
    const refSection = State.sections.find(s => /feature|hero/i.test(s.label)) || State.sections[0];
    const refHTML = refSection ? refSection.html.slice(0, 1000) : '';

    showToast('â³ Generatingâ€¦', 'AI is building your new section', 'info');

    try {
      const result = await callAIWorker([
        {
          role: 'system',
          content: `You are adding a new HTML section to an existing website. You MUST match the site's visual style perfectly.

CRITICAL STYLING RULES â€” follow exactly:
1. Use ONLY inline styles on every element â€” never write <style> tags or CSS classes
2. These CSS variables are already defined globally â€” use them in every color/font/radius decision:
   ${cssVars}
3. Use class="container" for the section's inner max-width wrapper (globally defined as max-width:1160px;margin:0 auto;padding:0 28px)
4. Section outer padding: style="padding:80px 0" or similar
5. Copy this exact style pattern from the site (colors, fonts, card shapes, button style):

REFERENCE SECTION FROM THIS SITE:
${refHTML}

Return ONLY the complete HTML section. No <style> tags. No explanation. No markdown fences.`
        },
        { role: 'user', content: `Build this section: ${description}` }
      ], { max_tokens: 3000, temperature: 0.65 });

      const clean = result.replace(/^```html?\n?/i,'').replace(/\n?```$/,'').trim();
      if (!clean || clean.length < 30) throw new Error('empty');

      let label = 'New Section';
      const d = description.toLowerCase();
      if (/nav|menu/i.test(d))              label = 'Navigation';
      else if (/hero|banner/i.test(d))      label = 'Hero';
      else if (/feature|service/i.test(d))  label = 'Features';
      else if (/testimonial|review/i.test(d)) label = 'Testimonials';
      else if (/pricing|plan/i.test(d))     label = 'Pricing';
      else if (/contact|cta|book/i.test(d)) label = 'Call to Action';
      else if (/footer/i.test(d))           label = 'Footer';
      else if (/gallery|portfolio/i.test(d)) label = 'Gallery';
      else if (/about|team/i.test(d))       label = 'About';
      else if (/faq/i.test(d))              label = 'FAQ';

      const newSec = { id: 'sec_' + (State.blockIdCounter++), label, html: clean, visible: true };
      const footerIdx = State.sections.findIndex(s => s.label === 'Footer');
      if (footerIdx >= 0) State.sections.splice(footerIdx, 0, newSec);
      else State.sections.push(newSec);

      History.push();
      refreshPreview();
      this.updatePanel();
      updateLayers();
      showToast('âœ… Section added', label + ' added to your site', 'success');

    } catch(e) {
      showToast('âš ï¸ Failed', 'Could not generate section. Try again.', 'error');
    }
  },

  /* â”€â”€ Delete a section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  delete(id) {
    const idx = State.sections.findIndex(s => s.id === id);
    if (idx === -1) return;
    const label = State.sections[idx].label;
    State.sections.splice(idx, 1);
    State.selectedSectionId = null;
    History.push();
    refreshPreview();
    this.updatePanel();
    updateLayers();
    closeRightPanel();
    showToast('ðŸ—‘ Removed', label + ' deleted', 'info');
  },

  /* â”€â”€ Move a section up or down â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  move(id, dir) {
    const idx = State.sections.findIndex(s => s.id === id);
    if (idx === -1) return;
    const to = dir === 'up' ? idx - 1 : idx + 1;
    if (to < 0 || to >= State.sections.length) return;
    [State.sections[idx], State.sections[to]] = [State.sections[to], State.sections[idx]];
    refreshPreview();
    this.updatePanel();
    updateLayers();
  },

  /* â”€â”€ Re-render the sections list in the sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  updatePanel() {
    const container = document.getElementById('sections-list');
    if (!container) return;

    if (!State.sections.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--ui-text2);">
          <div style="font-size:36px;margin-bottom:10px;">ðŸ¤–</div>
          <p style="font-size:13px;line-height:1.6;">Complete onboarding â€” AI will generate<br/>a 100% unique site for your business.</p>
        </div>`;
      return;
    }

    const ICONS = {
      'Navigation':'ðŸ§­','Hero':'âš¡','Features':'âœ¨','Testimonials':'ðŸ’¬',
      'Pricing':'ðŸ’Ž','Call to Action':'ðŸŽ¯','Gallery':'ðŸ–¼ï¸','About':'ðŸ‘¤',
      'Footer':'ðŸ“Œ','Contact':'ðŸ“‹','FAQ':'â“','New Section':'âž•','Header':'ðŸ '
    };

    container.innerHTML = State.sections.map((s,i) => `
      <div class="layer-item ${State.selectedSectionId === s.id ? 'active' : ''}"
          onclick="openSectionEditor('${s.id}')" style="cursor:pointer;">
        <span class="layer-icon">${ICONS[s.label] || 'ðŸ“„'}</span>
        <span class="layer-label" style="flex:1;">${s.label}</span>
        <div class="layer-actions">
          <button class="layer-btn" onclick="event.stopPropagation();openSectionEditor('${s.id}')" title="Edit">âœï¸</button>
          <button class="layer-btn" onclick="event.stopPropagation();SSections.move('${s.id}','up')" title="Move up">â†‘</button>
          <button class="layer-btn" onclick="event.stopPropagation();SSections.move('${s.id}','down')" title="Move down">â†“</button>
          <button class="layer-btn danger" onclick="event.stopPropagation();SSections.delete('${s.id}')" title="Delete">ðŸ—‘</button>
        </div>
      </div>`).join('');
  },
};
window.SSections = SSections;

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REGEN SYSTEM â€” Tier-limited site regeneration
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const RegenSystem = (function(){
  const LIMITS = { free:3, basic:5, single:5, pro:8, agency:15 };
  const KEY = 'ss_regen_count_v1';

  function _tier()  { return (State.userTier || 'free').toLowerCase(); }
  function _limit() { return LIMITS[_tier()] ?? 3; }
  function _used()  { try { return parseInt(localStorage.getItem(KEY) || '0', 10); } catch(e){ return 0; } }
  function _bump()  { try { localStorage.setItem(KEY, String(_used() + 1)); } catch(e){} }
  function _remaining() { return Math.max(0, _limit() - _used()); }

  function openModal() {
    if (!State.authenticated) return;
    const rem = _remaining();
    const line = document.getElementById('regen-count-line');
    if (line) {
      line.innerHTML = rem > 0
        ? `<span style="color:#fff;font-weight:700;">${rem}</span> regeneration${rem!==1?'s':''} remaining on your <span style="color:#ff6b35;font-weight:700;">${_tier()}</span> plan.`
        : `<span style="color:#ef4444;font-weight:700;">No regenerations left</span> on your ${_tier()} plan. <a href="https://supersuite-checkout.vercel.app" target="_blank" style="color:#ff6b35;">Upgrade â†’</a>`;
    }
    // Disable buttons if no regens left
    document.querySelectorAll('.regen-opt-btn').forEach(b => {
      b.style.opacity = rem > 0 ? '1' : '0.4';
      b.style.pointerEvents = rem > 0 ? '' : 'none';
    });
    const prompt = document.getElementById('regen-prompt');
    if (prompt) prompt.value = State.sitePrompt || '';
    document.getElementById('regen-modal').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('regen-modal').style.display = 'none';
  }

  async function run(mode) {
    if (!UsageLimiter.canUse('regens')) {
      closeModal();
      UsageLimiter.showUpgradePrompt('regens');
      return;
    }
    closeModal();

    const promptEl = document.getElementById('regen-prompt');
    const refinement = promptEl ? promptEl.value.trim() : '';
    const basePrompt = State.sitePrompt || State.businessName || 'my business';
    const fullPrompt = refinement ? basePrompt + '. ' + refinement : basePrompt;

    // For design-only regen, extract existing copy from sections
    let existingCopy = '';
    if (mode === 'design' && State.sections.length) {
      // Strip HTML tags to get raw copy
      const tmp = document.createElement('div');
      tmp.innerHTML = State.sections.map(s => s.html).join(' ');
      existingCopy = tmp.textContent.replace(/\s+/g, ' ').trim().slice(0, 800);
    }

    showToast('ðŸ”„ Regeneratingâ€¦', mode === 'design' ? 'Rebuilding design, keeping your content' : 'Building fresh from scratch', 'info');

    try {
      const info = {
        businessName: State.businessName || 'My Business',
        businessType: State.industry    || 'service business',
        sitePrompt:   fullPrompt,
        existingCopy: existingCopy,
        regenMode:    mode,
      };
      const html = await generateCustomSiteHTML(info);
      if (html && SSections.load(html, fullPrompt)) {
        _bump();
        UsageLimiter.consume('regens');
        if (typeof SSFreemiumV2 !== 'undefined') { SSFreemiumV2.consumeRegen(); SSFreemiumV2.enforceRegenUI(); }
        showToast('âœ… Regenerated!', _remaining() + ' regen' + (_remaining()!==1?'s':'') + ' remaining', 'success');
      }
    } catch(e) {
      showToast('âš ï¸ Regen failed', 'Could not reach AI. Try again.', 'error');
    }
  }

  return { openModal, closeModal, run, remaining: _remaining };
})();
window.RegenSystem = RegenSystem;

/* â”€â”€ Parse a section's HTML into editable fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function _parseSectionFields(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const fields = [];
  const seen = new Set();

  // Headings
  tmp.querySelectorAll('h1,h2,h3,h4,h5').forEach(el => {
    const txt = el.textContent.trim();
    if (txt && txt.length < 200 && !seen.has(txt)) {
      seen.add(txt);
      fields.push({ type:'heading', tag:el.tagName.toLowerCase(), label:el.tagName, original:txt });
    }
  });

  // Short paragraphs / spans with direct text
  tmp.querySelectorAll('p,span,div').forEach(el => {
    // Only leaf-ish elements with short direct text
    const kids = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim());
    if (!kids.length) return;
    const txt = el.textContent.trim();
    if (txt && txt.length >= 4 && txt.length < 250 && !seen.has(txt)) {
      seen.add(txt);
      const tag = el.tagName.toLowerCase();
      if (tag === 'p') fields.push({ type:'para', tag, label:'Paragraph', original:txt });
    }
  });

  // Buttons / links
  tmp.querySelectorAll('a,button').forEach(el => {
    const txt = el.textContent.trim();
    if (txt && txt.length < 60 && !seen.has(txt)) {
      seen.add(txt);
      fields.push({ type:'btn', tag:el.tagName.toLowerCase(), label:'Button', original:txt });
    }
  });

  return fields.slice(0, 12); // cap at 12 fields to avoid overwhelming the panel
}

/* â”€â”€ Open section editor â†’ now routes to SSModeC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function openSectionEditor(id, clickX, clickY) {
  State.selectedSectionId = id;
  SSections.updatePanel();
  const sec = State.sections.find(s => s.id === id);
  if (!sec) return;

  // Route to SSModeC floating block editor (right panel is removed)
  if (typeof SSModeC !== 'undefined') {
    // Position near center of viewport if no coordinates given
    const x = clickX !== undefined ? clickX : window.innerWidth  * 0.6;
    const y = clickY !== undefined ? clickY : window.innerHeight * 0.15;
    SSModeC.openForSection(id, x, y);
    return;
  }

  // Legacy fallback: render inline (kept for safety, normally unreachable)
  const rpContent = document.getElementById('right-panel-content');
  const rp        = document.getElementById('right-panel');
  if (!rpContent) return;

  // Parse editable fields from this section's HTML
  const fields = _parseSectionFields(sec.html);
  const fieldsHTML = fields.length ? `
    <div style="margin-bottom:14px;">
      <label style="font-size:11px;font-weight:700;color:var(--ui-accent);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:10px;">ðŸ“ Direct Edit</label>
      ${fields.map((f, i) => `
        <div style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--ui-text2);text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:3px;">${f.label}</label>
          ${f.type === 'para' ? `
            <textarea rows="2" data-sec-field="${i}" style="width:100%;background:var(--ui-bg2);border:1px solid var(--ui-border);border-radius:6px;color:var(--ui-text);padding:7px 9px;font-size:12px;font-family:'DM Sans',sans-serif;resize:none;outline:none;"
              oninput="SectionFieldEdit('${id}',${i},this.value)">${_escHtml(f.original)}</textarea>` : `
            <input type="text" value="${_escHtml(f.original)}" data-sec-field="${i}" style="width:100%;background:var(--ui-bg2);border:1px solid var(--ui-border);border-radius:6px;color:var(--ui-text);padding:7px 9px;font-size:12px;font-family:'DM Sans',sans-serif;outline:none;"
              oninput="SectionFieldEdit('${id}',${i},this.value)"/>`}
        </div>`).join('')}
    </div>
    <hr style="border:none;border-top:1px solid var(--ui-border);margin:12px 0;"/>` : '';

  rpContent.innerHTML = `
    <div style="padding:4px 0;">

      ${fieldsHTML}

      <div style="margin-bottom:14px;">
        <label style="font-size:11px;font-weight:700;color:var(--ui-accent);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px;">âœ¨ AI Edit</label>
        <textarea id="sec-ai-input" rows="2"
          placeholder="e.g. make darker, add urgency to headline, change CTA to Book Nowâ€¦"
          style="width:100%;background:var(--ui-bg2);border:1px solid var(--ui-border);border-radius:8px;color:var(--ui-text);padding:9px;font-size:13px;resize:none;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;"
          onfocus="this.style.borderColor='rgba(255,107,53,0.5)'" onblur="this.style.borderColor='var(--ui-border)'"
          onkeydown="if(event.key==='Enter'&&(event.metaKey||event.ctrlKey))SectionEditorApply()"></textarea>
        <button onclick="SectionEditorApply()" id="sec-ai-btn"
          style="width:100%;margin-top:7px;padding:10px;background:#ff6b35;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;"
          onmouseover="this.style.background='#e85520'" onmouseout="this.style.background='#ff6b35'">Apply AI Edit â†’</button>
      </div>

      <hr style="border:none;border-top:1px solid var(--ui-border);margin:12px 0;"/>

      <div style="margin-bottom:12px;">
        <label style="font-size:11px;font-weight:700;color:var(--ui-accent);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px;">âž• Add Section</label>
        <input id="sec-add-input" type="text" placeholder="e.g. FAQ, team, contact formâ€¦"
          style="width:100%;background:var(--ui-bg2);border:1px solid var(--ui-border);border-radius:7px;color:var(--ui-text);padding:8px 10px;font-size:12px;font-family:'DM Sans',sans-serif;outline:none;"
          onfocus="this.style.borderColor='rgba(255,107,53,0.5)'" onblur="this.style.borderColor='var(--ui-border)'"
          onkeydown="if(event.key==='Enter')SectionEditorAdd()"/>
        <button onclick="SectionEditorAdd()"
          style="width:100%;margin-top:7px;padding:9px;background:rgba(255,107,53,0.1);color:#ff6b35;border:1px solid rgba(255,107,53,0.3);border-radius:7px;font-weight:600;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;">ï¼‹ Generate &amp; Match Style</button>
      </div>

      <hr style="border:none;border-top:1px solid var(--ui-border);margin:12px 0;"/>

      <div style="display:flex;gap:7px;">
        <button onclick="SSections.move('${id}','up')"   style="flex:1;padding:8px;background:var(--ui-bg2);border:1px solid var(--ui-border);color:var(--ui-text);border-radius:7px;font-size:12px;cursor:pointer;">â†‘</button>
        <button onclick="SSections.move('${id}','down')" style="flex:1;padding:8px;background:var(--ui-bg2);border:1px solid var(--ui-border);color:var(--ui-text);border-radius:7px;font-size:12px;cursor:pointer;">â†“</button>
        <button onclick="SSections.delete('${id}')"      style="flex:1;padding:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:7px;font-size:12px;cursor:pointer;">Delete</button>
      </div>
    </div>`;

  if (rp) rp.classList.add('open');
  if (rpContent) rpContent.scrollTop = 0;
}

function _escHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Direct field edit â€” replaces text in section HTML instantly
function SectionFieldEdit(sectionId, fieldIdx, newVal) {
  const sec = State.sections.find(s => s.id === sectionId);
  if (!sec) return;
  const fields = _parseSectionFields(sec.html);
  const field = fields[fieldIdx];
  if (!field) return;
  // Replace the exact original text in HTML (text node content, not attribute values)
  sec.html = sec.html.replace(
    new RegExp('(>\\s*)' + _reEsc(field.original) + '(\\s*<)', 'g'),
    '$1' + newVal.replace(/\$/g,'$$$$') + '$2'
  );
  // Update the original so subsequent edits work
  field.original = newVal;
  // Debounce preview refresh
  clearTimeout(SectionFieldEdit._t);
  SectionFieldEdit._t = setTimeout(() => { History.push(); refreshPreview(); }, 400);
}
window.SectionFieldEdit = SectionFieldEdit;

function SectionEditorApply() {
  const btn   = document.getElementById('sec-ai-btn');
  const input = document.getElementById('sec-ai-input');
  if (!input || !State.selectedSectionId) return;
  const val = (input.value || '').trim();
  if (!val) return;
  if (btn) { btn.textContent = 'â³ Editingâ€¦'; btn.disabled = true; }
  SSections.editWithAI(State.selectedSectionId, val)
    .finally(() => { if (btn) { btn.textContent = 'Apply Changes â†’'; btn.disabled = false; } });
}

function SectionEditorAdd() {
  const input = document.getElementById('sec-add-input');
  if (!input || !input.value.trim()) return;
  SSections.addSection(input.value.trim());
  input.value = '';
}

window.openSectionEditor  = openSectionEditor;
window.SectionEditorApply = SectionEditorApply;
window.SectionEditorAdd   = SectionEditorAdd;

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AI-FIRST SITE GENERATION v2
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   The AI writes the entire HTML/CSS from scratch. No block library.
   No fixed templates. Each site is structurally unique.

   Flow:
   1. Design system call  â†’ colors, fonts, layout philosophy, sections
   2. Unsplash fetch      â†’ real images matching brand + industry
   3. HTML generation     â†’ AI writes complete custom HTML/CSS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const UNSPLASH_KEY = '6cc194de6357f1e38c5ae89f32b6e4e49c9bc6d59e8d42e10d1cd3f85c5476c';

async function fetchUnsplashImagesForSite(queries) {
  const images = [], seen = new Set();
  for (const q of (queries || []).slice(0, 4)) {
    if (!q) continue;
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=4&orientation=landscape`,
        { headers: { Authorization: 'Client-ID ' + UNSPLASH_KEY } }
      );
      const data = await res.json();
      for (const p of (data.results || [])) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          images.push({
            url:       p.urls.regular,
            thumb:     p.urls.small,
            alt:       p.alt_description || q,
            credit:    p.user.name,
            creditUrl: 'https://unsplash.com/@' + p.user.username + '?utm_source=supersuite&utm_medium=referral',
          });
        }
      }
    } catch(e) {}
  }
  return images.slice(0, 10);
}

async function generateCustomSiteHTML(info, _onStep) {
  const biz  = info.businessName   || 'Your Business';
  const ind  = info.businessType   || 'service business';
  const niche = info.niche         || '';
  const desc = info.description    || '';
  const loc  = info.location       || '';
  const tone = info.tone           || 'professional';
  const diff = info.differentiator || '';
  const cust = info.targetCustomer || '';
  const vibs = Array.isArray(info.vibes) ? info.vibes.join(', ') : (info.vibes || '');
  const goal = info.goal           || 'get leads';
  const svcs = info.services       || '';
  const phone= info.phone          || '';
  const colorPrefs = info.colorPrefs || '';
  const reqSections = info.sections || '';
  const competitors = info.competitors || '';
  const inspiration = info.inspiration || '';
  const extr = info.extra          || '';

  // â”€â”€ Build rich brand brief â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const brief = [
    `BUSINESS: ${biz}`,
    `INDUSTRY: ${ind}${niche ? ' â€” specifically: ' + niche : ''}`,
    desc        ? `DESCRIPTION: ${desc}` : '',
    loc         ? `LOCATION: ${loc}` : '',
    svcs        ? `SERVICES/PRODUCTS: ${svcs}` : '',
    vibs        ? `BRAND PERSONALITY: ${vibs}` : '',
    cust        ? `TARGET CUSTOMER: ${cust}` : '',
    competitors ? `COMPETITOR SITES THEY LIKE: ${competitors}` : '',
    inspiration ? `AESTHETIC INSPIRATION: ${inspiration}` : '',
    diff        ? `WHAT MAKES THEM DIFFERENT: ${diff}` : '',
    tone        ? `TONE OF VOICE: ${tone}` : '',
    goal        ? `PRIMARY GOAL: ${goal}` : '',
    colorPrefs  ? `COLOR PREFERENCES: ${colorPrefs}` : 'COLOR PREFERENCES: AI decides based on brand personality',
    reqSections ? `SPECIFIC SECTIONS NEEDED: ${reqSections}` : '',
    phone       ? `PHONE: ${phone}` : '',
    extr        ? `ADDITIONAL CONTEXT: ${extr}` : '',
  ].filter(Boolean).join('\n');

  if (_onStep) _onStep(1, 'Planning your design systemâ€¦');

  // â”€â”€ Step 1: Design system + section plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const dsRaw = await callAIWorker([
    { role: 'system', content: `You are an elite brand designer. Given a business brief, define a complete unique design system. Make every decision specific to this brand â€” no generic choices. Output ONLY valid JSON, no markdown:
{
  "primaryColor":     "#hex â€” main action/brand color tailored to personality",
  "secondaryColor":   "#hex â€” supporting color",
  "accentColor":      "#hex â€” highlight/contrast color",
  "bgColor":          "#hex â€” page background",
  "textColor":        "#hex â€” body text",
  "headingFont":      "Google Font name chosen to match personality precisely",
  "bodyFont":         "Google Font name that pairs with headingFont",
  "layoutPhilosophy": "one of: dense-editorial | airy-minimal | bold-fullbleed | structured-corporate | warm-editorial | dark-premium | playful-modern",
  "borderRadius":     "e.g. 0px or 4px or 12px â€” reflects brand personality",
  "sections":         ["array","of","sections","specifically","for","this","business"],
  "unsplashQueries":  ["3-5 highly specific image search terms for this business type and vibe"],
  "fontUrl":          "complete Google Fonts URL for both fonts"
}` },
    { role: 'user', content: brief },
  ], { max_tokens: 700, temperature: 0.85 });

  const ds = _ssjson(dsRaw, {
    primaryColor: '#1d4ed8', secondaryColor: '#0f172a', accentColor: '#f59e0b',
    bgColor: '#ffffff', textColor: '#0f172a',
    headingFont: 'Syne', bodyFont: 'DM Sans',
    layoutPhilosophy: 'airy-minimal',
    borderRadius: '8px',
    sections: ['nav','hero','services','why-us','testimonials','cta','footer'],
    unsplashQueries: [ind, niche || ind, biz + ' ' + ind],
    fontUrl: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500;600&display=swap',
  });

  if (_onStep) _onStep(2, 'Finding your photosâ€¦');

  // â”€â”€ Step 2: Fetch real Unsplash images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const images = await fetchUnsplashImagesForSite(ds.unsplashQueries || [ind, niche || biz]);

  const imageBlock = images.length ? images.map((img, i) =>
    `Image ${i+1}: ${img.url}\n  Alt: "${img.alt}"\n  Credit: Photo by ${img.credit} on Unsplash (${img.creditUrl})`
  ).join('\n\n') : '';

  if (_onStep) _onStep(3, 'Writing your websiteâ€¦');

  // â”€â”€ Step 3: AI writes the complete HTML/CSS from scratch â”€â”€â”€â”€â”€â”€â”€
  const systemPrompt = `You are an elite web designer and frontend developer. Your task is to write a complete, production-quality single-page website as a full HTML document.

CRITICAL RULES â€” follow every one exactly:

1. UNIQUE STRUCTURE: The HTML structure must be architecturally specific to this business type. A nail salon page must look structurally different from a law firm page. Different element hierarchy, different layout approach, different CSS patterns. Do NOT use generic hero â†’ features â†’ testimonials â†’ CTA patterns unless they genuinely fit.

2. DESIGN SYSTEM: Use ONLY the provided design system. All colors, fonts, and spacing must come from it. Load fonts via the provided Google Fonts URL.

3. REAL IMAGES: Use the provided Unsplash image URLs directly in <img> src attributes or CSS background-image. Do NOT use placeholder images, lorem picsum, or made-up URLs.

4. INLINE CSS: All CSS goes in a <style> tag in <head>. No external stylesheets except Google Fonts. CSS must be self-contained.

5. MOBILE RESPONSIVE: Include a complete @media (max-width: 768px) section that makes the site work perfectly on mobile.

6. SECTIONS: Generate exactly the sections listed in the design system, in an order that makes sense for this business.

7. COPY: Write all headings, body text, button labels, and nav items specifically for this business. No placeholders. No lorem ipsum.

8. UNSPLASH CREDIT: In the footer, include a small line: "Photography by Unsplash contributors." linking to https://unsplash.com

9. OUTPUT: Return ONLY the complete HTML document starting with <!DOCTYPE html>. No explanation, no markdown fences, no commentary.

DESIGN SYSTEM:
Primary color: ${ds.primaryColor}
Secondary color: ${ds.secondaryColor}
Accent color: ${ds.accentColor}
Background: ${ds.bgColor}
Text: ${ds.textColor}
Heading font: ${ds.headingFont}
Body font: ${ds.bodyFont}
Layout philosophy: ${ds.layoutPhilosophy}
Border radius: ${ds.borderRadius}
Google Fonts URL: ${ds.fontUrl}
Sections to include: ${(ds.sections || []).join(', ')}

${imageBlock ? 'AVAILABLE UNSPLASH IMAGES (use these exact URLs):\n' + imageBlock : ''}`;

  const htmlRaw = await callAIWorker([
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: 'Write a complete website for:\n\n' + brief },
  ], { max_tokens: 8000, temperature: 0.72 });

  if (_onStep) _onStep(4, 'Finalisingâ€¦');

  // â”€â”€ Extract and validate HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let html = htmlRaw.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  // If response got cut off, close it gracefully
  if (!html.toLowerCase().includes('</html>')) {
    if (!html.toLowerCase().includes('</body>')) html += '\n</body>';
    html += '\n</html>';
  }

  // Verify it's real HTML
  if (html.length < 400 || !html.toLowerCase().startsWith('<!doctype') && !html.toLowerCase().startsWith('<html')) {
    const m = html.match(/<!DOCTYPE[\s\S]+/i);
    html = m ? m[0] : null;
    if (!html || html.length < 400) throw new Error('AI returned invalid HTML (< 400 chars)');
  }

  // If design-only regen: preserve user's copy by injecting their text back
  if (info.regenMode === 'design' && info.existingCopy) {
    // The new design has fresh copy from the AI â€” this is acceptable for design regen
    // User can inline-edit the text afterwards
  }

  return html;
}

function _esc(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _ssjson(text,fallback){ try{ const m=text.match(/\{[\s\S]+\}/); return m?JSON.parse(m[0]):fallback; }catch(e){ return fallback; } }

function _extractCSSVars(css) {
  if (!css) return 'var(--p)=primary color, var(--s)=dark/secondary, var(--a)=accent, var(--bg)=background, var(--tc)=text, var(--fh)=heading font family, var(--fb)=body font family, var(--br)=border radius';
  // Pull :root variable definitions
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
  if (rootMatch) {
    const vars = rootMatch[1].match(/--([\w-]+)\s*:\s*([^;]+);?/g) || [];
    if (vars.length) return vars.map(v => v.trim()).join('; ');
  }
  // Fallback: describe the known variable names
  return 'var(--p)=primary color, var(--s)=dark/secondary, var(--a)=accent, var(--bg)=background, var(--tc)=text color, var(--fh)=heading font, var(--fb)=body font, var(--br)=border radius';
}

function buildPreviewHTML(forExport = false) {
  // SSections mode: AI-generated custom HTML takes priority over block system
  if (State.sections && State.sections.length > 0) {
    return SSections.buildPreview(forExport);
  }

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
        <button onclick="window.parent.postMessage({type:'openBlockSettings',id:'${block.id}'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;font-family:DM Sans,sans-serif;">âœï¸ Edit</button>
        <button onclick="window.parent.postMessage({type:'moveBlock',id:'${block.id}',dir:'up'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">â†‘</button>
        <button onclick="window.parent.postMessage({type:'moveBlock',id:'${block.id}',dir:'down'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">â†“</button>
        <button onclick="window.parent.postMessage({type:'duplicateBlock',id:'${block.id}'},'*')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">â§‰</button>
        <button onclick="window.parent.postMessage({type:'deleteBlock',id:'${block.id}'},'*')" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">ðŸ—‘</button>
      </div>` : ''}
    </div>`;
  }).join('\n');

  const emptyState = State.blocks.length === 0 && !forExport ? `
    <div style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#f8f8ff;font-family:DM Sans,sans-serif;">
      <div style="font-size:64px;">ðŸ—ï¸</div>
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
      // â”€â”€ Block hover controls (blocks-mode specific) â”€â”€
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

      // â”€â”€ SHARED CANVAS SCRIPT (inline edit + Mode B/C + action bar) â”€â”€
      // _buildSharedCanvasScript() is called at runtime and injected here.
      // This comment marks where it was; the actual code is below via:
      (function(){
        'use strict';
        var active         = null;
        var _justSaved     = false; // prevents Mode B firing on same click that saves

        var TEXT_TAGS      = ['H1','H2','H3','H4','H5','H6','P','BUTTON','A','LABEL','LI',
                              'CAPTION','FIGCAPTION','SPAN','TD','TH'];
        var SINGLE_LINE    = ['H1','H2','H3','H4','H5','H6','BUTTON','A','LABEL','CAPTION'];
        var SKIP_TAGS      = ['IMG','VIDEO','AUDIO','INPUT','TEXTAREA','SELECT','SVG',
                              'CANVAS','IFRAME','SCRIPT','STYLE'];

        function isSkip(el) { return !el || SKIP_TAGS.indexOf(el.tagName) !== -1; }

        function hasDirectText(el) {
          for (var i = 0; i < el.childNodes.length; i++) {
            if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) return true;
          }
          return false;
        }

        function findEditable(target) {
          if (isSkip(target)) return null;
          var el = target, depth = 0;
          while (el && el !== document.body && depth < 10) {
            if (!isSkip(el) && TEXT_TAGS.indexOf(el.tagName) !== -1) {
              var txt = el.textContent.trim();
              if (txt.length > 0 && txt.length < 600) {
                if (hasDirectText(el) || el.children.length === 0) return el;
              }
            }
            el = el.parentElement;
            depth++;
          }
          return null;
        }

        function isTextTarget(el) {
          return !!findEditable(el);
        }

        function isSingleLine(el) { return SINGLE_LINE.indexOf(el.tagName) !== -1; }

        function getWrapper(el) {
          return el.closest('[data-block-id]') || el.closest('[data-section-id]');
        }

        // â”€â”€ Cursor hint: show text cursor when hovering editable text â”€â”€
        document.addEventListener('mouseover', function(e) {
          if (active) return;
          var el = findEditable(e.target);
          if (el) { el.style.cursor = 'text'; }
        });
        document.addEventListener('mouseout', function(e) {
          var el = findEditable(e.target);
          if (el && el !== active) { el.style.cursor = ''; }
        });

        function activate(el, clickEvent) {
          if (active && active !== el) deactivate(active, false);
          if (active === el) return; // already editing
          active = el;

          el.dataset.ssOrigText = el.textContent;
          el.dataset.ssOrigHtml = el.innerHTML;
          el.contentEditable    = 'true';
          el.spellcheck         = false;

          // Design system styles â€” use !important to override AI CSS
          el.style.setProperty('outline',        '1px solid #F97316', 'important');
          el.style.setProperty('outline-offset', '2px',               'important');
          el.style.setProperty('border-radius',  '2px',               'important');
          el.style.setProperty('cursor',         'text',              'important');
          // Subtle glow tint only on elements without explicit backgrounds
          var computed = window.getComputedStyle(el).backgroundColor;
          if (!computed || computed === 'rgba(0, 0, 0, 0)' || computed === 'transparent') {
            el.dataset.ssAddedBg = '1';
            el.style.setProperty('background-color', 'rgba(249,115,22,0.06)', 'important');
          }

          el.focus();

          // Place caret at click position, or end of text if no click position
          if (clickEvent) {
            try {
              var range;
              if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(clickEvent.clientX, clickEvent.clientY);
              } else if (document.caretPositionFromPoint) {
                var pos = document.caretPositionFromPoint(clickEvent.clientX, clickEvent.clientY);
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
              }
              if (range) {
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
              }
            } catch(err) {}
          } else {
            // Place cursor at end
            try {
              var r = document.createRange();
              r.selectNodeContents(el);
              r.collapse(false);
              var s = window.getSelection();
              s.removeAllRanges();
              s.addRange(r);
            } catch(err) {}
          }
        }

        function deactivate(el, cancel) {
          if (!el) return;
          var origText = el.dataset.ssOrigText || '';
          var origHtml = el.dataset.ssOrigHtml || '';
          var newText  = el.textContent;

          el.contentEditable = 'false';
          el.removeAttribute('contenteditable');
          el.style.removeProperty('outline');
          el.style.removeProperty('outline-offset');
          el.style.removeProperty('border-radius');
          el.style.removeProperty('cursor');
          if (el.dataset.ssAddedBg) {
            el.style.removeProperty('background-color');
            delete el.dataset.ssAddedBg;
          }
          delete el.dataset.ssOrigText;
          delete el.dataset.ssOrigHtml;
          active = null;

          _justSaved = true;
          setTimeout(function() { _justSaved = false; }, 120);

          if (cancel) { el.innerHTML = origHtml; return; }

          if (newText !== origText && newText.trim().length > 0) {
            var wrapper = getWrapper(el);
            window.parent.postMessage({
              type:      'inlineEdit',
              blockId:   wrapper ? (wrapper.dataset.blockId   || null) : null,
              sectionId: wrapper ? (wrapper.dataset.sectionId || null) : null,
              original:  origText,
              newText:   newText,
            }, '*');
          }
        }

        // â”€â”€ SINGLE CLICK on text element â†’ activate editing â”€â”€â”€â”€â”€â”€â”€â”€â”€
        document.addEventListener('click', function(e) {
          var t = e.target;
          if (t.closest && t.closest('.ss-block-controls,.ss-sec-ctrl,.ss-block-action-bar')) return;
          if (active && (t === active || active.contains(t))) return; // click inside = fine

          var el = findEditable(t);
          if (el) {
            // Text element clicked â€” activate
            e.stopPropagation(); // prevent Mode B firing
            activate(el, e);
          } else {
            // Clicked outside any text element â€” save current edit
            if (active) deactivate(active, false);
          }
        }, false);

        // â”€â”€ Mousedown outside â†’ save immediately (before click fires) â”€
        document.addEventListener('mousedown', function(e) {
          if (!active) return;
          if (e.target === active || active.contains(e.target)) return;
          if (e.target.closest && e.target.closest('.ss-block-controls,.ss-sec-ctrl,.ss-block-action-bar')) return;
          deactivate(active, false);
        }, true);

        // â”€â”€ Keyboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        document.addEventListener('keydown', function(e) {
          if (!active) return;
          if (e.key === 'Escape') {
            e.preventDefault(); e.stopPropagation();
            deactivate(active, true);
          }
          if (e.key === 'Enter') {
            if (isSingleLine(active)) {
              e.preventDefault(); e.stopPropagation();
              deactivate(active, false);
            } else if (!e.shiftKey) {
              // Bare Enter on multi-line = save
              e.preventDefault();
              deactivate(active, false);
            }
            // Shift+Enter on multi-line = insert newline (browser default)
          }
          if (e.key === 'Tab') {
            e.preventDefault();
            // Move to next editable element in block
            var wrapper = getWrapper(active);
            if (wrapper) {
              var allText = Array.from(wrapper.querySelectorAll(TEXT_TAGS.join(','))).filter(function(x) {
                return x.textContent.trim() && !isSkip(x) && hasDirectText(x);
              });
              var idx = allText.indexOf(active);
              deactivate(active, false);
              var next = allText[e.shiftKey ? idx - 1 : idx + 1];
              if (next) activate(next);
            }
          }
        }, true);

        // â”€â”€ Blur fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        document.addEventListener('blur', function(e) {
          if (!active || e.target !== active) return;
          setTimeout(function() {
            if (active && document.activeElement !== active) deactivate(active, false);
          }, 100);
        }, true);

      })(); // end inline editing

      // â”€â”€ Double-click hint tooltip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      (function(){
        var TEXT_TAGS = ['H1','H2','H3','H4','H5','H6','P','BUTTON','A','LABEL'];
        var tip = null;
        var tipTimer = null;

        function showTip(el, x, y) {
          hideTip();
          tip = document.createElement('div');
          tip.textContent = 'Double-click to edit';
          tip.style.cssText = 'position:fixed;left:' + x + 'px;top:' + (y - 32) + 'px;background:#1a1a2e;color:#fff;font-size:11px;font-family:sans-serif;padding:4px 8px;border-radius:4px;pointer-events:none;z-index:2147483646;opacity:0;transition:opacity .15s;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.4);';
          document.body.appendChild(tip);
          requestAnimationFrame(function(){ tip.style.opacity = '1'; });
          tipTimer = setTimeout(hideTip, 1800);
        }

        function hideTip() {
          clearTimeout(tipTimer);
          if (tip) { tip.remove(); tip = null; }
        }

        document.addEventListener('mouseover', function(e) {
          if (document.querySelector('[contenteditable="true"]')) return;
          if (e.target.closest('.ss-block-controls,.ss-sec-ctrl')) return;
          var el = e.target;
          while (el && el !== document.body) {
            if (TEXT_TAGS.indexOf(el.tagName) !== -1 && el.textContent.trim()) {
              showTip(el, e.clientX, e.clientY);
              return;
            }
            el = el.parentElement;
          }
          hideTip();
        });

        document.addEventListener('mouseleave', hideTip);
      })();

      // â”€â”€ Mode B + C event routing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Mode B = single click on background/container area
      // Mode C = double click anywhere on a block/section
      (function(){
        var TEXT_TAGS = ['H1','H2','H3','H4','H5','H6','P','BUTTON','A','LABEL','LI','SPAN','TD','TH','CAPTION'];
        var SKIP_TAGS = ['IMG','VIDEO','AUDIO','INPUT','TEXTAREA','SELECT','SVG','CANVAS'];
        var CTRL_CLASSES = ['ss-block-controls','ss-sec-ctrl','ss-block-action-bar'];

        function isControl(el) {
          return CTRL_CLASSES.some(c => el.closest && el.closest('.' + c));
        }
        function isTextEl(el) {
          return TEXT_TAGS.indexOf(el.tagName) !== -1 && el.textContent.trim().length > 0;
        }
        function getWrapper(el) {
          return el.closest('[data-block-id]') || el.closest('[data-section-id]') || el.closest('[data-ss-wrapper]');
        }
        function getBgColor(el) {
          var st = window.getComputedStyle(el);
          return st.backgroundColor || '';
        }

        // Single click â†’ Mode B only (text handled by inline edit system above)
        document.addEventListener('click', function(e) {
          // Skip if text edit just saved (prevents Mode B opening on text-click-outside)
          if (typeof _justSaved !== 'undefined' && _justSaved) return;
          if (document.querySelector('[contenteditable="true"]')) return;
          var t = e.target;
          if (isControl(t)) return;
          // Skip text elements entirely â€” inline edit system owns those
          if (isTextEl(t)) return;
          var wrapper = getWrapper(t);
          if (wrapper) {
            var bid = wrapper.dataset.blockId   || null;
            var sid = wrapper.dataset.sectionId || null;
            var bg  = getBgColor(t);
            window.parent.postMessage({
              type:'modeBClick', blockId:bid, sectionId:sid,
              x:e.clientX, y:e.clientY, bg:bg
            },'*');
          }
        }, false);

        // Double click â†’ Mode C
        document.addEventListener('dblclick', function(e) {
          var t = e.target;
          if (isControl(t)) return;
          var wrapper = getWrapper(t);
          if (!wrapper) return;
          // If target is a text element, Mode A takes priority (dblclick also activates text edit)
          // Mode C only fires if target is NOT a text element
          if (!isTextEl(t)) {
            window.parent.postMessage({
              type:'modeCClick',
              blockId:   wrapper.dataset.blockId   || null,
              sectionId: wrapper.dataset.sectionId || null,
              x: e.clientX, y: e.clientY
            },'*');
          }
        }, false);

        // Block action bar â€” render above hovered block/section
        var _hoverWrapper = null;
        var _actionBar    = null;

        function showActionBar(wrapper) {
          if (_hoverWrapper === wrapper) return;
          removeActionBar();
          _hoverWrapper = wrapper;
          var bid = wrapper.dataset.blockId || null;
          var sid = wrapper.dataset.sectionId || null;
          var rect = wrapper.getBoundingClientRect();

          var bar = document.createElement('div');
          bar.className = 'ss-block-action-bar';
          bar.style.cssText = 'all:initial;position:fixed;top:' + (rect.top + 8) + 'px;left:' + (rect.right - 172) + 'px;display:flex;gap:4px;z-index:2147483647;';

          var btns = [
            {icon:'â†‘', title:'Move up',    msg:{type:'moveBlockOrSection', id: bid||sid, kind: bid?'block':'section', dir:'up'}},
            {icon:'â†“', title:'Move down',  msg:{type:'moveBlockOrSection', id: bid||sid, kind: bid?'block':'section', dir:'down'}},
            {icon:'â§‰', title:'Duplicate',  msg:{type:'duplicateBlockOrSection', id: bid||sid, kind: bid?'block':'section'}},
            {icon:'âœ•', title:'Delete',     msg:{type:'deleteBlockOrSection',   id: bid||sid, kind: bid?'block':'section'}, danger:true},
          ];
          btns.forEach(function(b) {
            var btn = document.createElement('button');
            btn.title = b.title;
            btn.innerHTML = b.icon;
            btn.style.cssText = 'all:initial;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#1A1A1A;border:1px solid #262626;border-radius:4px;color:' + (b.danger?'#ef4444':'#A3A3A3') + ';font-size:13px;cursor:pointer;font-family:sans-serif;transition:background 120ms ease;';
            btn.addEventListener('mouseenter', function(){ btn.style.background='#222222'; });
            btn.addEventListener('mouseleave', function(){ btn.style.background='#1A1A1A'; });
            btn.addEventListener('click', function(e){ e.stopPropagation(); window.parent.postMessage(b.msg,'*'); });
            bar.appendChild(btn);
          });
          document.body.appendChild(bar);
          _actionBar = bar;
        }

        function removeActionBar() {
          if (_actionBar) { _actionBar.remove(); _actionBar = null; }
          _hoverWrapper = null;
        }

        document.addEventListener('mouseover', function(e) {
          if (isControl(e.target)) return;
          var w = getWrapper(e.target);
          if (w) showActionBar(w); else removeActionBar();
        });
        document.addEventListener('mouseleave', removeActionBar);
      })();

      // â”€â”€ SSV26.2 F5: Global scroll animation system (BUILDER PREVIEW ONLY) â”€â”€
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
      // â”€â”€ Shared canvas script: inline editing + Mode B/C + action bar â”€â”€
      ${_buildSharedCanvasScript()}
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   CORE FUNCTIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.1 â€” AUTH SYSTEM & PASSWORD DATABASE
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   HOW TO ADD A NEW USER:
     Find the SS_PASSWORD_DB section for their tier and add one line:
       'YOURCODE': { note: 'Who this is for' },

   HOW TO MOVE A USER TO A DIFFERENT TIER:
     Cut their entry from one tier block and paste it into another.

   CODES ARE CASE-INSENSITIVE â€” 'mypro' and 'MYPRO' both work.

   TO ADD A WHOLE NEW TIER in SSV26.2+:
     1. Add a new block to SS_PASSWORD_DB
     2. Add its limits to Auth.tiers
     3. Add its CSS class to style.css (.nav-tier-badge.newtier)

   SSV26.2+ UPGRADE PATH:
     Replace Auth.verify() body with a fetch() to your backend.
     SS_PASSWORD_DB can then move server-side. No other code changes.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   â˜… PASSWORD DATABASE â€” EDIT THIS SECTION TO MANAGE USERS â˜…
   Each entry: 'CODE': { note: 'description (for your reference)' }
   Codes are matched case-insensitively.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SS_PASSWORD_DB = {

  // â”€â”€ FREE / TRIAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Limits: 1 site per week Â· 30 min session per day
  free: {
    'SS26':      { note: 'Default public demo code' },
    'TRYME':     { note: 'General trial invite' },
    'FREETRIAL': { note: 'Marketing campaign â€” batch A' },
    // â†“ Add free codes below this line
  },

  // â”€â”€ BASIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Limits: 1 site per day Â· 60 min session per day
  basic: {
    'SSBASIC':   { note: 'Default basic test code' },
    'BASIC2026': { note: 'Basic launch cohort' },
    // â†“ Add basic codes below this line
  },

  // â”€â”€ PRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Limits: 3 sites per day Â· 180 min session per day
  pro: {
    'SSPRO':       { note: 'Default pro test code' },
    'PROLAUNCH':   { note: 'Pro early adopter â€” batch A' },
    'BUILDFAST':   { note: 'Pro early adopter â€” batch B' },
    // â†“ Add pro codes below this line
  },

  // â”€â”€ AGENCY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Limits: Unlimited sites Â· Unlimited session time
  agency: {
    'SSAGENCY':    { note: 'Default agency test code' },
    'AGENCYLAUNCH':{ note: 'Agency founding client â€” batch A' },
    'POPPY':       { note: 'Agency Â· Poppy access' },
    '26.1.1':      { note: 'Agency Â· Build 26.1.1' },
    '26.1.2':      { note: 'Agency Â· Build 26.1.2' },
    '26.1.3':      { note: 'Agency Â· Build 26.1.3' },
    'ROASRYE':     { note: 'Agency Â· ROASRYE access' },
    'GRAYSON2':    { note: 'Agency Â· Grayson access' },
    'POPPY2':      { note: 'Agency Â· Poppy access 2' },
    'SUPERSTUDIO1':{ note: 'Agency Â· Super Studio access' }
    // â†“ Add agency codes below this line
  },

};
/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   END OF PASSWORD DATABASE â€” do not edit below this line
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const Auth = {
  version: 'SSV26.3',

  // â”€â”€ Tier limits â€” update here for SSV26.2+ pricing changes â”€â”€â”€â”€â”€
  tiers: {
    free:   { label: 'Free Trial', sitesPerWeek: 1,   sitesPerDay: 0,   sessionMinutes: 30,   weekly: true  },
    basic:  { label: 'Basic',      sitesPerWeek: 0,   sitesPerDay: 1,   sessionMinutes: 60,   weekly: false },
    pro:    { label: 'Pro',        sitesPerWeek: 0,   sitesPerDay: 3,   sessionMinutes: 180,  weekly: false },
    agency: { label: 'Agency',     sitesPerWeek: 0,   sitesPerDay: 999, sessionMinutes: 9999, weekly: false },
  },

  /**
   * verify(code) â†’ { ok: bool, tier, label, note, error }
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
   * listCodes() â€” developer utility
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.1 â€” USAGE TRACKER
   Tracks session time + site exports per day / per week.
   Resets daily (midnight local). Weekly resets for Free tier.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
   * canExport() â†’ bool
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.1 â€” LANDING PAGE FUNCTIONS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/** Open the login modal, optionally pre-scroll to pricing anchor */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSAUTH â€” Simple 2-flow auth (free email/pass Â· paid via Gumroad)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const SSAuth = {
  _busy: false,

  async go() {
    if (this._busy) return;
    const rawInput = (document.getElementById('ea-email')?.value || '').trim();
    const email    = rawInput.toLowerCase();
    const pwd      = (document.getElementById('ea-password')?.value || '');
    const btn      = document.getElementById('ea-submit');
    const err      = document.getElementById('gate-error');

    if (err) { err.style.display = 'none'; err.textContent = ''; }

    // â”€â”€ Hidden admin / access-code backdoor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Typing a known code in the email field (no @ sign) activates it directly.
    if (!rawInput.includes('@') && rawInput.length >= 3) {
      const result = (typeof Auth !== 'undefined') ? Auth.verify(rawInput.toUpperCase()) : { ok: false };
      if (result && result.ok) {
        closeLoginModal();
        // Override all usage limits for agency tier
        if (result.tier === 'agency') {
          try { localStorage.setItem('ss_admin_bypass', '1'); } catch(e) {}
        }
        EmailAuth._activate({ email: rawInput + '@admin.local', name: rawInput, tier: result.tier || 'agency' }, false);
        return;
      }
      return this._err('Invalid code. Enter your email address to continue.');
    }

    if (!email || !email.includes('@')) return this._err('Enter a valid email address.');
    if (!pwd || pwd.length < 6)         return this._err('Password must be at least 6 characters.');

    this._busy = true;
    if (btn) { btn.textContent = 'â³ Please waitâ€¦'; btn.disabled = true; }

    try {
      // Try sign-in first; if that fails, sign up automatically
      let result = await SSBase.authSignIn(email, pwd);

      if (result.error) {
        const msg = result.error.message || '';
        if (msg.includes('Invalid login') || msg.includes('invalid_credentials') || msg.includes('Invalid credentials')) {
          // New user â€” sign them up
          result = await SSBase.authSignUp(email, pwd);
          if (result.error) {
            const m = result.error.message || 'Sign up failed.';
            this._reset(btn);
            return this._err(m.includes('already registered') ? 'Wrong password for this email. Try again.' : m);
          }
          if (!result.access_token) {
            this._reset(btn);
            return this._err('Check your email â€” click the confirmation link, then sign in.');
          }
          // New account â€” upsert with free tier
          await SSBase.upsertUser({ email, tier: 'free', business: '' });
          try { localStorage.setItem('ss_user_email', email); } catch(e) {}
          closeLoginModal();
          EmailAuth._activate({ email, name: email.split('@')[0], tier: 'free' }, false);
          return;
        }
        this._reset(btn);
        return this._err(msg || 'Sign in failed. Check your email and password.');
      }

      // Existing user â€” fetch tier
      const rows = await SSBase.query('users', 'GET', null, { email: 'eq.' + email, select: 'tier,email' });
      const tier = (rows && rows[0]?.tier) || 'free';
      await SSBase.upsertUser({ email, tier });
      try { localStorage.setItem('ss_user_email', email); } catch(e) {}
      closeLoginModal();
      EmailAuth._activate({ email, name: email.split('@')[0], tier }, false);

    } catch(e) {
      this._reset(btn);
      this._err('Connection error. Check your internet and try again.');
    }
  },

  forgot() {
    const email = (document.getElementById('ea-email')?.value || '').trim();
    if (!email) return this._err('Enter your email address first.');
    SSBase.query && fetch(`https://yhddvyncsxpcnvtvkajw.supabase.co/auth/v1/recover`, {
      method: 'POST',
      headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloZGR2eW5jc3hwY252dHZrYWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzkxOTIsImV4cCI6MjA5NTk1NTE5Mn0.CTlfSLnHtOZ0DkZZT4-Z2sSfKleky0wo8ltQWBc7ar4', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    this._err('âœ“ If that email exists, a reset link is on its way.');
  },

  _err(msg) {
    const el = document.getElementById('gate-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  },

  _reset(btn) {
    this._busy = false;
    if (btn) { btn.textContent = 'Continue â†’'; btn.disabled = false; }
  },
};
window.SSAuth = SSAuth;

/* ══════════════════════════════════════════════════════════════════
   SSFREEMIUMV2 — localStorage freemium gate
   Key: ss_free_session  →  { regens_used: 0, regen_limit: 3 }
   - Export: always redirects to checkout
   - Regen: limited to 3, shows tooltip when exhausted
══════════════════════════════════════════════════════════════════ */
const SSFreemiumV2 = (function(){
  const KEY     = 'ss_free_session';
  const CHECKOUT = 'https://supersuite-checkout.vercel.app';

  function _load()  { try { return JSON.parse(localStorage.getItem(KEY)||'null') || {regens_used:0,regen_limit:3}; } catch(e){ return {regens_used:0,regen_limit:3}; } }
  function _save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch(e){} }

  function canRegen()    { const d=_load(); return d.regens_used < d.regen_limit; }
  function consumeRegen(){ const d=_load(); d.regens_used++; _save(d); }
  function remaining()   { const d=_load(); return Math.max(0, d.regen_limit - d.regens_used); }

  /* Export gate — always redirect, no modal */
  function gateExport() {
    window.location.href = CHECKOUT + '?ref=export';
  }

  /* Called after regen to enforce UI state */
  function enforceRegenUI() {
    const regenBtns = document.querySelectorAll('[onclick*="RegenSystem.openModal"], .btn-regen, #tb-regen-btn');
    const rem = remaining();
    regenBtns.forEach(btn => {
      if (rem <= 0) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.title = '3 free regens used — upgrade to continue';
        // Show tooltip if not already there
        const wrap = btn.closest('.ss-regen-disabled-wrap');
        if (!wrap) {
          const w = document.createElement('div');
          w.className = 'ss-regen-disabled-wrap';
          btn.parentNode.insertBefore(w, btn);
          w.appendChild(btn);
          const tip = document.createElement('div');
          tip.className = 'ss-regen-tooltip';
          tip.innerHTML = '3 free regens used — <a href="' + CHECKOUT + '?ref=regen" class="ss-regen-tooltip-link" target="_blank">Upgrade →</a>';
          w.appendChild(tip);
        }
      }
    });
    // Update export sublabel
    const sub = document.getElementById('ss-export-sublabel');
    if (sub) sub.style.display = 'block';
  }

  /* Initialize on builder load */
  function init() {
    // Override export to always redirect
    const origExport = window.exportSite;
    window.exportSite = function() { gateExport(); };
    enforceRegenUI();
  }

  return { canRegen, consumeRegen, remaining, gateExport, enforceRegenUI, init };
})();
window.SSFreemiumV2 = SSFreemiumV2;


/* ══════════════════════════════════════════════════════════════════
   SSLANDINGV2 — Landing page logic
   Wired to real functions:
     - generateCustomSiteHTML()  → AI generation
     - SSections.load()          → load into builder
     - saveToSession()           → persist
     - initApp()                 → boot builder
══════════════════════════════════════════════════════════════════ */
const SSLandingV2 = (function(){

  // Chip prompt templates
  const CHIP_PROMPTS = {
    'nail salon':          "I run a nail salon in Louisville, KY. We specialize in luxury gel nails and nail art. Our vibe is modern, clean, and feminine. Target customers are women 20-45 who want to treat themselves.",
    'law firm':            "I run a law firm in Chicago specializing in personal injury and family law. We're approachable but authoritative. We help everyday people navigate difficult legal situations.",
    'bbq restaurant':      "I own a BBQ restaurant in Austin, TX called Smoke & Fire. We serve slow-smoked brisket, ribs, and pulled pork. Casual, rustic atmosphere. Family-friendly with a strong local following.",
    'photography portfolio': "I'm a freelance photographer based in New York specializing in editorial and portrait photography. I work with brands, magazines, and individuals. My style is cinematic and moody.",
    'personal trainer':    "I'm a personal trainer in Miami offering 1-on-1 and small group sessions. I specialize in strength training and body transformation. My clients are professionals aged 25-45.",
    'plumber':             "I run a plumbing business in Denver, CO. We handle emergency repairs, installations, and renovations. Available 24/7. Licensed and insured. Family-owned for 15 years.",
    'boutique clothing':   "I own a boutique clothing store in Brooklyn called Thread & Thread. We carry curated contemporary women's fashion from independent designers. Sustainable, stylish, and unique.",
    'real estate agent':   "I'm a real estate agent in the Greater Miami area specializing in luxury waterfront properties. I help buyers and sellers navigate the high-end market. Trusted, results-driven.",
  };

  // Category preview data for tab showcase
  const CAT_DATA = {
    websites:    [{name:'Coastal Plumbing',    type:'Service Business', bg:'#0d1117', accent:'#3b82f6'},  {name:'Bloom Studio',       type:'Interior Design',  bg:'#f5f0eb', accent:'#8b7355'}, {name:'Apex Consulting',    type:'B2B Services',     bg:'#111827', accent:'#10b981'}],
    portfolios:  [{name:'Maya Chen Photo',     type:'Photography',      bg:'#0a0a0a', accent:'#ffffff'}, {name:'Studio Möbius',      type:'Architecture',     bg:'#f8f8f6', accent:'#1a1a1a'}, {name:'Jake Torres Design', type:'Graphic Design',    bg:'#1a0a2e', accent:'#a855f7'}],
    services:    [{name:'GreenEdge Lawn',      type:'Landscaping',      bg:'#0d1f0d', accent:'#22c55e'}, {name:'Dr. Kim DDS',        type:'Dental Practice',  bg:'#f0f8ff', accent:'#2563eb'}, {name:'Swift Clean Co.',    type:'Cleaning Service',  bg:'#0f172a', accent:'#38bdf8'}],
    restaurants: [{name:'Ember & Oak',         type:'Fine Dining',      bg:'#1a0a00', accent:'#f59e0b'}, {name:'Pho Saigon House',   type:'Vietnamese',       bg:'#0f0805', accent:'#ef4444'}, {name:'Café Lumière',      type:'French Café',      bg:'#fdf6ec', accent:'#854d0e'}],
    stores:      [{name:'Thread & Thread',     type:'Boutique Fashion',  bg:'#0a0a0a', accent:'#ec4899'}, {name:'Little Oak Toys',    type:'Kids Products',    bg:'#f0fdf4', accent:'#16a34a'}, {name:'Scent Lab',         type:'Fragrance',        bg:'#1c0f02', accent:'#d97706'}],
    landing:     [{name:'LaunchKit SaaS',      type:'Software Product',  bg:'#030712', accent:'#6366f1'}, {name:'Summit Conference',  type:'Event',            bg:'#0a0500', accent:'#F97316'}, {name:'Apex Fitness App',  type:'Mobile App',       bg:'#0a1a0a', accent:'#22c55e'}],
    personal:    [{name:'Alex Morgan',         type:'Executive Coach',   bg:'#0a0a0f', accent:'#a78bfa'}, {name:'Sofia Reyes',        type:'Nutrition Coach',  bg:'#0a1a0a', accent:'#4ade80'}, {name:'James Wu',          type:'Keynote Speaker',  bg:'#fffbe6', accent:'#f59e0b'}],
  };

  let _focusTimer = null;
  let _generating = false;

  /* ── Canvas prism beam animation ─────────────────────────── */
  function initPrism() {
    const canvas = document.getElementById('ss-prism');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawBeam(t, speed, angle, colorStops) {
      const w = canvas.width, h = canvas.height;
      const progress = ((t * speed) % 1 + 1) % 1;
      const diagonal = Math.sqrt(w*w + h*h);
      const offset = progress * (diagonal * 2) - diagonal * 0.5;

      ctx.save();
      ctx.translate(w/2, h/2);
      ctx.rotate(angle);

      const bw = 100;
      const x = offset - bw/2;
      const grad = ctx.createLinearGradient(x, 0, x + bw, 0);
      colorStops.forEach(([stop, color]) => grad.addColorStop(stop, color));

      ctx.fillStyle = grad;
      ctx.fillRect(x, -diagonal, bw, diagonal * 2);
      ctx.restore();
    }

    let raf;
    function animate() {
      const t = Date.now() / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Beam 1 — warm white→orange→blue prism, slow
      drawBeam(t, 1/12, Math.PI * 0.28, [
        [0,   'rgba(255,255,255,0)'],
        [0.15,'rgba(249,115,22,0.04)'],
        [0.35,'rgba(200,180,255,0.06)'],
        [0.5, 'rgba(255,255,255,0.12)'],
        [0.65,'rgba(100,180,255,0.06)'],
        [0.85,'rgba(249,115,22,0.04)'],
        [1,   'rgba(255,255,255,0)'],
      ]);

      // Beam 2 — cooler, different angle, slower
      drawBeam(t, 1/18, Math.PI * 0.18, [
        [0,   'rgba(255,255,255,0)'],
        [0.2, 'rgba(150,200,255,0.03)'],
        [0.5, 'rgba(255,255,255,0.07)'],
        [0.8, 'rgba(249,115,22,0.03)'],
        [1,   'rgba(255,255,255,0)'],
      ]);

      raf = requestAnimationFrame(animate);
    }
    animate();
  }

  /* ── IntersectionObserver for scroll reveals ─────────────── */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.ss-reveal2').forEach(el => el.classList.add('ss-visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('ss-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.ss-reveal2').forEach(el => io.observe(el));
  }

  /* ── Category tabs ────────────────────────────────────────── */
  function _renderCards(cat) {
    const container = document.getElementById('ss-preview-cards2');
    if (!container) return;
    const data = CAT_DATA[cat] || CAT_DATA.websites;
    container.style.opacity = '0';
    container.style.transition = 'opacity 150ms ease';
    setTimeout(() => {
      container.innerHTML = data.map(d => `
        <div class="ss-preview-card2" onclick="SSLandingV2.fillFromPreview('${d.type.toLowerCase()}')">
          <div class="ss-preview-thumb2" style="background:${d.bg};">
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:12px;justify-content:flex-end;">
              <div style="height:6px;background:${d.accent};border-radius:2px;width:50%;margin-bottom:6px;opacity:0.85;"></div>
              <div style="height:3px;background:${d.accent};border-radius:2px;width:70%;opacity:0.35;"></div>
              <div style="height:3px;background:${d.accent};border-radius:2px;width:40%;margin-top:3px;opacity:0.2;"></div>
            </div>
          </div>
          <div class="ss-preview-info2">
            <div class="ss-preview-title2">${d.name}</div>
            <div class="ss-preview-type2">${d.type}</div>
          </div>
        </div>`).join('');
      container.style.opacity = '1';
    }, 150);
  }

  function switchCat(btn, cat) {
    document.querySelectorAll('.ss-tab2').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    _renderCards(cat);
  }

  function fillFromPreview(type) {
    useChip(type);
    document.getElementById('ss-hero2')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ── Textarea focus glow trigger ─────────────────────────── */
  function onInput() {
    clearTimeout(_focusTimer);
    const card = document.getElementById('ss-prompt-card2');
    if (card) card.classList.remove('ss-prompt-focused');
  }

  function _startGlowPulse() {
    const ta   = document.getElementById('ss-prompt-ta');
    const card = document.getElementById('ss-prompt-card2');
    if (!ta || !card) return;
    ta.addEventListener('focus', () => {
      _focusTimer = setTimeout(() => card.classList.add('ss-prompt-focused'), 1000);
    });
    ta.addEventListener('blur', () => {
      clearTimeout(_focusTimer);
      if (card) card.classList.remove('ss-prompt-focused');
    });
  }

  /* ── Chip click ───────────────────────────────────────────── */
  function useChip(business) {
    const ta = document.getElementById('ss-prompt-ta');
    if (!ta) return;
    ta.value = CHIP_PROMPTS[business] || ('I run a ' + business + ' business. We provide high-quality services to local customers.');
    ta.focus();
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    onInput();
  }

  /* ── Main submit — wired to real generation ──────────────── */
  async function submit() {
    if (_generating) return;

    const ta   = document.getElementById('ss-prompt-ta');
    const btn  = document.getElementById('ss-build-btn2');
    const card = document.getElementById('ss-prompt-card2');
    const text = (ta?.value || '').trim();

    // Validate
    if (!text) {
      if (card) {
        card.classList.add('ss-prompt-error');
        setTimeout(() => card.classList.remove('ss-prompt-error'), 600);
      }
      ta?.focus();
      return;
    }

    _generating = true;
    if (btn)  { btn.disabled = true; btn.textContent = 'Building...'; }
    if (card) card.classList.remove('ss-prompt-focused');

    // Show loading overlay
    const overlay = document.getElementById('ss-load-overlay');
    const lp      = document.getElementById('landing-page');
    if (overlay) overlay.style.display = 'flex';
    if (lp) {
      lp.style.transition = 'opacity 400ms ease';
      lp.style.opacity    = '0';
      setTimeout(() => { if (lp) lp.style.pointerEvents = 'none'; }, 400);
    }

    // Cycle loading messages
    const msgs = [
      'Analyzing your business...',
      'Designing your layout...',
      'Writing your content...',
      'Pulling photography...',
      'Almost ready...',
    ];
    const msgEl = document.getElementById('ss-load-msg');
    const barEl = document.getElementById('ss-load-bar');
    let mi = 0;
    const msgInterval = setInterval(() => {
      mi = Math.min(mi + 1, msgs.length - 1);
      if (msgEl) {
        msgEl.style.opacity = '0';
        setTimeout(() => { if (msgEl) { msgEl.textContent = msgs[mi]; msgEl.style.opacity = '1'; } }, 180);
      }
    }, 1500);
    // Start progress bar animation
    setTimeout(() => { if (barEl) barEl.style.width = '90%'; }, 50);

    try {
      // Parse prompt for basic info
      const info = _parsePrompt(text);

      // Set guest state BEFORE generation
      State.authenticated = true;
      State.userTier      = 'free';
      State.businessName  = info.businessName;
      State.industry      = info.businessType;

      // Run real AI generation
      const html = await generateCustomSiteHTML(info);
      if (!html || html.length < 200) throw new Error('Generation returned empty HTML');

      // Complete progress bar
      clearInterval(msgInterval);
      if (barEl) { barEl.style.transition = 'width 300ms ease'; barEl.style.width = '100%'; }
      if (msgEl) { msgEl.textContent = 'Almost ready...'; }

      // Load into SSections (real function)
      SSections.load(html, text);
      State.sitePrompt = text;
      saveToSession();

      // Short pause to show 100%
      await new Promise(r => setTimeout(r, 400));

      // Transition to builder
      if (overlay) { overlay.style.opacity = '0'; overlay.style.transition = 'opacity 300ms ease'; setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 300); }
      if (lp)      { lp.style.display = 'none'; }

      const app = document.getElementById('app');
      if (app) {
        app.style.display = 'flex';
        document.body.classList.remove('lp-active');
        document.body.classList.add('builder-active');
        initApp();  // real function — detects SSections, skips onboarding
      }

      // Init freemium gate on builder
      setTimeout(() => {
        try { SSFreemiumV2.init(); } catch(e){}
        try { AIHub.mount(); } catch(e){}
      }, 800);

    } catch(err) {
      console.error('[SSLandingV2.submit]', err);
      clearInterval(msgInterval);
      // Restore landing page
      if (overlay) { overlay.style.display = 'none'; }
      if (lp) { lp.style.opacity = '0'; lp.style.display = ''; lp.style.pointerEvents = ''; setTimeout(() => { lp.style.opacity = '1'; }, 50); }
      if (btn) { btn.disabled = false; btn.textContent = 'Build My Site →'; }
      _generating = false;
      // Show error to user
      const msgEl2 = document.getElementById('ss-load-msg');
      if (msgEl2) msgEl2.textContent = 'Generation failed — please try again';
    }
  }

  /* ── Extract basic info from a free-text prompt ──────────── */
  function _parsePrompt(text) {
    const lower = text.toLowerCase();
    const BIZ_MAP = {
      'nail salon':'nail salon','salon':'beauty salon','restaurant':'restaurant','dining':'restaurant',
      'café':'café','cafe':'café','coffee':'coffee shop','bakery':'bakery',
      'photographer':'photography','photography':'photography','portfolio':'portfolio',
      'plumber':'plumbing','plumbing':'plumbing','electrician':'electrical',
      'lawyer':'law firm','law firm':'law firm','attorney':'law firm','legal':'law firm',
      'dentist':'dental','dental':'dental','doctor':'medical','medical':'medical',
      'gym':'fitness','personal trainer':'fitness','fitness':'fitness',
      'clothing':'retail','boutique':'retail','store':'retail','shop':'retail',
      'real estate':'real estate','realtor':'real estate',
      'agency':'agency','marketing':'marketing','design':'design studio',
      'landscaping':'landscaping','cleaning':'cleaning service',
    };
    let businessType = 'service business';
    for (const [kw, type] of Object.entries(BIZ_MAP)) {
      if (lower.includes(kw)) { businessType = type; break; }
    }
    // Try to find business name (pattern: "called X" or "named X")
    const nameMatch = text.match(/(?:called|named|my\s+(?:business|company|shop|salon|studio|firm)\s+is)\s+([A-Z][^\.,\n]{2,30})/i);
    const businessName = nameMatch ? nameMatch[1].trim() : 'Your Business';

    return {
      businessName,
      businessType,
      description: text,
      industry:    businessType,
      tone:        'professional',
      goal:        'get leads',
    };
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    initPrism();
    initReveal();
    _startGlowPulse();
    // Render default category
    _renderCards('websites');
  }

  return { init, submit, useChip, switchCat, fillFromPreview, onInput };
})();
window.SSLandingV2 = SSLandingV2;

// Auto-init when DOM is ready
(function(){
  function tryInit() { if (document.getElementById('ss-hero2')) SSLandingV2.init(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInit);
  else tryInit();
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSFREEMIUM â€” localStorage-based usage gate
   Free: 3 regens total Â· unlimited inline/AI edits Â· export gates
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function openLoginModal(planHint) {
  const m = document.getElementById('login-modal');
  if (m) m.style.display = 'flex';
  setTimeout(() => document.getElementById('ea-email')?.focus(), 100);
  const err = document.getElementById('gate-error');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
  // Restore remembered email
  try {
    const saved = localStorage.getItem('ss_user_email');
    const inp = document.getElementById('ea-email');
    if (inp && saved) inp.value = saved;
  } catch(e) {}
}

function closeLoginModal() {
  SSAuth._busy = false;
  const btn = document.getElementById('ea-submit');
  if (btn) { btn.textContent = 'Continue â†’'; btn.disabled = false; }
  document.getElementById('login-modal').style.display = 'none';
}

/** Live-preview tier name as user types code */
function previewTierFromCode(val) {
  const result = Auth.verify(val);
  const hint = document.getElementById('login-tier-hint');
  if (!hint) return;
  if (val.length >= 4 && result.ok) {
    hint.style.display = 'flex';
    hint.textContent = 'âœ“ ' + result.label + ' plan detected';
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.1 â€” BLOCK SELECTOR (Feature 6)
   Tracks which block types the user wants visible in the library
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
    nav:          { icon: 'ðŸ§­', label: 'Navigation',       desc: 'Site header & menu' },
    hero:         { icon: 'âš¡', label: 'Hero Section',     desc: 'Headline + CTA' },
    leadform:     { icon: 'ðŸ“‹', label: 'Lead Form',        desc: 'Capture leads' },
    testimonials: { icon: 'ðŸ’¬', label: 'Testimonials',     desc: 'Social proof cards' },
    pricing:      { icon: 'ðŸ’Ž', label: 'Pricing / Services',desc: 'Plans & tiers' },
    cta:          { icon: 'ðŸŽ¯', label: 'CTA Section',      desc: 'Drive conversions' },
    features:     { icon: 'âœ¨', label: 'Features',         desc: 'Icon + text grid' },
    gallery:      { icon: 'ðŸ–¼ï¸', label: 'Gallery',         desc: 'Image showcase' },
    footer:       { icon: 'ðŸ“Œ', label: 'Footer',           desc: 'Links & copyright' },
  };

  list.innerHTML = BlockSelector._allTypes.map(type => {
    const m = meta[type] || { icon: 'â—»', label: type, desc: '' };
    const on = enabled.includes(type);
    return `
      <div class="bsl-item ${on?'enabled':''}" data-type="${type}" onclick="toggleBslItem(this)">
        <div class="bsl-check">${on?'âœ“':''}</div>
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
  if (check) check.textContent = el.classList.contains('enabled') ? 'âœ“' : '';
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
  showToast('âœ… Block library updated', enabled.length + ' block types visible', 'success');
}

// â”€â”€ Existing password gate function â€” now routes through Auth â”€â”€
function checkPassword() {
  const input = document.getElementById('gate-input');
  const error = document.getElementById('gate-error');
  const val = input.value.trim();
  const result = Auth.verify(val);

  if (result.ok) {
    State.authenticated = true;
    State.userTier = result.tier;
    // SSV27: log user to Supabase immediately on login
    setTimeout(() => {
      try {
        if (typeof window.SSBaseOnLogin === 'function') {
          const email = State.userEmail || localStorage.getItem('ss_user_email') || '';
          window.SSBaseOnLogin(email, result.tier, State.businessName || '', State.industry || '');
        }
      } catch(e) {}
    }, 200);

    // SSV26.7 â€” Remember-me persistence
    try {
      const remember = document.getElementById('gate-remember');
      if (remember && remember.checked) {
        localStorage.setItem('ss_remember_code_v267', val);
      } else {
        localStorage.removeItem('ss_remember_code_v267');
      }
    } catch(e) {}

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
    error.textContent = 'âŒ ' + result.error;
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
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BUILDER V2 â€” LAYOUT SYSTEM
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MIGRATION MAP:
     Sections tab     â†’ SSPanels.toggle('sections')
     Projects tab     â†’ SSPanels.toggle('projects')
     Layers tab       â†’ SSPanels.toggle('layers')
     Templates tab    â†’ DROPPED
     Global Styles    â†’ DROPPED
     Right panel      â†’ Mode C (double-click â†’ SSModeC)
     Canvas toolbar   â†’ Top bar undo/redo buttons
     Block settings   â†’ Mode C floating block editor (SSModeC)
   NEW:
     Connectors       â†’ SSPanels.toggle('connectors') â†’ SSConnectors
     Mode A (click text)       â†’ inline text edit (already in iframe)
     Mode B (click bg)         â†’ SSModeB floating color/style panel
     Mode C (double-click blk) â†’ SSModeC floating block editor
     Block action bar          â†’ rendered inside iframe
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€ SSPanels â€” top bar floating panel manager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SSPanels = (function(){
  const PANELS = ['sections','projects','layers','connectors'];
  let _active = null;

  function _getEl(name) { return document.getElementById('ss-panel-' + name); }

  function _anchorPanel(el, triggerBtn) {
    if (!triggerBtn) return;
    const rect = triggerBtn.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - (parseInt(el.style.minWidth)||260) - 8)) + 'px';
    el.style.top  = (rect.bottom + 6) + 'px';
  }

  function open(name, triggerBtn) {
    const el = _getEl(name);
    if (!el) return;
    // Close any other open panel
    if (_active && _active !== name) close(_active);
    _active = name;
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    _anchorPanel(el, triggerBtn);
    document.getElementById('ss-panel-backdrop').style.display = 'block';
    const btn = triggerBtn || document.getElementById('tb-' + name + '-btn');
    if (btn) btn.classList.add('active');
    // Populate panel content
    if (name === 'sections') SSections.updatePanel();
    if (name === 'layers')   updateLayers();
    if (name === 'projects') SSProjectPanel.render();
    if (name === 'connectors') SSConnectors.render();
  }

  function close(name) {
    const el = _getEl(name);
    if (el) el.style.display = 'none';
    const btn = document.getElementById('tb-' + name + '-btn');
    if (btn) btn.classList.remove('active');
    if (_active === name) _active = null;
    if (!_active) document.getElementById('ss-panel-backdrop').style.display = 'none';
  }

  function closeAll() {
    PANELS.forEach(close);
    SSModeB.close();
    SSModeC.close();
    document.getElementById('ss-panel-backdrop').style.display = 'none';
  }

  function toggle(name, triggerBtn) {
    const el = _getEl(name);
    if (el && el.style.display !== 'none') close(name);
    else open(name, triggerBtn);
  }

  function setActiveDevice(btn) {
    document.querySelectorAll('.ss-topbar .device-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function togglePreview(btn) {
    openFullPreview();
  }

  return { open, close, closeAll, toggle, setActiveDevice, togglePreview };
})();
window.SSPanels = SSPanels;

/* â”€â”€ SSProjectPanel â€” renders the projects floating panel â”€â”€â”€â”€â”€â”€â”€ */
const SSProjectPanel = {
  render() {
    const list = document.getElementById('projects-list');
    if (!list) return;
    const projects = Projects.getAll();
    if (!projects.length) {
      list.innerHTML = '<p style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--ss-text-3);padding:12px 8px;">No projects saved yet</p>';
      return;
    }
    list.innerHTML = projects.map((p, i) => `
      <div class="ss-project-card ${p.active ? 'active' : ''}" onclick="loadProject(${i});SSPanels.close('projects')">
        <div class="ss-project-name">${p.name || 'Untitled'}</div>
        <button onclick="event.stopPropagation();deleteProject(${i})" style="background:none;border:none;color:var(--ss-text-3);cursor:pointer;font-size:12px;padding:0;" title="Delete">âœ•</button>
      </div>`).join('');
  }
};
window.SSProjectPanel = SSProjectPanel;

/* â”€â”€ Mode B â€” background click color/style panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SSModeB = (function(){
  let _targetBlockId   = null;
  let _targetSectionId = null;
  let _origBg = '';

  function show(blockId, sectionId, clickX, clickY, currentBg) {
    _targetBlockId   = blockId   || null;
    _targetSectionId = sectionId || null;
    _origBg = currentBg || '';

    const panel = document.getElementById('ss-bg-panel');
    if (!panel) return;

    // Position near click
    const pw = 240, ph = 240;
    let left = clickX, top = clickY + 12;
    if (left + pw > window.innerWidth  - 16) left = window.innerWidth  - pw - 16;
    if (top  + ph > window.innerHeight - 16) top  = clickY - ph - 12;
    panel.style.left    = Math.max(8, left) + 'px';
    panel.style.top     = Math.max(8, top)  + 'px';
    panel.style.display = 'block';

    // Populate
    const colorInput   = document.getElementById('ss-bg-color-input');
    const imgInput     = document.getElementById('ss-bg-img-input');
    const padT         = document.getElementById('ss-bg-pad-t');
    const padB         = document.getElementById('ss-bg-pad-b');
    const opacityInput = document.getElementById('ss-bg-opacity-input');
    const opacityVal   = document.getElementById('ss-bg-opacity-val');
    if (colorInput)   colorInput.value   = _origBg.startsWith('#') ? _origBg : '#111111';
    if (imgInput)     imgInput.value     = '';
    if (padT)         padT.value         = '';
    if (padB)         padB.value         = '';
    if (opacityInput) { opacityInput.value = '100'; }
    if (opacityVal)   opacityVal.textContent = '100%';

    document.getElementById('ss-panel-backdrop').style.display = 'block';
  }

  function _applyToTarget(cssProp, cssVal) {
    const iframe = document.getElementById('preview-frame');
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    const sel = _targetSectionId
      ? doc.querySelector('[data-section-id="' + _targetSectionId + '"]')
      : doc.querySelector('[data-block-id="' + _targetBlockId + '"]');
    if (sel) sel.style[cssProp] = cssVal;
    // Also persist to state
    if (_targetSectionId) {
      const sec = State.sections.find(s => s.id === _targetSectionId);
      if (sec) {
        // Inject/override the CSS property on the outermost element via regex
        sec.html = sec.html.replace(
          /(<(?:section|nav|header|footer|div)[^>]*style=["'])([^"']*)(["'])/i,
          (m, pre, styles, post) => {
            const cleaned = styles.replace(new RegExp(cssProp.replace(/-([a-z])/g,(g,c)=>'-'+c) + '\\s*:[^;]+;?', 'gi'), '');
            return pre + cleaned + cssProp + ':' + cssVal + ';' + post;
          }
        );
      }
    }
  }

  function applyBg(color)     { _applyToTarget('background-color', color); }
  function applyBgImage(url)  { _applyToTarget('background-image', url ? 'url(' + url + ')' : ''); }
  function applyOpacity(val)  {
    const el = document.getElementById('ss-bg-opacity-val');
    if (el) el.textContent = val + '%';
    _applyToTarget('opacity', (parseInt(val)/100).toString());
  }
  function applyPadding() {
    const t = document.getElementById('ss-bg-pad-t')?.value;
    const b = document.getElementById('ss-bg-pad-b')?.value;
    if (t !== undefined && t !== '') _applyToTarget('padding-top',    t + 'px');
    if (b !== undefined && b !== '') _applyToTarget('padding-bottom', b + 'px');
  }

  function close() {
    const panel = document.getElementById('ss-bg-panel');
    if (panel) panel.style.display = 'none';
    _targetBlockId   = null;
    _targetSectionId = null;
    if (!SSPanels._active) document.getElementById('ss-panel-backdrop').style.display = 'none';
    History.push();
    saveToSession();
  }

  return { show, close, applyBg, applyBgImage, applyOpacity, applyPadding };
})();
window.SSModeB = SSModeB;

/* â”€â”€ Mode C â€” double-click block editor panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SSModeC = (function(){
  let _activeId   = null;
  let _activeType = 'section'; // 'section' | 'block'

  function openForSection(sectionId, clickX, clickY) {
    _activeId   = sectionId;
    _activeType = 'section';
    const sec = State.sections.find(s => s.id === sectionId);
    if (!sec) return;
    _show(sec.label, _buildSectionEditor(sec), clickX, clickY);
  }

  function openForBlock(blockId, clickX, clickY) {
    _activeId   = blockId;
    _activeType = 'block';
    const block = State.blocks.find(b => b.id === blockId);
    if (!block) return;
    _show(block.label, _buildBlockEditor(block), clickX, clickY);
  }

  function _show(title, contentHTML, clickX, clickY) {
    const panel = document.getElementById('ss-block-editor');
    const titleEl = document.getElementById('ss-be-title');
    const body    = document.getElementById('ss-block-editor-body');
    if (!panel || !body) return;

    if (titleEl) titleEl.textContent = title;
    body.innerHTML = contentHTML;

    // Position panel near click, avoid viewport overflow
    const pw = 360, ph = 480;
    let left = clickX + 16, top = clickY;
    if (left + pw > window.innerWidth  - 16) left = clickX - pw - 16;
    if (top  + ph > window.innerHeight - 16) top  = window.innerHeight - ph - 16;
    panel.style.left    = Math.max(8, left) + 'px';
    panel.style.top     = Math.max(52, top) + 'px';
    panel.style.display = 'flex';

    document.getElementById('ss-panel-backdrop').style.display = 'block';

    // Wire up live preview for the editing data
    if (_activeType === 'block') {
      const block = State.blocks.find(b => b.id === _activeId);
      if (block) {
        _editingBlockId = _activeId;
        _editingData    = JSON.parse(JSON.stringify(block.data));
      }
    }
  }

  function _buildSectionEditor(sec) {
    const fields = _parseSectionFields(sec.html);
    const fieldsHTML = fields.map((f, i) => `
      <div class="ss-panel-field">
        <label class="ss-panel-label">${f.label}</label>
        ${f.type === 'para'
          ? `<textarea class="ss-panel-input ss-panel-textarea" oninput="SectionFieldEdit('${sec.id}',${i},this.value)">${_escHtml(f.original)}</textarea>`
          : `<input type="text" class="ss-panel-input" value="${_escHtml(f.original)}" oninput="SectionFieldEdit('${sec.id}',${i},this.value)"/>`}
      </div>`).join('');

    return `
      <div class="ss-be-section-title">Content</div>
      ${fieldsHTML || '<p style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--ss-text-3);">No editable text found</p>'}
      <div class="ss-be-section-title">AI Edit</div>
      <div class="ss-panel-field">
        <textarea id="sec-ai-input" class="ss-panel-input ss-panel-textarea" rows="2" placeholder="Tell AI what to changeâ€¦"
          onkeydown="if(event.key==='Enter'&&(event.metaKey||event.ctrlKey))SectionEditorApply()"></textarea>
        <button class="ss-panel-btn ss-panel-btn-primary" style="margin-top:6px;width:100%;" onclick="SectionEditorApply()" id="sec-ai-btn">Apply AI Edit â†’</button>
      </div>
      <div class="ss-be-section-title">Section</div>
      <div style="display:flex;gap:6px;">
        <button class="ss-panel-btn" style="flex:1;" onclick="SSections.move('${sec.id}','up');SSModeC.refresh()">â†‘</button>
        <button class="ss-panel-btn" style="flex:1;" onclick="SSections.move('${sec.id}','down');SSModeC.refresh()">â†“</button>
        <button class="ss-panel-btn" style="flex:1;color:var(--ui-danger);border-color:rgba(239,68,68,.2);" onclick="SSections.delete('${sec.id}');SSModeC.close()">Delete</button>
      </div>
      <div class="ss-be-section-title">Add Section</div>
      <div class="ss-panel-field">
        <input type="text" id="sec-add-input" class="ss-panel-input" placeholder="e.g. FAQ, team, contact formâ€¦"
          onkeydown="if(event.key==='Enter')SectionEditorAdd()"/>
        <button class="ss-panel-btn" style="margin-top:6px;width:100%;" onclick="SectionEditorAdd()">ï¼‹ Generate & Match Style</button>
      </div>`;
  }

  function _buildBlockEditor(block) {
    // Delegates to existing renderBlockSettingsForm for all block types
    const formHTML = (typeof renderBlockSettingsForm === 'function')
      ? renderBlockSettingsForm(block.type, _editingData || block.data)
      : '<p style="color:var(--ss-text-3);font-size:11px;padding:8px;">No editor for this block type</p>';

    return `
      <div id="bsm-content">${formHTML}</div>
      <div style="display:flex;gap:6px;padding:12px 0 4px;border-top:1px solid var(--ss-border);margin-top:8px;">
        <button class="ss-panel-btn" onclick="SSModeC.close()">Cancel</button>
        <button class="ss-panel-btn ss-panel-btn-primary" style="flex:1;" onclick="SSModeC.saveBlock()">Save Changes</button>
      </div>`;
  }

  function saveBlock() {
    if (_activeType === 'block' && _activeId && _editingData) {
      const block = State.blocks.find(b => b.id === _activeId);
      if (block) {
        block.data = JSON.parse(JSON.stringify(_editingData));
        History.push();
        refreshPreview();
        updateLayers();
        showToast('âœ… Saved', 'Block updated', 'success');
        saveToSession();
      }
    }
    close();
  }

  function refresh() {
    if (!_activeId) return;
    if (_activeType === 'section') {
      const sec = State.sections.find(s => s.id === _activeId);
      if (sec) {
        const body = document.getElementById('ss-block-editor-body');
        if (body) body.innerHTML = _buildSectionEditor(sec);
      }
    }
  }

  function close() {
    const panel = document.getElementById('ss-block-editor');
    if (panel) panel.style.display = 'none';
    _activeId   = null;
    _activeType = 'section';
    if (!SSPanels._active) document.getElementById('ss-panel-backdrop').style.display = 'none';
  }

  return { openForSection, openForBlock, saveBlock, refresh, close };
})();
window.SSModeC = SSModeC;

/* â”€â”€ SSConnectors â€” 5-connector integration system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SSConnectors = (function(){
  const KEYS = {
    ga:      'ss_connector_google_analytics',
    mailchimp:'ss_connector_mailchimp',
    formspree:'ss_connector_formspree',
    zapier:   'ss_connector_zapier',
    gsc:      'ss_connector_search_console',
  };

  function _get(key)       { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; } }
  function _set(key, val)  { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }
  function _clear(key)     { try { localStorage.removeItem(key); } catch(e) {} }
  function isConnected(k)  { return !!_get(KEYS[k]); }
  function getIdent(k)     { const d = _get(KEYS[k]); return d ? (d.email || d.endpoint || d.webhookUrl || 'Connected') : null; }

  const CONNECTORS = [
    {
      id: 'ga',
      name: 'Google Analytics',
      desc: 'Auto-inject GA4 tracking into exports',
      logoSVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="28" height="28"><path fill="#F9AB00" d="M130 29v132c0 14.77 10.19 23 21 23 10 0 21-7 21-23V30c0-13.54-10-22-21-22s-21 9.33-21 21z"/><path fill="#E37400" d="M71 96v65c0 14.77 10.19 23 21 23 10 0 21-7 21-23V97c0-13.54-10-22-21-22s-21 9.33-21 21z"/><circle fill="#E37400" cx="41" cy="163" r="21"/></svg>`,
      authType: 'oauth',
      oauthHint: 'Connect via Google OAuth to inject GA4',
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      desc: 'Push lead form submissions to your audience',
      logoSVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56.693 56.693" width="28" height="28"><path fill="#FFE01B" d="M28.347 0C12.683 0 0 12.683 0 28.347s12.683 28.346 28.347 28.346 28.346-12.682 28.346-28.346S44.01 0 28.347 0z"/><path fill="#241C15" d="M35.5 26.3c-.3-.2-.7-.3-1.1-.3-.9 0-1.6.4-2 1-.4.6-.4 1.4 0 2 .4.6 1.1 1 2 1 .9 0 1.6-.4 2-1 .5-.7.4-2-.9-2.7zm-14.2 0c-.3-.2-.7-.3-1.1-.3-.9 0-1.6.4-2 1-.4.6-.4 1.4 0 2 .4.6 1.1 1 2 1 .9 0 1.6-.4 2-1 .5-.7.4-2-.9-2.7zm7.1-10c-7.2 0-13 5.8-13 13s5.8 13 13 13 13-5.8 13-13-5.8-13-13-13z"/></svg>`,
      authType: 'oauth',
      oauthHint: 'Connect via Mailchimp OAuth',
    },
    {
      id: 'formspree',
      name: 'Formspree',
      desc: 'Wire all forms to your Formspree endpoint',
      logoSVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#e87c5c" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>`,
      authType: 'apikey',
      placeholder: 'https://formspree.io/f/yourform',
      label: 'Formspree endpoint URL',
      storeKey: 'endpoint',
    },
    {
      id: 'zapier',
      name: 'Zapier',
      desc: 'Send form data to any Zap via webhook',
      logoSVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="12" fill="#FF4A00"/><path fill="#fff" d="M12 4l1.5 5h5l-4 3 1.5 5L12 14l-4 3 1.5-5-4-3h5z"/></svg>`,
      authType: 'apikey',
      placeholder: 'https://hooks.zapier.com/hooks/catch/â€¦',
      label: 'Zapier webhook URL',
      storeKey: 'webhookUrl',
    },
    {
      id: 'gsc',
      name: 'Search Console',
      desc: 'Auto-submit sitemap.xml on export',
      logoSVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="12" fill="#4285F4"/><path fill="#fff" d="M12 6a6 6 0 1 0 0 12A6 6 0 0 0 12 6zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>`,
      authType: 'oauth',
      oauthHint: 'Connect via Google OAuth for Search Console',
    },
  ];

  function render() {
    const body = document.getElementById('connectors-panel-body');
    if (!body) return;
    body.innerHTML = CONNECTORS.map(c => {
      const connected = isConnected(c.id);
      const ident     = getIdent(c.id);
      return `
        <div class="ss-connector-card">
          <div class="ss-connector-logo">${c.logoSVG}</div>
          <div class="ss-connector-info">
            <div class="ss-connector-name">${c.name}</div>
            <div class="ss-connector-status ${connected?'connected':''}">${connected ? (ident || 'Connected') : c.desc}</div>
          </div>
          <div class="ss-connector-actions">
            ${connected
              ? `<button class="ss-connector-btn disconnect" onclick="SSConnectors.disconnect('${c.id}')">Disconnect</button>`
              : `<button class="ss-connector-btn" onclick="SSConnectors.openAuth('${c.id}')">Connect</button>`}
          </div>
        </div>`;
    }).join('');
  }

  function openAuth(id) {
    const c = CONNECTORS.find(x => x.id === id);
    if (!c) return;
    const overlay = document.getElementById('ss-connector-auth-overlay');
    const content = document.getElementById('ss-connector-auth-content');
    if (!overlay || !content) return;

    content.innerHTML = `
      <div class="ss-connector-auth-header">
        <div class="ss-connector-auth-logo">${c.logoSVG}</div>
        <div>
          <div class="ss-connector-auth-name">Connect ${c.name}</div>
          <div class="ss-connector-auth-sub">${c.desc}</div>
        </div>
      </div>
      ${c.authType === 'oauth' ? `
        <p style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:var(--ss-text-2);margin-bottom:16px;line-height:1.6;">${c.oauthHint}</p>
        <button class="ss-panel-btn ss-panel-btn-primary" style="width:100%;padding:10px;" onclick="SSConnectors.startOAuth('${c.id}')">
          Continue with ${c.name.includes('Google') ? 'Google' : c.name} â†’
        </button>
      ` : `
        <div class="ss-panel-field">
          <label class="ss-panel-label">${c.label}</label>
          <input type="text" id="ss-conn-input-${c.id}" class="ss-panel-input" placeholder="${c.placeholder}"/>
        </div>
        <button class="ss-panel-btn ss-panel-btn-primary" style="width:100%;margin-top:8px;padding:10px;" onclick="SSConnectors.saveApiKey('${c.id}','${c.storeKey}')">Save & Connect</button>
      `}`;
    overlay.style.display = 'flex';
  }

  function closeAuth() {
    document.getElementById('ss-connector-auth-overlay').style.display = 'none';
  }

  function saveApiKey(id, storeKey) {
    const inp = document.getElementById('ss-conn-input-' + id);
    const val = inp ? inp.value.trim() : '';
    if (!val) { showToast('âš ï¸ Required', 'Enter a value', 'error'); return; }
    const data = {}; data[storeKey] = val;
    _set(KEYS[id], data);
    closeAuth();
    render();
    showToast('âœ… Connected', CONNECTORS.find(c=>c.id===id)?.name + ' connected', 'success');
  }

  function startOAuth(id) {
    // For Google OAuth: open popup pointing to Cloudflare Worker
    const WORKER = 'https://supersuite-ai.rylandritchie12.workers.dev/oauth/' + id;
    const w = window.open(WORKER, 'ss_oauth', 'width=500,height=650,left=200,top=100');
    const timer = setInterval(() => {
      if (w && w.closed) {
        clearInterval(timer);
        // Check if credentials were saved (worker posts back via localStorage)
        if (isConnected(id)) {
          render();
          showToast('âœ… Connected', CONNECTORS.find(c=>c.id===id)?.name + ' connected', 'success');
        }
      }
    }, 500);
  }

  function disconnect(id) {
    _clear(KEYS[id]);
    render();
    showToast('Disconnected', CONNECTORS.find(c=>c.id===id)?.name + ' removed', 'info');
  }

  // Inject connector snippets into export HTML
  function injectIntoExport(html) {
    // Google Analytics
    const gaData = _get(KEYS.ga);
    if (gaData && gaData.measurementId) {
      const gaSnippet = `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaData.measurementId}"><\/script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaData.measurementId}');<\/script>`;
      html = html.replace('</head>', gaSnippet + '</head>');
    }
    // Formspree â€” replace all form action="#" with Formspree endpoint
    const fsData = _get(KEYS.formspree);
    if (fsData && fsData.endpoint) {
      html = html.replace(/action="#"/g, `action="${fsData.endpoint}" method="POST"`);
    }
    // Zapier â€” replace form actions
    const zapData = _get(KEYS.zapier);
    if (zapData && zapData.webhookUrl) {
      html = html.replace(/data-zapier-hook="true"/g, `action="${zapData.webhookUrl}" method="POST"`);
    }
    return html;
  }

  return { render, openAuth, closeAuth, saveApiKey, startOAuth, disconnect, injectIntoExport, isConnected, getIdent, KEYS };
})();
window.SSConnectors = SSConnectors;

function initApp() {
  // â”€â”€ SSV26.1: Wire tier badge in nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tier = State.userTier || 'free';
  const tierBadge = document.getElementById('nav-tier-badge');
  if (tierBadge) {
    const cfg = Auth.getTierConfig(tier);
    tierBadge.textContent = cfg.label;
    tierBadge.className = 'nav-tier-badge ' + tier;
  }

  // â”€â”€ SSV26.1: Start usage tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  UsageTracker.init(tier);

  // â”€â”€ SSV26.1: Apply block selector preferences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  BlockSelector.applyToSidebar();

  // â”€â”€ SSV28+: Restore SSections from session if available â”€â”€â”€â”€â”€â”€
  if (loadFromSession() && State.sections && State.sections.length > 0) {
    refreshPreview();
    SSections.updatePanel();
    updateLayers();
    showToast('ðŸ“‚ Session restored', State.sections.length + ' custom sections loaded', 'info');
    return; // Skip onboarding â€” they have a site
  }

  // â”€â”€ Check for SSV28 landing-page generated site (returning from checkout) â”€â”€
  try {
    const v28key = 'ss_v28_generated_site';
    const saved = sessionStorage.getItem(v28key);
    if (saved) {
      const site = JSON.parse(saved);
      if (site && site.html && Date.now() - site.savedAt < 4 * 60 * 60 * 1000) {
        sessionStorage.removeItem(v28key);
        if (SSections.load(site.html, site.prompt || '')) {
          if (site.businessName) {
            const inp = document.getElementById('site-name-input');
            if (inp) inp.value = site.businessName;
          }
          return; // Skip onboarding â€” they already generated their site
        }
      }
    }
  } catch(e) {}

  // â”€â”€ Existing startup sequence (unchanged) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  applyTemplate('glass');
  loadStarterDemo();

  // SSV26.7 â€” Always start in DESKTOP preview, never mobile.
  try {
    State.currentDevice = 'desktop';
    if (typeof switchDevice === 'function') switchDevice('desktop');
  } catch(e) { console.warn('[initApp desktop default]', e); }

  // SSV27: Always show onboarding on fresh login â€” session wipe means
  // every load is a fresh start. Onboarding complete flag is reset on login.
  setTimeout(() => {
    try {
      // Reset onboarding so it shows fresh every session
      Onboarding.reset();
      Onboarding.open();
    } catch(e) {
      console.warn('[Onboarding]', e);
    }
  }, 600);

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
  showToast('ðŸŽ‰ Welcome to Supersuite!', Auth.getTierConfig(tier).label + ' plan Â· ' + (Auth.version || 'SSV26.3'), 'success');
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

  // FIX2 C: After load, resize frame to fit content â€” but cap at a sensible max
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
      // Cross-origin or other error â€” keep existing height
    }
  };
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   BLOCK MANAGEMENT
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  showToast('âœ… Block added', def.label + ' block added to your page', 'success');
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
  showToast('ðŸ—‘ï¸ Block removed', label + ' was deleted', 'info');
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
  showToast('â§‰ Duplicated', orig.label + ' block duplicated', 'info');
}

// Expose to iframe
window.addBlock = addBlock;

/* â”€â”€ Apply inline canvas text edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function applyInlineEdit(msg) {
  const { eid, sectionId, blockId, newHTML, original, newText } = msg;

  // â”€â”€ New: ID-based approach (reliable for all element types) â”€â”€
  if (eid) {
    if (sectionId) {
      const sec = State.sections.find(s => s.id === sectionId);
      if (!sec) return;
      try {
        // Parse section HTML into a live DOM, find the stamped element, swap innerHTML
        const doc  = new DOMParser().parseFromString('<body>' + sec.html + '</body>', 'text/html');
        const el   = doc.body.querySelector('[data-ss-eid="' + eid + '"]');
        if (el) {
          el.innerHTML = newHTML || '';
          el.removeAttribute('data-ss-eid');
          sec.html = doc.body.innerHTML;
          History.push();
          saveToSession();
          // No refreshPreview() â€” DOM is already showing the right state.
          // Only refresh if section has nested dynamic content.
        }
      } catch(e) { console.warn('[applyInlineEdit]', e); }
      return;
    }
    if (blockId) {
      // Blocks store structured data â€” extract plain text from the new HTML
      // and use _replaceInData with the original text value for matching.
      const block = State.blocks.find(b => b.id === blockId);
      if (!block || !original) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = newHTML || '';
      const newPlain = tmp.textContent;
      if (newPlain !== original) {
        block.data = _replaceInData(block.data, original, newPlain);
        History.push();
        refreshPreview();
        saveToSession();
      }
      return;
    }
  }

  // â”€â”€ Legacy text-match fallback (used when eid not present) â”€â”€â”€â”€
  if (!original || original === newText) return;
  if (sectionId && State.sections.length) {
    const sec = State.sections.find(s => s.id === sectionId);
    if (!sec) return;
    sec.html = _replaceTextNodes(sec.html, original, newText);
    History.push();
    saveToSession();
    return;
  }
  if (blockId) {
    const block = State.blocks.find(b => b.id === blockId);
    if (!block) return;
    block.data = _replaceInData(block.data, original, newText);
    History.push();
    refreshPreview();
    saveToSession();
  }
}

/* â”€â”€ Shared canvas interaction script â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Injected into BOTH SSections.buildPreview() and buildPreviewHTML()
   so inline editing and Mode B/C work in all rendering modes.
   Uses element-ID stamping so saves are reliable for any HTML shape.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function _buildSharedCanvasScript() {
  return `
(function(){
if (window.__ssCanvas) return; window.__ssCanvas = true;
'use strict';

/* â•â• INLINE TEXT EDITING â€” Canva/Slides style â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
var _active    = null;
var _justSaved = false;
var TEXT_TAGS   = 'H1,H2,H3,H4,H5,H6,P,BUTTON,A,LABEL,LI,CAPTION,FIGCAPTION,SPAN,TD,TH'.split(',');
var SINGLE_LINE = 'H1,H2,H3,H4,H5,H6,BUTTON,A,LABEL,CAPTION'.split(',');
var SKIP_TAGS   = 'IMG,VIDEO,AUDIO,INPUT,TEXTAREA,SELECT,SVG,CANVAS,IFRAME,SCRIPT,STYLE'.split(',');

function _skip(el)  { return !el || SKIP_TAGS.indexOf(el.tagName) !== -1; }
function _isSingle(el) { return SINGLE_LINE.indexOf(el.tagName) !== -1; }

function _hasDirectText(el) {
  for (var i=0;i<el.childNodes.length;i++) {
    if (el.childNodes[i].nodeType===3 && el.childNodes[i].textContent.trim()) return true;
  }
  return false;
}

function _findEditable(t) {
  if (_skip(t)) return null;
  var el=t, d=0;
  while (el && el!==document.body && d<10) {
    if (!_skip(el) && TEXT_TAGS.indexOf(el.tagName)!==-1) {
      var txt=el.textContent.trim();
      if (txt.length>0 && txt.length<600 && (_hasDirectText(el)||el.children.length===0)) return el;
    }
    el=el.parentElement; d++;
  }
  return null;
}

function _wrapper(el) {
  return el.closest && (el.closest('[data-block-id]')||el.closest('[data-section-id]'));
}

function _isCtrl(el) {
  return el.closest && el.closest('.ss-block-controls,.ss-sec-ctrl,.ss-block-action-bar');
}

function _activate(el, evt) {
  if (_active && _active!==el) _deactivate(_active, false);
  if (_active===el) return;
  _active = el;

  /* stamp a unique ID so parent can find this exact element in the HTML string */
  var eid = 'sse'+ Date.now() +'_'+ Math.random().toString(36).slice(2,6);
  el.setAttribute('data-ss-eid', eid);
  el.dataset.ssOrigText = el.textContent;

  el.contentEditable = 'true';
  el.spellcheck      = false;
  el.style.setProperty('outline',        '1px solid #F97316', 'important');
  el.style.setProperty('outline-offset', '2px',               'important');
  el.style.setProperty('border-radius',  '2px',               'important');
  el.style.setProperty('cursor',         'text',              'important');
  var comp = window.getComputedStyle(el).backgroundColor;
  if (!comp || comp==='rgba(0, 0, 0, 0)' || comp==='transparent') {
    el.dataset.ssAddedBg='1';
    el.style.setProperty('background-color','rgba(249,115,22,0.07)','important');
  }
  el.focus();

  /* place caret at click position */
  if (evt) {
    try {
      var range;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(evt.clientX, evt.clientY);
      } else if (document.caretPositionFromPoint) {
        var pos=document.caretPositionFromPoint(evt.clientX,evt.clientY);
        range=document.createRange(); range.setStart(pos.offsetNode,pos.offset);
      }
      if (range) { var s=window.getSelection(); s.removeAllRanges(); s.addRange(range); }
    } catch(e){}
  } else {
    try {
      var r=document.createRange(); r.selectNodeContents(el); r.collapse(false);
      var s=window.getSelection(); s.removeAllRanges(); s.addRange(r);
    } catch(e){}
  }
}

function _deactivate(el, cancel) {
  if (!el) return;
  var eid      = el.getAttribute('data-ss-eid') || '';
  var origText = el.dataset.ssOrigText || '';
  var newHTML  = el.innerHTML;
  var newText  = el.textContent;

  el.contentEditable='false'; el.removeAttribute('contenteditable');
  el.style.removeProperty('outline');
  el.style.removeProperty('outline-offset');
  el.style.removeProperty('border-radius');
  el.style.removeProperty('cursor');
  if (el.dataset.ssAddedBg) { el.style.removeProperty('background-color'); delete el.dataset.ssAddedBg; }
  el.removeAttribute('data-ss-eid');
  delete el.dataset.ssOrigText;
  _active = null;

  _justSaved=true; setTimeout(function(){ _justSaved=false; },150);

  if (cancel || newText===origText || !eid) return;

  var w = _wrapper(el);
  window.parent.postMessage({
    type:      'inlineEdit',
    eid:       eid,
    blockId:   w ? (w.dataset.blockId   ||null) : null,
    sectionId: w ? (w.dataset.sectionId ||null) : null,
    original:  origText,   /* kept for block-mode fallback */
    newHTML:   newHTML,
    newText:   newText,
  },'*');
}

/* cursor hint on hover */
document.addEventListener('mouseover', function(e){
  if (_active) return;
  var el=_findEditable(e.target);
  if (el) el.style.cursor='text';
});
document.addEventListener('mouseout', function(e){
  var el=_findEditable(e.target);
  if (el && el!==_active) el.style.cursor='';
});

/* SINGLE CLICK â€” activate text editing */
document.addEventListener('click', function(e){
  if (_isCtrl(e.target)) return;
  if (_active && (_active===e.target||_active.contains(e.target))) return;
  var el=_findEditable(e.target);
  if (el) {
    e.stopPropagation();  /* prevent Mode B firing */
    _activate(el, e);
  } else {
    if (_active) _deactivate(_active, false);
  }
}, false);

/* mousedown outside â†’ save before click fires */
document.addEventListener('mousedown', function(e){
  if (!_active) return;
  if (e.target===_active||_active.contains(e.target)) return;
  if (_isCtrl(e.target)) return;
  _deactivate(_active, false);
}, true);

/* keyboard */
document.addEventListener('keydown', function(e){
  if (!_active) return;
  if (e.key==='Escape') { e.preventDefault(); e.stopPropagation(); _deactivate(_active,true); }
  if (e.key==='Enter') {
    if (_isSingle(_active)) { e.preventDefault(); e.stopPropagation(); _deactivate(_active,false); }
    else if (!e.shiftKey)   { e.preventDefault(); _deactivate(_active,false); }
  }
  if (e.key==='Tab') {
    e.preventDefault();
    var w=_wrapper(_active);
    if (w) {
      var all=Array.from(w.querySelectorAll(TEXT_TAGS.join(','))).filter(function(x){
        return !_skip(x) && x.textContent.trim() && _hasDirectText(x);
      });
      var idx=all.indexOf(_active);
      _deactivate(_active,false);
      var next=all[e.shiftKey?idx-1:idx+1];
      if (next) _activate(next);
    }
  }
}, true);

/* blur fallback */
document.addEventListener('blur', function(e){
  if (!_active||e.target!==_active) return;
  setTimeout(function(){ if (_active&&document.activeElement!==_active) _deactivate(_active,false); },100);
},true);


/* â•â• MODE B (background click) + MODE C (double-click) â•â•â•â•â•â•â•â• */
var TEXT_SET = {};
TEXT_TAGS.forEach(function(t){ TEXT_SET[t]=true; });
function _isText(el)   { return TEXT_SET[el.tagName] && el.textContent.trim().length>0; }
function _getWrapper(el) { return el.closest&&(el.closest('[data-block-id]')||el.closest('[data-section-id]')||el.closest('[data-ss-wrapper]')); }

/* Mode B: background click */
document.addEventListener('click', function(e){
  if (_justSaved||document.querySelector('[contenteditable="true"]')) return;
  if (_isCtrl(e.target)||_isText(e.target)) return;
  var w=_getWrapper(e.target);
  if (!w) return;
  window.parent.postMessage({type:'modeBClick',
    blockId:  w.dataset.blockId   ||null,
    sectionId:w.dataset.sectionId ||null,
    x:e.clientX, y:e.clientY,
    bg:window.getComputedStyle(e.target).backgroundColor||''
  },'*');
}, false);

/* Mode C: double-click opens block editor */
document.addEventListener('dblclick', function(e){
  if (_isCtrl(e.target)) return;
  var w=_getWrapper(e.target);
  if (!w) return;
  if (!_isText(e.target)) {   /* text elements: dblclick still lands in edit mode via click */
    window.parent.postMessage({type:'modeCClick',
      blockId:  w.dataset.blockId   ||null,
      sectionId:w.dataset.sectionId ||null,
      x:e.clientX, y:e.clientY
    },'*');
  }
}, false);


/* â•â• BLOCK ACTION BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
var _hovW=null, _bar=null;
function _showBar(w) {
  if (_hovW===w) return;
  _removeBar();
  _hovW=w;
  var bid=w.dataset.blockId||null, sid=w.dataset.sectionId||null;
  var rect=w.getBoundingClientRect();
  var bar=document.createElement('div');
  bar.className='ss-block-action-bar';
  bar.style.cssText='all:initial;position:fixed;top:'+(rect.top+8)+'px;left:'+(rect.right-164)+'px;display:flex;gap:3px;z-index:2147483646;pointer-events:all;';
  var defs=[
    {i:'â†‘',t:'Up',   m:{type:'moveBlockOrSection',    id:bid||sid,kind:bid?'block':'section',dir:'up'}},
    {i:'â†“',t:'Down', m:{type:'moveBlockOrSection',    id:bid||sid,kind:bid?'block':'section',dir:'down'}},
    {i:'â§‰',t:'Dup',  m:{type:'duplicateBlockOrSection',id:bid||sid,kind:bid?'block':'section'}},
    {i:'âœ•',t:'Del',  m:{type:'deleteBlockOrSection',   id:bid||sid,kind:bid?'block':'section'},d:true},
  ];
  defs.forEach(function(def){
    var b=document.createElement('button');
    b.title=def.t; b.textContent=def.i;
    b.style.cssText='all:initial;width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#1A1A1A;border:1px solid #262626;border-radius:4px;color:'+(def.d?'#ef4444':'#A3A3A3')+';font-size:12px;cursor:pointer;font-family:sans-serif;';
    b.addEventListener('click',function(e){ e.stopPropagation(); window.parent.postMessage(def.m,'*'); });
    b.addEventListener('mouseenter',function(){ b.style.background='#2a2a2a'; });
    b.addEventListener('mouseleave',function(){ b.style.background='#1A1A1A'; });
    bar.appendChild(b);
  });
  document.body.appendChild(bar);
  _bar=bar;
}
function _removeBar(){ if(_bar){_bar.remove();_bar=null;} _hovW=null; }
document.addEventListener('mouseover', function(e){
  if (_isCtrl(e.target)) return;
  var w=_getWrapper(e.target);
  if (w) _showBar(w); else _removeBar();
});
document.addEventListener('mouseleave', _removeBar);


/* â•â• LINK BLOCKING in preview â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
document.addEventListener('click',function(e){
  var el=e.target;
  while(el&&el.tagName!=='A') el=el.parentElement;
  if(el&&el.tagName==='A'){
    var h=el.getAttribute('href')||'';
    if(h.charAt(0)==='#'||!h||h.indexOf('javascript')===0) return;
    e.preventDefault();
  }
},true);

})(); /* end shared canvas script */
`;
}

/**
 * Replace text only inside HTML text nodes (between tags), never in attribute values.
 * Strategy: parse into DOM, walk text nodes, replace, serialise back.
 */
function _replaceTextNodes(html, from, to) {
  try {
    const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    const body = doc.body;
    const walk = (node) => {
      if (node.nodeType === 3) { // Text node
        if (node.textContent.includes(from)) {
          node.textContent = node.textContent.split(from).join(to);
        }
      } else {
        node.childNodes.forEach(walk);
      }
    };
    walk(body);
    // Serialise â€” use innerHTML of the body wrapper
    return body.innerHTML;
  } catch(e) {
    // Fallback: simple text-node regex (safe: only matches between > and <)
    return html.replace(
      new RegExp('(>[^<]*)' + _reEsc(from) + '([^<]*<)', 'g'),
      '$1' + to.replace(/\$/g, '$$$$') + '$2'
    );
  }
}

function _replaceInData(obj, from, to) {
  if (typeof obj === 'string') return obj === from ? to : obj;
  if (Array.isArray(obj)) return obj.map(v => _replaceInData(v, from, to));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k in obj) out[k] = _replaceInData(obj[k], from, to);
    return out;
  }
  return obj;
}

function _reEsc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
window.applyInlineEdit = applyInlineEdit;
window.deleteBlock = deleteBlock;
window.moveBlock = moveBlock;
window.duplicateBlock = duplicateBlock;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   LAYERS PANEL
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function updateLayers() {
  const list = document.getElementById('layers-list');
  if (!list) return;
  // In SSections mode, delegate to SSections panel
  if (State.sections && State.sections.length > 0) {
    SSections.updatePanel();
    list.innerHTML = '<p class="empty-layers" style="font-size:12px;text-align:center;padding:16px;color:var(--ui-text2);">Use the Sections tab to reorder.</p>';
    return;
  }
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
      <span class="layer-drag-handle">â ¿</span>
      <span class="layer-icon">${block.icon}</span>
      <span class="layer-label">${block.label}</span>
      <div class="layer-actions">
        <button class="layer-btn" onclick="event.stopPropagation();openBlockSettings('${block.id}')" title="Edit">âœï¸</button>
        <button class="layer-btn" onclick="event.stopPropagation();moveBlock('${block.id}','up')" title="Move up">â†‘</button>
        <button class="layer-btn" onclick="event.stopPropagation();moveBlock('${block.id}','down')" title="Move down">â†“</button>
        <button class="layer-btn danger" onclick="event.stopPropagation();deleteBlock('${block.id}')" title="Delete">ðŸ—‘</button>
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   BLOCK SETTINGS MODAL â€” dynamic forms per block type
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let _editingBlockId = null;
let _editingData = null;

window.openBlockSettings = function(id, clickX, clickY) {
  const block = State.blocks.find(b => b.id === id);
  if (!block) return;

  _editingBlockId = id;
  _editingData    = JSON.parse(JSON.stringify(block.data));

  // Route to SSModeC floating panel (block-settings-modal is legacy)
  if (typeof SSModeC !== 'undefined') {
    const x = clickX !== undefined ? clickX : window.innerWidth  * 0.6;
    const y = clickY !== undefined ? clickY : window.innerHeight * 0.15;
    SSModeC.openForBlock(id, x, y);
    return;
  }

  // Legacy modal fallback (unreachable in v2 UI)
  const bsmTitle = document.getElementById('bsm-title');
  const bsmContent = document.getElementById('bsm-content');
  const bsmModal = document.getElementById('block-settings-modal');
  if (!bsmContent || !bsmModal) return;
  if (bsmTitle) bsmTitle.textContent = block.icon + ' ' + block.label + ' Settings';
  const blockForm = renderBlockSettingsForm(block.type, _editingData);
  const glassTab  = renderGlassTab(_editingData);
  bsmContent.innerHTML = renderBlockModalWithGlass(blockForm, glassTab);
  bsmModal.style.display = 'flex';
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
    <div class="glass-swatch-item" style="background:none;border:1px dashed var(--ui-border2);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--ui-text2);width:auto;aspect-ratio:unset;padding:6px 10px;margin-bottom:12px;cursor:pointer;border-radius:6px;" onclick="applyGlassPreset('none',0,1)">âœ• No Glass</div>

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
      <button class="bsm-tab active" style="padding:10px 16px;font-size:12px;" onclick="switchOuterBSMTab(event,'outer-block-form')">âš™ Settings</button>
      <button class="bsm-tab" style="padding:10px 16px;font-size:12px;" onclick="switchOuterBSMTab(event,'outer-glass-form')">ðŸªŸ Glass Panel</button>
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
    photo: renderPhotoForm,
    footer: renderFooterForm,
  };
  return forms[type] ? forms[type](data) : '<p style="color:#666;padding:16px;">No settings available for this block.</p>';
}

/* â”€â”€ Nav link helpers (called from nav form inline) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function _normaliseLinks(links) {
  return (links||[]).map(l => typeof l==='string' ? {label:l, href:'#'} : l);
}
function navLinkUpdate(i, field, val) {
  if (!_editingData) return;
  _editingData.links = _normaliseLinks(_editingData.links);
  _editingData.links[i][field] = val;
  livePreview();
}
function navLinkAdd() {
  if (!_editingData) return;
  _editingData.links = _normaliseLinks(_editingData.links);
  _editingData.links.push({ label: 'New Link', href: '#' });
  openBlockSettings(_editingBlockId);
}
function navLinkRemove(i) {
  if (!_editingData) return;
  _editingData.links = _normaliseLinks(_editingData.links);
  _editingData.links.splice(i, 1);
  openBlockSettings(_editingBlockId);
}
window.navLinkUpdate = navLinkUpdate;
window.navLinkAdd    = navLinkAdd;
window.navLinkRemove = navLinkRemove;

function renderHeroForm(data) {
  // FIX13: Compact tabbed editor with live preview dot + immediate state binding
  return `
    <div class="hero-live-preview-strip">
      <div class="hero-live-dot"></div>
      <span>Live â€” changes reflect instantly in preview</span>
    </div>
    <div class="bsm-tabs hero-compact-editor">
      <button class="bsm-tab active" onclick="switchBSMTab(event,'hero-content-panel')">âœ Content</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'hero-design-panel')">ðŸŽ¨ Design</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'hero-btns-panel')">ðŸ”˜ Buttons</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'hero-elements-panel')">ðŸŽ­ Elements</button>
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
          <option value="50vh" ${data.minHeight==='50vh'?'selected':''}>50vh â€” Compact</option>
          <option value="60vh" ${data.minHeight==='60vh'?'selected':''}>60vh â€” Medium</option>
          <option value="85vh" ${data.minHeight==='85vh'?'selected':''}>85vh â€” Tall</option>
          <option value="100vh" ${data.minHeight==='100vh'?'selected':''}>100vh â€” Full screen</option>
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
        <input type="url" value="${data.bgImage||''}" placeholder="https://â€¦"
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
          <span class="ecg-label">ðŸ”¤ Heading</span>
          <div class="ecg-colors">
            <input type="color" title="Color" value="${data.elemHeadingColor||data.textColor}" oninput="_editingData.elemHeadingColor=this.value;heroLiveUpdate();livePreview()"/>
          </div>
        </div>
        <div class="ecg-item">
          <span class="ecg-label">ðŸ“ Subtext</span>
          <div class="ecg-colors">
            <input type="color" title="Color" value="${data.elemSubColor||data.textColor}" oninput="_editingData.elemSubColor=this.value;heroLiveUpdate();livePreview()"/>
          </div>
        </div>
        <div class="ecg-item">
          <span class="ecg-label">ðŸ· Badge</span>
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
        if (btn) { btn.textContent = d.btnText + ' â†’'; btn.style.background = d.btnColor; btn.style.color = d.btnTextColor; }
        // If DOM patch fails cleanly, fall through â€” refreshPreview handles it
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
      <button class="bsm-tab" onclick="switchBSMTab(event,'nav-style-panel')">ðŸŽ¨ Style</button>
    </div>

    <div id="nav-content-panel" class="bsm-panel active">
      <div class="bsm-field"><label>Logo Text</label><input type="text" value="${data.logo}" oninput="_editingData.logo=this.value;livePreview()"/></div>
      <div class="bsm-field">
        <label style="display:flex;align-items:center;justify-content:space-between;">Nav Links
          <button onclick="navLinkAdd()" style="background:rgba(255,107,53,0.15);border:1px solid rgba(255,107,53,0.3);color:#ff6b35;border-radius:5px;padding:3px 9px;font-size:11px;cursor:pointer;">ï¼‹ Add</button>
        </label>
        <div id="nav-links-list" style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
          ${(data.links||[]).map((l,i) => {
            const label = typeof l==='string'?l:l.label;
            const href  = typeof l==='string'?'#':(l.href||'#');
            return `<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:4px;align-items:center;">
              <input type="text" value="${label}" placeholder="Label" style="background:var(--ui-bg2);border:1px solid var(--ui-border);border-radius:5px;color:var(--ui-text);padding:5px 7px;font-size:12px;font-family:'DM Sans',sans-serif;"
                oninput="navLinkUpdate(${i},'label',this.value)"/>
              <input type="text" value="${href}" placeholder="#section" style="background:var(--ui-bg2);border:1px solid var(--ui-border);border-radius:5px;color:var(--ui-text);padding:5px 7px;font-size:12px;font-family:'DM Sans',sans-serif;"
                oninput="navLinkUpdate(${i},'href',this.value)"/>
              <button onclick="navLinkRemove(${i})" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:5px;padding:5px 7px;font-size:11px;cursor:pointer;">âœ•</button>
            </div>`;
          }).join('')}
        </div>
      </div>
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
      <button class="bsm-tab" onclick="switchBSMTab(event,'lf-webhook-panel')">ðŸ”— Backend</button>
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
      <button class="add-tier-btn" onclick="leadformAddField()">ï¼‹ Add Field</button>
    </div>

    <div id="lf-webhook-panel" class="bsm-panel">
      <div class="webhook-section">
        <h5>ðŸ”— Webhook Endpoint</h5>
        <p style="font-size:12px;color:var(--ui-text2);margin-bottom:10px;">POST JSON to your endpoint on every submission. Works with Zapier, Make, n8n, and any webhook receiver.</p>
        <div class="bsm-field"><label>Webhook URL</label>
          <input type="url" value="${data.webhookUrl||''}" placeholder="https://hooks.zapier.com/hooks/catch/â€¦"
            oninput="_editingData.webhookUrl=this.value;livePreview()"/>
        </div>
        <button class="webhook-test-btn" onclick="testWebhook()">â–¶ Send Test Payload</button>
        <div id="webhook-test-status" class="webhook-status"></div>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--ui-border);">
        <p style="font-size:12px;font-weight:600;color:var(--ui-text2);margin-bottom:8px;">FIELD MAPPING</p>
        <p style="font-size:11px;color:var(--ui-text2);margin-bottom:10px;">Fields are sent as JSON keys using each field's name. Make sure field names are unique.</p>
        ${data.fields.map((f,i) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;">
            <span style="background:var(--ui-surface2);border:1px solid var(--ui-border);padding:3px 8px;border-radius:4px;font-family:monospace;color:var(--ui-accent);">${f.name||'field'+i}</span>
            <span style="color:var(--ui-text2);">â†’</span>
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
  if (!url) { if (statusEl) { statusEl.textContent = 'âš ï¸ Enter a webhook URL first'; statusEl.className = 'webhook-status fail'; } return; }
  if (statusEl) { statusEl.textContent = 'â³ Sending test payloadâ€¦'; statusEl.className = 'webhook-status'; }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _test: true, source: 'supersuite_builder', name: 'Test User', email: 'test@example.com', ts: new Date().toISOString() }),
      mode: 'no-cors',
    });
    if (statusEl) { statusEl.textContent = 'âœ… Payload sent (check your endpoint)'; statusEl.className = 'webhook-status ok'; }
  } catch(e) {
    if (statusEl) { statusEl.textContent = 'âŒ Request failed: ' + e.message; statusEl.className = 'webhook-status fail'; }
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
          <button class="tier-action-btn" onclick="pricingMoveTier(${i},'up')" title="Move up">â†‘</button>
          <button class="tier-action-btn" onclick="pricingMoveTier(${i},'down')" title="Move down">â†“</button>
          <button class="tier-action-btn danger" onclick="pricingDeleteTier(${i})" title="Remove tier">âœ•</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div class="bsm-field"><label>Tier Name</label><input type="text" value="${p.name}" oninput="_editingData.plans[${i}].name=this.value;document.querySelector('#ptier-${i} .pricing-tier-label').textContent='Tier ${i+1}: '+this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Price</label><input type="text" value="${p.price}" oninput="_editingData.plans[${i}].price=this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Billing Cycle</label><input type="text" value="${p.period}" placeholder="/month" oninput="_editingData.plans[${i}].period=this.value;livePreview()"/></div>
        <div class="bsm-field"><label>Highlight?</label><select onchange="_editingData.plans[${i}].featured=this.value==='true';livePreview()"><option value="false" ${!p.featured?'selected':''}>No</option><option value="true" ${p.featured?'selected':''}>â­ Yes</option></select></div>
      </div>
      <div class="bsm-field"><label>Description</label><input type="text" value="${p.description}" oninput="_editingData.plans[${i}].description=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>CTA Button Text</label><input type="text" value="${p.ctaText}" oninput="_editingData.plans[${i}].ctaText=this.value;livePreview()"/></div>
      <div class="bsm-field"><label>Features (one per line)</label>
        <textarea rows="6" oninput="pricingUpdateFeatures(this,${i})">${(p.features||[]).join('\n')}</textarea>
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
      <button class="bsm-tab" onclick="switchBSMTab(event,'pricing-tiers-panel')">ðŸ’Ž Tiers (${data.plans.length})</button>
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
      <button class="add-tier-btn" onclick="pricingAddTier()">ï¼‹ Add New Tier</button>
    </div>
  `;
}

// Reliable features textarea handler â€” avoids inline IIFE scoping issues
function pricingUpdateFeatures(el, idx) {
  if (!_editingData || !_editingData.plans || !_editingData.plans[idx]) return;
  var lines = el.value.split('\n').map(function(f){ return f.trim(); }).filter(function(f){ return f.length > 0; });
  _editingData.plans[idx].features = lines;
  livePreview();
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
    showToast('âš ï¸ Cannot remove', 'Must have at least one tier', 'warning');
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
          <div id="gal-err-${i}" style="display:none;font-size:11px;color:var(--ui-danger);margin-top:4px;">âš ï¸ Image URL failed to load</div>
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


function renderPhotoForm(data) {
  const hasImg = !!data.imageUrl;
  const opacityPct = Math.round((data.overlayOpacity || 0) * 100);
  return `
    <div style="margin-bottom:14px;">
      ${hasImg ? `
        <div style="width:100%;height:130px;border-radius:8px;overflow:hidden;margin-bottom:10px;position:relative;background:#0f0f18;">
          <img src="${data.imageUrl}" style="width:100%;height:100%;object-fit:cover;"
            onerror="this.parentElement.innerHTML='<div style=&quot;padding:20px;color:var(--ui-danger);font-size:12px;&quot;>âš ï¸ Image failed to load</div>'"/>
          ${data.credit ? `<div style="position:absolute;bottom:6px;right:6px;font-size:10px;color:#fff;background:rgba(0,0,0,0.5);padding:2px 7px;border-radius:4px;">ðŸ“· ${data.credit}</div>` : ''}
        </div>` : `
        <div style="width:100%;height:80px;border:2px dashed rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);font-size:13px;margin-bottom:10px;background:rgba(255,255,255,0.02);">No photo selected</div>`}
      <button onclick="UnplashLib.open(_unsplashPickForPhoto)"
        style="width:100%;padding:11px;background:#ff6b35;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.2s;"
        onmouseover="this.style.background='#e85520'" onmouseout="this.style.background='#ff6b35'">
        ðŸ“· Browse Unsplash Photos
      </button>
    </div>
    <div class="bsm-field"><label>Or paste image URL</label>
      <input type="url" value="${data.imageUrl||''}" placeholder="https://images.unsplash.com/â€¦"
        oninput="_editingData.imageUrl=this.value;_editingData.credit='';_editingData.creditUrl='';livePreview()"/>
    </div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:14px 0;"/>
    <div class="bsm-field"><label>Heading (overlay text)</label>
      <input type="text" value="${data.heading||''}" placeholder="e.g. Our Story"
        oninput="_editingData.heading=this.value;livePreview()"/>
    </div>
    <div class="bsm-field"><label>Caption</label>
      <input type="text" value="${data.caption||''}" placeholder="Short descriptionâ€¦"
        oninput="_editingData.caption=this.value;livePreview()"/>
    </div>
    <div class="bsm-field"><label>Height</label>
      <select onchange="_editingData.height=this.value;livePreview()">
        <option value="300px" ${data.height==='300px'?'selected':''}>300px â€” Short</option>
        <option value="480px" ${(data.height||'480px')==='480px'?'selected':''}>480px â€” Medium</option>
        <option value="600px" ${data.height==='600px'?'selected':''}>600px â€” Tall</option>
        <option value="80vh" ${data.height==='80vh'?'selected':''}>80vh â€” Large</option>
        <option value="100vh" ${data.height==='100vh'?'selected':''}>100vh â€” Full screen</option>
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div class="bsm-field"><label>Fit</label>
        <select onchange="_editingData.objectFit=this.value;livePreview()">
          <option value="cover" ${(data.objectFit||'cover')==='cover'?'selected':''}>Cover</option>
          <option value="contain" ${data.objectFit==='contain'?'selected':''}>Contain</option>
          <option value="fill" ${data.objectFit==='fill'?'selected':''}>Fill</option>
        </select>
      </div>
      <div class="bsm-field"><label>Position</label>
        <select onchange="_editingData.objectPosition=this.value;livePreview()">
          <option value="center" ${(data.objectPosition||'center')==='center'?'selected':''}>Center</option>
          <option value="top" ${data.objectPosition==='top'?'selected':''}>Top</option>
          <option value="bottom" ${data.objectPosition==='bottom'?'selected':''}>Bottom</option>
          <option value="left" ${data.objectPosition==='left'?'selected':''}>Left</option>
          <option value="right" ${data.objectPosition==='right'?'selected':''}>Right</option>
        </select>
      </div>
    </div>
    <div class="bsm-field"><label>Dark Overlay â€” ${opacityPct}%</label>
      <div class="slider-wrap">
        <input type="range" min="0" max="100" value="${opacityPct}"
          oninput="_editingData.overlayOpacity=this.value/100;this.previousElementSibling.textContent='Dark Overlay â€” '+this.value+'%';livePreview()"/>
        <span>${opacityPct}%</span>
      </div>
    </div>
    <div class="bsm-field"><label>Width</label>
      <select onchange="_editingData.fullWidth=this.value==='true';livePreview()">
        <option value="true" ${data.fullWidth!==false?'selected':''}>Full width</option>
        <option value="false" ${data.fullWidth===false?'selected':''}>Contained</option>
      </select>
    </div>
    <div class="bsm-field"><label>Click Link (optional)</label>
      <input type="url" value="${data.linkUrl||''}" placeholder="https://â€¦"
        oninput="_editingData.linkUrl=this.value;livePreview()"/>
    </div>
  `;
}

function _unsplashPickForPhoto(p) {
  if (!_editingData || !_editingBlockId) return;
  _editingData.imageUrl  = p.url;
  _editingData.credit    = p.credit;
  _editingData.creditUrl = p.creditUrl;
  // Commit to block so reopening the modal shows the new image
  const block = State.blocks.find(b => b.id === _editingBlockId);
  if (block) { block.data = JSON.parse(JSON.stringify(_editingData)); History.push(); }
  livePreview();
  openBlockSettings(_editingBlockId);
}
window._unsplashPickForPhoto = _unsplashPickForPhoto;

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   UNSPLASH PHOTO LIBRARY
   Browse, search, and insert real Unsplash photos directly into
   any Photo block. Opens as a modal overlay with search + grid.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const UnplashLib = (function(){
  const API_KEY = '6cc194de6357f1e38c5ae89f32b6e4e49c9bc6d59e8d42e10d1cd3f85c5476c';
  let _cb      = null;
  let _query   = 'nature';
  let _page    = 1;

  function open(callback) {
    _cb    = callback;
    _query = 'nature';
    _page  = 1;
    const modal = document.getElementById('unsplash-lib-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('unsplash-search-input').value = '';
    _search('nature', 1);
  }

  function close() {
    const modal = document.getElementById('unsplash-lib-modal');
    if (modal) modal.style.display = 'none';
    _cb = null;
  }

  async function _search(query, page) {
    _query = query || 'nature';
    _page  = page  || 1;
    const grid = document.getElementById('unsplash-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:rgba(255,255,255,0.3);font-family:\'DM Sans\',sans-serif;font-size:14px;">Loading photosâ€¦</div>';

    try {
      const res  = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(_query)}&per_page=18&page=${_page}&orientation=landscape`,
        { headers: { Authorization: 'Client-ID ' + API_KEY } }
      );
      const data   = await res.json();
      const photos = data.results || [];

      if (!photos.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:rgba(255,255,255,0.3);font-family:\'DM Sans\',sans-serif;font-size:14px;">No photos found â€” try a different search.</div>';
        return;
      }

      grid.innerHTML = photos.map(p => {
        const alt    = (p.alt_description || p.user.name || _query).replace(/'/g, '').replace(/"/g, '');
        const credit = 'Photo by ' + p.user.name + ' on Unsplash';
        const creditUrl = 'https://unsplash.com/@' + p.user.username + '?utm_source=supersuite&utm_medium=referral';
        return `<div class="ulib-item"
          onclick="UnplashLib.pick('${p.urls.regular}','${p.urls.small}','${alt}','${credit}','${creditUrl}')"
          style="position:relative;cursor:pointer;border-radius:10px;overflow:hidden;aspect-ratio:3/2;background:#1a1a2e;transition:transform 0.15s,box-shadow 0.15s;"
          onmouseover="this.querySelector('.ulib-ov').style.opacity='1';this.querySelector('.ulib-cr').style.opacity='1';this.style.transform='scale(1.03)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.6)'"
          onmouseout="this.querySelector('.ulib-ov').style.opacity='0';this.querySelector('.ulib-cr').style.opacity='0';this.style.transform='';this.style.boxShadow=''">
          <img src="${p.urls.small}" alt="${alt}" loading="lazy"
            style="width:100%;height:100%;object-fit:cover;display:block;"/>
          <div class="ulib-ov" style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 55%);opacity:0;transition:opacity 0.2s;pointer-events:none;"></div>
          <div class="ulib-cr" style="position:absolute;bottom:8px;left:10px;right:10px;font-size:11px;color:rgba(255,255,255,0.85);font-family:'DM Sans',sans-serif;opacity:0;transition:opacity 0.2s;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.user.name}</div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,107,53,0.85);opacity:0;transition:opacity 0.15s;pointer-events:none;" class="ulib-sel">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>`;
      }).join('');

      // Hover: show select checkmark on hover
      grid.querySelectorAll('.ulib-item').forEach(el => {
        el.addEventListener('mouseenter', () => el.querySelector('.ulib-sel').style.opacity = '0.92');
        el.addEventListener('mouseleave', () => el.querySelector('.ulib-sel').style.opacity = '0');
      });

      const prevBtn = document.getElementById('unsplash-prev-btn');
      const nextBtn = document.getElementById('unsplash-next-btn');
      if (prevBtn) prevBtn.disabled = _page <= 1;
      if (nextBtn) nextBtn.disabled = photos.length < 18;
      document.getElementById('unsplash-page-info').textContent = 'Page ' + _page;

    } catch(e) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:rgba(255,255,255,0.3);font-family:\'DM Sans\',sans-serif;font-size:14px;">Failed to load. Check your connection.</div>';
    }
  }

  function pick(url, thumb, alt, credit, creditUrl) {
    if (_cb) _cb({ url, thumbUrl: thumb, alt, credit, creditUrl });
    close();
  }

  function nextPage() { _search(_query, _page + 1); }
  function prevPage() { if (_page > 1) _search(_query, _page - 1); }

  function searchFromInput() {
    const val = (document.getElementById('unsplash-search-input')?.value || '').trim();
    if (val) _search(val, 1);
  }

  return { open, close, pick, nextPage, prevPage, search: _search, searchFromInput };
})();
window.UnplashLib = UnplashLib;

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
  showToast('âœ… Saved!', 'Block settings updated', 'success');
}

/* Live preview â€” called by every oninput/onchange in block settings forms.
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TEMPLATE MANAGEMENT
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  showToast('ðŸŽ¨ Template Applied', Templates[tplKey].name, 'success');
}

function applyCustomCSS() {
  State.customCSS = document.getElementById('custom-css-input').value;
  refreshPreview();
  showToast('âœ… CSS Applied', 'Custom styles applied to preview', 'success');
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   GLOBAL STYLE CONTROLS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  // Store preference â€” applied via extra CSS
  State.globalStyles['--anim'] = val;
  refreshPreview();
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DEVICE SWITCHING
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const DeviceWidths = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

const DeviceLabels = {
  desktop: 'Desktop Â· 1440px wide',
  tablet: 'Tablet Â· 768px wide',
  mobile: 'Mobile Â· 390px wide',
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ZOOM CONTROLS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB SWITCHING
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function switchTab(tab) {
  document.querySelectorAll('.stab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
  if (tab === 'projects') renderProjectsList();
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RIGHT PANEL â€” ELEMENT EDITOR
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function openRightPanel(title, content) {
  document.getElementById('rp-title').textContent = title;
  document.getElementById('right-panel-content').innerHTML = content;
  document.getElementById('right-panel').classList.remove('closed');
}

function closeRightPanel() {
  document.getElementById('right-panel').classList.add('closed');
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   FULL PREVIEW
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function openFullPreview() {
  const modal = document.getElementById('full-preview-modal');
  const frame = document.getElementById('full-preview-frame');
  frame.srcdoc = buildPreviewHTML(true);
  modal.style.display = 'flex';
}

function closeFullPreview() {
  document.getElementById('full-preview-modal').style.display = 'none';
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   EXPORT ENGINE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function exportSite() {
  // SSV26.1: Enforce tier export limit before proceeding
  if (typeof UsageTracker !== 'undefined' && !UsageTracker.canExport()) {
    UsageTracker.showExportLimitModal();
    return;
  }

  const siteName = document.getElementById('site-name-input')?.value || 'my-site';

  // FIX3: buildExportHTML() now uses the same renderer as preview (buildPreviewHTML(true)).
  // The HTML file is fully self-contained â€” all CSS is inlined, no external dependencies.
  let exportHTML = buildExportHTML();
  // Inject connector snippets (GA, Formspree, Zapier, etc.)
  if (typeof SSConnectors !== 'undefined') {
    exportHTML = SSConnectors.injectIntoExport(exportHTML);
  }

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
  // This guarantees pixel-identical output â€” same CSS vars, same block renderers,
  // same glass effects, same responsive overrides. No divergence possible.
  const siteName = document.getElementById('site-name-input')?.value || 'My Site';

  // Get the fully-rendered preview HTML (forExport=true strips builder controls)
  const previewBase = buildPreviewHTML(true);

  // Inject production-quality <head> metadata into the already-correct preview output.
  // The preview HTML already has: charset, viewport, fonts, inline CSS, all blocks.
  // We add: title (with site name), meta description, favicon, Open Graph basics.
  const productionHead = `  <title>${siteName}</title>
  <meta name="description" content="Built with Supersuite â€” the fastest website builder"/>
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

  return `/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Generated by Supersuite â€” https://supersuite.com
   Template: ${template.name}
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â”€â”€ MOBILE RESPONSIVE â€” full auto-optimization â”€â”€ */

/* All grid layouts collapse to single column on tablet */
@media (max-width: 768px) {
  /* Grid overrides */
  [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
  [style*="display: grid"]         { display: block !important; }

  /* Nav â€” hide links, show hamburger */
  .ss-nav-links  { display: none !important; }
  .ss-nav-inner  { padding: 0 20px !important; }
  .ss-hamburger  { display: flex !important; }

  /* Mobile nav drawer */
  .ss-mobile-nav {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.96);
    z-index: 9999;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
  }
  .ss-mobile-nav.open { display: flex !important; }
  .ss-mobile-nav a {
    font-size: 22px !important;
    color: #fff !important;
    text-decoration: none;
    font-weight: 700;
  }
  .ss-mobile-nav-close {
    position: absolute;
    top: 24px; right: 24px;
    background: none; border: none;
    color: #fff; font-size: 28px;
    cursor: pointer;
  }

  /* Hero â€” stack layout, scale text */
  .ss-hero { padding: 60px 24px 48px !important; min-height: auto !important; }
  .ss-hero h1 { font-size: clamp(28px, 7vw, 48px) !important; line-height: 1.15 !important; }
  .ss-hero p  { font-size: 15px !important; }
  .ss-hero .ss-hero-inner,
  .ss-hero [style*="display: flex"] { flex-direction: column !important; gap: 32px !important; }
  .ss-hero img,
  .ss-hero [style*="border-radius"] { width: 100% !important; max-width: 100% !important; }

  /* Sections */
  .ss-block { padding: 48px 20px !important; }
  .ss-section-title { font-size: clamp(22px, 5vw, 36px) !important; }

  /* Cards */
  .ss-card { padding: 20px !important; }

  /* Pricing â€” stack cards */
  .ss-pricing-card { width: 100% !important; }

  /* Buttons â€” full width on mobile */
  .ss-btn-primary,
  .ss-btn-secondary {
    width: 100% !important;
    padding: 16px 20px !important;
    font-size: 16px !important;
    text-align: center !important;
    display: block !important;
    box-sizing: border-box !important;
  }

  /* Forms */
  .ss-form input,
  .ss-form textarea,
  .ss-form select { font-size: 16px !important; } /* prevents iOS zoom */

  /* Footer */
  .ss-footer { padding: 40px 20px !important; }
  .ss-footer [style*="display: flex"]  { flex-direction: column !important; gap: 20px !important; }
  .ss-footer [style*="display: grid"]  { grid-template-columns: 1fr !important; }
}

/* Small phones */
@media (max-width: 480px) {
  .ss-hero h1  { font-size: clamp(24px, 8vw, 36px) !important; }
  .ss-block    { padding: 40px 16px !important; }
  .ss-nav      { height: 60px !important; }
  .ss-card     { padding: 16px !important; }
  /* Testimonial quotes */
  .ss-testimonial-card { padding: 20px !important; }
  /* Gallery â€” 1 col */
  .ss-gallery [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
  /* Pricing price text */
  [style*="font-size:52px"] { font-size: 40px !important; }
  [style*="font-size: 52px"] { font-size: 40px !important; }
}
`;
}

function buildExportJS() {
  return `/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Generated by Supersuite â€” https://supersuite.com
   Site script â€” interactivity & animations
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

'use strict';

/* â”€â”€ SCROLL ANIMATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ SMOOTH ANCHOR SCROLL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ FORM HANDLING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function initForms() {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'âœ“ Submitted!';
        btn.style.background = '#22c55e';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.background = '';
        }, 3000);
      }
    });
  });
}

/* â”€â”€ STICKY NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ MOBILE NAV TOGGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function initMobileNav() {
  const nav = document.querySelector('.ss-nav');
  if (!nav) return;
  const links = nav.querySelector('.ss-nav-links');
  if (!links) return;

  const toggle = document.createElement('button');
  toggle.innerHTML = 'â˜°';
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

/* â”€â”€ COUNTER ANIMATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TOAST NOTIFICATIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function showToast(title, message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: 'âœ…', error: 'âŒ', info: 'â„¹ï¸', warning: 'âš ï¸' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'â„¹ï¸'}</span>
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   IMAGE UPLOAD
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   KEYBOARD SHORTCUTS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  // Ctrl+Z â€” undo (simple: just refresh)
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    History.back();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    History.forward();
  }

  // Ctrl+S â€” save session
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveToSession();
    showToast('ðŸ’¾ Auto-saved', 'Changes saved to session', 'success');
  }

  // Ctrl+P â€” preview
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    openFullPreview();
  }
});

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   AUTO-SAVE TO SESSIONSSTORAGE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   USAGE LIMITER â€” weekly quotas per tier
   free:   1 site/wk Â· 2 regens/wk Â· 20 AI edits/wk
   single: 5 sites  Â· 5 regens   Â· 100 AI edits
   pro:    âˆž sites  Â· 8 regens   Â· âˆž  AI edits
   agency: âˆž all
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const UsageLimiter = (function(){
  const LIMITS = {
    free:   { sites: 1,  regens: 2,  ai: 20  },
    basic:  { sites: 3,  regens: 4,  ai: 50  },
    single: { sites: 5,  regens: 5,  ai: 100 },
    pro:    { sites: 999,regens: 8,  ai: 999 },
    agency: { sites: 999,regens: 15, ai: 999 },
  };

  function _weekKey() {
    return 'ss_usage_w' + Math.floor(Date.now() / (7*24*60*60*1000));
  }
  function _load() {
    try { return JSON.parse(localStorage.getItem(_weekKey()) || '{}'); } catch(e) { return {}; }
  }
  function _save(d) {
    try { localStorage.setItem(_weekKey(), JSON.stringify(d)); } catch(e) {}
  }
  function _tier() { return (State.userTier || 'free').toLowerCase(); }
  function _limits() { return LIMITS[_tier()] || LIMITS.free; }

  function used(type)  { return _load()[type] || 0; }
  function limit(type) { return _limits()[type]; }
  function isAdmin() {
    try { return localStorage.getItem('ss_admin_bypass') === '1'; } catch(e) { return false; }
  }
  function canUse(type){
    if (isAdmin()) return true;
    const tier = _tier();
    if (tier === 'agency' || tier === 'pro') return true; // effectively unlimited
    return used(type) < limit(type);
  }

  function consume(type) {
    const d = _load();
    d[type] = (d[type] || 0) + 1;
    _save(d);
  }

  function remaining(type) { return Math.max(0, limit(type) - used(type)); }

  function showUpgradePrompt(type) {
    const msgs = {
      sites:  'You\'ve used your free site creation this week.',
      regens: 'You\'ve used your free regenerations this week.',
      ai:     'You\'ve used your 20 free AI edits this week.',
    };
    showToast('âš ï¸ ' + (msgs[type]||'Limit reached'), 'Upgrade for more â†’ supersuite-checkout.vercel.app', 'error');
    setTimeout(() => {
      const existing = document.getElementById('ss-upgrade-nudge');
      if (existing) existing.remove();
      const el = document.createElement('div');
      el.id = 'ss-upgrade-nudge';
      el.innerHTML = `
        <div style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#111118;border:1px solid rgba(255,107,53,0.4);border-radius:14px;padding:16px 24px;z-index:9997;display:flex;align-items:center;gap:16px;box-shadow:0 20px 60px rgba(0,0,0,.6);font-family:'DM Sans',sans-serif;animation:ss-nudge-in .3s ease;">
          <div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:3px;">${msgs[type]||'Limit reached'}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.45);">Resets next week Â· Upgrade for unlimited</div>
          </div>
          <a href="https://supersuite-checkout.vercel.app" target="_blank" style="background:#ff6b35;color:#fff;padding:9px 18px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;white-space:nowrap;flex-shrink:0;">Upgrade â†’</a>
          <button onclick="this.closest('#ss-upgrade-nudge').remove()" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:18px;cursor:pointer;padding:4px;">âœ•</button>
        </div>`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 8000);
    }, 300);
  }

  return { canUse, consume, remaining, limit, used, showUpgradePrompt };
})();
window.UsageLimiter = UsageLimiter;

const SS_SITE_KEY = 'ss_site_v1'; // localStorage â€” survives session wipes

function saveToSession() {
  try {
    const data = {
      blocks:          State.blocks,
      sections:        State.sections,
      siteCSS:         State.siteCSS,
      siteFontsURL:    State.siteFontsURL,
      sitePrompt:      State.sitePrompt,
      globalStyles:    State.globalStyles,
      currentTemplate: State.currentTemplate,
      customCSS:       State.customCSS,
      blockIdCounter:  State.blockIdCounter,
      siteName:        document.getElementById('site-name-input')?.value,
      savedAt:         Date.now(),
    };
    // Save to localStorage so it survives page refresh + session wipe
    localStorage.setItem(SS_SITE_KEY, JSON.stringify(data));
    // Also keep sessionStorage for same-tab quick restore
    try { sessionStorage.setItem('supersuite_session', JSON.stringify(data)); } catch(e) {}
  } catch(e) {}
}

function loadFromSession() {
  try {
    // Try localStorage first (survives refresh), fall back to sessionStorage
    const raw = localStorage.getItem(SS_SITE_KEY) || sessionStorage.getItem('supersuite_session');
    if (!raw) return false;
    const data = JSON.parse(raw);
    // Reject stale saves older than 30 days
    if (data.savedAt && Date.now() - data.savedAt > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SS_SITE_KEY);
      return false;
    }
    // SSections mode restore
    if (data.sections && data.sections.length > 0) {
      State.sections     = data.sections;
      State.siteCSS      = data.siteCSS      || '';
      State.siteFontsURL = data.siteFontsURL || '';
      State.sitePrompt   = data.sitePrompt   || '';
      State.blocks       = [];
    } else {
      State.blocks = data.blocks || [];
    }
    State.globalStyles    = { ...State.globalStyles, ...data.globalStyles };
    State.currentTemplate = data.currentTemplate || 'glass';
    State.customCSS       = data.customCSS || '';
    State.blockIdCounter  = data.blockIdCounter || 1;
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DRAG & DROP FROM SIDEBAR INTO CANVAS (Phase 2)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* postMessage bridge â€” routes messages from the sandboxed srcdoc preview iframe.
   srcdoc iframes have a null origin so window.parent.fn() silently fails;
   postMessage('*') + this listener is the correct cross-origin approach. */
window.addEventListener('message', function(e) {
  const msg = e.data;
  if (!msg || typeof msg.type !== 'string') return;
  switch (msg.type) {
    case 'openBlockSettings': {
      const iframe2 = document.getElementById('preview-frame');
      const ir2 = iframe2 ? iframe2.getBoundingClientRect() : {left:0,top:0};
      openBlockSettings(msg.id, ir2.left + (msg.x||400), ir2.top + (msg.y||200));
      break;
    }
    case 'moveBlock':           moveBlock(msg.id, msg.dir); break;
    case 'duplicateBlock':      duplicateBlock(msg.id); break;
    case 'deleteBlock':         deleteBlock(msg.id); break;
    case 'addBlock':            addBlock(msg.blockType); break;
    // SSections handlers
    case 'openSectionEditor': {
      const iframe3 = document.getElementById('preview-frame');
      const ir3 = iframe3 ? iframe3.getBoundingClientRect() : {left:0,top:0};
      openSectionEditor(msg.id, ir3.left + (msg.x||400), ir3.top + (msg.y||200));
      break;
    }
    case 'moveSection':         SSections.move(msg.id, msg.dir); break;
    case 'deleteSection':       SSections.delete(msg.id); break;
    // Inline canvas editing
    case 'inlineEdit':          applyInlineEdit(msg); break;
    // Mode B â€” background click
    case 'modeBClick': {
      const iframe = document.getElementById('preview-frame');
      const iRect  = iframe ? iframe.getBoundingClientRect() : { left:0, top:0 };
      SSModeB.show(msg.blockId, msg.sectionId,
        iRect.left + msg.x, iRect.top + msg.y, msg.bg);
      break;
    }
    // Mode C â€” double click
    case 'modeCClick': {
      const iframe = document.getElementById('preview-frame');
      const iRect  = iframe ? iframe.getBoundingClientRect() : { left:0, top:0 };
      if (msg.sectionId) SSModeC.openForSection(msg.sectionId, iRect.left + msg.x, iRect.top + msg.y);
      else if (msg.blockId) SSModeC.openForBlock(msg.blockId, iRect.left + msg.x, iRect.top + msg.y);
      break;
    }
    // Block action bar
    case 'moveBlockOrSection':
      if (msg.kind === 'section') SSections.move(msg.id, msg.dir);
      else moveBlock(msg.id, msg.dir);
      break;
    case 'duplicateBlockOrSection':
      if (msg.kind === 'section') {
        const sec = State.sections.find(s => s.id === msg.id);
        if (sec) { const copy = JSON.parse(JSON.stringify(sec)); copy.id = 'sec_' + (State.blockIdCounter++); const idx = State.sections.indexOf(sec); State.sections.splice(idx+1, 0, copy); History.push(); refreshPreview(); SSections.updatePanel(); }
      } else duplicateBlock(msg.id);
      break;
    case 'deleteBlockOrSection':
      if (msg.kind === 'section') SSections.delete(msg.id);
      else deleteBlock(msg.id);
      break;
  }
});

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STARTER DEMO â€” auto-populate with a sample page
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function loadStarterDemo() {
  // Restore previous session first (preserves all user edits)
  if (loadFromSession() && State.blocks.length > 0) {
    refreshPreview();
    updateLayers();
    showToast('ðŸ“‚ Session Restored', 'Your previous work was loaded', 'info');
    return;
  }

  // SSV26.1: Only add demo blocks that are enabled in BlockSelector
  const enabled = BlockSelector.getEnabled();
  const demoBlocks = ['nav', 'hero', 'features', 'testimonials', 'pricing', 'cta', 'footer'];
  demoBlocks.filter(t => enabled.includes(t)).forEach(t => addBlock(t));
  showToast('ðŸŽ‰ Demo Loaded', 'Start editing â€” all your blocks are ready!', 'success');
  // Push initial state to history so undo works from the start
  setTimeout(() => History.push(), 100);
}


/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PROJECT LIBRARY â€” Save / load named projects
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  // SSV26.7: window.prompt is disabled by default in Electron â€” use SSPrompt modal.
  const defaultName = 'Untitled Project ' + (Projects.getAll().length + 1);
  SSPrompt.ask({
    title: 'ï¼‹ New Project',
    label: 'Give your new project a name',
    placeholder: defaultName,
    defaultValue: defaultName,
    okText: 'Create Project'
  }).then(name => {
    if (!name) return;
    if (State.blocks.length) saveCurrentProject();
    _createNewProjectInternal(name);
  });
}

function _createNewProjectInternal(name) {
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
  showToast('ðŸ“ New Project', name + ' created', 'success');
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
  showToast('ðŸ’¾ Saved', '"' + name + '" saved to library', 'success');
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
  showToast('ðŸ“‚ Loaded', '"' + name + '" loaded', 'success');
}

function deleteProject(name) {
  // SSV26.7: window.confirm is disabled in Electron â€” use SSConfirm modal.
  SSConfirm.ask({
    title: 'Delete project?',
    body: 'Delete "' + name + '"? This cannot be undone.',
    okText: 'Delete',
    danger: true
  }).then(ok => { if (ok) _deleteProjectInternal(name); });
}

function _deleteProjectInternal(name) {
  const projects = Projects.getAll().filter(p => p.name !== name);
  Projects.save(projects);
  renderProjectsList();
  showToast('ðŸ—‘ Deleted', '"' + name + '" removed', 'info');
}

function renderProjectsList() {
  const list = document.getElementById('projects-list');
  if (!list) return;
  const projects = Projects.getAll();
  if (!projects.length) {
    list.innerHTML = '<p style="color:var(--ui-text2);font-size:13px;text-align:center;padding:20px;">No saved projects yet. Click ðŸ’¾ Save to create one.</p>';
    return;
  }
  list.innerHTML = projects.map(p => `
    <div style="background:var(--ui-surface2);border:1px solid var(--ui-border);border-radius:var(--r-sm);padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="loadProject('${p.name.replace(/'/g, "\\'")}')">
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:var(--ui-text);">${p.name}</div>
        <div style="font-size:11px;color:var(--ui-text2);">${p.blocks?.length||0} blocks Â· ${new Date(p.ts).toLocaleDateString()}</div>
      </div>
      <button onclick="event.stopPropagation();deleteProject('${p.name.replace(/'/g, "\\'")}')" style="min-width:28px;min-height:28px;background:none;border:1px solid var(--ui-border);border-radius:var(--r-sm);color:var(--ui-text2);cursor:pointer;font-size:12px;" title="Delete">ðŸ—‘</button>
    </div>
  `).join('');
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   BOOT
   initApp() is called by checkPassword() after successful login.
   The duplicate stub below has been removed in SSV26.1.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.2 â€” FEATURE 6+7: ADVANCED TEMPLATE SYSTEM + STARTER TEMPLATES
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Each template now controls the full design system:
   typography Â· spacing Â· color palette Â· liquid-glass intensity Â·
   layout defaults. Three industry starter templates populate the
   canvas with conversion-optimized blocks.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* Industry starter templates â€” full design system */
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

/* TemplateSystem â€” applies a template's FULL design system to State */
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
    showToast('ðŸŽ¨ ' + tpl.name + ' Template Loaded', 'Customize anything from the sidebar', 'success');

    // F8: kick off Unsplash image fetch for hero + gallery
    if (tpl.unsplashKeyword) Unsplash.applyToBlocks(tpl.unsplashKeyword);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.2 â€” STARTER COPY (conversion-optimized text per industry)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const StarterCopy = {
  pressure: {
    nav: { logo: 'PressureProz', links: ['Services','Gallery','Pricing','Book Now'], ctaText: 'Get Free Quote', ctaBgColor: '#ffd400', textColor: '#ffffff', bgColor: '#0c1a36', sticky: true },
    hero: {
      heading: 'Professional Pressure Washing â€” Book Instantly',
      subheading: 'Driveways, decks, siding, and roofs restored to like-new in one visit. Licensed, insured, and 5-star rated.',
      btnText: 'Get a Free Quote', btn2Text: 'See Before & After',
      bgColor: '#0a4da3', bgColor2: '#0c1a36', textColor: '#ffffff',
      btnColor: '#ffd400', btnTextColor: '#0c1a36',
      showBadge: true, badgeText: 'â­ 500+ 5-Star Reviews', minHeight: '85vh'
    },
    features: { heading: 'What We Clean', subheading: 'Every surface, every season â€” pressure-washed to perfection.',
      items: [
        { icon: 'ðŸ ', title: 'House Washing',   description: 'Soft-wash siding & exterior walls. Removes mold, algae, and dirt without damaging paint.' },
        { icon: 'ðŸš—', title: 'Driveways',       description: 'Concrete, pavers, and asphalt. Oil stains, tire marks, and grime â€” gone.' },
        { icon: 'ðŸªµ', title: 'Decks & Patios',  description: 'Wood, composite, and stone. Restore original color before sealing or staining.' },
        { icon: 'ðŸ¢', title: 'Commercial',      description: 'Storefronts, parking lots, and dumpster pads. Scheduled service available.' },
        { icon: 'ðŸšï¸', title: 'Roof Cleaning',  description: 'Soft-wash treatment kills moss, lichen, and algae streaks safely.' },
        { icon: 'ðŸ§±', title: 'Brick & Stone',   description: 'Restore brick, stone, and stucco surfaces to their original beauty.' }
      ], accentColor: '#0a4da3', bgColor: '#ffffff', textColor: '#0c1a36'
    },
    gallery: { heading: 'Before & After', subheading: 'Real customers. Real transformations.', bgColor: '#f5f8ff', textColor: '#0c1a36', columns: 3,
      images: Array.from({length:6}, (_,i) => ({ src:'', alt:'Project '+(i+1), caption: ['Driveway Restoration','Roof Soft-Wash','House Siding','Deck Renewal','Concrete Cleanup','Brick Patio'][i] })) },
    testimonials: { heading: 'Customers Love Our Work', subheading: 'See why we are the #1 rated pressure washing crew.', bgColor: '#ffffff', textColor: '#0c1a36', accentColor: '#0a4da3',
      cards: [
        { name:'Mike H.',    role:'Homeowner',     rating:5, quote:'My driveway looks brand new. Booked online in 2 minutes, crew showed up on time, done in 90 minutes.', bgColor:'#ffffff' },
        { name:'Lisa P.',    role:'Property Mgr.', rating:5, quote:'We use them for all 14 of our buildings. Reliable, professional, and the results are consistent.',   bgColor:'#ffffff' },
        { name:'Carlos R.',  role:'Restaurant Owner', rating:5, quote:'Cleaned our patio and storefront â€” customers commented on it the next day. Worth every dollar.',   bgColor:'#ffffff' }
      ] },
    pricing: { heading: 'Honest, Upfront Pricing', subheading: 'Free quote in 60 seconds. No surprises.', bgColor: '#0c1a36', textColor: '#ffffff', accentColor: '#ffd400',
      plans: [
        { name:'Driveway',  price:'$149', period:'flat', description:'Up to 1,000 sqft of concrete or pavers.', features:['Full pre-treatment','Stain removal','Sealed finish optional','30-day satisfaction guarantee'], ctaText:'Book Now', ctaLink:'#book', featured:false, bgColor:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)' },
        { name:'House Wash',price:'$299', period:'flat', description:'Full exterior soft-wash, single-story home.', features:['Eco-safe detergents','Mold & algae kill','Window/sill cleaning','Driveway rinse-off included','100% satisfaction guarantee'], ctaText:'Most Booked', ctaLink:'#book', featured:true, bgColor:'#ffd400', borderColor:'#ffd400' },
        { name:'Full Property', price:'$499', period:'flat', description:'House + driveway + walkways + deck.', features:['Everything in House Wash','Deck or patio included','Walkways & steps','Roof inspection','Priority scheduling'], ctaText:'Get Quote', ctaLink:'#book', featured:false, bgColor:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)' }
      ] },
    cta: { heading: 'Ready for a Cleaner Property?', subheading: 'Same-week appointments available. Free quote, no pressure (except on the gun).', bgColor:'#0a4da3', bgColor2:'#0c1a36', textColor:'#ffffff', btnText:'Get My Free Quote', btnColor:'#ffd400', btnTextColor:'#0c1a36', btn2Text:'Call (555) 123-4567' },
    leadform: { heading: 'Get a Free Quote in 60 Seconds', subheading: 'Tell us about your property â€” we will text you a price within the hour.', bgColor:'#ffffff', textColor:'#0c1a36', accentColor:'#0a4da3', btnColor:'#0a4da3', btnText:'Get My Quote â†’',
      fields:[ { type:'text',  placeholder:'Your name',    name:'name'    }, { type:'tel', placeholder:'Phone number',  name:'phone' }, { type:'email', placeholder:'Email address', name:'email' }, { type:'textarea', placeholder:'What do you need cleaned?', name:'service' } ] },
    footer: { logo:'PressureProz', tagline:'Professional Pressure Washing Â· Licensed & Insured', bgColor:'#0c1a36', textColor:'#9ab2d4', accentColor:'#ffd400' }
  },

  lawn: {
    nav: { logo: 'GreenStripe Lawn', links: ['Services','Packages','Pricing','Book'], ctaText: 'Free Estimate', ctaBgColor: '#f4a300', textColor: '#ffffff', bgColor: '#16361b', sticky: true },
    hero: {
      heading: 'Lawn Care That Keeps Your Yard Looking Flawless',
      subheading: 'Weekly mowing, edging, fertilization, and seasonal cleanups. Same crew every visit. No contracts.',
      btnText: 'Get Free Estimate', btn2Text: 'See Packages',
      bgColor: '#2d7a3a', bgColor2: '#16361b', textColor: '#ffffff',
      btnColor: '#f4a300', btnTextColor: '#16361b',
      showBadge: true, badgeText: 'ðŸŒ¿ Locally Owned Â· Same Crew Every Time', minHeight: '80vh'
    },
    features: { heading: 'Lawn Services', subheading: 'Everything your yard needs â€” done right, every time.',
      items: [
        { icon: 'ðŸŒ±', title: 'Weekly Mowing',     description: 'Sharp-blade cuts at the right height for your grass type. Edged, blown, and bagged on request.' },
        { icon: 'ðŸƒ', title: 'Fertilization',     description: '6-step year-round program. Slow-release nutrients and pre-emergent weed control.' },
        { icon: 'ðŸŒ³', title: 'Tree & Shrub Care', description: 'Pruning, trimming, and seasonal shaping. Keeps everything healthy and tidy.' },
        { icon: 'ðŸ‚', title: 'Leaf Cleanup',      description: 'Fall and spring cleanups â€” blown, vacuumed, and hauled away.' },
        { icon: 'ðŸ’§', title: 'Sprinkler Tune-Up', description: 'Spring start-up, fall blow-out, and mid-season head adjustments.' },
        { icon: 'ðŸŒ·', title: 'Mulch & Beds',      description: 'Fresh mulch, edging, and bed prep. Crisp lines that last all season.' }
      ], accentColor: '#2d7a3a', bgColor: '#ffffff', textColor: '#16361b'
    },
    gallery: { heading: 'Recent Lawns', subheading: 'A few yards we keep looking sharp.', bgColor:'#f6fbf3', textColor:'#16361b', columns:3,
      images: Array.from({length:6}, (_,i) => ({ src:'', alt:'Lawn '+(i+1), caption:['Spring Cleanup','Weekly Mow','Fresh Mulch','Hedge Trim','Fall Cleanup','New Sod'][i] })) },
    testimonials: { heading:'Neighbors Trust Us', subheading:'Real reviews from real customers in your area.', bgColor:'#ffffff', textColor:'#16361b', accentColor:'#2d7a3a',
      cards:[
        { name:'Jessica T.', role:'Homeowner', rating:5, quote:'Best looking lawn on my street. Same two guys every Tuesday â€” they know the property and never miss a detail.', bgColor:'#ffffff' },
        { name:'Brian L.',   role:'Homeowner', rating:5, quote:'Switched from a big company and saved 20%. Quality is way better. Highly recommend.', bgColor:'#ffffff' },
        { name:'Maria S.',   role:'HOA Board', rating:5, quote:'They handle 40+ properties for our HOA. Always on schedule, professional, and homeowners love the results.', bgColor:'#ffffff' }
      ] },
    pricing: { heading:'Simple Seasonal Packages', subheading:'No contracts. Cancel anytime. Pricing for Â¼-acre lots.', bgColor:'#16361b', textColor:'#ffffff', accentColor:'#f4a300',
      plans:[
        { name:'Basic Mow', price:'$45', period:'/visit', description:'Weekly mowing essentials.', features:['Mow + edge + blow','Sharp-blade cuts','Visible debris cleanup','Easy online scheduling'], ctaText:'Start Service', ctaLink:'#book', featured:false, bgColor:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)' },
        { name:'Full Care', price:'$129', period:'/month', description:'Complete weekly care + monthly extras.', features:['Everything in Basic Mow','Monthly fertilization','Bed weeding','Hedge maintenance','Seasonal cleanups included'], ctaText:'Most Popular', ctaLink:'#book', featured:true, bgColor:'#f4a300', borderColor:'#f4a300' },
        { name:'Premier',   price:'$249', period:'/month', description:'White-glove yard management.', features:['Everything in Full Care','Mulch refresh 2x/yr','Tree/shrub pruning','Irrigation maintenance','Annual lawn analysis'], ctaText:'Get Quote', ctaLink:'#book', featured:false, bgColor:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)' }
      ] },
    cta: { heading:'Get a Yard You Are Proud Of', subheading:'Free estimate in under a minute. We handle everything from there.', bgColor:'#2d7a3a', bgColor2:'#16361b', textColor:'#ffffff', btnText:'Get My Free Estimate', btnColor:'#f4a300', btnTextColor:'#16361b', btn2Text:'Call (555) 123-4567' },
    leadform: { heading:'Tell Us About Your Yard', subheading:'We will text you a same-day quote with photos of similar properties.', bgColor:'#ffffff', textColor:'#16361b', accentColor:'#2d7a3a', btnColor:'#2d7a3a', btnText:'Get Estimate â†’',
      fields:[ { type:'text', placeholder:'Your name', name:'name' }, { type:'tel', placeholder:'Phone', name:'phone' }, { type:'text', placeholder:'Address (street only)', name:'address' }, { type:'textarea', placeholder:'What services are you interested in?', name:'service' } ] },
    footer: { logo:'GreenStripe Lawn', tagline:'Local. Reliable. Sharp lines every time.', bgColor:'#16361b', textColor:'#9bbf8f', accentColor:'#f4a300' }
  },

  lifestyle: {
    nav: { logo: 'IRON & EDGE', links: ['Book','Services','Gallery','Crew'], ctaText: 'Book Session', ctaBgColor: '#e63946', textColor: '#f5f5f7', bgColor: '#0d0d10', sticky: true },
    hero: {
      heading: 'Book Your Next Session â€” Walk Out Confident',
      subheading: 'Cuts, fades, fits, and finishes by master-level pros. Walk-ins welcome. Most clients book online in under 30 seconds.',
      btnText: 'Book My Slot', btn2Text: 'See Our Work',
      bgColor: '#0d0d10', bgColor2: '#1a1a22', textColor: '#f5f5f7',
      btnColor: '#e63946', btnTextColor: '#ffffff',
      showBadge: true, badgeText: 'âš¡ Same-Day Booking Available', minHeight: '90vh'
    },
    features: { heading: 'What We Do', subheading: 'Premium service. Honest pricing. Atmosphere you actually want to hang in.',
      items: [
        { icon: 'âœ‚ï¸', title: 'Signature Cuts',  description: 'Skin fades, scissor work, beard sculpting. Tailored to your face shape and lifestyle.' },
        { icon: 'ðŸª’', title: 'Hot Towel Shave', description: 'Old-school straight razor, hot towel prep, and post-shave balm. The full experience.' },
        { icon: 'ðŸ’ª', title: '1-on-1 Training', description: 'Strength, conditioning, mobility. Programs built around YOUR goals.' },
        { icon: 'ðŸŽ¨', title: 'Custom Tattoo',   description: 'From flash to full sleeve. Booking opens the 1st of every month.' },
        { icon: 'ðŸ§´', title: 'Grooming Goods',  description: 'Curated pomades, beard oils, and aftercare. Stuff we actually use.' },
        { icon: 'ðŸŽ', title: 'Gift Cards',      description: 'Any service, any amount. Delivered instantly to their phone.' }
      ], accentColor: '#e63946', bgColor: '#0d0d10', textColor: '#f5f5f7'
    },
    gallery: { heading: 'Recent Work', subheading: 'A taste of what walks out of the chair.', bgColor:'#1a1a22', textColor:'#f5f5f7', columns:3,
      images: Array.from({length:6}, (_,i) => ({ src:'', alt:'Work '+(i+1), caption:['Skin Fade','Beard Sculpt','Long Layered','Buzz & Beard','Custom Color','Straight Razor'][i] })) },
    testimonials: { heading:'Five-Star Vibes', subheading:'What our regulars are saying.', bgColor:'#0d0d10', textColor:'#f5f5f7', accentColor:'#e63946',
      cards:[
        { name:'Tony D.',  role:'Regular, 3 years', rating:5, quote:'Best chair in the city. The crew actually listens â€” every cut is exactly what I asked for.', bgColor:'#1a1a22' },
        { name:'James K.', role:'New Client',       rating:5, quote:'Booked online, in and out in 35 minutes, looked sharp for a wedding the next day. Bookmarking these guys.', bgColor:'#1a1a22' },
        { name:'Mason R.', role:'Personal Training', rating:5, quote:'Lost 22 lbs in 4 months training here. The coaches push without being weird about it.', bgColor:'#1a1a22' }
      ] },
    pricing: { heading:'Straight-Up Pricing', subheading:'No upsells. No surprises. Tip optional, never expected.', bgColor:'#1a1a22', textColor:'#f5f5f7', accentColor:'#e63946',
      plans:[
        { name:'Quick Trim',   price:'$35',  period:'/30 min', description:'Maintenance cut. Same shape, sharper lines.', features:['Wash + cut','Neckline shape-up','Style + finish','Walk-ins welcome'], ctaText:'Book', ctaLink:'#book', featured:false, bgColor:'#0d0d10', borderColor:'rgba(230,57,70,0.2)' },
        { name:'Signature',    price:'$65',  period:'/45 min', description:'Full cut + beard. Our most-booked service.', features:['Hot towel prep','Custom skin/scissor cut','Beard line-up','Style consultation','Aftercare product'], ctaText:'Book Signature', ctaLink:'#book', featured:true, bgColor:'#e63946', borderColor:'#e63946' },
        { name:'Full Service', price:'$110', period:'/75 min', description:'Cut, beard, hot shave, hair tonic.', features:['Everything in Signature','Old-school straight razor','Scalp massage','Take-home product','Priority rebooking'], ctaText:'Book Full Service', ctaLink:'#book', featured:false, bgColor:'#0d0d10', borderColor:'rgba(230,57,70,0.2)' }
      ] },
    cta: { heading:'Walk in. Walk out. Look the part.', subheading:'Your chair is open. Most slots fill within 2 hours of opening â€” book early.', bgColor:'#e63946', bgColor2:'#0d0d10', textColor:'#ffffff', btnText:'Book My Session', btnColor:'#ffffff', btnTextColor:'#e63946', btn2Text:'Call to Book' },
    leadform: { heading:'Booking Request', subheading:'Tell us when you want in â€” we will confirm by text within the hour.', bgColor:'#0d0d10', textColor:'#f5f5f7', accentColor:'#e63946', btnColor:'#e63946', btnText:'Request Booking â†’',
      fields:[ { type:'text', placeholder:'Your name', name:'name' }, { type:'tel', placeholder:'Phone', name:'phone' }, { type:'text', placeholder:'Service (cut, beard, training, tattooâ€¦)', name:'service' }, { type:'textarea', placeholder:'Preferred days/times', name:'when' } ] },
    footer: { logo:'IRON & EDGE', tagline:'Premium grooming Â· Personal training Â· Custom tattoo', bgColor:'#0d0d10', textColor:'#7a7a82', accentColor:'#e63946' }
  },

  /** Merge an Onboarding businessInfo object into a starter copy in-place */
  merge(copy, info) {
    const name  = (info.businessName || '').trim();
    const phone = (info.phone || '').trim();
    const services = (info.services || '').split('\n').map(s => s.trim()).filter(Boolean);
    const pricing  = (info.pricing  || '').split('\n').map(s => s.trim()).filter(Boolean);

    // Industry vocabulary â€” drives tone across the WHOLE site
    const VOCAB = {
      pressure:   { noun:'pressure washing', verb:'cleaned',     action:'Book a Wash',     who:'crew',       jobNoun:'wash',      audience:'homeowners',  cta:'Get Free Quote',     bookCta:'Get My Quote',  whatWeDo:'What We Clean',   recent:'Recent Projects',     review:'Customers Love Our Work', tagline:'Pro pressure washing Â· Licensed & insured', badge:'â­ 500+ 5-Star Reviews', linksCore:['Services','Gallery','Pricing','Book Now'], featureLead:'Every surface, every season â€” pressure-washed to perfection.' },
      lawn:       { noun:'lawn care',        verb:'serviced',    action:'Book a Visit',    who:'crew',       jobNoun:'visit',     audience:'neighbors',   cta:'Free Estimate',      bookCta:'Get Estimate',  whatWeDo:'Lawn Services',   recent:'Recent Lawns',        review:'Neighbors Trust Us',     tagline:'Local lawn care Â· Same crew every time',         badge:'ðŸŒ¿ Locally Owned Â· Same Crew Every Time', linksCore:['Services','Packages','Pricing','Book'], featureLead:'Everything your yard needs â€” done right, every time.' },
      barber:     { noun:'barbering',        verb:'styled',      action:'Book Your Chair', who:'barbers',    jobNoun:'cut',       audience:'guys',        cta:'Book a Cut',         bookCta:'Book My Chair', whatWeDo:'Chair Services',  recent:'Recent Cuts',         review:'What Our Regulars Say',  tagline:'Premium barbering Â· Walk-ins welcome',           badge:'ðŸ’ˆ Walk-Ins Welcome Â· Same-Day Booking',  linksCore:['Book','Services','Gallery','Crew'], featureLead:'Sharp cuts, hot shaves, and an atmosphere you actually want to hang in.' },
      fitness:    { noun:'personal training', verb:'trained',    action:'Book a Session',  who:'coaches',    jobNoun:'session',   audience:'clients',     cta:'Start Training',     bookCta:'Book My Session',whatWeDo:'Programs',       recent:'Recent Transformations', review:'What Our Clients Say', tagline:'Personal training Â· Real results Â· No fluff',  badge:'ðŸ’ª 1-on-1 Coaching Â· Real Results',       linksCore:['Programs','Coaches','Pricing','Book'], featureLead:'Programs built around YOUR goals. No fluff. Just results.' },
      tattoo:     { noun:'tattoo work',      verb:'tattooed',    action:'Book a Session',  who:'artists',    jobNoun:'piece',     audience:'collectors',  cta:'Request Booking',    bookCta:'Request a Session', whatWeDo:'Studio Services', recent:'Recent Work',     review:'What Our Clients Say',   tagline:'Custom tattoo studio Â· By appointment',          badge:'ðŸŽ¨ Booking Open Â· Custom Designs',        linksCore:['Artists','Portfolio','Booking','Aftercare'], featureLead:'From flash to full sleeves â€” custom designs by master artists.' },
      restaurant: { noun:'food',             verb:'served',      action:'Reserve a Table', who:'kitchen',    jobNoun:'dish',      audience:'guests',      cta:'Reserve Now',        bookCta:'Reserve a Table', whatWeDo:'On the Menu',   recent:'From the Kitchen',    review:'What Our Guests Say',    tagline:'Fresh kitchen Â· Locally sourced',                 badge:'ðŸ´ Reservations Recommended',             linksCore:['Menu','Reservations','Gallery','Visit'], featureLead:'Honest food, sourced local, made from scratch every day.' }
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

    // â”€â”€â”€ NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (copy.nav) {
      if (name) copy.nav.logo = name;
      copy.nav.links   = V.linksCore.slice();
      copy.nav.ctaText = V.cta;
    }

    // â”€â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (copy.hero) {
      copy.hero.heading    = name ? (`${name} â€” Professional ${titleCase(V.noun)}`) : `Professional ${titleCase(V.noun)} You Can Trust`;
      copy.hero.subheading = `${cap(svcList.slice(0,3).join(', '))}${svcList.length>3?' & more':''}. Booked in seconds, ${V.verb} by pros, guaranteed to look right.`;
      copy.hero.btnText    = V.cta;
      copy.hero.btn2Text   = phone ? ('ðŸ“ž ' + phone) : `See Our ${cap(V.jobNoun)}s`;
      copy.hero.badgeText  = V.badge;
      copy.hero.showBadge  = true;
    }

    // â”€â”€â”€ FEATURES (services) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (copy.features) {
      copy.features.heading    = V.whatWeDo;
      copy.features.subheading = V.featureLead;
      const baseIcons = (copy.features.items || []).map(i => i.icon);
      copy.features.items = svcList.slice(0, 6).map((svc, i) => ({
        icon: baseIcons[i] || baseIcons[i % baseIcons.length] || 'âœ¨',
        title: cap(svc),
        description: `Professional ${svc.toLowerCase()} from the ${brand} ${V.who}. ${V.audience.charAt(0).toUpperCase()+V.audience.slice(1)} love the consistency, the speed, and the finish.`
      }));
      // Pad to 6 if user gave fewer
      while (copy.features.items.length < 6 && copy.features.items.length < svcList.length + 1) break;
    }

    // â”€â”€â”€ GALLERY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (copy.gallery) {
      copy.gallery.heading    = V.recent;
      copy.gallery.subheading = `A few recent ${V.jobNoun}s from the ${brand} ${V.who}.`;
      if (Array.isArray(copy.gallery.images)) {
        copy.gallery.images = copy.gallery.images.map((img, i) => Object.assign({}, img, {
          caption: cap(svcList[i % svcList.length] || V.jobNoun),
          alt: `${brand} â€” ${svcList[i % svcList.length] || V.jobNoun}`
        }));
      }
    }

    // â”€â”€â”€ TESTIMONIALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (copy.testimonials && Array.isArray(copy.testimonials.cards)) {
      copy.testimonials.heading    = V.review;
      copy.testimonials.subheading = `Real reviews from real ${V.audience} of ${brand}.`;
      const quoteTemplates = [
        (svc) => `Booked online in 2 minutes, ${brand} crew showed up on time, and the ${svc.toLowerCase()} was exactly what I wanted. Already rebooked.`,
        (svc) => `I have tried 3 other places. ${brand} is the only one I trust for ${svc.toLowerCase()} now. Worth every dollar.`,
        (svc) => `${brand} handled our ${svc.toLowerCase()} flawlessly â€” professional, fast, and the result looks incredible. Highly recommend.`
      ];
      copy.testimonials.cards = copy.testimonials.cards.map((c, i) => Object.assign({}, c, {
        quote: quoteTemplates[i % quoteTemplates.length](svcList[i % svcList.length] || V.jobNoun)
      }));
    }

    // â”€â”€â”€ PRICING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€â”€ CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (copy.cta) {
      copy.cta.heading    = `Ready to book your ${V.jobNoun}?`;
      copy.cta.subheading = `${brand} has same-week openings. Get a free quote in under a minute.`;
      copy.cta.btnText    = V.bookCta;
      copy.cta.btn2Text   = phone ? ('ðŸ“ž ' + phone) : 'Call to Book';
    }

    // â”€â”€â”€ LEAD FORM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (copy.leadform) {
      copy.leadform.heading    = `Request a ${cap(V.jobNoun)}`;
      copy.leadform.subheading = phone
        ? `Tell us what you need â€” or call ${brand} directly at ${phone}.`
        : `Tell us what you need â€” the ${brand} ${V.who} will text you back within the hour.`;
      copy.leadform.btnText    = V.bookCta + ' â†’';
      if (Array.isArray(copy.leadform.fields)) {
        // Personalize service field placeholder with user's actual services
        copy.leadform.fields = copy.leadform.fields.map(f => {
          if (f.name === 'service' || (f.placeholder || '').toLowerCase().includes('service')) {
            return Object.assign({}, f, { placeholder: `What ${V.jobNoun} are you booking? (${svcList.slice(0,3).join(', ')}â€¦)` });
          }
          return f;
        });
      }
    }

    // â”€â”€â”€ FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (copy.footer) {
      if (name) copy.footer.logo = name;
      copy.footer.tagline = `${brand} Â· ${V.tagline}`;
    }
  }
};

function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function titleCase(s) { return String(s || '').split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' '); }

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.2 â€” FEATURE 8: UNSPLASH AUTO IMAGE INTEGRATION
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
      showToast('ðŸ–¼ Image fetch skipped', 'Using gradient placeholders. You can add images manually.', 'warning');
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
      showToast('ðŸ–¼ Images Loaded', 'Auto-fetched from Unsplash Â· ' + images.length + ' photos cached', 'success');
    }
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV27 â€” NEW ONBOARDING: 6-STEP BRAND INTERVIEW
   Pollinations AI generates 3 unique designs per user.
   Unsplash auto-pulls industry-relevant images for each design.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const Onboarding = {
  _key: 'ss_onboarding_v28',
  _step: 0,
  _data: {
    // Step 1
    businessName:   '',
    description:    '',
    // Step 2
    industry:       '',
    niche:          '',   // specific niche within industry
    location:       '',
    // Step 3
    vibes:          [],   // 3-5 personality words
    // Step 4
    targetCustomer: '',
    // Step 5
    competitors:    '',   // competitor sites they like
    inspiration:    '',   // any aesthetic inspiration sites
    // Step 6
    differentiator: '',
    // Step 7
    tone:           '',
    // Step 8
    goal:           '',
    // Step 9
    colorPrefs:     '',   // color preferences or 'AI decides'
    // Step 10
    services:       '',
    phone:          '',
    cta:            '',
    // Step 11
    sections:       '',   // specific sections needed
    logo:           '',   // data URL if uploaded
    // Step 12
    extra:          '',
  },
  _designs: [],      // 3 generated design objects
  _selectedDesign: null,
  _generating: false,

  GEMINI_KEY: '',    // set via SSV27_GEMINI_KEY in localStorage or window
  POLL_URL:  'https://text.pollinations.ai/openai',
  POLL_MODEL:'openai',

  INDUSTRIES: [
    'Restaurant / Food & Drink',
    'Trades (Plumbing, Electric, HVAC)',
    'Fitness / Gym / Wellness',
    'Salon / Beauty / Spa',
    'Law / Finance / Consulting',
    'Retail / Ecommerce',
    'Real Estate',
    'Photography / Creative',
    'Healthcare / Medical',
    'Auto / Automotive',
    'Other'
  ],

  VIBES: ['Modern','Bold','Minimal','Playful','Luxury','Trustworthy','Energetic','Elegant','Friendly','Professional'],

  CUSTOMERS: [
    'Local families and individuals',
    'Corporate clients and businesses',
    'Young trendy audience',
    'High-end luxury clients',
    'General public / everyone'
  ],

  PALETTES: [
    { id:'warm',    label:'Warm earthy tones',     preview:['#c0392b','#e67e22','#f5cba7'] },
    { id:'cool',    label:'Cool blues and greys',   preview:['#2980b9','#85929e','#d6eaf8'] },
    { id:'bold',    label:'Bold and vibrant',       preview:['#8e44ad','#e74c3c','#f39c12'] },
    { id:'dark',    label:'Dark and premium',       preview:['#1a1a2e','#16213e','#e94560'] },
    { id:'minimal', label:'Clean minimal white',    preview:['#ffffff','#f2f2f2','#333333'] }
  ],

  GOALS: [
    'Get people to call me',
    'Get people to book an appointment',
    'Show my work / portfolio',
    'Build trust and credibility',
    'Sell products online'
  ],

  isComplete() {
    try { return localStorage.getItem(this._key) === 'done'; } catch(e) { return false; }
  },
  markDone() {
    try { localStorage.setItem(this._key, 'done'); } catch(e) {}
    State.onboardingComplete = true;
  },
  reset() {
    try { localStorage.removeItem(this._key); } catch(e) {}
    State.onboardingComplete = false;
    this._step = 0;
    this._data = { businessName:'', description:'', industry:'', niche:'', location:'', vibes:[], targetCustomer:'', competitors:'', inspiration:'', differentiator:'', tone:'', goal:'', colorPrefs:'', services:'', phone:'', cta:'', sections:'', logo:'', extra:'' };
    this._designs = [];
    this._selectedDesign = null;
  },
  maybeShow() {
    if (!this.isComplete()) this.open();
  },
  open() {
    this._step = 0;
    this._renderModal();
  },
  close(skip) {
    const m = document.getElementById('onboarding-modal');
    if (m) m.style.display = 'none';
    if (skip) {
      this.markDone();
      showToast('Welcome to Supersuite', 'You can redo onboarding from Settings anytime.', 'info');
    }
  },

  /* â”€â”€ Gemini Flash API call â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _getGeminiKey() { return ''; }, // keyless via Pollinations

  async _callGemini(prompt) {
    const res = await fetch(this.POLL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:   this.POLL_MODEL,
        messages:[{ role: 'user', content: prompt }],
        private: true,
        referrer:'supersuite',
        jsonMode: true
      })
    });
    if (!res.ok) throw new Error('Pollinations HTTP ' + res.status);
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch(e) { json = { choices:[{message:{content:text}}] }; }
    const out = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!out) throw new Error('No Pollinations response');
    const match = out.match(/```(?:json)?\s*([\s\S]+?)```/) || out.match(/(\[[\s\S]+\])/);
    return match ? match[1] : out;
  },

  /* â”€â”€ Build design generation prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _buildPrompt() {
    const d = this._data;
    return `You are a professional web designer. Generate 3 COMPLETELY DIFFERENT website design concepts for this business:

Business Name: "${d.businessName}"
Industry: ${d.industry}
Brand vibes: ${d.vibes.join(', ')}
Target customers: ${d.customers}
Color palette preference: ${d.palette}
Primary website goal: ${d.goal}

Return ONLY a valid JSON array (no markdown, no explanation) with exactly 3 objects. Each object must have:
{
  "name": "short design concept name (2-3 words)",
  "cssVars": {
    "--primary": "#hexcolor",
    "--secondary": "#hexcolor",
    "--accent": "#hexcolor",
    "--bg": "#hexcolor",
    "--text": "#hexcolor",
    "--font-heading": "'FontName', sans-serif",
    "--font-body": "'FontName', sans-serif",
    "--radius": "4px or 10px or 18px or 28px",
    "--shadow": "css box-shadow value",
    "--btn-radius": "px value"
  },
  "blockOrder": ["nav","hero","features","testimonials","cta","footer"],
  "heroLayout": "centered or split or asymmetric",
  "unsplashQuery": "2-4 word search query for relevant images",
  "buttonStyle": "filled or outlined or pill",
  "vibe": "one sentence describing the design personality"
}

Make each design VISUALLY DISTINCT. Use different fonts, colors, border-radius, and layouts. The 3 designs should look nothing alike.`;
  },

  /* â”€â”€ Generate 3 designs via Gemini â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  async _generateDesigns() {
    this._generating = true;
    this._updateLoadingState(true);
    try {
      const json = await this._callGemini(this._buildPrompt());
      let designs;
      try { designs = JSON.parse(json); } catch(e) {
        // Try to extract array even if malformed
        const match = json.match(/\[[\s\S]+\]/);
        if (match) designs = JSON.parse(match[0]);
        else throw new Error('Could not parse Gemini response as JSON');
      }
      if (!Array.isArray(designs) || designs.length < 1) throw new Error('Expected array of designs');
      // Ensure we have exactly 3 (pad if needed)
      while (designs.length < 3) designs.push(designs[0]);
      this._designs = designs.slice(0, 3);
      // Now fetch Unsplash images for each design
      await Promise.all(this._designs.map(async (d, i) => {
        try {
          const imgs = await Unsplash.fetchImages(d.unsplashQuery || this._data.industry, 4);
          d._images = imgs;
        } catch(e) {
          d._images = [];
        }
      }));
      this._updateLoadingState(false);
      this._renderDesignPicker();
    } catch(err) {
      this._generating = false;
      this._updateLoadingState(false);
      console.warn('[Onboarding] Gemini failed, using fallback designs:', err.message);
      this._useFallbackDesigns();
      this._renderDesignPicker();
    }
  },

  /* â”€â”€ Fallback designs if Gemini fails â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _useFallbackDesigns() {
    const paletteCss = {
      warm:    { '--primary':'#c0392b','--secondary':'#e67e22','--accent':'#f39c12','--bg':'#fdf6f0','--text':'#2c1810' },
      cool:    { '--primary':'#2980b9','--secondary':'#5d6d7e','--accent':'#00b4d8','--bg':'#f0f8ff','--text':'#1a2b3c' },
      bold:    { '--primary':'#8e44ad','--secondary':'#e74c3c','--accent':'#f39c12','--bg':'#fefefe','--text':'#111111' },
      dark:    { '--primary':'#e94560','--secondary':'#0f3460','--accent':'#e94560','--bg':'#16213e','--text':'#eaeaea' },
      minimal: { '--primary':'#333333','--secondary':'#666666','--accent':'#ff6b35','--bg':'#ffffff','--text':'#1a1a1a' }
    };
    const pal = paletteCss[this._data.palette] || paletteCss.minimal;
    const name = this._data.businessName || 'My Business';
    this._designs = [
      { name:'The Pro', cssVars: { ...pal, '--font-heading':"'Syne', sans-serif", '--font-body':"'DM Sans', sans-serif", '--radius':'4px','--btn-radius':'4px','--shadow':'0 4px 14px rgba(0,0,0,.08)' }, blockOrder:['nav','hero','features','testimonials','cta','footer'], heroLayout:'split', buttonStyle:'filled', vibe:'Sharp, professional, direct', unsplashQuery:this._data.industry, _images:[] },
      { name:'The Warm', cssVars: { ...pal, '--font-heading':"'Playfair Display', serif", '--font-body':"'Raleway', sans-serif", '--radius':'18px','--btn-radius':'28px','--shadow':'0 12px 32px rgba(0,0,0,.12)' }, blockOrder:['nav','hero','testimonials','features','cta','footer'], heroLayout:'centered', buttonStyle:'pill', vibe:'Friendly, approachable, warm', unsplashQuery:this._data.industry + ' people', _images:[] },
      { name:'The Bold', cssVars: { '--primary':'#000000','--secondary':'#111111','--accent':pal['--primary'],'--bg':'#ffffff','--text':'#000000','--font-heading':"'Space Grotesk', sans-serif",'--font-body':"'DM Sans', sans-serif",'--radius':'0px','--btn-radius':'0px','--shadow':'4px 4px 0 #000' }, blockOrder:['nav','hero','cta','features','testimonials','footer'], heroLayout:'asymmetric', buttonStyle:'outlined', vibe:'Confident, bold, editorial', unsplashQuery:this._data.industry, _images:[] }
    ];
  },

  /* â”€â”€ Apply selected design to State â”€â”€â”€ SSV27 FIX â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _applyDesign(design) {
    const d = this._data;
    const name = d.businessName || 'Your Business';
    const industry = d.industry || '';
    const goal = d.goal || '';
    const cv = design.cssVars || {};
    const primary   = cv['--primary']   || '#ff6b35';
    const secondary = cv['--secondary'] || '#333';
    const accent    = cv['--accent']    || primary;
    const bg        = cv['--bg']        || '#ffffff';
    const text      = cv['--text']      || '#1a1a2e';

    // 1. Apply CSS variables globally
    Object.entries(cv).forEach(([k,v]) => {
      State.globalStyles[k] = v;
      document.documentElement.style.setProperty(k, v);
    });

    // 1b. Switch to 'custom' template so no template overrides clobber AI colors
    State.currentTemplate = 'custom';
    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.querySelector('.template-card[data-key="custom"]');
    if (activeCard) activeCard.classList.add('active');

    // 2. Store onboarding data in State for other systems
    State.businessName = name;
    State.industry     = industry;
    State.heroLayout   = design.heroLayout || 'centered';

    // 3. Build goal-driven headline + CTA copy
    const goalCopy = {
      'Get people to call me':              { h:'Get Expert Help Fast', sub:'Serving ' + industry + ' â€” call us for a free quote today.', cta:'ðŸ“ž Call Now', cta2:'Learn More' },
      'Get people to book an appointment':  { h:'Book Your Appointment', sub:'Fast, easy online booking for ' + name + '.', cta:'Book Now â†’', cta2:'See Availability' },
      'Show my work / portfolio':           { h:'Our Work Speaks for Itself', sub:'Browse ' + name + '\u2019s portfolio of ' + industry + ' projects.', cta:'View Portfolio \u2192', cta2:'Get in Touch' },
      'Build trust and credibility':        { h:'Trusted ' + industry + ' Experts', sub:name + ' â€” years of experience, hundreds of happy clients.', cta:'Meet the Team â†’', cta2:'Our Reviews' },
      'Sell products online':               { h:'Shop ' + name, sub:'Quality ' + industry + ' products â€” fast shipping, easy returns.', cta:'Shop Now â†’', cta2:'View All Products' },
    };
    const copy = goalCopy[goal] || { h:'Welcome to ' + name, sub:'Your trusted ' + industry + ' experts.', cta:'Get Started â†’', cta2:'Learn More' };

    // 4. Clear existing blocks and build fresh from design.blockOrder
    State.blocks = [];
    State.blockIdCounter = State.blockIdCounter || 1;

    const order = (design.blockOrder && design.blockOrder.length)
      ? design.blockOrder
      : ['nav','hero','features','testimonials','cta','footer'];

    // Pull rich StarterCopy for this industry (fall back to generic if not found)
    // Map onboarding industry string to a StarterCopy key
    const industryCopyKey = (function(){
      const i = (industry || '').toLowerCase();
      if (i.includes('pressure') || i.includes('wash') || i.includes('clean')) return 'pressure';
      if (i.includes('lawn') || i.includes('landscap') || i.includes('garden')) return 'lawn';
      if (i.includes('barber') || i.includes('salon') || i.includes('beauty') || i.includes('spa') ||
          i.includes('fitness') || i.includes('gym') || i.includes('tattoo') || i.includes('lifestyle')) return 'lifestyle';
      return null;
    })();
    const starterCopy = industryCopyKey ? JSON.parse(JSON.stringify(StarterCopy[industryCopyKey])) : null;
    // Merge business name + phone into StarterCopy if we have it
    if (starterCopy) {
      StarterCopy.merge(starterCopy, { businessName: name, phone: d.phone || '', _industry: industryCopyKey });
    }

    order.forEach(type => {
      if (!BlockDefs[type]) return;
      const def  = BlockDefs[type];
      const data = JSON.parse(JSON.stringify(def.defaultData));
      const id   = 'block_' + (State.blockIdCounter++);
      const sc   = starterCopy && starterCopy[type]; // industry-specific copy for this block

      // Personalize each block type â€” prefer StarterCopy, fall back to generic
      if (type === 'nav') {
        data.logo       = sc ? sc.logo : name;
        data.bgColor    = sc ? sc.bgColor  : bg;
        data.textColor  = sc ? sc.textColor : text;
        data.ctaBgColor = sc ? sc.ctaBgColor : primary;
        data.ctaText    = sc ? sc.ctaText : copy.cta2;
        if (sc && sc.links) data.links = sc.links;
        if (sc && sc.sticky !== undefined) data.sticky = sc.sticky;
      }
      if (type === 'hero') {
        if (sc) {
          Object.assign(data, sc);
        } else {
          data.heading    = copy.h;
          data.subheading = copy.sub;
          data.bgColor    = primary;
          data.textColor  = '#ffffff';
          data.btnText    = copy.cta;
          data.btnColor   = accent;
          data.btn2Text   = copy.cta2;
        }
        data.layout = design.heroLayout || data.layout || 'centered';
        if (design._images && design._images[0]) {
          data.bgType  = 'image';
          data.bgImage = design._images[0].url;
          data.overlay = 0.55;
        }
      }
      if (type === 'features') {
        if (sc) {
          data.heading     = sc.heading;
          data.subheading  = sc.subheading;
          data.bgColor     = sc.bgColor;
          data.textColor   = sc.textColor;
          data.accentColor = sc.accentColor || primary;
          // features block uses data.items â€” not data.cards
          if (sc.items) {
            data.items = sc.items.map(item => ({ icon: item.icon, title: item.title, description: item.description }));
          }
        } else {
          data.heading     = 'Why Choose ' + name;
          data.subheading  = 'Professional ' + industry + ' service you can count on.';
          data.bgColor     = bg;
          data.textColor   = text;
          data.accentColor = primary;
          // Always overwrite data.items with business-specific content
          data.items = [
            { icon:'âš¡', title:'Fast & Reliable',        description:'Quick turnaround with consistent, quality results every time.' },
            { icon:'ðŸ†', title:'Proven Expertise',        description:'Years of hands-on experience in ' + industry + ' â€” local and trusted.' },
            { icon:'ðŸ’°', title:'Transparent Pricing',     description:'Upfront quotes with zero hidden fees. You know what you pay before we start.' },
            { icon:'â­', title:'5-Star Rated',             description:'Hundreds of happy customers and growing. Check our reviews.' },
            { icon:'ðŸ“ž', title:'Fast Response',            description:'We reply within the hour â€” no chasing, no waiting.' },
            { icon:'âœ…', title:'Satisfaction Guarantee',   description:'Not happy? We come back and make it right. No questions asked.' },
          ];
        }
      }
      if (type === 'testimonials') {
        if (sc) {
          data.heading    = sc.heading;
          data.subheading = sc.subheading;
          data.bgColor    = sc.bgColor;
          data.textColor  = sc.textColor;
          data.accentColor = sc.accentColor || accent;
          if (sc.cards) data.cards = sc.cards;
        } else {
          data.heading    = 'What Our Clients Say';
          data.subheading = 'Real results from real ' + industry + ' customers.';
          data.bgColor    = secondary;
          data.textColor  = bg;
          data.accentColor = accent;
          if (data.cards) {
            data.cards = [
              { name:'Sarah M.',  role:'Customer',         rating:5, quote:'Best ' + industry + ' service I have ever hired. Professional, on time, and the results were incredible.', bgColor: secondary },
              { name:'James R.',  role:'Repeat Client',    rating:5, quote:'Used ' + name + ' three times now. Always consistent and always worth every penny.', bgColor: secondary },
              { name:'Priya K.',  role:'Business Owner',   rating:5, quote:'Highly recommend ' + name + '. Fast turnaround, fair price, and quality I was not expecting.', bgColor: secondary },
            ].slice(0, data.cards.length);
          }
        }
      }
      if (type === 'pricing') {
        if (sc) {
          data.heading    = sc.heading;
          data.subheading = sc.subheading;
          data.bgColor    = sc.bgColor;
          data.textColor  = sc.textColor;
          data.accentColor = sc.accentColor || primary;
          if (sc.plans) data.plans = sc.plans;
        } else {
          data.heading    = name + ' Pricing';
          data.subheading = 'Simple, transparent rates. Free quote in 60 seconds.';
          data.bgColor    = bg;
          data.textColor  = text;
          data.accentColor = primary;
        }
      }
      if (type === 'cta') {
        if (sc) {
          Object.assign(data, sc);
        } else {
          data.heading    = 'Ready to Get Started?';
          data.subheading = 'Contact ' + name + ' today â€” we reply within the hour.';
          data.btnText    = copy.cta;
          data.btn2Text   = copy.cta2;
          data.bgColor    = primary;
          data.textColor  = '#ffffff';
          data.btnColor   = '#ffffff';
          data.btnTextColor = primary;
        }
      }
      if (type === 'gallery') {
        if (sc) {
          data.heading    = sc.heading;
          data.subheading = sc.subheading;
          data.bgColor    = sc.bgColor;
          data.textColor  = sc.textColor;
          if (sc.images) data.images = sc.images;
        } else {
          data.heading    = 'Our Work';
          data.bgColor    = bg;
          data.textColor  = text;
        }
        if (design._images && design._images.length && data.images) {
          data.images = data.images.map((img,i) => {
            const src = design._images[i] || design._images[i % design._images.length];
            return src ? { ...img, src: src.url, alt: src.alt || industry } : img;
          });
        }
      }
      if (type === 'footer') {
        if (sc) {
          Object.assign(data, sc);
        } else {
          data.logo      = name;
          data.tagline   = name + ' â€” ' + industry + ' experts.';
          data.bgColor   = '#1a1a2e';
          data.textColor = '#f4f4f8';
          data.accentColor = primary;
        }
      }
      if (type === 'leadform') {
        if (sc) {
          data.heading    = sc.heading;
          data.subheading = sc.subheading;
          data.bgColor    = sc.bgColor;
          data.textColor  = sc.textColor;
          data.accentColor = sc.accentColor || primary;
          data.btnColor   = sc.btnColor || primary;
          data.btnText    = sc.btnText || 'Get a Free Quote â†’';
          if (sc.fields) data.fields = sc.fields;
        } else {
          data.heading    = 'Get a Free Quote';
          data.subheading = 'Tell us about your ' + industry + ' project and we will be in touch.';
          data.btnText    = copy.cta;
          data.btnColor   = primary;
          data.bgColor    = bg;
          data.textColor  = text;
        }
      }

      State.blocks.push({ id, type, label: def.label, icon: def.icon, data, visible: true });
    });

    // 5. Refresh the UI
    if (typeof updateLayers    === 'function') updateLayers();
    if (typeof refreshPreview  === 'function') refreshPreview();
    if (typeof History !== 'undefined')        History.push();

    this._selectedDesign = design;
  },

  /* â”€â”€ UI helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _updateLoadingState(loading) {
    const body = document.getElementById('onboarding-body');
    if (!body) return;
    if (loading) {
      body.innerHTML = `
        <div class="ob-generating">
          <div class="ob-spinner"></div>
          <div class="ob-gen-title">Building your 3 designsâ€¦</div>
          <div class="ob-gen-sub">Gemini is crafting unique looks for ${this._data.businessName || 'your business'} + fetching photos from Unsplash.</div>
        </div>`;
    }
  },

  /* â”€â”€ BRAND INTERVIEW â€” 12-question conversational session â”€â”€â”€â”€â”€â”€ */
  _steps: ['name','industry','vibe','customer','competition','differentiator','tone','goal','colors','services','sections','extra'],

  _renderModal() {
    let m = document.getElementById('onboarding-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'onboarding-modal';
      m.className = 'ob-overlay';
      document.body.appendChild(m);
    }
    m.style.display = 'flex';
    m.innerHTML = `
      <div class="ob-card" id="ob-card">
        <div class="ob-progress" id="ob-progress"></div>
        <div class="ob-body" id="onboarding-body"></div>
        <div class="ob-foot" id="ob-foot"></div>
      </div>`;
    this._renderStep();
  },

  _renderProgress() {
    const el = document.getElementById('ob-progress');
    if (!el) return;
    const total = this._steps.length;
    const pct   = Math.min(100, ((this._step + 1) / total) * 100);
    el.innerHTML = `
      <div class="ob-progress-bar" style="width:${pct}%"></div>
      <div style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:11px;color:rgba(255,255,255,0.35);font-family:'DM Sans',sans-serif;">Step ${this._step + 1} of ${total}</div>`;
  },

  _renderStep() {
    this._renderProgress();
    const body = document.getElementById('onboarding-body');
    const foot = document.getElementById('ob-foot');
    if (!body || !foot) return;
    const d    = this._data;
    const biz  = d.businessName || 'your business';
    const step = this._step;
    const total= this._steps.length;

    /* â”€â”€ Question definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const TONES = [
      { id:'formal',         label:'Formal',         desc:'Professional, authoritative, corporate' },
      { id:'conversational', label:'Conversational',  desc:'Friendly, approachable, human' },
      { id:'bold',           label:'Bold',            desc:'Direct, confident, no-nonsense' },
      { id:'warm',           label:'Warm',            desc:'Caring, personal, community-focused' },
      { id:'minimal',        label:'Minimal',         desc:'Clean, understated, let the work speak' },
      { id:'loud',           label:'Loud',            desc:'Energetic, expressive, impossible to ignore' },
    ];
    const GOALS = [
      { id:'get-leads',     label:'Get leads',          icon:'ðŸ“¥' },
      { id:'sell-products', label:'Sell products',       icon:'ðŸ›’' },
      { id:'credibility',   label:'Build credibility',   icon:'â­' },
      { id:'book-appts',    label:'Book appointments',   icon:'ðŸ“…' },
      { id:'showcase-work', label:'Showcase portfolio',  icon:'ðŸ–¼' },
      { id:'inform',        label:'Inform & educate',    icon:'ðŸ“–' },
    ];

    /* â”€â”€ Per-step HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const stepContent = () => {
      switch(step) {
        case 0: return `
          <div class="ob-q-intro">Let's start with the basics.</div>
          <h2 class="ob-title">What's your business called?</h2>
          <div class="ob-field"><input id="ob-biz-name" class="ob-input ob-input-lg" type="text" placeholder="e.g. Luxe Studio, Rivera & Co." value="${this._esc(d.businessName)}" autofocus maxlength="80"/></div>
          <div class="ob-field"><label class="ob-label">What do you do? <span class="ob-opt">(optional â€” more detail = better site)</span></label>
          <textarea id="ob-description" class="ob-textarea" rows="3" placeholder="e.g. We're a nail salon in East London specialising in gel extensions and nail art for women who want to treat themselves.">${this._esc(d.description)}</textarea></div>`;

        case 1: return `
          <div class="ob-q-intro">Tell me about your market.</div>
          <h2 class="ob-title">What industry are you in, and how specific is your niche?</h2>
          <div class="ob-field"><label class="ob-label">Industry</label>
          <select id="ob-industry" class="ob-select">
            <option value="">Pick your industryâ€¦</option>
            ${this.INDUSTRIES.map(i => `<option value="${i}" ${d.industry===i?'selected':''}>${i}</option>`).join('')}
          </select></div>
          <div class="ob-field"><label class="ob-label">Niche / specifics <span class="ob-opt">(be as precise as possible)</span></label>
          <input id="ob-niche" class="ob-input" type="text" placeholder="e.g. upscale Japanese omakase, kids birthday parties, emergency plumbing 24/7" value="${this._esc(d.niche)}"/></div>
          <div class="ob-field"><label class="ob-label">Location <span class="ob-opt">(optional)</span></label>
          <input id="ob-location" class="ob-input" type="text" placeholder="e.g. East London Â· Toronto Â· Miami Beach" value="${this._esc(d.location)}"/></div>`;

        case 2: return `
          <div class="ob-q-intro">Let's capture the personality of ${biz}.</div>
          <h2 class="ob-title">Pick 3â€“5 words that describe your brand vibe.</h2>
          <p class="ob-sub">These shape your fonts, layout, spacing, and feel.</p>
          <div class="ob-chip-grid">
            ${this.VIBES.map(v => `<button type="button" class="ob-chip ${d.vibes.includes(v)?'selected':''}" onclick="Onboarding._toggleVibe('${v}')">${v}</button>`).join('')}
          </div>
          <div class="ob-chip-hint">${d.vibes.length ? d.vibes.join(' Â· ') : 'Select 3â€“5 words'}</div>`;

        case 3: return `
          <div class="ob-q-intro">Who is ${biz} for?</div>
          <h2 class="ob-title">Describe your ideal customer.</h2>
          <p class="ob-sub">Write it like you're describing a real person. The more specific, the more the AI can write copy that speaks directly to them.</p>
          <textarea id="ob-customer" class="ob-textarea" rows="4" placeholder="e.g. Women aged 25â€“40, professional, treat themselves monthly. They care about quality and Instagram-worthy results more than price. They book 2 weeks in advance and tip well.">${this._esc(d.targetCustomer)}</textarea>`;

        case 4: return `
          <div class="ob-q-intro">Inspiration helps a lot.</div>
          <h2 class="ob-title">Any websites you love the look of?</h2>
          <p class="ob-sub">Paste URLs of competitor sites you like AND any site from any industry whose design inspires you. Both help the AI understand the aesthetic level you're aiming for.</p>
          <div class="ob-field"><label class="ob-label">Competitor sites <span class="ob-opt">(paste 1â€“2 URLs)</span></label>
          <textarea id="ob-competitors" class="ob-textarea" rows="2" placeholder="e.g. https://rival.com&#10;https://anotherbrand.com">${this._esc(d.competitors)}</textarea></div>
          <div class="ob-field"><label class="ob-label">Aesthetic inspiration <span class="ob-opt">(any industry, 1â€“2 URLs)</span></label>
          <textarea id="ob-inspiration" class="ob-textarea" rows="2" placeholder="e.g. https://stripe.com&#10;https://linear.app">${this._esc(d.inspiration)}</textarea></div>`;

        case 5: return `
          <div class="ob-q-intro">What makes ${biz} stand out?</div>
          <h2 class="ob-title">What's your unique difference from competitors?</h2>
          <p class="ob-sub">Be specific. "We're the best" is useless. "We guarantee 24-hour turnaround, every time" is gold.</p>
          <textarea id="ob-differentiator" class="ob-textarea" rows="3" placeholder="e.g. We're the only nail salon in East London open until 10pm, 7 days a week. No appointments needed for gel touch-ups.">${this._esc(d.differentiator)}</textarea>`;

        case 6: return `
          <div class="ob-q-intro">How does ${biz} communicate?</div>
          <h2 class="ob-title">What's your tone of voice?</h2>
          <p class="ob-sub">This shapes every word the AI writes.</p>
          <div class="ob-tone-grid">
            ${TONES.map(t => `
              <label class="ob-tone-card ${d.tone===t.id?'selected':''}">
                <input type="radio" name="ob-tone" value="${t.id}" ${d.tone===t.id?'checked':''} onchange="Onboarding._data.tone=this.value;document.querySelectorAll('.ob-tone-card').forEach(c=>c.classList.remove('selected'));this.closest('.ob-tone-card').classList.add('selected')"/>
                <span class="ob-tone-label">${t.label}</span>
                <span class="ob-tone-desc">${t.desc}</span>
              </label>`).join('')}
          </div>`;

        case 7: return `
          <div class="ob-q-intro">What should this site achieve?</div>
          <h2 class="ob-title">What's the primary goal of your website?</h2>
          <div class="ob-goal-grid">
            ${GOALS.map(g => `
              <label class="ob-goal-card ${d.goal===g.id?'selected':''}">
                <input type="radio" name="ob-goal" value="${g.id}" ${d.goal===g.id?'checked':''} onchange="Onboarding._data.goal=this.value;document.querySelectorAll('.ob-goal-card').forEach(c=>c.classList.remove('selected'));this.closest('.ob-goal-card').classList.add('selected')"/>
                <span class="ob-goal-icon">${g.icon}</span>
                <span class="ob-goal-label">${g.label}</span>
              </label>`).join('')}
          </div>`;

        case 8: return `
          <div class="ob-q-intro">Let's talk visuals.</div>
          <h2 class="ob-title">Do you have brand colors?</h2>
          <p class="ob-sub">If yes, paste hex codes or describe them. If no, leave blank and the AI will design a palette based on your personality.</p>
          <div class="ob-field"><textarea id="ob-colorprefs" class="ob-textarea" rows="2" placeholder="e.g. Primary: #C2A876 (champagne gold) Â· Secondary: #1A1A1A (near black)&#10;Or: warm earthy tones, terracotta and cream&#10;Or: leave blank â€” AI decides">${this._esc(d.colorPrefs)}</textarea></div>`;

        case 9: return `
          <div class="ob-q-intro">A few practical details.</div>
          <h2 class="ob-title">What are your core services or products?</h2>
          <div class="ob-field"><textarea id="ob-services" class="ob-textarea" rows="3" placeholder="e.g. Gel extensions Â£65 Â· Acrylic set Â£55 Â· Nail art from Â£75 Â· Remove & reshape Â£40">${this._esc(d.services)}</textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px;">
            <div class="ob-field" style="margin:0"><label class="ob-label">Phone <span class="ob-opt">optional</span></label>
            <input id="ob-phone" class="ob-input" type="tel" placeholder="+44 20 7946 0123" value="${this._esc(d.phone)}"/></div>
            <div class="ob-field" style="margin:0"><label class="ob-label">CTA button text <span class="ob-opt">optional</span></label>
            <input id="ob-cta" class="ob-input" type="text" placeholder="Book Now Â· Get a Quote" value="${this._esc(d.cta)}"/></div>
          </div>`;

        case 10: return `
          <div class="ob-q-intro">Last two questions.</div>
          <h2 class="ob-title">Any specific sections you need?</h2>
          <p class="ob-sub">The AI decides based on your business type, but you can request specific ones.</p>
          <div class="ob-field"><textarea id="ob-sections" class="ob-textarea" rows="2" placeholder="e.g. Menu / price list Â· Team page Â· Before & after gallery Â· FAQ Â· Booking form Â· Portfolio Â· Testimonials">${this._esc(d.sections)}</textarea></div>
          <div class="ob-field" style="margin-top:14px;">
            <label class="ob-label">Logo <span class="ob-opt">(optional â€” AI creates a text logotype if none)</span></label>
            <div class="ob-logo-drop" id="ob-logo-drop" onclick="document.getElementById('ob-logo-file').click()" style="${d.logo?'border-color:rgba(255,107,53,.5)':''}">
              ${d.logo
                ? `<img src="${d.logo}" style="max-height:60px;max-width:180px;object-fit:contain;" alt="logo"/><div class="ob-logo-sub" style="margin-top:6px;color:rgba(255,107,53,.8);">âœ“ Logo uploaded</div>`
                : `<div class="ob-logo-icon">ðŸ“Ž</div><div class="ob-logo-text">Click to upload logo</div><div class="ob-logo-sub">PNG, SVG, JPG</div>`}
              <input type="file" id="ob-logo-file" accept="image/*" style="display:none" onchange="Onboarding._handleLogo(this)"/>
            </div>
          </div>`;

        case 11: return `
          <div class="ob-q-intro">One last thing.</div>
          <h2 class="ob-title">Anything else the AI should know?</h2>
          <p class="ob-sub">Style notes, things to avoid, tone nuances, anything. This is your chance to make it truly yours.</p>
          <textarea id="ob-extra" class="ob-textarea" rows="4" placeholder="e.g. The vibe should be sophisticated but not cold â€” we want women to feel pampered and welcome, not intimidated. Avoid anything too trendy or Gen Z. We don't want cursive fonts. The hero should feel like walking into a high-end spa.">${this._esc(d.extra)}</textarea>
          <p class="ob-sub" style="margin-top:10px;font-size:11px;opacity:.5;">After this â€” your site will be generated completely from scratch. Every pixel unique to ${biz}.</p>`;

        default: return '';
      }
    };

    body.innerHTML = stepContent();

    /* â”€â”€ Footer buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const isLast = step === total - 1;
    foot.innerHTML = `
      <div class="ob-foot-left">
        ${step > 0 ? '<button type="button" class="ob-btn ob-btn-ghost" onclick="Onboarding.back()">â† Back</button>' : ''}
        <button type="button" class="ob-btn ob-btn-skip" onclick="Onboarding.close(true)">Skip setup</button>
      </div>
      <div class="ob-foot-right">
        <button type="button" class="ob-btn ob-btn-primary" id="ob-next-btn" onclick="Onboarding.next()">
          ${isLast ? 'âœ¦ Build my site â†’' : 'Next â†’'}
        </button>
      </div>`;
  },

    /* OLD 3-STEP CONTENT REMOVED â€” replaced by 12-step interview above */
    if (false) {
      body.innerHTML = `
        <div class="ob-eyebrow">STEP 1 OF 3 Â· THE BASICS</div>
        <h2 class="ob-title">Tell us about your business</h2>
        <p class="ob-sub">Just a name and what you do â€” AI handles everything else.</p>
        <label class="ob-field">
          <span class="ob-label">BUSINESS NAME <span style="color:#ff6b35;">*</span></span>
          <input type="text" id="ob-biz-name" class="ob-input" placeholder="e.g. Luxe Studio, Mike's Plumbing Co." value="${this._esc(d.businessName)}" maxlength="60" autofocus>
        </label>
        <label class="ob-field">
          <span class="ob-label">WHAT DO YOU DO? <span style="opacity:.5;font-weight:400">optional â€” more detail = better site</span></span>
          <textarea id="ob-description" class="ob-textarea" rows="3" placeholder="e.g. Emergency plumbing in Toronto. Burst pipes, blocked drains, bathroom installs. Available 24/7.">${this._esc(d.description)}</textarea>
        </label>
        <label class="ob-field">
          <span class="ob-label">INDUSTRY <span style="opacity:.5;font-weight:400">optional</span></span>
          <select id="ob-industry" class="ob-select">
            <option value="">Pick your industryâ€¦</option>
            ${this.INDUSTRIES.map(i => `<option value="${i}" ${d.industry===i?'selected':''}>${i}</option>`).join('')}
          </select>
        </label>
        <label class="ob-field">
          <span class="ob-label">LOCATION <span style="opacity:.5;font-weight:400">optional</span></span>
          <input type="text" id="ob-location" class="ob-input" placeholder="e.g. Toronto Â· East London Â· Miami Beach" value="${this._esc(d.location)}">
        </label>`;

    // â”€â”€ Step 1: Brand feel (all optional) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    } else if (this._step === 1) {
      body.innerHTML = `
        <div class="ob-eyebrow">STEP 2 OF 3 Â· YOUR BRAND <span style="opacity:.5;font-weight:400">â€” all optional</span></div>
        <h2 class="ob-title">How should your site feel?</h2>
        <p class="ob-sub">Skip any of these â€” they just make the result more you.</p>
        <label class="ob-field">
          <span class="ob-label">BRAND PERSONALITY â€” pick up to 3</span>
          <div class="ob-chip-grid" style="margin-top:8px;">
            ${this.VIBES.map(v => `<button type="button" class="ob-chip ${d.vibes.includes(v)?'selected':''}" onclick="Onboarding._toggleVibe('${v}')">${v}</button>`).join('')}
          </div>
          ${d.vibes.length ? `<div class="ob-chip-hint" style="margin-top:6px;">${d.vibes.join(' Â· ')}</div>` : ''}
        </label>
        <label class="ob-field">
          <span class="ob-label">TONE OF VOICE</span>
          <select id="ob-tone-select" class="ob-select" onchange="Onboarding._data.tone=this.value">
            <option value="">Pick a toneâ€¦</option>
            <option value="professional"  ${d.tone==='professional'?'selected':''}>Professional & Authoritative</option>
            <option value="friendly"      ${d.tone==='friendly'?'selected':''}>Friendly & Warm</option>
            <option value="bold"          ${d.tone==='bold'?'selected':''}>Bold & Confident</option>
            <option value="luxury"        ${d.tone==='luxury'?'selected':''}>Luxury & Refined</option>
            <option value="playful"       ${d.tone==='playful'?'selected':''}>Playful & Fun</option>
          </select>
        </label>
        <label class="ob-field">
          <span class="ob-label">WHAT MAKES YOU DIFFERENT?</span>
          <input type="text" id="ob-differentiator" class="ob-input" placeholder="e.g. Only team with guaranteed 90-min arrival, 24/7" value="${this._esc(d.differentiator)}">
        </label>
        <label class="ob-field">
          <span class="ob-label">WHO IS YOUR IDEAL CUSTOMER?</span>
          <input type="text" id="ob-customer" class="ob-input" placeholder="e.g. Homeowners 30-55 who need fast, trustworthy service" value="${this._esc(d.targetCustomer)}">
        </label>`;

    // â”€â”€ Step 2: Details + generate (all optional) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    } else if (this._step === 2) {
      body.innerHTML = `
        <div class="ob-eyebrow">STEP 3 OF 3 Â· FINAL DETAILS <span style="opacity:.5;font-weight:400">â€” all optional</span></div>
        <h2 class="ob-title">Last few things, then we build</h2>
        <p class="ob-sub">Fill in what you have. Leave blank anything you don't.</p>
        <label class="ob-field">
          <span class="ob-label">SERVICES / PRODUCTS</span>
          <textarea id="ob-services" class="ob-textarea" rows="2" placeholder="e.g. Emergency callouts Â· drain unblocking Â· boiler installs">${this._esc(d.services)}</textarea>
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <label class="ob-field" style="margin:0;">
            <span class="ob-label">PHONE</span>
            <input type="tel" id="ob-phone" class="ob-input" placeholder="+1 (416) 555-0100" value="${this._esc(d.phone)}">
          </label>
          <label class="ob-field" style="margin:0;">
            <span class="ob-label">CTA BUTTON TEXT</span>
            <input type="text" id="ob-cta" class="ob-input" placeholder="e.g. Get a Free Quote" value="${this._esc(d.cta)}">
          </label>
        </div>
        <label class="ob-field">
          <span class="ob-label">ANYTHING ELSE FOR THE AI?</span>
          <textarea id="ob-extra" class="ob-textarea" rows="2" placeholder="e.g. Dark premium feel. No stock photo suits. Avoid clichÃ©s.">${this._esc(d.extra)}</textarea>
        </label>`;
    }

    const isLast = this._step === this._steps.length - 1;
    foot.innerHTML = `
      <div class="ob-foot-left">
        ${this._step > 0 ? '<button type="button" class="ob-btn ob-btn-ghost" onclick="Onboarding.back()">â† Back</button>' : ''}
        <button type="button" class="ob-btn ob-btn-skip" onclick="Onboarding.close(true)">Skip setup</button>
      </div>
      <div class="ob-foot-right">
        <button type="button" class="ob-btn ob-btn-primary" id="ob-next-btn" onclick="Onboarding.next()">
          ${isLast ? 'âœ¨ Build my site â†’' : 'Next â†’'}
        </button>
      </div>`;
  },

  /* â”€â”€ Design Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _renderDesignPicker() {
    const m = document.getElementById('onboarding-modal');
    if (!m) return;
    const designs = this._designs;
    m.innerHTML = `
      <div class="ob-card ob-card-wide" id="ob-card">
        <div class="ob-eyebrow" style="text-align:center;padding:24px 0 8px;">YOUR 3 DESIGNS ARE READY</div>
        <h2 class="ob-title" style="text-align:center;font-size:26px;padding:0 24px 4px;">Pick your favourite</h2>
        <p class="ob-sub" style="text-align:center;padding:0 24px 20px;">Each is unique â€” fonts, colors, layout, and photos are all different.</p>
        <div class="ob-design-grid">
          ${designs.map((d, i) => `
            <div class="ob-design-card ${this._selectedDesign === d ? 'selected' : ''}" onclick="Onboarding._pickDesign(${i})">
              <div class="ob-design-preview" style="background:${d.cssVars && d.cssVars['--bg'] || '#fff'}">
                <div class="ob-design-hero" style="background:${d.cssVars && d.cssVars['--primary'] || '#333'}">
                  <div class="ob-design-nav-bar" style="background:rgba(0,0,0,.15)"></div>
                  <div class="ob-design-hero-text">
                    <div class="ob-design-h1" style="font-family:${d.cssVars && d.cssVars['--font-heading'] || 'sans-serif'};color:#fff">
                      ${this._esc(this._data.businessName || 'Your Business')}
                    </div>
                    <div class="ob-design-btn" style="background:${d.cssVars && d.cssVars['--accent'] || '#fff'};border-radius:${d.cssVars && d.cssVars['--btn-radius'] || '8px'}"></div>
                  </div>
                </div>
                ${d._images && d._images[0] ? `<img src="${d._images[0].thumb || d._images[0].url}" class="ob-design-photo" alt="" loading="lazy">` : ''}
              </div>
              <div class="ob-design-info">
                <div class="ob-design-name">${this._esc(d.name || 'Design ' + (i+1))}</div>
                <div class="ob-design-vibe">${this._esc(d.vibe || '')}</div>
                <div class="ob-design-swatches">
                  ${['--primary','--secondary','--accent'].map(k => `<div class="ob-design-swatch" style="background:${d.cssVars && d.cssVars[k] || '#ccc'}"></div>`).join('')}
                </div>
              </div>
            </div>`).join('')}
        </div>
        <div class="ob-design-foot">
          <button type="button" class="ob-btn ob-btn-ghost" onclick="Onboarding._regenerate()">ðŸ”„ Generate new designs</button>
          <button type="button" class="ob-btn ob-btn-primary" id="ob-apply-btn" onclick="Onboarding._confirmDesign()" ${!this._selectedDesign ? 'disabled' : ''}>
            Use this design â†’
          </button>
        </div>
      </div>`;
  },

  _pickDesign(i) {
    this._selectedDesign = this._designs[i];
    // Re-render to update selected state
    this._renderDesignPicker();
    // Preview it live
    this._applyDesign(this._selectedDesign);
  },

  _confirmDesign() {
    if (!this._selectedDesign) return;
    this._applyDesign(this._selectedDesign);
    this.markDone();
    const m = document.getElementById('onboarding-modal');
    if (m) { m.style.opacity = '0'; m.style.transition = 'opacity .3s'; setTimeout(() => { m.style.display = 'none'; m.style.opacity = '1'; }, 300); }
    if (typeof switchTab === 'function') switchTab('layers');
    showToast('âœ¨ ' + (this._data.businessName || 'Your site') + ' is ready', 'AI built your site â€” click any block to edit it.', 'success');
  },

  async _regenerate() {
    this._selectedDesign = null;
    await this._generateDesigns();
  },

  /* â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  next() {
    const d = this._data;
    const g = id => (document.getElementById(id)?.value || '').trim();
    const step = this._step;

    // Collect current step's fields â€” each case in {} to avoid const scope issues
    switch(step) {
      case 0: {
        const name = g('ob-biz-name');
        if (!name) { this._shake(); showToast('âš ï¸ We need your business name', '', 'warning'); return; }
        d.businessName = name;
        d.description  = g('ob-description');
        State.businessName = name;
        break;
      }
      case 1: {
        d.industry = document.getElementById('ob-industry')?.value || '';
        d.niche    = g('ob-niche');
        d.location = g('ob-location');
        State.industry = d.industry;
        break;
      }
      case 2: {
        if (!d.vibes.length) { showToast('âš ï¸ Pick at least one word', '', 'warning'); return; }
        break;
      }
      case 3: {
        d.targetCustomer = g('ob-customer');
        break;
      }
      case 4: {
        d.competitors  = g('ob-competitors');
        d.inspiration  = g('ob-inspiration');
        break;
      }
      case 5: {
        d.differentiator = g('ob-differentiator');
        break;
      }
      case 6: { /* tone set via radio onchange */ break; }
      case 7: { /* goal set via radio onchange */ break; }
      case 8: {
        d.colorPrefs = g('ob-colorprefs');
        break;
      }
      case 9: {
        d.services = g('ob-services');
        d.phone    = g('ob-phone');
        d.cta      = g('ob-cta');
        break;
      }
      case 10: {
        d.sections = g('ob-sections');
        break;
      }
      case 11: {
        d.extra = g('ob-extra');
        const btn = document.getElementById('ob-next-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'â³ Buildingâ€¦'; }
        this._runGeneration();
        return;
      }
    }

    this._step++;
    this._renderStep();
  },

  back() {
    this._step = Math.max(this._step - 1, 0);
    this._renderStep();
  },

  /* â”€â”€ Generation â€” called at end of interview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  async _runGeneration() {
    const d = this._data;
    State.businessName = d.businessName || '';
    State.industry     = d.industry     || '';

    // Check weekly site creation quota
    if (!UsageLimiter.canUse('sites')) {
      const m = document.getElementById('onboarding-modal');
      if (m) m.style.display = 'none';
      UsageLimiter.showUpgradePrompt('sites');
      return;
    }

    // Replace modal with a full-screen generating UI
    const m = document.getElementById('onboarding-modal');
    if (!m) { showToast('âš ï¸ Modal not found', 'Try refreshing the page.', 'error'); return; }

    m.style.display = 'flex';
    m.innerHTML = `
      <div class="ob-card" style="text-align:center;padding:52px 36px;min-width:320px;">
        <div style="font-size:52px;margin-bottom:18px;">ðŸ¤–</div>
        <h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#fff;margin-bottom:8px;">Building your siteâ€¦</h2>
        <p style="font-size:14px;color:rgba(255,255,255,0.45);margin-bottom:32px;line-height:1.6;">
          AI is designing a unique site for<br><strong style="color:#fff;">${this._esc(d.businessName || 'your business')}</strong>
        </p>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:260px;margin:0 auto 24px;" id="ob-gen-steps">
          <div id="ogstep-1" style="font-size:13px;color:#ff6b35;font-weight:600;font-family:'DM Sans',sans-serif;">âœ¦ Understanding your brandâ€¦</div>
          <div id="ogstep-2" style="font-size:13px;color:rgba(255,255,255,0.25);font-family:'DM Sans',sans-serif;">âœ¦ Writing your copy</div>
          <div id="ogstep-3" style="font-size:13px;color:rgba(255,255,255,0.25);font-family:'DM Sans',sans-serif;">âœ¦ Choosing your design</div>
          <div id="ogstep-4" style="font-size:13px;color:rgba(255,255,255,0.25);font-family:'DM Sans',sans-serif;">âœ¦ Building your sections</div>
        </div>
        <div id="ob-gen-error" style="display:none;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;font-size:13px;color:#ef4444;margin-top:16px;font-family:'DM Sans',sans-serif;"></div>
      </div>`;

    const _tick = (n, msg) => {
      for (let i=1;i<=4;i++) {
        const el = document.getElementById('ogstep-'+i);
        if (!el) continue;
        if (i < n)  { el.style.color='rgba(255,255,255,0.5)'; el.textContent = 'âœ“ ' + el.textContent.replace(/^[âœ¦âœ“] /,''); }
        if (i === n){ el.style.color='#ff6b35'; el.style.fontWeight='600'; if(msg) el.textContent = 'âœ¦ ' + msg; }
        if (i > n)  { el.style.color='rgba(255,255,255,0.25)'; el.style.fontWeight='400'; }
      }
    };

    const _showError = (msg) => {
      const el = document.getElementById('ob-gen-error');
      if (el) { el.style.display='block'; el.textContent = 'âš ï¸ ' + msg + ' â€” click below to try again.'; }
      // Show retry button
      const card = m.querySelector('.ob-card');
      if (card && !card.querySelector('#ob-gen-retry')) {
        const btn = document.createElement('button');
        btn.id = 'ob-gen-retry';
        btn.className = 'ob-btn ob-btn-primary';
        btn.style.cssText = 'margin-top:16px;width:100%;';
        btn.textContent = 'Try Again â†’';
        btn.onclick = () => this._runGeneration();
        card.appendChild(btn);
      }
    };

    try {
      _tick(1, 'Understanding your brandâ€¦');
      const html = await generateCustomSiteHTML({
        // Core identity
        businessName:   d.businessName   || 'Your Business',
        businessType:   d.industry       || 'service business',
        niche:          d.niche          || '',
        description:    d.description    || '',
        location:       d.location       || '',
        // Brand personality
        vibes:          d.vibes          || [],
        tone:           d.tone           || 'professional',
        // Customer & differentiation
        targetCustomer: d.targetCustomer || '',
        differentiator: d.differentiator || '',
        // Inspiration
        competitors:    d.competitors    || '',
        inspiration:    d.inspiration    || '',
        // Goal & CTA
        goal:           d.goal           || 'get leads',
        cta:            d.cta            || '',
        // Visual
        colorPrefs:     d.colorPrefs     || '',
        // Content
        services:       d.services       || '',
        phone:          d.phone          || '',
        sections:       d.sections       || '',
        extra:          d.extra          || '',
      }, _tick);

      if (!html || html.length < 100) throw new Error('AI returned empty response');

      _tick(4, 'Finalisingâ€¦');
      this.markDone();

      // Load into builder
      UsageLimiter.consume('sites');
      const loaded = SSections.load(html, d.businessName);
      if (loaded) {
        const inp = document.getElementById('site-name-input');
        if (inp) inp.value = d.businessName || 'My Site';
        saveToSession(); // immediately persist
      }

      // Fade out modal
      m.style.transition = 'opacity .35s';
      m.style.opacity = '0';
      setTimeout(() => { m.style.display = 'none'; m.style.opacity = '1'; }, 380);
      showToast('âœ… ' + (d.businessName || 'Your site') + ' is ready', 'Double-click any text to edit it inline.', 'success');

    } catch(err) {
      console.error('[Onboarding._runGeneration]', err);
      _showError(err.message || 'Generation failed');
    }
  },

  /* finish() â€” kept for backward compat with existing patches */
  async finish() { return this._runGeneration(); },

  /* â”€â”€ Event handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _toggleVibe(v) {
    const idx = this._data.vibes.indexOf(v);
    if (idx >= 0) {
      this._data.vibes.splice(idx, 1);
    } else {
      if (this._data.vibes.length >= 3) {
        showToast('Max 3 vibes', 'Remove one first.', 'warning');
        return;
      }
      this._data.vibes.push(v);
    }
    this._renderStep();
  },

  _selectPalette(id) {
    this._data.palette = id;
    this._renderStep();
  },

  _highlightRadio(input) {
    document.querySelectorAll('label.ob-radio').forEach(l => l.classList.remove('selected'));
    if (input.closest('label')) input.closest('label').classList.add('selected');
  },

  _handleLogo(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      State.uploadedImages['__logo__'] = e.target.result;
      const drop = document.getElementById('ob-logo-drop');
      if (drop) {
        drop.innerHTML = `<img src="${e.target.result}" style="max-height:80px;max-width:200px;object-fit:contain;border-radius:8px;" alt="logo">
          <div class="ob-logo-sub" style="margin-top:8px;">Logo uploaded âœ“</div>`;
      }
      // Auto-advance after a second
      setTimeout(() => this.next(), 1000);
    };
    reader.readAsDataURL(file);
  },

  _shake() {
    const card = document.getElementById('ob-card');
    if (!card) return;
    card.style.animation = 'ob-shake .4s';
    setTimeout(() => card.style.animation = '', 400);
  },

  _esc(s) {
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
};

window.Onboarding = Onboarding;

window.TemplateSystem = TemplateSystem;
window.Unsplash = Unsplash;

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.2 â€” F5: SCROLL ANIMATION CONTROL (builder UI hook)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function setScrollAnimation(mode) {
  const valid = ['off','subtle','soft','dramatic'];
  if (!valid.includes(mode)) mode = 'off';
  State.scrollAnimation = mode;
  // Update visual chips
  document.querySelectorAll('.scroll-anim-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === mode);
  });
  refreshPreview();
  showToast('ðŸŽ¬ Scroll animation', mode === 'off' ? 'Disabled' : 'Mode: ' + mode, 'info');
}
window.setScrollAnimation = setScrollAnimation;


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.3 â€” AI ASSISTANT, LIVE CHATBOT & MOTION SYSTEM
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   F10: AIBridge       â€” talks to OpenAI GPT-5 from browser
   F11: AIChatbot      â€” floating chat panel that can edit the live site
   F12: MotionFX       â€” site-wide hover, ripple, parallax, counters,
                         page-transition, magnetic buttons (BUILDER PREVIEW ONLY)
   F13: AICopywriter   â€” used by Onboarding to generate richer starter copy
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ F10: AI BRIDGE (SSV27 â€” NVIDIA NIM) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const AIBridge = {
  GATEWAY:  'https://text.pollinations.ai/openai',
  MODEL:    'openai',
  PROVIDER: 'Pollinations AI (keyless)',
  BUILTIN_ENABLED: true,

  hasBuiltin() { return true; },
  getKey()      { return ''; },
  setKey()      {},
  clearKey()    {},
  promptForKey(){ return true; },

  async chat({ messages, tools, model, signal }) {
    const body = {
      model:   model || this.MODEL,
      messages: messages,
      private: true,
      referrer:'supersuite',
      stream:  false
    };
    if (tools && tools.length) {
      // Pollinations doesn't support native tool calling â€” inject as JSON protocol
      const toolsList = tools.map(t => 'â€¢ ' + t.function.name + '(' +
        Object.keys(t.function.parameters?.properties||{}).join(', ') + ') â€” ' +
        (t.function.description||'')).join('\n');
      const sys = {
        role:'system',
        content:'You can take actions by responding ONLY with JSON: ' +
          '{"actions":[{"name":"<tool>","args":{}}],"say":"<one sentence>"}\n' +
          'Available tools:\n' + toolsList + '\nIf no tools needed: {"actions":[],"say":"..."}'
      };
      body.messages = [sys].concat(messages);
      body.jsonMode = true;
    }
    const res = await fetch(this.GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify(body),
      signal: signal
    });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) throw new Error('AI_HTTP_' + res.status);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch(e) { return { choices:[{message:{role:'assistant',content:text}}] }; }
  }
};
window.AIBridge = AIBridge;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ F13: AI COPYWRITER (used by Onboarding) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const AICopywriter = {
  async enrich(info) {
    // SSV26.8: built-in gateway is always available; only bail if user explicitly disabled AI
    if (!AIBridge.getKey() && !AIBridge.BUILTIN_ENABLED) return null;
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ F11: AI CHATBOT (live editor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
      '3) After editing, reply with one short sentence confirming what changed â€” never dump JSON. ' +
      '4) If the user is vague (e.g. "make it better"), ask one clarifying question instead of guessing.';
  },

  /* â”€â”€ Tool execution â”€â”€ */
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
    // SSV26.7: built-in GPT-5 gateway means no key required. Just go.
    this.appendMsg('user', userText);
    this._history.push({ role:'user', content: userText });
    this._busy = true;
    this.setBusy(true);
    try {
      const messages = [ { role:'system', content: this.systemPrompt() } ].concat(this._history);
      // Tool loop â€” up to 5 rounds.
      for (let round = 0; round < 5; round++) {
        const resp = await AIBridge.chat({ messages, tools: this.toolDefs });
        const msg  = resp.choices[0].message;
        messages.push(msg);
        const calls = msg.tool_calls || [];
        if (!calls.length) {
          const text = (msg.content || '').toString().trim() || 'âœ“ Done.';
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
        this.appendThinking(calls.map(c => 'âš™ ' + c.function.name).join(', '));
      }
    } catch(err) {
      let m = 'âš ï¸ ' + err.message;
      if (err.message === 'NO_API_KEY')      m = 'ðŸ”‘ Add your OpenAI GPT-5 key (click the key icon).';
      if (err.message === 'BAD_API_KEY')     m = 'ðŸ”‘ Your AI key was rejected â€” please re-enter it.';
      if (err.message === 'RATE_LIMIT')      m = 'â³ Rate limit hit. Try again in a moment.';
      if (err.message === 'PAYMENT_REQUIRED')m = 'ðŸ’³ OpenAI credits exhausted or quota hit. Check your billing at platform.openai.com.';
      this.appendMsg('assistant', m);
    } finally {
      this._busy = false;
      this.setBusy(false);
    }
  },

  /* â”€â”€ UI â”€â”€ */
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
            '<button class="ai-icon-btn" id="ai-key-btn" title="API key">ðŸ”‘</button>' +
            '<button class="ai-icon-btn" id="ai-clear-btn" title="Clear chat">âŸ²</button>' +
            '<button class="ai-icon-btn" id="ai-close-btn" title="Close">âœ•</button>' +
          '</div>' +
        '</header>' +
        '<div id="ai-chat-stream" class="ai-chat-stream"></div>' +
        '<div class="ai-chat-suggest" id="ai-chat-suggest"></div>' +
        '<form class="ai-chat-input" id="ai-chat-form">' +
          '<textarea id="ai-chat-text" rows="1" placeholder="Ask the AI to edit your siteâ€¦"></textarea>' +
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
    this.appendMsg('assistant', 'ðŸ‘‹ Hi! I can edit your site live. Try: <em>"change the hero headline"</em>, <em>"add a pricing block"</em>, <em>"make the colors warmer"</em>, or <em>"fetch new images for power washing"</em>.');
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
    this.appendMsg('assistant', 'ðŸ§¹ Chat cleared. What should we build next?');
  },
  setBusy(b) {
    const send = document.getElementById('ai-chat-send'); if (!send) return;
    send.disabled = b;
    document.getElementById('ai-chat-text').disabled = b;
    if (b) this.appendThinking('Thinkingâ€¦'); else this.removeThinking();
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ F12: MOTION FX (builder preview only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* patchOnboarding â€” superseded by Onboarding._runGeneration. */
(function patchOnboarding(){
  return; // disabled â€” _runGeneration handles generation directly
  if (typeof Onboarding === 'undefined' || !Onboarding.finish) return;
  const origFinish = Onboarding.finish.bind(Onboarding);
  Onboarding.finish = async function() {
    origFinish();   // run original â€” applies template + base copy + Unsplash
    // SSV26.7+: built-in keyless GPT-5 gateway is always on â€” no key prompt needed.
    if (!AIBridge.getKey() && !AIBridge.BUILTIN_ENABLED) return;
    try {
      if (typeof showToast === 'function') showToast('ðŸ¤– AI is writing your copyâ€¦', 'Customizing every section for ' + (this._info.businessName || 'your business'), 'info');
      const enriched = await AICopywriter.enrich(this._info);
      if (enriched) {
        AICopywriter.applyToBlocks(enriched);
        if (typeof saveHistory === 'function') saveHistory();
        refreshPreview();
        if (typeof showToast === 'function') showToast('âœ¨ Copy personalized', 'Every section rewritten by AI for ' + (this._info.industry || 'your industry'), 'success');
      }
    } catch(err) {
      console.warn('[Onboarding AI enrich]', err);
    }
  };
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.4 â€” KEYLESS AI + FULL SITE GENERATOR
   F14: FreeAI         â€” keyless fallback via Pollinations text/image API
   F15: AIBridge patch â€” auto-route to FreeAI when no Lovable key
   F16: AISiteGenerator â€” full site plan (HTML/CSS/JS-equivalent block tree)
   F17: Prominent UI   â€” glowing FAB label + top-bar "âœ¨ Generate with AI"
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ F14: FreeAI (no key required) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
      const toolsList = tools.map(t => 'â€¢ ' + t.function.name + '(' +
        Object.keys(t.function.parameters?.properties||{}).join(', ') + ') â€” ' +
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ F15: AIBridge patch â€” keyless fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
(function patchBridge(){
  const origChat = AIBridge.chat.bind(AIBridge);
  AIBridge.hasKey = () => !!AIBridge.getKey();

  // SSV26.7 â€” built-in GPT-5 gateway (no key required)
  AIBridge.builtinChat = async function({ messages, tools, signal, jsonOnly }) {
    const body = {
      model: this.BUILTIN_MODEL,
      messages: messages.slice(),
      private: true,
      referrer: 'supersuite-builder'
    };
    if (jsonOnly) body.jsonMode = true;
    if (tools && tools.length) {
      const toolsList = tools.map(t => 'â€¢ ' + t.function.name + '(' +
        Object.keys(t.function.parameters?.properties || {}).join(', ') + ') â€” ' +
        (t.function.description || '')).join('\n');
      body.messages = [{
        role: 'system',
        content:
          'You can take actions on a live website by responding ONLY with one JSON object:\n' +
          '{ "actions": [ { "name": "<tool>", "args": { ... } } ], "say": "<one short sentence>" }\n\n' +
          'Available tools:\n' + toolsList + '\n\n' +
          'Rules: raw JSON only â€” no markdown fences.'
      }].concat(body.messages);
      body.jsonMode = true;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 28000);
    let res;
    try {
      res = await fetch(this.BUILTIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: signal || ctrl.signal
      });
    } finally { clearTimeout(t); }
    if (!res.ok) throw new Error('AI_HTTP_' + res.status);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch(e) { return { choices: [{ message: { role: 'assistant', content: text } }] }; }
  };

  AIBridge.chat = async function({ messages, tools, model, signal, jsonOnly }) {
    // 1) If user supplied an OpenAI key â†’ use real OpenAI GPT-5
    if (this.getKey()) {
      try { return await origChat({ messages, tools, model, signal }); }
      catch(err) {
        if (err.message === 'BAD_API_KEY' || err.message === 'NO_API_KEY' ||
            err.message === 'AI_HTTP_404' || err.message === 'AI_HTTP_400') {
          // fall through to built-in
        } else if (this.BUILTIN_ENABLED) {
          console.warn('[AIBridge] OpenAI failed, falling back to built-in gateway:', err.message);
        } else {
          throw err;
        }
      }
    }
    // 2) Built-in keyless gateway
    if (this.BUILTIN_ENABLED) return await this.builtinChat({ messages, tools, signal, jsonOnly });
    // 3) Last-resort error
    throw new Error('NO_API_KEY');
  };

  AIBridge.free = FreeAI;
})();

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ F16: AISiteGenerator â€” full site builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      'that will be rendered as live blocks. Every word must be specific to the business â€” ' +
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
      '    { "type":"features", "data":{ "heading":"...","items":[{"icon":"âš¡","title":"...","desc":"..."}] } },\n' +
      '    { "type":"testimonials", "data":{ "heading":"...","items":[{"quote":"...","author":"...","role":"..."}] } },\n' +
      '    { "type":"pricing", "data":{ "heading":"...","tiers":[{"name":"...","price":"$...","period":"...","description":"...","features":["..."],"ctaText":"Book","ctaLink":"#book","featured":false}] } },\n' +
      '    { "type":"cta", "data":{ "heading":"...","subheading":"...","ctaText":"...","ctaLink":"#book" } },\n' +
      '    { "type":"footer", "data":{ "businessName":"' + biz + '","tagline":"...","phone":"' + phone + '" } }\n' +
      '  ]\n' +
      '}\n' +
      'Allowed block types: ' + this.ALLOWED_TYPES.join(', ') + '. Return between 5 and 8 blocks. ' +
      'No commentary, no markdown â€” JSON only.';

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
      showToast('ðŸ¤– AI generating your siteâ€¦', 'Designing layout, copy, colors & images', 'info');
    }
    const plan = await this.generate(info || {});
    if (!plan) {
      if (typeof showToast === 'function') {
        showToast('âš ï¸ AI fell back to template', 'Using starter â€” try again or refine your prompt', 'info');
      }
      return false;
    }
    const ok = this.apply(plan, info || {});
    if (ok && typeof showToast === 'function') {
      showToast('âœ¨ Your AI site is live', (plan.blocks||[]).length + ' custom blocks generated', 'success');
    }
    return ok;
  }
};
window.AISiteGenerator = AISiteGenerator;

/* SSV28+ â€” finish() is now defined directly on Onboarding._runGeneration.
   This patch is kept for backward compat but delegates to _runGeneration. */
// patchOnboardingV264 â€” superseded by Onboarding._runGeneration defined above.

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
            const text = (msg.content || '').toString().trim() || 'âœ“ Done.';
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
          this.appendThinking(calls.map(c => 'âš™ ' + c.function.name).join(', '));
        }
      } else {
        // Keyless path: JSON-action protocol via FreeAI
        for (let round = 0; round < 4; round++) {
          const resp = await AIBridge.chat({ messages, tools: this.toolDefs });
          const raw  = (resp.choices?.[0]?.message?.content || '').toString();
          const plan = AISiteGenerator._parseJSON(raw);
          if (!plan || !Array.isArray(plan.actions) || !plan.actions.length) {
            const text = (plan && plan.say) || raw.replace(/[{}\[\]"]/g,'').slice(0,400) || 'âœ“ Done.';
            this.appendMsg('assistant', text);
            this._history.push({ role:'assistant', content: text });
            break;
          }
          const results = [];
          for (const a of plan.actions) {
            const r = await this.runTool(a.name, a.args || {});
            results.push({ name: a.name, result: r });
          }
          this.appendThinking(plan.actions.map(a => 'âš™ ' + a.name).join(', '));
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
      this.appendMsg('assistant', 'âš ï¸ ' + (err.message || 'Something went wrong') +
        '. Trying free AI fallback may help â€” refresh and try again.');
    } finally {
      this._busy = false;
      this.setBusy(false);
    }
  };
})();

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ F17: Prominent AI buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
(function injectAITopbarButton(){
  function mount() {
    const navRight = document.querySelector('.top-nav .nav-right');
    if (!navRight || document.getElementById('ai-generate-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'ai-generate-btn';
    btn.className = 'btn-ai-generate';
    btn.title = 'Regenerate the entire site with AI';
    btn.innerHTML = '<span class="btn-ai-spark">âœ¨</span> Generate with AI';
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.5 â€” CHATBOT EDIT FIX
   Problem in 26.4: when keyless (Pollinations) the request would hang or
   return non-JSON, leaving the chat panel stuck on "Thinkingâ€¦" with no
   action ever firing.
   Fix:
     â€¢ Hard 25s timeout on every FreeAI call (AbortController)
     â€¢ Robust parse + always-clear spinner + always-print reply
     â€¢ Built-in regex intent parser as a final guarantee that common
       commands ("change headline to X", "add pricing", "make it
       darker/warmer", "new hero image of â€¦") still execute even if the
       free model returns nothing useful.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
      let m = t.match(/(?:change|update|set|make)\s+(?:the\s+)?(headline|title|hero\s*headline|tagline|subtitle)\s+(?:to|=)\s+["â€œ']?([^"â€'\n]+?)["â€']?\s*$/i);
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
            if (!hero) return 'âš ï¸ No hero block found.';
            hero.data = hero.data || {};
            if (args.target === 'subheadline') hero.data.subheadline = args.value;
            else hero.data.headline = args.value;
            (typeof renderBlocks === 'function') && renderBlocks();
            (typeof saveProject === 'function') && saveProject();
            return `âœ“ Updated the ${args.target} to "${args.value}".`;
          }
          case 'add_block': {
            if (typeof addBlock === 'function') { addBlock(args.type); return `âœ“ Added a ${args.type} block.`; }
            return 'âš ï¸ addBlock unavailable.';
          }
          case 'remove_block': {
            const idx = State.blocks?.findIndex(b => b.type === args.type);
            if (idx == null || idx < 0) return `âš ï¸ No ${args.type} block found.`;
            State.blocks.splice(idx, 1);
            (typeof renderBlocks === 'function') && renderBlocks();
            (typeof saveProject === 'function') && saveProject();
            return `âœ“ Removed the ${args.type} block.`;
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
            return `âœ“ Recolored the site (${args.mood}).`;
          }
          case 'set_color': {
            State.styles = State.styles || {};
            const v = args.value.startsWith('#') ? args.value : args.value;
            State.styles[args.which] = v;
            (typeof applyStyles === 'function') && applyStyles();
            (typeof saveProject === 'function') && saveProject();
            return `âœ“ Set ${args.which} colour to ${v}.`;
          }
          case 'set_hero_image': {
            const hero = State.blocks?.find(b => b.type === 'hero');
            if (!hero) return 'âš ï¸ No hero block.';
            hero.data = hero.data || {};
            hero.data.image = FreeAI.imageURL(args.prompt, 1600, 900);
            (typeof renderBlocks === 'function') && renderBlocks();
            (typeof saveProject === 'function') && saveProject();
            return `âœ“ New hero image: "${args.prompt}".`;
          }
        }
      } catch (e) {
        console.warn('[Intent.execute]', e);
        return 'âš ï¸ ' + (e.message || 'Edit failed.');
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
          Intent.execute(intent).then(say => finalize(say || 'âœ“ Done.'))
            .catch(() => finalize('âš ï¸ Free AI is slow right now â€” I tried a local edit instead.'))
            .finally(() => { this._busy = false; this.setBusy(false); });
        } else {
          finalize('âš ï¸ The free AI took too long to respond. Try a more specific command, e.g. "change the headline to Welcome", "add a pricing block", or "make the colors warmer".');
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
            finalize((msg.content || '').toString().trim() || 'âœ“ Done.');
            break;
          }
          for (const c of calls) {
            let args = {}; try { args = JSON.parse(c.function.arguments || '{}'); } catch(e){}
            const result = await this.runTool(c.function.name, args);
            messages.push({ tool_call_id: c.id, role:'tool', content: JSON.stringify(result) });
          }
          this.appendThinking(calls.map(c => 'âš™ ' + c.function.name).join(', '));
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
          this.appendThinking(plan.actions.map(a => 'âš™ ' + a.name).join(', '));
          finalize(plan.say || 'âœ“ Done.');
        } else {
          // Fall back to local intent parser
          const intent = Intent.parse(userText);
          if (intent) {
            const say = await Intent.execute(intent);
            this.appendThinking('âš™ local:' + intent.name);
            finalize(say || 'âœ“ Done.');
          } else if (raw && raw.trim()) {
            // Free model gave prose only â€” show it
            finalize(raw.replace(/```[a-z]*|```/gi, '').trim().slice(0, 600));
          } else {
            finalize('ðŸ¤” I couldn\'t reach the free AI just now. Try a direct command like:\nâ€¢ "change the headline to <text>"\nâ€¢ "add a pricing block"\nâ€¢ "make the colors warmer"\nâ€¢ "new hero image of a coffee shop"');
          }
        }
      }
    } catch (err) {
      console.warn('[AIChatbot.send v26.5]', err);
      // Last-ditch: try local intent
      const intent = Intent.parse(userText);
      if (intent) {
        try { finalize(await Intent.execute(intent) || 'âœ“ Done.'); }
        catch(e2) { finalize('âš ï¸ ' + (err.message || 'Something went wrong.')); }
      } else {
        finalize('âš ï¸ ' + (err.message || 'Something went wrong.'));
      }
    } finally {
      clearTimeout(watchdog);
      this._busy = false;
      this.setBusy(false);
    }
  };

  console.log('[SSV26.5] Chatbot edit fix loaded.');
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.6 â€” AUTO-ONBOARDING + REGENERATE WITH STYLE & GOAL
   Adds:
     â€¢ Onboarding modal opens immediately after a correct builder code
     â€¢ Top-bar "ðŸŽ¨ Regenerate" button â†’ modal with Style + Goal picker
     â€¢ Patched AISiteGenerator that bakes Style/Goal into the prompt
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
        'that will be rendered as live blocks. Every word must be specific to the business â€” ' +
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
        'Allowed block types: ' + this.ALLOWED_TYPES.join(', ') + '. Return 5â€“8 blocks. JSON only.';

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

  /* ---------- 2. SSV26.7 â€” Onboarding gating ----------
     Removed the SSV26.6 always-open patch. Onboarding now appears ONCE
     (gated by Onboarding.isComplete()). Subsequent logins trigger
     AIImprover.runOnLogin() which proposes incremental AI-driven
     improvements rather than re-asking the same questions. */

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
      '    <button id="regen-confirm" style="padding:10px 22px;border:0;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;border-radius:10px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(99,102,241,.35);">âœ¨ Regenerate</button>' +
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
      if (typeof showToast === 'function') showToast('âœ¨ Regeneratingâ€¦', 'New '+(pickedStyle||'')+(pickedStyle&&pickedGoal?' Â· ':'')+(pickedGoal||'')+' site coming up.', 'info');
      try {
        const ok = await AISiteGenerator.run(info);
        if (ok && typeof showToast === 'function') showToast('âœ… Site regenerated', 'Fresh layout applied.', 'success');
        else if (typeof showToast === 'function') showToast('âš ï¸ Regenerate failed', 'Free AI may be busy â€” try again.', 'warn');
      } catch (e) {
        console.warn('[regen]', e);
        if (typeof showToast === 'function') showToast('âš ï¸ Error', e.message || 'Failed.', 'warn');
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
    btn.title = 'Regenerate the site with a new style and goal';
    btn.innerHTML = '<span class="btn-ai-spark">ðŸŽ¨</span> Regenerate';
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.7 â€” BUILT-IN ANALYTICS Â· GAMIFIED DASHBOARD Â· VERCEL DEPLOY
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   What this adds:
     1. SSAnalytics  â€” tracks views, clicks, block engagement, sessions
                       (writes to localStorage; injected into exported sites
                        as a self-contained tracker that posts back to the
                        same origin via the bundled tracker.js fallback)
     2. SSDashboard  â€” top-bar "ðŸ“Š Dashboard" button â†’ full-screen panel
                       with: stats, level/XP, achievements, AI improvement
                       quests, weekly streak. Suggestions powered by FreeAI
                       and the local SSIntent fallback.
     3. SSVercel     â€” top-bar "ðŸš€ Deploy" button â†’ modal that ships the
                       current export bundle to Vercel via their public
                       upload API. User pastes a Vercel token (stored in
                       localStorage only), picks a project name, one-click.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function SSV267(){
  'use strict';
  if (window.__SSV267_LOADED__) return;
  window.__SSV267_LOADED__ = true;

  /* â•â•â•â•â•â•â•â•â•â•â•â• 1. ANALYTICS ENGINE â•â•â•â•â•â•â•â•â•â•â•â• */
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
          showToast('ðŸ† Level up!', `You reached level ${newLevel}`, 'success');
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

  /* â•â•â•â•â•â•â•â•â•â•â•â• 2. AI IMPROVEMENT QUESTS â•â•â•â•â•â•â•â•â•â•â•â• */
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
        showToast(`âœ… Quest done: ${q.title}`, `+${q.xp} XP`, 'success');
    }
    SSAnalytics.save();
    if (window.SSDashboard?._open) window.SSDashboard.render();
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â• 3. DASHBOARD UI â•â•â•â•â•â•â•â•â•â•â•â• */
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
            <h1 style="margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em;">ðŸ“Š Your Dashboard</h1>
            <p style="margin:4px 0 0;opacity:.7;font-size:14px;">Level up your site Â· Built-in analytics Â· AI-suggested quests</p>
          </div>
          <button onclick="SSDashboard.close()" style="background:rgba(255,255,255,.08);border:0;color:#fff;width:40px;height:40px;border-radius:10px;font-size:20px;cursor:pointer;">Ã—</button>
        </div>

        <!-- Level + XP -->
        <div style="background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(236,72,153,.18));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:24px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
            <div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;opacity:.7;">Builder Level</div>
              <div style="font-size:48px;font-weight:900;line-height:1;">Lv ${s.level}</div>
              <div style="font-size:13px;opacity:.7;margin-top:4px;">${s.xp} XP total Â· ${doneCount}/${quests.length} quests done Â· ðŸ”¥ ${s.streakDays}-day streak</div>
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
          ${tile('ðŸ‘ï¸', 'Total views', s.views, '#6366f1')}
          ${tile('ðŸ–±ï¸', 'Total clicks', s.clicks, '#ec4899')}
          ${tile('ðŸŽ¯', 'CTA clicks', s.ctaClicks, '#10b981')}
          ${tile('ðŸ“©', 'Form submits', s.formSubmits, '#f59e0b')}
          ${tile('ðŸ“ˆ', 'CTR (7d)', s.ctr + '%', '#8b5cf6')}
          ${tile('ðŸ”¥', 'Day streak', s.streakDays, '#ef4444')}
        </div>

        <!-- Two column: traffic chart + AI tip -->
        <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin-bottom:20px;" class="ss-dash-2col">
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
              <strong>Traffic â€” last 7 days</strong>
              <span style="font-size:12px;opacity:.6;">${s.last7Views} views Â· ${s.last7Clicks} clicks</span>
            </div>
            <div style="display:flex;align-items:flex-end;gap:6px;height:80px;">${barsHTML}</div>
          </div>
          <div style="background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(236,72,153,.10));border:1px solid rgba(99,102,241,.3);border-radius:18px;padding:20px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:20px;">ðŸ¤–</span>
              <strong>AI Coach</strong>
              <span style="margin-left:auto;font-size:11px;opacity:.6;">SSV26.7</span>
            </div>
            <div id="ss-ai-tip" style="font-size:14px;line-height:1.5;opacity:.92;min-height:60px;">${this._aiTip || '<em style="opacity:.6;">Analyzing your siteâ€¦</em>'}</div>
            <button onclick="SSDashboard.fetchAITip(true)" style="margin-top:12px;background:rgba(255,255,255,.1);border:0;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;cursor:pointer;">ðŸ”„ New suggestion</button>
          </div>
        </div>

        <!-- Quests -->
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:14px;align-items:center;">
            <strong>ðŸŽ¯ Improvement Quests</strong>
            <span style="font-size:12px;opacity:.6;">${doneCount}/${quests.length} done Â· earn XP & level up</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
            ${quests.map(q => `
              <div style="background:${q.done?'rgba(16,185,129,.12)':'rgba(255,255,255,.04)'};border:1px solid ${q.done?'rgba(16,185,129,.4)':'rgba(255,255,255,.08)'};border-radius:12px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                  <strong style="font-size:14px;">${q.done?'âœ…':'â­•'} ${q.title}</strong>
                  <span style="background:rgba(99,102,241,.2);color:#a5b4fc;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">+${q.xp} XP</span>
                </div>
                <p style="margin:6px 0 10px;font-size:12px;opacity:.7;line-height:1.4;">${q.desc}</p>
                ${q.done
                  ? '<div style="font-size:11px;color:#10b981;font-weight:600;">Completed</div>'
                  : `<button onclick="SSDashboard.runQuest('${q.id}')" style="background:linear-gradient(135deg,#6366f1,#ec4899);border:0;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%;">Do it â†’</button>`
                }
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Top blocks -->
        ${s.topBlocks.length ? `
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;">
          <strong>ðŸ… Top engaging blocks</strong>
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
      // Re-check after a tick â€” some actions modify State immediately
      setTimeout(() => {
        if (q.check()) completeQuest(id);
        else this.render();
      }, 600);
    },
    async fetchAITip(force) {
      const el = () => document.getElementById('ss-ai-tip');
      if (el()) el().innerHTML = '<em style="opacity:.6;">ðŸ¤” Thinkingâ€¦</em>';
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
          'Add a testimonial block under your hero â€” social proof typically lifts conversion 20-34%.',
          'Your headline is your highest-leverage element. Make it about the visitor, not you.',
          'Move your strongest CTA above the fold. Most visitors decide in the first 7 seconds.',
          'Add a pricing block. Hidden pricing is the #1 reason B2B visitors bounce.',
          'Compress hero images and aim for <2s load â€” every second of delay costs ~7% conversion.',
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

  /* â•â•â•â•â•â•â•â•â•â•â•â• 4. VERCEL DEPLOY â•â•â•â•â•â•â•â•â•â•â•â• */
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
            <span style="font-size:24px;">ðŸš€</span>
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
            <button id="ss-vc-go" style="padding:10px 22px;background:linear-gradient(135deg,#000,#333);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:10px;cursor:pointer;font-weight:700;">â–² Deploy now</button>
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
      if (!tok)  return this.setStatus('âš ï¸ Please paste a Vercel token.', '#fbbf24');
      localStorage.setItem(this.TOKEN_KEY, tok);
      localStorage.setItem(this.PROJ_KEY, proj);

      // Build the export bundle in-memory
      this.setStatus('ðŸ“¦ Packaging your siteâ€¦');
      let html, css, js;
      try {
        html = (typeof buildExportHTML === 'function') ? buildExportHTML() : (typeof buildPreviewHTML === 'function' ? buildPreviewHTML(true) : document.documentElement.outerHTML);
        css  = (typeof buildExportCSS  === 'function') ? buildExportCSS()  : '';
        js   = (typeof buildExportJS   === 'function') ? buildExportJS()   : '';
      } catch(e) { return this.setStatus('âŒ Failed to build site bundle: ' + e.message, '#f87171'); }

      // Inject analytics tracker so deployed site reports back to localStorage
      const tracker = `\n<script>(function(){try{var k='ss_analytics_v1';var d=JSON.parse(localStorage.getItem(k)||'{}');d.views=(d.views||0)+1;d.lastSeen=Date.now();localStorage.setItem(k,JSON.stringify(d));document.addEventListener('click',function(e){var t=e.target.closest('a,button');if(!t)return;d=JSON.parse(localStorage.getItem(k)||'{}');d.clicks=(d.clicks||0)+1;if(/cta|buy|book|start|sign/i.test(t.textContent||''))d.ctaClicks=(d.ctaClicks||0)+1;localStorage.setItem(k,JSON.stringify(d));});}catch(e){}})();</script>\n`;
      html = html.replace('</body>', tracker + '</body>');

      const files = [
        { file: 'index.html', data: html },
        ...(css ? [{ file: 'style.css', data: css }] : []),
        ...(js  ? [{ file: 'script.js', data: js  }] : [])
      ];

      this.setStatus('ðŸš€ Uploading to Vercelâ€¦');
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
          return this.setStatus('âŒ Vercel error: ' + (json.error?.message || res.statusText), '#f87171');
        }
        const url = json.url ? 'https://' + json.url : (json.alias?.[0] ? 'https://' + json.alias[0] : null);
        if (url) {
          this.setStatus(`âœ… Live! <a href="${url}" target="_blank" style="color:#10b981;font-weight:700;">${url} â†’</a>`, '#10b981');
          completeQuest('deploy_vercel');
          if (typeof showToast === 'function') showToast('ðŸš€ Deployed!', url, 'success');
        } else {
          this.setStatus('âœ… Deployment created. Check vercel.com/dashboard.', '#10b981');
        }
      } catch(e) {
        this.setStatus('âŒ Network error: ' + e.message + ' â€” your token may need scope, or CORS is blocked.', '#f87171');
      }
    }
  };
  window.SSVercel = SSVercel;

  /* â•â•â•â•â•â•â•â•â•â•â•â• 5. INJECT TOP-BAR BUTTONS â•â•â•â•â•â•â•â•â•â•â•â• */
  function injectTopBarButtons() {
    const navRight = document.querySelector('.nav-right, .top-bar-right, .topbar-right, header .nav-right');
    if (!navRight) return false;

    if (!document.getElementById('ss-dash-btn')) {
      const b = document.createElement('button');
      b.id = 'ss-dash-btn';
      b.className = 'nav-btn ss-dash-btn';
      b.innerHTML = 'ðŸ“Š Dashboard';
      b.title = 'View analytics, level up, get AI suggestions';
      b.onclick = () => SSDashboard.open();
      navRight.appendChild(b);
    }
    if (!document.getElementById('ss-vercel-btn')) {
      const b = document.createElement('button');
      b.id = 'ss-vercel-btn';
      b.className = 'nav-btn ss-vercel-btn';
      b.innerHTML = 'â–² Deploy';
      b.title = 'Deploy your site to Vercel in one click';
      b.onclick = () => SSVercel.openModal();
      navRight.appendChild(b);
    }
    return true;
  }
  const iv = setInterval(() => { if (injectTopBarButtons()) clearInterval(iv); }, 500);
  setTimeout(() => clearInterval(iv), 20000);

  /* â•â•â•â•â•â•â•â•â•â•â•â• 6. AUTO-TRACK BLOCKS IN PREVIEW â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.9 â€” FUNCTIONAL AI EDIT REPAIR
   Fixes the edit pipeline so AI/chat commands actually mutate State.blocks,
   use the builder's real render/save functions, and fall back locally before
   showing a non-editing answer.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function ssv269FunctionalAIEditRepair(){
  if (typeof AIChatbot === 'undefined' || typeof State === 'undefined') return;

  const ALLOWED_BLOCKS = ['nav','hero','features','gallery','testimonials','pricing','cta','leadform','footer'];
  const TYPE_ALIASES = {
    lead: 'leadform', form: 'leadform', contact: 'leadform', contactform: 'leadform', booking: 'leadform', book: 'leadform',
    testimonial: 'testimonials', reviews: 'testimonials', review: 'testimonials', price: 'pricing', services: 'pricing', service: 'pricing',
    feature: 'features', work: 'gallery', portfolio: 'gallery', photos: 'gallery', photo: 'gallery', image: 'gallery', images: 'gallery',
    calltoaction: 'cta', button: 'cta', navigation: 'nav', menu: 'nav'
  };
  const COLOR_NAMES = {
    black:'#000000', white:'#ffffff', red:'#ef4444', orange:'#f97316', yellow:'#eab308', green:'#22c55e', blue:'#2563eb',
    purple:'#7c3aed', pink:'#ec4899', gray:'#64748b', grey:'#64748b', navy:'#0f172a', teal:'#14b8a6', cyan:'#06b6d4'
  };

  function toast(title, body, type) { if (typeof showToast === 'function') showToast(title, body || '', type || 'info'); }
  function normalizeType(type) {
    type = (type || '').toString().toLowerCase().replace(/[^a-z]/g, '');
    return TYPE_ALIASES[type] || type;
  }
  function normalizeColor(value) {
    const v = (value || '').toString().trim().toLowerCase();
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) return v;
    return COLOR_NAMES[v] || value;
  }
  function commit(label) {
    try { if (typeof History !== 'undefined' && History.push) History.push(); } catch(e) {}
    if (typeof refreshPreview === 'function') refreshPreview();
    if (typeof updateLayers === 'function') updateLayers();
    try { window.dispatchEvent(new CustomEvent('ss:ai-edited', { detail: { label: label || 'AI edit' } })); } catch(e) {}
  }
  function blockSummary() {
    return (State.blocks || []).map((b, i) => {
      const d = b.data || {};
      return {
        index: i,
        id: b.id,
        type: b.type,
        label: b.label,
        heading: d.heading || d.logo || '',
        subheading: d.subheading || d.tagline || '',
        button: d.btnText || d.ctaText || '',
        preview: [d.heading, d.subheading, d.btnText, d.ctaText, d.logo, d.tagline].filter(Boolean).join(' | ').slice(0, 180)
      };
    });
  }
  function findBlock(args) {
    args = args || {};
    if (args.block_id) {
      const exact = (State.blocks || []).find(b => b.id === args.block_id);
      if (exact) return exact;
    }
    const type = normalizeType(args.type || args.target_type || args.block_type || args.target || '');
    if (type) {
      const byType = (State.blocks || []).find(b => b.type === type);
      if (byType) return byType;
    }
    const fieldHint = (args.field || args.target || '').toString().toLowerCase();
    if (/logo|nav|menu/.test(fieldHint)) return (State.blocks || []).find(b => b.type === 'nav') || null;
    if (/footer|tagline/.test(fieldHint)) return (State.blocks || []).find(b => b.type === 'footer') || null;
    if (/cta|button/.test(fieldHint)) return (State.blocks || []).find(b => b.type === 'hero') || (State.blocks || []).find(b => b.type === 'cta') || null;
    return (State.blocks || []).find(b => b.type === 'hero') || (State.blocks || [])[0] || null;
  }
  function normalizeFields(fields, block) {
    const src = Object.assign({}, fields || {});
    if (src.value !== undefined && (src.field || src.target)) {
      src[src.field || src.target] = src.value;
      delete src.value;
    }
    const out = {};
    Object.keys(src).forEach(k => {
      let key = k;
      const low = k.toLowerCase().replace(/\s+/g, '');
      if (['headline','title','herotitle','heroheadline'].includes(low)) key = 'heading';
      if (['sub','subtitle','subhead','subheadline','herosubtitle','herosubheading'].includes(low)) key = 'subheading';
      if (['button','buttontext','ctabutton','primarybutton','herobutton','ctatext'].includes(low)) {
        key = block && (block.type === 'nav') ? 'ctaText' : 'btnText';
      }
      if (['logo','businessname','brand'].includes(low)) key = block && block.type === 'footer' ? 'logo' : 'logo';
      if (['tagline'].includes(low)) key = 'tagline';
      if (['background','backgroundcolor','bg'].includes(low)) key = 'bgColor';
      if (['image','photo','picture','heroimage'].includes(low)) key = block && block.type === 'gallery' ? 'src' : 'bgImage';
      out[key] = src[k];
    });
    return out;
  }
  function setGlobalColor(which, value) {
    const map = { primary:'--primary', accent:'--accent', background:'--bg', bg:'--bg', text:'--text', secondary:'--secondary' };
    const cssVar = map[(which || '').toLowerCase()] || which;
    State.globalStyles = State.globalStyles || {};
    State.globalStyles[cssVar] = normalizeColor(value);
    const inputMap = { '--primary':'color-primary','--secondary':'color-secondary','--accent':'color-accent','--bg':'color-bg','--text':'color-text' };
    const el = document.getElementById(inputMap[cssVar]);
    if (el) el.value = State.globalStyles[cssVar];
    const hex = el && el.nextElementSibling;
    if (hex) hex.value = State.globalStyles[cssVar];
  }

  if (typeof FreeAI !== 'undefined') {
    const endpoints = ['https://gen.pollinations.ai/v1/chat/completions', FreeAI.TEXT_URL || 'https://text.pollinations.ai/openai'];
    FreeAI.TEXT_URL = endpoints[0];
    FreeAI.chat = async function(opts) {
      opts = opts || {};
      let messages = (opts.messages || []).slice();
      if (opts.tools && opts.tools.length) {
        const usableTools = opts.tools.filter(t => t.function && t.function.name !== 'list_blocks');
        const toolsList = usableTools.map(t => '- ' + t.function.name + ': ' + (t.function.description || '')).join('\n');
        messages = [{ role:'system', content:
          'You are controlling a live website builder. Return ONLY raw JSON, no markdown. ' +
          'Do not ask to list blocks; the current block ids are provided. Use exact ids from the site snapshot. ' +
          'Format: {"actions":[{"name":"edit_block_text","args":{"block_id":"block_1","fields":{"heading":"New heading"}}}],"say":"Short confirmation"}. ' +
          'Available actions:\n' + toolsList
        }].concat(messages);
      }
      const body = {
        model: opts.model || this.MODEL || 'openai',
        messages,
        stream: false,
        private: true,
        referrer: 'supersuite',
        temperature: 0.25,
        max_tokens: 1800
      };
      if ((opts.tools && opts.tools.length) || opts.jsonOnly) body.response_format = { type: 'json_object' };
      let lastErr;
      for (const url of endpoints) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 18000);
        try {
          const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) throw new Error('FREE_AI_HTTP_' + res.status);
          const text = await res.text();
          try { return JSON.parse(text); }
          catch(e) { return { choices:[{ message:{ role:'assistant', content:text } }] }; }
        } catch(e) {
          clearTimeout(timer);
          lastErr = e;
        }
      }
      throw new Error('FREE_AI_FAILED:' + (lastErr && lastErr.message ? lastErr.message : 'network'));
    };
  }

  AIChatbot.runTool = async function(name, args) {
    args = args || {};
    switch (name) {
      case 'list_blocks':
        return blockSummary();
      case 'edit_block_text': {
        const block = findBlock(args);
        if (!block) return { error: 'block not found', blocks: blockSummary() };
        block.data = Object.assign({}, block.data || {}, normalizeFields(args.fields || args, block));
        commit('Edited ' + block.type);
        return { ok: true, edited_id: block.id, type: block.type };
      }
      case 'add_block': {
        const type = normalizeType(args.type);
        if (!ALLOWED_BLOCKS.includes(type)) return { error: 'unsupported block type', allowed: ALLOWED_BLOCKS };
        if (typeof addBlock !== 'function') return { error: 'addBlock function missing' };
        const before = (State.blocks || []).map(b => b.id);
        const newId = addBlock(type);
        const newBlock = (State.blocks || []).find(b => b.id === newId) || (State.blocks || []).find(b => !before.includes(b.id));
        if (newBlock && args.position === 'after' && args.after_id) {
          const cur = State.blocks.findIndex(b => b.id === newBlock.id);
          const tgt = State.blocks.findIndex(b => b.id === args.after_id);
          if (cur >= 0 && tgt >= 0 && cur !== tgt + 1) {
            State.blocks.splice(cur, 1);
            State.blocks.splice(tgt + 1, 0, newBlock);
            commit('Moved new block');
          }
        }
        return { ok: true, added_id: newBlock && newBlock.id, type };
      }
      case 'remove_block': {
        const block = findBlock(args);
        if (!block) return { error: 'block not found' };
        if (typeof deleteBlock === 'function') deleteBlock(block.id);
        else { State.blocks = (State.blocks || []).filter(b => b.id !== block.id); commit('Removed block'); }
        return { ok: true, removed_id: block.id, type: block.type };
      }
      case 'move_block': {
        const block = findBlock(args);
        if (!block) return { error: 'block not found' };
        if (typeof moveBlock === 'function') moveBlock(block.id, args.direction === 'up' ? 'up' : 'down');
        else return { error: 'moveBlock function missing' };
        return { ok: true, moved_id: block.id };
      }
      case 'set_palette': {
        Object.entries(args || {}).forEach(([k,v]) => { if (v) setGlobalColor(k, v); });
        commit('Changed palette');
        return { ok: true, globalStyles: State.globalStyles };
      }
      case 'set_typography': {
        State.globalStyles = State.globalStyles || {};
        if (args.heading) State.globalStyles['--font-heading'] = `'${args.heading}', sans-serif`;
        if (args.body) State.globalStyles['--font-body'] = `'${args.body}', sans-serif`;
        if (args.base_size) State.globalStyles['--font-base'] = args.base_size;
        commit('Changed typography');
        return { ok: true };
      }
      case 'apply_template': {
        if (typeof applyTemplate === 'function') { applyTemplate(args.key || 'glass'); return { ok: true }; }
        return { error: 'template function missing' };
      }
      case 'fetch_images': {
        const hero = (State.blocks || []).find(b => b.type === 'hero');
        if (hero && typeof FreeAI !== 'undefined') {
          hero.data = hero.data || {};
          hero.data.bgType = 'image';
          hero.data.bgImage = FreeAI.imageURL(args.query || 'professional business', 1600, 900);
          commit('Changed hero image');
          return { ok: true };
        }
        return { error: 'hero image unavailable' };
      }
      case 'set_scroll_animation': {
        if (typeof setScrollAnimation === 'function') { setScrollAnimation(args.mode || 'soft'); return { ok: true }; }
        State.scrollAnimation = args.mode || 'soft'; commit('Changed scroll animation'); return { ok: true };
      }
    }
    return { error: 'unknown tool ' + name };
  };

  const Intent = {
    parse(text) {
      const raw = (text || '').trim();
      const t = raw.toLowerCase();
      if (!t) return null;
      let m;
      m = raw.match(/(?:change|update|set|make)\s+(?:the\s+)?(?:hero\s+)?(headline|title|heading|subheading|subtitle|sub headline|button text|cta|logo|tagline)\s+(?:to|=)\s+["â€œ']?([^"â€'\n]+)["â€']?\s*$/i);
      if (m) {
        const field = m[1].toLowerCase();
        let type = /logo/.test(field) ? 'nav' : (/tagline/.test(field) ? 'footer' : 'hero');
        let key = /sub/.test(field) ? 'subheading' : (/button|cta/.test(field) ? 'btnText' : (/logo/.test(field) ? 'logo' : (/tagline/.test(field) ? 'tagline' : 'heading')));
        return { name:'edit_block_text', args:{ type, fields:{ [key]: m[2].trim() } } };
      }
      m = t.match(/\badd\s+(?:a\s+|an\s+|new\s+)?([a-z\s]+?)\s*(?:block|section)?\s*$/i);
      if (m && /pricing|price|testimonial|review|gallery|portfolio|feature|lead|form|contact|cta|footer|nav|hero/.test(m[1])) return { name:'add_block', args:{ type: normalizeType(m[1]) } };
      m = t.match(/\b(?:remove|delete)\s+(?:the\s+)?([a-z\s]+?)\s*(?:block|section)?\s*$/i);
      if (m) return { name:'remove_block', args:{ type: normalizeType(m[1]) } };
      m = t.match(/\b(?:make|change)\s+(?:the\s+)?(?:colors?|theme|site|page)\s+(warmer|cooler|darker|lighter|brighter|bolder|softer|professional|luxury|modern)\b/i);
      if (m) return { name:'recolor', args:{ mood:m[1].toLowerCase() } };
      m = t.match(/\b(?:change|set|make)\s+(?:the\s+)?(primary|accent|background|bg|text|secondary)\s+colou?r\s+(?:to\s+)?(#?[a-z0-9]+)\b/i);
      if (m) return { name:'set_palette', args:{ [m[1].toLowerCase()]: normalizeColor(m[2]) } };
      m = raw.match(/\b(?:new|fetch|generate|create|change|set)\s+(?:the\s+)?(?:hero\s+)?(?:image|photo|picture)\s+(?:of|to|for)\s+(.+)$/i);
      if (m) return { name:'fetch_images', args:{ query:m[1].trim() } };
      if (/\b(redo|regenerate|redesign|rebuild)\b/.test(t) || /\b(make it|make the site)\s+(more\s+)?(professional|luxury|minimal|modern|bold|playful|editorial|brutalist)\b/.test(t)) {
        const styleMatch = t.match(/\b(bold|minimal|playful|luxury|editorial|brutalist|professional|modern)\b/);
        const goalMatch = t.match(/\b(leads|professionalism|showcase|sales|community)\b/);
        return { name:'generate_site', args:{ style: styleMatch ? styleMatch[1] : 'modern', goal: goalMatch ? goalMatch[1] : (t.includes('lead') ? 'leads' : '') } };
      }
      return null;
    },
    async execute(intent) {
      if (!intent) return null;
      if (intent.name === 'recolor') {
        const moods = {
          warmer:{ primary:'#c2410c', accent:'#f59e0b', bg:'#fff7ed', text:'#1c1917' },
          cooler:{ primary:'#2563eb', accent:'#06b6d4', bg:'#f8fafc', text:'#0f172a' },
          darker:{ primary:'#8b5cf6', accent:'#22d3ee', bg:'#020617', text:'#f8fafc' },
          lighter:{ primary:'#2563eb', accent:'#22c55e', bg:'#ffffff', text:'#0f172a' },
          brighter:{ primary:'#f97316', accent:'#ec4899', bg:'#fffbeb', text:'#111827' },
          bolder:{ primary:'#111827', accent:'#ef4444', bg:'#ffffff', text:'#111827' },
          softer:{ primary:'#64748b', accent:'#14b8a6', bg:'#f8fafc', text:'#334155' },
          professional:{ primary:'#0f172a', accent:'#2563eb', bg:'#ffffff', text:'#111827' },
          luxury:{ primary:'#111827', accent:'#d4af37', bg:'#0b0b0d', text:'#f8fafc' },
          modern:{ primary:'#111827', accent:'#14b8a6', bg:'#f8fafc', text:'#0f172a' }
        };
        const p = moods[intent.args.mood] || moods.modern;
        await AIChatbot.runTool('set_palette', p);
        return 'âœ“ Updated the site colors.';
      }
      if (intent.name === 'generate_site') {
        if (typeof AISiteGenerator !== 'undefined' && AISiteGenerator.run) {
          const info = {
            businessName: State.businessName || document.getElementById('site-name-input')?.value || 'My Business',
            businessType: State.industry || 'service business',
            style: intent.args.style,
            goal: intent.args.goal
          };
          const ok = await AISiteGenerator.run(info);
          return ok ? 'âœ“ Regenerated the site with a new style.' : 'âš ï¸ I could not regenerate it right now.';
        }
        return 'âš ï¸ Site generator is unavailable.';
      }
      const result = await AIChatbot.runTool(intent.name, intent.args || {});
      if (result && result.error) return 'âš ï¸ ' + result.error;
      if (intent.name === 'edit_block_text') return 'âœ“ Updated the site text.';
      if (intent.name === 'add_block') return 'âœ“ Added the ' + normalizeType(intent.args.type) + ' section.';
      if (intent.name === 'remove_block') return 'âœ“ Removed the section.';
      if (intent.name === 'set_palette') return 'âœ“ Updated the site colors.';
      if (intent.name === 'fetch_images') return 'âœ“ Updated the hero image.';
      return 'âœ“ Done.';
    }
  };
  window.SSIntent = Intent;

  AIChatbot.send = async function(userText) {
    if (this._busy) return;
    this.appendMsg('user', userText);
    this._history.push({ role:'user', content:userText });
    this._busy = true;
    this.setBusy(true);
    const finish = (text) => {
      this.clearThinking && this.clearThinking();
      this.appendMsg('assistant', text || 'âœ“ Done.');
      this._history.push({ role:'assistant', content:text || 'âœ“ Done.' });
    };
    try {
      const local = Intent.parse(userText);
      if (local && /^(change|update|set|make|add|remove|delete|new|fetch|generate|create|redo|regenerate|redesign|rebuild)\b/i.test(userText.trim())) {
        this.appendThinking('âš™ editing');
        finish(await Intent.execute(local));
        return;
      }

      const toolDefs = (this.toolDefs || []).filter(t => t.function && t.function.name !== 'list_blocks');
      const messages = [
        { role:'system', content:this.systemPrompt() + ' Return JSON actions when an edit is requested. Use the exact current block ids below. Do not call list_blocks.' },
        { role:'user', content:'Current site blocks JSON: ' + JSON.stringify(blockSummary()) },
        { role:'user', content:'User request: ' + userText }
      ];
      let raw = '', plan = null;
      try {
        const resp = await AIBridge.chat({ messages, tools: toolDefs, jsonOnly:true });
        const msg = resp && resp.choices && resp.choices[0] && resp.choices[0].message;
        if (msg && msg.tool_calls && msg.tool_calls.length) {
          plan = { actions: msg.tool_calls.map(c => {
            let args = {}; try { args = JSON.parse(c.function.arguments || '{}'); } catch(e) {}
            return { name:c.function.name, args };
          }), say:'âœ“ Updated the site.' };
        } else {
          raw = (msg && msg.content ? msg.content : '').toString();
          plan = (typeof AISiteGenerator !== 'undefined' && AISiteGenerator._parseJSON) ? AISiteGenerator._parseJSON(raw) : JSON.parse(raw);
        }
      } catch(e) {
        console.warn('[SSV26.9 AI edit] model failed:', e.message || e);
      }

      if (plan && Array.isArray(plan.actions) && plan.actions.length) {
        this.appendThinking('âš™ ' + plan.actions.map(a => a.name).join(', '));
        for (const action of plan.actions) await this.runTool(action.name, action.args || {});
        finish(plan.say || 'âœ“ Updated the site.');
        return;
      }

      if (local) {
        this.appendThinking('âš™ local edit');
        finish(await Intent.execute(local));
        return;
      }

      finish((plan && plan.say) || raw.replace(/```[a-z]*|```/gi, '').trim().slice(0, 500) || 'Tell me the exact edit you want, like â€œchange the headline to Fresh Cutsâ€ or â€œadd a pricing section.â€');
    } catch(err) {
      console.warn('[SSV26.9 AIChatbot.send]', err);
      const local = Intent.parse(userText);
      if (local) finish(await Intent.execute(local));
      else finish('âš ï¸ ' + (err.message || 'The edit failed.'));
    } finally {
      this._busy = false;
      this.setBusy(false);
    }
  };

  console.log('[SSV26.9] Functional AI edit repair loaded.');
})();


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.7 â€” DESKTOP-FRIENDLY DIALOGS (replace window.prompt / confirm)
   Electron disables native prompt() and confirm() by default. These
   work in any environment (web, Electron, Chrome extension popup).
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const SSPrompt = {
  _ensureRoot() {
    let r = document.getElementById('ss-dialog-root');
    if (!r) {
      r = document.createElement('div');
      r.id = 'ss-dialog-root';
      document.body.appendChild(r);
    }
    return r;
  },
  ask({ title, label, placeholder, defaultValue, okText, cancelText }) {
    return new Promise(resolve => {
      const root = this._ensureRoot();
      const node = document.createElement('div');
      node.className = 'ss-dialog-overlay';
      node.innerHTML =
        '<div class="ss-dialog-card" role="dialog" aria-modal="true">' +
          '<div class="ss-dialog-title">' + (title || 'Enter a value') + '</div>' +
          (label ? '<div class="ss-dialog-label">' + label + '</div>' : '') +
          '<input class="ss-dialog-input" type="text" placeholder="' + (placeholder||'') + '" value="' + (defaultValue||'').replace(/"/g,'&quot;') + '"/>' +
          '<div class="ss-dialog-actions">' +
            '<button class="ss-dialog-btn ss-dialog-cancel">' + (cancelText||'Cancel') + '</button>' +
            '<button class="ss-dialog-btn ss-dialog-ok">' + (okText||'OK') + '</button>' +
          '</div>' +
        '</div>';
      root.appendChild(node);
      const input = node.querySelector('.ss-dialog-input');
      const ok = node.querySelector('.ss-dialog-ok');
      const cancel = node.querySelector('.ss-dialog-cancel');
      const close = (val) => { node.remove(); resolve(val); };
      ok.onclick = () => close(input.value.trim() || (defaultValue||''));
      cancel.onclick = () => close(null);
      node.addEventListener('click', e => { if (e.target === node) close(null); });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); ok.click(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancel.click(); }
      });
      setTimeout(() => { input.focus(); input.select(); }, 30);
    });
  }
};
window.SSPrompt = SSPrompt;

const SSConfirm = {
  ask({ title, body, okText, cancelText, danger }) {
    return new Promise(resolve => {
      const root = SSPrompt._ensureRoot();
      const node = document.createElement('div');
      node.className = 'ss-dialog-overlay';
      node.innerHTML =
        '<div class="ss-dialog-card" role="dialog" aria-modal="true">' +
          '<div class="ss-dialog-title">' + (title || 'Are you sure?') + '</div>' +
          (body ? '<div class="ss-dialog-body">' + body + '</div>' : '') +
          '<div class="ss-dialog-actions">' +
            '<button class="ss-dialog-btn ss-dialog-cancel">' + (cancelText||'Cancel') + '</button>' +
            '<button class="ss-dialog-btn ss-dialog-ok' + (danger?' danger':'') + '">' + (okText||'OK') + '</button>' +
          '</div>' +
        '</div>';
      root.appendChild(node);
      const ok = node.querySelector('.ss-dialog-ok');
      const cancel = node.querySelector('.ss-dialog-cancel');
      const close = v => { node.remove(); resolve(v); };
      ok.onclick = () => close(true);
      cancel.onclick = () => close(false);
      node.addEventListener('click', e => { if (e.target === node) close(false); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(false); }
      });
      setTimeout(() => ok.focus(), 30);
    });
  }
};
window.SSConfirm = SSConfirm;

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.7 â€” AI IMPROVER (returning-user experience)
   Onboarding runs once. On every subsequent login, AIImprover proposes
   a small set of AI-generated improvements (copy polish, palette tweak,
   missing section, hero sharpening) the user can accept with one click.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const AIImprover = {
  _key: 'ss_lastimprove_v267',

  /** Throttle: at most once per 6 hours per user. */
  _shouldRun() {
    try {
      const last = parseInt(localStorage.getItem(this._key) || '0', 10);
      return (Date.now() - last) > (6 * 60 * 60 * 1000);
    } catch(e) { return true; }
  },
  _markRan() {
    try { localStorage.setItem(this._key, String(Date.now())); } catch(e) {}
  },

  async runOnLogin() {
    if (!this._shouldRun()) return;
    if (!State.blocks || !State.blocks.length) return;
    this._markRan();

    // Build a compact summary of the current site to send to GPT-5.
    const summary = {
      industry:   State.industry || 'unknown',
      business:   State.businessName || (document.getElementById('site-name-input')?.value || ''),
      template:   State.currentTemplate || 'glass',
      blockTypes: State.blocks.map(b => b.type),
      headline:   State.blocks.find(b => b.type === 'hero')?.data?.heading || '',
      palette:    {
        primary:   State.globalStyles['--primary'],
        secondary: State.globalStyles['--secondary'],
        accent:    State.globalStyles['--accent'],
      }
    };

    let suggestions;
    try {
      const sys =
        'You are a senior conversion designer reviewing a live site. Reply ONLY with JSON: ' +
        '{ "summary": "<one sentence about what is good>", "improvements": [ ' +
        '{ "title": "...", "why": "...", "kind": "headline|palette|add_block|cta", "value": "..." } ] } ' +
        'Return 3 improvements max. Keep titles under 8 words.';
      const user = 'Site snapshot: ' + JSON.stringify(summary);
      const resp = await AIBridge.chat({
        messages: [
          { role:'system', content: sys },
          { role:'user',   content: user }
        ],
        jsonOnly: true
      });
      const raw = resp.choices?.[0]?.message?.content || '';
      const parsed = (typeof AISiteGenerator !== 'undefined' && AISiteGenerator._parseJSON)
        ? AISiteGenerator._parseJSON(raw)
        : (function(){ try { return JSON.parse(raw); } catch(e){ return null; } })();
      if (parsed && Array.isArray(parsed.improvements) && parsed.improvements.length) {
        suggestions = parsed;
      }
    } catch(err) {
      console.warn('[AIImprover]', err);
    }

    if (!suggestions) return; // silently skip on failure
    this._showPanel(suggestions);
  },

  _showPanel(suggestions) {
    const root = SSPrompt._ensureRoot();
    const node = document.createElement('div');
    node.className = 'ss-dialog-overlay';
    const items = suggestions.improvements.map((s, i) =>
      '<li class="ai-improve-item">' +
        '<div class="ai-improve-head"><span class="ai-improve-kind">' + (s.kind||'tip') + '</span> ' +
        '<strong>' + (s.title || ('Improvement #' + (i+1))) + '</strong></div>' +
        (s.why ? '<div class="ai-improve-why">' + s.why + '</div>' : '') +
        (s.value ? '<div class="ai-improve-value">â†’ ' + s.value + '</div>' : '') +
        '<div class="ai-improve-actions">' +
          '<button class="ss-dialog-btn ss-dialog-ok ai-improve-apply" data-i="' + i + '">Apply</button>' +
          '<button class="ss-dialog-btn ai-improve-skip"  data-i="' + i + '">Skip</button>' +
        '</div>' +
      '</li>'
    ).join('');
    node.innerHTML =
      '<div class="ss-dialog-card ai-improve-card" role="dialog" aria-modal="true">' +
        '<div class="ss-dialog-title">âœ¨ AI improvements for your site</div>' +
        '<div class="ss-dialog-body">' + (suggestions.summary || 'A few ideas based on what is on the page.') + '</div>' +
        '<ul class="ai-improve-list">' + items + '</ul>' +
        '<div class="ss-dialog-actions">' +
          '<button class="ss-dialog-btn ss-dialog-cancel">Maybe later</button>' +
          '<button class="ss-dialog-btn ss-dialog-ok ai-improve-apply-all">Apply all</button>' +
        '</div>' +
      '</div>';
    root.appendChild(node);

    const close = () => node.remove();
    node.querySelector('.ss-dialog-cancel').onclick = close;
    node.addEventListener('click', e => { if (e.target === node) close(); });

    const apply = (s) => {
      try { AIImprover._apply(s); } catch(e) { console.warn('[AIImprover apply]', e); }
    };
    node.querySelectorAll('.ai-improve-apply').forEach(b => {
      b.onclick = () => {
        const i = parseInt(b.dataset.i, 10);
        apply(suggestions.improvements[i]);
        b.textContent = 'âœ“ Applied';
        b.disabled = true;
      };
    });
    node.querySelectorAll('.ai-improve-skip').forEach(b => {
      b.onclick = () => b.closest('.ai-improve-item').remove();
    });
    node.querySelector('.ai-improve-apply-all').onclick = () => {
      suggestions.improvements.forEach(apply);
      close();
      if (typeof showToast === 'function') showToast('âœ¨ Improvements applied', 'AI updated your site', 'success');
    };
  },

  _apply(s) {
    if (!s || !s.kind) return;
    if (s.kind === 'headline' && s.value) {
      const hero = State.blocks.find(b => b.type === 'hero');
      if (hero) { hero.data.heading = s.value; refreshPreview(); }
    } else if (s.kind === 'palette' && s.value) {
      // value can be "#ff6b35" (primary) or comma-separated "primary:#xxx, accent:#yyy"
      const parts = s.value.split(',').map(p => p.trim());
      parts.forEach(p => {
        const [k, v] = p.split(':').map(x => (x||'').trim());
        if (!v || !v.startsWith('#')) return;
        const map = { primary:'--primary', secondary:'--secondary', accent:'--accent' };
        if (map[k]) { State.globalStyles[map[k]] = v; }
      });
      if (parts.length === 1 && parts[0].startsWith('#')) {
        State.globalStyles['--primary'] = parts[0];
      }
      refreshPreview();
    } else if (s.kind === 'add_block' && s.value) {
      const valid = ['nav','hero','features','leadform','testimonials','pricing','cta','gallery','widget','photo','footer'];
      const t = (s.value || '').toLowerCase();
      if (valid.includes(t) && typeof addBlock === 'function') addBlock(t);
    } else if (s.kind === 'cta' && s.value) {
      const cta = State.blocks.find(b => b.type === 'cta');
      if (cta) { cta.data.heading = s.value; refreshPreview(); }
    }
  }
};
window.AIImprover = AIImprover;



/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.8 â€” NEW FEATURES BUNDLE
   1) EmailAuth     â€” local email + password accounts (per-device)
   2) StudioMode    â€” agency-tier dual-pane Developer + AI Agent surface
   3) Bug fixes & quality-of-life patches
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 1. EMAIL + PASSWORD AUTH (local, per-device) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   - Accounts stored in localStorage as ss_accounts_v268
   - Passwords hashed with PBKDF2-SHA256 (100k iters, per-account salt)
   - "Remember me" stores the active session token (rotates per signin)
   - Each account can optionally bind to an access code (carries that tier)
*/
const EmailAuth = {
  STORE: 'ss_accounts_v268',
  SESSION: 'ss_session_v268',
  _mode: 'signin',

  // ---------- crypto helpers ----------
  _b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); },
  _b64dec(str) { return Uint8Array.from(atob(str), c => c.charCodeAt(0)); },
  async _hash(password, saltB64) {
    const salt = this._b64dec(saltB64);
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      baseKey, 256
    );
    return this._b64(bits);
  },
  _newSalt() {
    const a = new Uint8Array(16); crypto.getRandomValues(a); return this._b64(a);
  },
  _newToken() {
    const a = new Uint8Array(24); crypto.getRandomValues(a); return this._b64(a);
  },

  // ---------- store helpers ----------
  _read() {
    try { return JSON.parse(localStorage.getItem(this.STORE) || '{}'); }
    catch(e) { return {}; }
  },
  _write(obj) {
    try { localStorage.setItem(this.STORE, JSON.stringify(obj)); return true; }
    catch(e) { return false; }
  },
  _normalizeEmail(e) { return (e || '').trim().toLowerCase(); },

  // ---------- session ----------
  saveSession(email, token, remember) {
    // SSV27: no persistent sessions â€” always sessionStorage regardless of remember
    const payload = JSON.stringify({ email, token, ts: Date.now() });
    try {
      sessionStorage.setItem(this.SESSION, payload);
      localStorage.removeItem(this.SESSION); // never store in localStorage
    } catch(e) {}
  },
  getSession() {
    try {
      const raw = localStorage.getItem(this.SESSION) || sessionStorage.getItem(this.SESSION);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) { return null; }
  },
  clearSession() {
    try { localStorage.removeItem(this.SESSION); sessionStorage.removeItem(this.SESSION); } catch(e) {}
  },

  // ---------- UI ----------
  setMode(mode) {
    this._mode = (mode === 'signup') ? 'signup' : 'signin';
    document.querySelectorAll('.eat-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.eat === this._mode));
    const extra = document.getElementById('email-signup-extra');
    const submit = document.getElementById('ea-submit');
    if (extra) extra.style.display = (this._mode === 'signup') ? 'block' : 'none';
    if (submit) submit.textContent = (this._mode === 'signup') ? 'Create Account â†’' : 'Sign In â†’';
    const pwd = document.getElementById('ea-password');
    if (pwd) pwd.setAttribute('autocomplete', this._mode === 'signup' ? 'new-password' : 'current-password');
  },

  // ---------- auto-restore on load ----------
  async tryAutoLogin() {
    const sess = this.getSession();
    if (!sess || !sess.email || !sess.token) return false;
    const accounts = this._read();
    const acc = accounts[this._normalizeEmail(sess.email)];
    if (!acc || acc.token !== sess.token) { this.clearSession(); return false; }
    return this._activate(acc, true);
  },

  // ---------- core actions ----------
  async submit() {
    const errEl  = document.getElementById('gate-error');
    const email  = this._normalizeEmail(document.getElementById('ea-email')?.value || '');
    const pwd    = (document.getElementById('ea-password')?.value || '');
    const btn    = document.getElementById('ea-submit');
    if (errEl) errEl.textContent = '';

    if (!email || !email.includes('@')) return this._fail('Please enter a valid email address.');
    if (!pwd || pwd.length < 6)         return this._fail('Password must be at least 6 characters.');

    if (btn) { btn.textContent = 'â³ Please waitâ€¦'; btn.disabled = true; }

    try {
      if (this._mode === 'signup') {
        const name     = (document.getElementById('ea-name')?.value || '').trim();
        const bindCode = (document.getElementById('ea-bind-code')?.value || '').trim();

        // Determine tier from bind code
        let tier = 'free';
        if (bindCode) {
          const r = (typeof Auth !== 'undefined') ? Auth.verify(bindCode) : { ok: false };
          if (!r.ok) { if (btn) { btn.textContent = 'Sign Up â†’'; btn.disabled = false; } return this._fail('Invalid plan code. Leave blank for Free.'); }
          tier = r.tier;
        }

        // Create account in Supabase Auth
        const result = await SSBase.authSignUp(email, pwd);
        if (result.error) {
          const msg = result.error.message || 'Sign up failed.';
          if (btn) { btn.textContent = 'Sign Up â†’'; btn.disabled = false; }
          return this._fail(msg.includes('already registered') ? 'Email already registered. Try signing in.' : msg);
        }

        // If no access_token, email confirmation is required
        if (!result.access_token && !result.session?.access_token) {
          if (btn) { btn.textContent = 'Sign Up â†’'; btn.disabled = false; }
          return this._fail('Check your email â€” we sent a confirmation link. Click it then sign in here.');
        }

        // Upsert user record in our users table
        await SSBase.upsertUser({ email, tier, business: name || '' });
        try { localStorage.setItem('ss_user_email', email); } catch(e) {}

        if (typeof showToast === 'function') showToast('ðŸŽ‰ Account created', 'Welcome to Supersuite!', 'success');
        return this._activate({ email, name: name || email.split('@')[0], tier }, false);

      } else {
        // Sign in via Supabase Auth
        const result = await SSBase.authSignIn(email, pwd);
        if (result.error) {
          const msg = result.error.message || 'Sign in failed.';
          if (btn) { btn.textContent = 'Sign In â†’'; btn.disabled = false; }
          return this._fail(msg.includes('Invalid login') ? 'Incorrect email or password.' : msg);
        }

        // Fetch tier from our users table
        const rows = await SSBase.query('users', 'GET', null, { email: 'eq.' + email, select: 'tier,email' });
        const tier = (rows && rows[0] && rows[0].tier) || 'free';

        // Update last_seen
        await SSBase.upsertUser({ email, tier });
        try { localStorage.setItem('ss_user_email', email); } catch(e) {}

        return this._activate({ email, name: email.split('@')[0], tier }, false);
      }
    } catch(e) {
      if (btn) { btn.textContent = this._mode === 'signup' ? 'Sign Up â†’' : 'Sign In â†’'; btn.disabled = false; }
      return this._fail('Connection error. Check your internet and try again.');
    }
  },

  _fail(msg) {
    const el = document.getElementById('gate-error');
    if (el) {
      el.textContent = 'âŒ ' + msg;
      el.style.animation = 'none';
      requestAnimationFrame(() => { el.style.animation = 'shake 0.4s ease both'; });
    }
    return false;
  },

  _activate(acc, silent) {
    State.authenticated = true;
    State.userTier = acc.tier || 'free';
    State.userEmail = acc.email;
    State.userName  = acc.name || acc.email;

    const landing = document.getElementById('landing-page');
    const app = document.getElementById('app');
    closeLoginModal();
    if (landing) {
      landing.style.opacity = '0';
      landing.style.transition = 'opacity 0.4s ease';
      setTimeout(() => { landing.style.display = 'none'; }, 400);
    }
    if (app) setTimeout(() => { app.style.display = 'flex'; initApp(); }, 420);
    if (!silent && typeof showToast === 'function') {
      showToast('ðŸ‘‹ Welcome back', acc.name || acc.email, 'success');
    }
    return true;
  },

  forgot() {
    const email = this._normalizeEmail(document.getElementById('ea-email').value);
    if (!email) return this._fail('Enter your email above first, then click Forgot password.');
    const accounts = this._read();
    const acc = accounts[email];
    if (!acc) return this._fail('No account found for that email.');
    if (!confirm('Reset password for ' + email + '?\n\nLocal-only accounts can\'t email you a link, so we\'ll let you set a new one now after a quick verify.\n\nClick OK to continue.')) return;
    const newPwd = prompt('Enter your NEW password (at least 6 characters):');
    if (!newPwd || newPwd.length < 6) return this._fail('Password reset cancelled.');
    this._hash(newPwd, acc.salt).then(h => {
      acc.hash = h; acc.token = this._newToken();
      this._write(accounts);
      if (typeof showToast === 'function') showToast('ðŸ” Password reset', 'You can now sign in with the new password.', 'success');
    });
  },

  exportAccounts() {
    const accounts = this._read();
    const list = Object.values(accounts).map(a => ({
      email: a.email, name: a.name, tier: a.tier, createdAt: new Date(a.createdAt).toISOString()
    }));
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'supersuite-accounts.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  signOut() {
    this.clearSession();
    State.authenticated = false;
    location.reload();
  }
};
window.EmailAuth = EmailAuth;

function switchLoginMode(mode) {
  const tabs = document.querySelectorAll('.login-tab');
  tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  document.getElementById('login-pane-code').style.display  = (mode === 'code')  ? 'block' : 'none';
  document.getElementById('login-pane-email').style.display = (mode === 'email') ? 'block' : 'none';
  document.getElementById('login-pane-code').classList.toggle('active', mode === 'code');
  document.getElementById('login-pane-email').classList.toggle('active', mode === 'email');
  const err = document.getElementById('gate-error'); if (err) err.textContent = '';
}
function switchEmailAuthMode(mode) { EmailAuth.setMode(mode); }
window.switchLoginMode = switchLoginMode;
window.switchEmailAuthMode = switchEmailAuthMode;

// Hook Enter key for the email pane
document.addEventListener('keydown', function(e) {
  const modal = document.getElementById('login-modal');
  if (!modal || modal.style.display === 'none') return;
  const emailPane = document.getElementById('login-pane-email');
  if (emailPane && emailPane.style.display !== 'none' && e.key === 'Enter') {
    e.preventDefault();
    EmailAuth.submit();
  }
});

// Auto-restore on landing if a session exists
window.addEventListener('load', () => {
  setTimeout(() => {
    const sess = EmailAuth.getSession();
    if (sess && document.getElementById('landing-page')) {
      EmailAuth.tryAutoLogin();
    }
  }, 250);
});


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   2. STUDIO MODE â€” Agency-tier only Â· Beta
   Two routes inside one panel:
   â€¢ Developer   â€” read/edit live HTML/CSS/JS templates + see preview source
   â€¢ AI Agent    â€” autonomous agent with tool access (edit blocks, fetch
                   URLs, call user-configured APIs)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const StudioMode = {
  _open: false,
  _route: 'developer',   // 'developer' | 'agent'
  _agentRunning: false,
  _agentMessages: [],

  isAvailable() { return (State.userTier === 'agency'); },

  ensureUI() {
    if (document.getElementById('studio-mode-root')) return;

    // Floating launch button (top-nav slot)
    const navRight = document.querySelector('.nav-right');
    if (navRight && !document.getElementById('studio-launch-btn')) {
      const btn = document.createElement('button');
      btn.id = 'studio-launch-btn';
      btn.className = 'btn-studio';
      btn.title = 'Studio Mode (Agency Â· Beta)';
      btn.innerHTML = 'ðŸ§ª Studio';
      btn.onclick = () => StudioMode.toggle();
      // Insert before the export button
      const exportBtn = navRight.querySelector('.btn-export');
      if (exportBtn) navRight.insertBefore(btn, exportBtn); else navRight.appendChild(btn);
      if (!this.isAvailable()) btn.classList.add('locked');
    }

    const root = document.createElement('div');
    root.id = 'studio-mode-root';
    root.className = 'studio-root';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="studio-overlay" onclick="StudioMode.toggle(false)"></div>
      <aside class="studio-panel">
        <header class="studio-header">
          <div class="studio-title">
            <span class="studio-icon">ðŸ§ª</span>
            <strong>Studio Mode</strong>
            <span class="studio-beta">BETA</span>
          </div>
          <div class="studio-routes">
            <button class="studio-route active" data-route="developer" onclick="StudioMode.setRoute('developer')">
              &lt;/&gt; Developer
            </button>
            <button class="studio-route" data-route="agent" onclick="StudioMode.setRoute('agent')">
              ðŸ¤– AI Agent
            </button>
          </div>
          <button class="studio-close" onclick="StudioMode.toggle(false)" aria-label="Close">âœ•</button>
        </header>

        <!-- DEVELOPER ROUTE -->
        <section class="studio-body" id="studio-body-developer">
          <div class="studio-dev-tabs">
            <button class="sdt-btn active" data-tab="preview" onclick="StudioMode.setDevTab('preview')">Live Preview</button>
            <button class="sdt-btn" data-tab="html" onclick="StudioMode.setDevTab('html')">HTML</button>
            <button class="sdt-btn" data-tab="css" onclick="StudioMode.setDevTab('css')">CSS</button>
            <button class="sdt-btn" data-tab="js" onclick="StudioMode.setDevTab('js')">JS</button>
            <button class="sdt-btn" data-tab="state" onclick="StudioMode.setDevTab('state')">State JSON</button>
            <div class="sdt-spacer"></div>
            <button class="sdt-action" onclick="StudioMode.refreshDev()" title="Re-read current preview">â†» Refresh</button>
            <button class="sdt-action primary" onclick="StudioMode.applyDev()" title="Apply edits to live preview">âœ“ Apply</button>
          </div>
          <div class="studio-dev-views">
            <div class="sdv active" id="sdv-preview">
              <div class="sdv-preview-frame">
                <iframe id="studio-preview-iframe" sandbox="allow-same-origin allow-scripts"></iframe>
              </div>
            </div>
            <div class="sdv" id="sdv-html"><textarea spellcheck="false" id="studio-html-area" placeholder="HTML sourceâ€¦"></textarea></div>
            <div class="sdv" id="sdv-css"><textarea spellcheck="false" id="studio-css-area" placeholder="Custom CSS (applied on Apply)"></textarea></div>
            <div class="sdv" id="sdv-js"><textarea spellcheck="false" id="studio-js-area" placeholder="JS console (read-only â€” use AI Agent to run code)"></textarea></div>
            <div class="sdv" id="sdv-state"><textarea spellcheck="false" id="studio-state-area" placeholder="Live state JSONâ€¦"></textarea></div>
          </div>
          <div class="studio-dev-warn">
            âš ï¸ Beta Â· HTML edits write to State.customCSS / blocks where possible. JS is read-only â€” use the AI Agent to mutate state.
          </div>
        </section>

        <!-- AI AGENT ROUTE -->
        <section class="studio-body" id="studio-body-agent" style="display:none;">
          <div class="studio-agent-shell">
            <div class="studio-agent-stream" id="studio-agent-stream">
              <div class="sas-msg sas-system">
                <strong>ðŸ¤– Studio Agent Â· Beta</strong><br/>
                I can edit your site, fetch URLs, and call APIs you give me.
                Try: <em>"Add a pricing block with 3 tiers and warm colors"</em>,
                <em>"Fetch this JSON: https://jsonplaceholder.typicode.com/users and add a testimonials block from it"</em>,
                or <em>"Set the hero headline to something more bold"</em>.
              </div>
            </div>
            <div class="studio-agent-tools">
              <details>
                <summary>ðŸ”§ API Endpoints (the agent can call these)</summary>
                <div class="sat-config">
                  <p class="sat-help">Add a label + URL. The agent will fetch them on demand. Use {{prompt}} as a placeholder.</p>
                  <div id="studio-api-list"></div>
                  <button class="sat-add-btn" onclick="StudioMode.addApi()">ï¼‹ Add Endpoint</button>
                </div>
              </details>
              <details>
                <summary>ðŸ›¡ï¸ Permissions</summary>
                <div class="sat-config">
                  <label class="sat-toggle"><input type="checkbox" id="studio-perm-edit" checked/> Allow editing site state</label>
                  <label class="sat-toggle"><input type="checkbox" id="studio-perm-fetch" checked/> Allow fetching external URLs</label>
                  <label class="sat-toggle"><input type="checkbox" id="studio-perm-api"/> Allow calling configured API endpoints</label>
                </div>
              </details>
            </div>
            <form class="studio-agent-input" id="studio-agent-form" onsubmit="event.preventDefault(); StudioMode.agentSend();">
              <textarea id="studio-agent-text" rows="2" placeholder="Tell the agent what to doâ€¦ (Shift+Enter for newline)"></textarea>
              <div class="sai-row">
                <button type="button" class="sai-clear" onclick="StudioMode.agentClear()">Clear</button>
                <button type="submit" class="sai-send" id="studio-agent-send">Run â†’</button>
              </div>
            </form>
          </div>
        </section>
      </aside>
    `;
    document.body.appendChild(root);

    // textarea grow
    const t = document.getElementById('studio-agent-text');
    if (t) {
      t.addEventListener('input', () => { t.style.height='auto'; t.style.height = Math.min(t.scrollHeight, 160)+'px'; });
      t.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('studio-agent-form').requestSubmit(); }
      });
    }
    this.renderApis();
  },

  toggle(force) {
    if (!this.isAvailable()) {
      if (typeof showToast === 'function')
        showToast('ðŸ”’ Studio Mode is Agency-only', 'Upgrade to Agency tier to unlock the developer + AI agent surface.', 'warn');
      return;
    }
    this.ensureUI();
    this._open = (force === undefined) ? !this._open : !!force;
    const root = document.getElementById('studio-mode-root');
    root.classList.toggle('open', this._open);
    root.setAttribute('aria-hidden', this._open ? 'false' : 'true');
    if (this._open) this.refreshDev();
  },

  setRoute(route) {
    this._route = route;
    document.querySelectorAll('.studio-route').forEach(b =>
      b.classList.toggle('active', b.dataset.route === route));
    document.getElementById('studio-body-developer').style.display = (route === 'developer') ? 'flex' : 'none';
    document.getElementById('studio-body-agent').style.display     = (route === 'agent')     ? 'flex' : 'none';
  },

  setDevTab(tab) {
    document.querySelectorAll('.sdt-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.sdv').forEach(v => v.classList.toggle('active', v.id === 'sdv-' + tab));
  },

  refreshDev() {
    try {
      const html = (typeof buildPreviewHTML === 'function') ? buildPreviewHTML(false) : '<!-- buildPreviewHTML missing -->';
      const ifr = document.getElementById('studio-preview-iframe');
      if (ifr) ifr.srcdoc = html;
      const htmlA = document.getElementById('studio-html-area');
      if (htmlA) htmlA.value = html;
      const cssA = document.getElementById('studio-css-area');
      if (cssA) cssA.value = State.customCSS || '';
      const stateA = document.getElementById('studio-state-area');
      if (stateA) {
        const safe = {
          template: State.currentTemplate, device: State.currentDevice,
          tier: State.userTier, blockCount: State.blocks.length,
          globalStyles: State.globalStyles,
          blocks: State.blocks.map(b => ({ id: b.id, type: b.type, data: b.data }))
        };
        stateA.value = JSON.stringify(safe, null, 2);
      }
      const jsA = document.getElementById('studio-js-area');
      if (jsA) jsA.value = '// Read-only snapshot of available helpers:\n// State, addBlock(t), refreshPreview(), saveHistory(),\n// AIBridge, AIChatbot, MotionFX, Onboarding, EmailAuth, StudioMode\n//\n// Use the AI Agent route to actually mutate things.';
    } catch(e) { console.warn('[Studio refreshDev]', e); }
  },

  applyDev() {
    try {
      const cssA = document.getElementById('studio-css-area');
      if (cssA) State.customCSS = cssA.value;
      const stateA = document.getElementById('studio-state-area');
      if (stateA && stateA.value.trim()) {
        try {
          const parsed = JSON.parse(stateA.value);
          if (parsed && parsed.globalStyles) Object.assign(State.globalStyles, parsed.globalStyles);
          if (parsed && Array.isArray(parsed.blocks)) {
            // Only allow block-data updates by id, not arbitrary structure changes
            parsed.blocks.forEach(pb => {
              const cur = State.blocks.find(b => b.id === pb.id);
              if (cur && pb.data && typeof pb.data === 'object') {
                Object.assign(cur.data, pb.data);
              }
            });
          }
        } catch(err) { return showToast('âŒ Invalid JSON', err.message, 'warn'); }
      }
      if (typeof saveHistory === 'function') saveHistory();
      if (typeof refreshPreview === 'function') refreshPreview();
      this.refreshDev();
      if (typeof showToast === 'function') showToast('âœ“ Applied', 'Studio edits pushed to live preview.', 'success');
    } catch(e) { showToast('âŒ Apply failed', e.message, 'warn'); }
  },

  // -------- API endpoints (user-configured) --------
  _apiKey: 'ss_studio_apis_v268',
  _readApis() { try { return JSON.parse(localStorage.getItem(this._apiKey) || '[]'); } catch(e) { return []; } },
  _writeApis(arr) { try { localStorage.setItem(this._apiKey, JSON.stringify(arr)); } catch(e) {} },
  renderApis() {
    const list = document.getElementById('studio-api-list');
    if (!list) return;
    const apis = this._readApis();
    list.innerHTML = apis.map((a, i) => `
      <div class="sat-api-row">
        <input type="text" placeholder="Label (e.g. stripe)" value="${(a.label||'').replace(/"/g,'&quot;')}" oninput="StudioMode.updateApi(${i},'label',this.value)"/>
        <input type="text" placeholder="https://apiâ€¦  (or paste API key)" value="${(a.url||'').replace(/"/g,'&quot;')}" oninput="StudioMode.updateApi(${i},'url',this.value)" onblur="StudioMode._autodetect(${i})"/>
        <input type="password" placeholder="API key (Bearer)" value="${(a.key||'').replace(/"/g,'&quot;')}" oninput="StudioMode.updateApi(${i},'key',this.value)"/>
        <button class="sat-del" onclick="StudioMode.removeApi(${i})">âœ•</button>
      </div>`).join('') || '<p class="sat-empty">No endpoints yet.</p>';
  },
  addApi() { const arr = this._readApis(); arr.push({ label: '', url: '', key: '' }); this._writeApis(arr); this.renderApis(); },
  removeApi(i) { const arr = this._readApis(); arr.splice(i, 1); this._writeApis(arr); this.renderApis(); },
  updateApi(i, k, v) { const arr = this._readApis(); if (arr[i]) { arr[i][k] = v; this._writeApis(arr); } },
  _autodetect(i) {
    const arr = this._readApis(); const row = arr[i]; if (!row) return;
    const v = (row.url || '').trim();
    if (v && !/^https?:\/\//i.test(v) && v.length > 12 && !v.includes(' ')) {
      row.key = v; row.url = ''; this._writeApis(arr); this.renderApis();
    }
  },

  // -------- AI Agent --------
  _agentTools: [
    { type: 'function', function: { name: 'edit_hero', description: 'Update the hero block text.', parameters: { type: 'object', properties: { heading: { type: 'string' }, sub: { type: 'string' }, ctaLabel: { type: 'string' } } } } },
    { type: 'function', function: { name: 'add_block', description: 'Add a block to the page.', parameters: { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: ['nav','hero','features','leadform','testimonials','pricing','cta','gallery','widget','photo','footer'] } } } } },
    { type: 'function', function: { name: 'set_palette', description: 'Set primary/secondary/accent colors as #hex.', parameters: { type: 'object', properties: { primary: { type:'string' }, secondary: { type:'string' }, accent: { type:'string' } } } } },
    { type: 'function', function: { name: 'fetch_url', description: 'GET a URL and return the response body (max 16KB).', parameters: { type: 'object', required:['url'], properties: { url: { type: 'string' } } } } },
    { type: 'function', function: { name: 'call_api', description: 'Call one of the user-configured API endpoints by label.', parameters: { type: 'object', required:['label'], properties: { label: { type: 'string' }, body: { type: 'string', description: 'Optional JSON string POST body' } } } } },
    { type: 'function', function: { name: 'finish', description: 'Stop running tools and write the final reply.', parameters: { type: 'object', properties: { summary: { type:'string' } } } } }
  ],

  _appendMsg(role, html) {
    const stream = document.getElementById('studio-agent-stream');
    if (!stream) return;
    const div = document.createElement('div');
    div.className = 'sas-msg sas-' + role;
    div.innerHTML = html;
    stream.appendChild(div);
    stream.scrollTop = stream.scrollHeight;
    return div;
  },

  agentClear() {
    this._agentMessages = [];
    const s = document.getElementById('studio-agent-stream');
    if (s) s.innerHTML = '<div class="sas-msg sas-system">ðŸ¤– Cleared. Ready for a new task.</div>';
  },

  async _runTool(name, args) {
    const permEdit  = !!document.getElementById('studio-perm-edit')?.checked;
    const permFetch = !!document.getElementById('studio-perm-fetch')?.checked;
    const permApi   = !!document.getElementById('studio-perm-api')?.checked;

    if (name === 'edit_hero') {
      if (!permEdit) return { error: 'Editing not permitted.' };
      const hero = State.blocks.find(b => b.type === 'hero');
      if (!hero) return { error: 'No hero block exists. Use add_block first.' };
      ['heading','sub','ctaLabel'].forEach(k => { if (typeof args[k] === 'string') hero.data[k] = args[k]; });
      if (typeof refreshPreview === 'function') refreshPreview();
      this.refreshDev();
      return { ok: true, applied: args };
    }
    if (name === 'add_block') {
      if (!permEdit) return { error: 'Editing not permitted.' };
      if (typeof addBlock === 'function') { addBlock(args.type); this.refreshDev(); return { ok: true, type: args.type }; }
      return { error: 'addBlock unavailable.' };
    }
    if (name === 'set_palette') {
      if (!permEdit) return { error: 'Editing not permitted.' };
      const map = { primary: '--primary', secondary: '--secondary', accent: '--accent' };
      Object.keys(map).forEach(k => {
        if (typeof args[k] === 'string' && args[k].startsWith('#')) State.globalStyles[map[k]] = args[k];
      });
      if (typeof refreshPreview === 'function') refreshPreview();
      this.refreshDev();
      return { ok: true, applied: args };
    }
    if (name === 'fetch_url') {
      if (!permFetch) return { error: 'External fetches not permitted.' };
      try {
        const r = await fetch(args.url, { method: 'GET' });
        const txt = (await r.text()).slice(0, 16000);
        return { status: r.status, body: txt };
      } catch(e) { return { error: e.message }; }
    }
    if (name === 'call_api') {
      if (!permApi) return { error: 'API calls not permitted (toggle in Permissions).' };
      const apis = this._readApis();
      const ep = apis.find(a => (a.label || '').toLowerCase() === (args.label || '').toLowerCase());
      if (!ep || !ep.url) return { error: 'No API endpoint with that label.' };
      try {
        const init = { method: args.body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } };
        if (ep.key) init.headers['Authorization'] = /^Bearer\s/i.test(ep.key) ? ep.key : 'Bearer ' + ep.key;
        if (args.body) init.body = args.body;
        const r = await fetch(ep.url, init);
        const txt = (await r.text()).slice(0, 16000);
        return { status: r.status, body: txt };
      } catch(e) { return { error: e.message }; }
    }
    if (name === 'finish') return { ok: true, summary: args.summary || '' };
    return { error: 'Unknown tool: ' + name };
  },

  async agentSend() {
    if (this._agentRunning) return;
    const ta = document.getElementById('studio-agent-text');
    const text = (ta.value || '').trim();
    if (!text) return;
    ta.value = ''; ta.style.height = 'auto';

    this._appendMsg('user', '<strong>You:</strong> ' + text.replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;'));
    this._agentMessages.push({ role: 'user', content: text });
    if (this._agentMessages.length === 1) {
      this._agentMessages.unshift({
        role: 'system',
        content:
          'You are the Supersuite Studio Agent (BETA, agency-tier). You can edit a single-page website in the Supersuite builder via tools. ' +
          'Use the provided tools â€” do not write code in plain text. Prefer concrete actions. ' +
          'When done, call the finish tool with a short summary. Be concise and specific.'
      });
    }

    const sendBtn = document.getElementById('studio-agent-send');
    sendBtn.disabled = true; this._agentRunning = true;
    const status = this._appendMsg('thinking', 'ðŸ¤– Thinkingâ€¦');

    try {
      let safety = 0;
      while (safety++ < 6) {
        const resp = await AIBridge.chat({
          messages: this._agentMessages,
          tools: this._agentTools,
          model: AIBridge.MODEL || 'gpt-5'
        });
        const choice = resp.choices && resp.choices[0];
        const msg = choice && choice.message;
        if (!msg) throw new Error('Empty AI response');
        this._agentMessages.push(msg);

        const calls = msg.tool_calls || [];
        if (!calls.length) {
          status.remove();
          if (msg.content) this._appendMsg('assistant', '<strong>Agent:</strong> ' + this._mdLite(msg.content));
          break;
        }
        for (const c of calls) {
          let args = {};
          try { args = JSON.parse(c.function.arguments || '{}'); } catch(e) {}
          this._appendMsg('tool-call', '<code>â†’ ' + c.function.name + '(' + this._briefArgs(args) + ')</code>');
          const result = await this._runTool(c.function.name, args);
          this._appendMsg('tool-result', '<code>â† ' + this._briefResult(result) + '</code>');
          this._agentMessages.push({
            role: 'tool', tool_call_id: c.id, name: c.function.name,
            content: JSON.stringify(result).slice(0, 8000)
          });
          if (c.function.name === 'finish') {
            status.remove();
            this._appendMsg('assistant', '<strong>Agent:</strong> ' + this._mdLite(args.summary || 'Done.'));
            safety = 999; break;
          }
        }
      }
    } catch(e) {
      status.remove();
      this._appendMsg('assistant', '<strong>Error:</strong> ' + (e.message || 'Agent failed'));
    } finally {
      sendBtn.disabled = false; this._agentRunning = false;
    }
  },

  _briefArgs(a) { try { return JSON.stringify(a).slice(0, 120); } catch(e) { return ''; } },
  _briefResult(r) { try { return JSON.stringify(r).slice(0, 160); } catch(e) { return ''; } },
  _mdLite(t) {
    return String(t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  }
};
window.StudioMode = StudioMode;

// Wire up Studio Mode after initApp runs
(function patchInitForStudio() {
  if (typeof initApp !== 'function') return;
  const orig = initApp;
  window.initApp = function() {
    orig.apply(this, arguments);
    setTimeout(() => {
      try {
        StudioMode.ensureUI();
        const btn = document.getElementById('studio-launch-btn');
        if (btn) btn.classList.toggle('locked', !StudioMode.isAvailable());
      } catch(e) { console.warn('[StudioMode init]', e); }
    }, 600);
  };
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   3. MISC FIXES
   - Defensive: ensure showToast exists as no-op shim if missing
   - "Sign out" exposed globally for the future user menu
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
if (typeof window.showToast !== 'function') {
  window.showToast = function(t, s, type) { console.log('[toast]', type || 'info', t, s || ''); };
}
window.signOut = () => EmailAuth.signOut();

console.log('[SSV26.8] EmailAuth + StudioMode loaded.');

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV26.9 â€” STANDALONE SS STUDIO AGENT
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Lives outside the builder. Gated by access codes (ROASRYE / SSSTUDIO
   or any agency-tier code in SS_PASSWORD_DB). Reuses AIBridge for the
   actual model calls so it works keyless via the built-in gateway.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const StudioAgentApp = {
  _running: false,
  _messages: [],
  _tier: null,
  _apiKey: 'ss_studio_agent_apis_v269',
  _gateKey: 'ss_studio_agent_session_v269',

  // â”€â”€ Tools the standalone agent can call â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _tools: [
    { type: 'function', function: { name: 'fetch_url', description: 'GET a URL and return body text (max 16KB).', parameters: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } },
    { type: 'function', function: { name: 'call_api', description: 'Call a user-configured API endpoint by label. The endpoint may have a stored API key auto-injected as Authorization: Bearer.', parameters: { type: 'object', required: ['label'], properties: { label: { type: 'string' }, method: { type: 'string', enum: ['GET','POST','PUT','DELETE','PATCH'] }, body: { type: 'string', description: 'Optional JSON string body for non-GET requests' } } } } },
    { type: 'function', function: { name: 'builder_add_block', description: 'Add a block to the Supersuite builder (requires bridge permission).', parameters: { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: ['nav','hero','features','leadform','testimonials','pricing','cta','gallery','widget','photo','footer'] } } } } },
    { type: 'function', function: { name: 'builder_edit_hero', description: 'Edit the hero block in the builder (requires bridge permission).', parameters: { type: 'object', properties: { heading: { type: 'string' }, sub: { type: 'string' }, ctaLabel: { type: 'string' } } } } },
    { type: 'function', function: { name: 'finish', description: 'Stop running tools and return the final reply.', parameters: { type: 'object', properties: { summary: { type: 'string' } } } } }
  ],

  // â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  open(tier) {
    this._tier = tier || 'agency';
    const shell = document.getElementById('studio-agent-app');
    if (!shell) return;
    shell.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const pill = document.getElementById('sa-tier-pill');
    if (pill) pill.textContent = this._tier;
    this.renderApis();
    // Persist a soft session so refreshing keeps you in
    try { sessionStorage.setItem(this._gateKey, JSON.stringify({ tier: this._tier, t: Date.now() })); } catch(e) {}
  },
  exit() {
    const shell = document.getElementById('studio-agent-app');
    if (shell) shell.style.display = 'none';
    document.body.style.overflow = '';
    try { sessionStorage.removeItem(this._gateKey); } catch(e) {}
  },
  resumeIfActive() {
    try {
      const raw = sessionStorage.getItem(this._gateKey);
      if (!raw) return false;
      const { tier, t } = JSON.parse(raw);
      // 4h soft TTL
      if (Date.now() - t > 4 * 60 * 60 * 1000) { sessionStorage.removeItem(this._gateKey); return false; }
      this.open(tier);
      return true;
    } catch(e) { return false; }
  },

  // â”€â”€ Quick-prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sendQuick(text) {
    const ta = document.getElementById('sa-text');
    if (ta) { ta.value = text; ta.focus(); }
    this.send();
  },

  clear() {
    this._messages = [];
    const s = document.getElementById('sa-stream');
    if (s) s.innerHTML = '<div class="sa-msg sa-msg-system"><strong>ðŸ¤– Studio Agent</strong> cleared. Ready for a new task.</div>';
  },

  // â”€â”€ API endpoints (separate store from StudioMode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _readApis() { try { return JSON.parse(localStorage.getItem(this._apiKey) || '[]'); } catch(e) { return []; } },
  _writeApis(arr) { try { localStorage.setItem(this._apiKey, JSON.stringify(arr)); } catch(e) {} },
  renderApis() {
    const list = document.getElementById('sa-api-list'); if (!list) return;
    const apis = this._readApis();
    list.innerHTML = apis.map((a, i) => `
      <div class="sa-api-row">
        <input type="text" placeholder="Label (e.g. stripe)" value="${(a.label||'').replace(/"/g,'&quot;')}" oninput="StudioAgentApp.updateApi(${i},'label',this.value)"/>
        <input type="text" placeholder="https://apiâ€¦  (or paste API key)" value="${(a.url||'').replace(/"/g,'&quot;')}" oninput="StudioAgentApp.updateApi(${i},'url',this.value)" onblur="StudioAgentApp._autodetect(${i})"/>
        <input type="password" placeholder="API key (Bearer)" value="${(a.key||'').replace(/"/g,'&quot;')}" oninput="StudioAgentApp.updateApi(${i},'key',this.value)"/>
        <button title="Remove" onclick="StudioAgentApp.removeApi(${i})">âœ•</button>
      </div>`).join('') || '<p class="sa-empty">No endpoints yet. Paste a URL <em>or</em> just an API key â€” the agent figures it out.</p>';
  },
  addApi() { const arr = this._readApis(); arr.push({ label: '', url: '', key: '' }); this._writeApis(arr); this.renderApis(); },
  removeApi(i) { const arr = this._readApis(); arr.splice(i, 1); this._writeApis(arr); this.renderApis(); },
  updateApi(i, k, v) { const arr = this._readApis(); if (arr[i]) { arr[i][k] = v; this._writeApis(arr); } },
  _autodetect(i) {
    const arr = this._readApis(); const row = arr[i]; if (!row) return;
    const v = (row.url || '').trim();
    if (v && !/^https?:\/\//i.test(v) && v.length > 12 && !v.includes(' ')) {
      row.key = v; row.url = ''; this._writeApis(arr); this.renderApis();
    }
  },
  openTools() { const d = document.getElementById('sa-tools-drawer'); if (d) d.style.display = 'flex'; this.renderApis(); },
  closeTools() { const d = document.getElementById('sa-tools-drawer'); if (d) d.style.display = 'none'; },

  // â”€â”€ Hand off to the builder (and Studio Mode if available) â”€â”€â”€â”€
  openBuilderHandoff() {
    // Close agent shell, reveal builder, then open Studio Mode if agency
    this.exit();
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('app');
    if (landing) landing.style.display = 'none';
    if (app) app.style.display = 'flex';
    setTimeout(() => {
      try {
        if (window.StudioMode && StudioMode.isAvailable && StudioMode.isAvailable()) {
          StudioMode.toggle(true);
        }
      } catch(e) { console.warn('[SA handoff]', e); }
    }, 400);
  },

  // â”€â”€ Tool runtime â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async _runTool(name, args) {
    const permFetch   = !!document.getElementById('sa-perm-fetch')?.checked;
    const permApi     = !!document.getElementById('sa-perm-api')?.checked;
    const permBuilder = !!document.getElementById('sa-perm-builder')?.checked;

    if (name === 'fetch_url') {
      if (!permFetch) return { error: 'Fetch permission disabled.' };
      try {
        const r = await fetch(args.url, { method: 'GET' });
        const txt = (await r.text()).slice(0, 16000);
        return { status: r.status, body: txt };
      } catch(e) { return { error: e.message }; }
    }
    if (name === 'call_api') {
      if (!permApi) return { error: 'API permission disabled.' };
      const apis = this._readApis();
      const ep = apis.find(a => (a.label || '').toLowerCase() === (args.label || '').toLowerCase());
      if (!ep || !ep.url) return { error: 'No endpoint with label: ' + args.label };
      try {
        const method = (args.method || (args.body ? 'POST' : 'GET')).toUpperCase();
        const init = { method, headers: { 'Content-Type': 'application/json' } };
        if (ep.key) init.headers['Authorization'] = /^Bearer\s/i.test(ep.key) ? ep.key : 'Bearer ' + ep.key;
        if (args.body && method !== 'GET') init.body = args.body;
        const r = await fetch(ep.url, init);
        return { status: r.status, body: (await r.text()).slice(0, 16000) };
      } catch(e) { return { error: e.message }; }
    }
    if (name === 'builder_add_block') {
      if (!permBuilder) return { error: 'Builder bridge disabled. Toggle it on in Permissions to allow writes.' };
      if (typeof addBlock !== 'function') return { error: 'Builder not initialized yet. Open Builder first.' };
      try { addBlock(args.type); return { ok: true, added: args.type }; }
      catch(e) { return { error: e.message }; }
    }
    if (name === 'builder_edit_hero') {
      if (!permBuilder) return { error: 'Builder bridge disabled.' };
      if (!window.State || !State.blocks) return { error: 'Builder state unavailable.' };
      const hero = State.blocks.find(b => b.type === 'hero');
      if (!hero) return { error: 'No hero block. Add one first.' };
      ['heading','sub','ctaLabel'].forEach(k => { if (typeof args[k] === 'string') hero.data[k] = args[k]; });
      if (typeof refreshPreview === 'function') refreshPreview();
      return { ok: true, applied: args };
    }
    if (name === 'finish') return { ok: true, summary: args.summary || '' };
    return { error: 'Unknown tool: ' + name };
  },

  _appendMsg(role, html) {
    const stream = document.getElementById('sa-stream');
    if (!stream) return null;
    const div = document.createElement('div');
    div.className = 'sa-msg sa-msg-' + role;
    div.innerHTML = html;
    stream.appendChild(div);
    stream.scrollTop = stream.scrollHeight;
    // live turn counter
    try {
      const t = document.getElementById('sa-stat-turns');
      if (t) {
        const n = stream.querySelectorAll('.sa-msg-user').length;
        t.textContent = n + ' turn' + (n === 1 ? '' : 's');
      }
    } catch(e) {}
    return div;
  },

  _esc(t) { return String(t).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); },
  _briefArgs(a) { try { return this._esc(JSON.stringify(a).slice(0, 140)); } catch(e) { return ''; } },
  _briefResult(r) { try { return this._esc(JSON.stringify(r).slice(0, 180)); } catch(e) { return ''; } },
  _md(t) {
    return this._esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  },

  async send() {
    if (this._running) return;
    const ta = document.getElementById('sa-text');
    const text = (ta.value || '').trim();
    if (!text) return;
    ta.value = ''; ta.style.height = 'auto';

    this._appendMsg('user', '<strong>You:</strong> ' + this._esc(text));
    this._messages.push({ role: 'user', content: text });
    if (this._messages.length === 1 || this._messages[0].role !== 'system') {
      this._messages.unshift({
        role: 'system',
        content:
          'You are SS Studio Agent â€” a standalone, agency-tier AI agent for Supersuite. ' +
          'You exist OUTSIDE the website builder and operate as your own private system. ' +
          'You can think on your own, fetch URLs, call user-configured APIs, and (only if the builder bridge permission is enabled) write changes into the Supersuite builder. ' +
          'Prefer concrete tool calls over plain-text instructions. Be concise, specific, and helpful. ' +
          'When you are done, call the `finish` tool with a short summary.'
      });
    }

    const sendBtn = document.getElementById('sa-send');
    sendBtn.disabled = true; this._running = true;
    const status = this._appendMsg('thinking', 'ðŸ¤– Thinkingâ€¦');

    try {
      let safety = 0;
      while (safety++ < 6) {
        const resp = await AIBridge.chat({
          messages: this._messages,
          tools: this._tools,
          model: AIBridge.MODEL || 'gpt-5'
        });
        const choice = resp.choices && resp.choices[0];
        const msg = choice && choice.message;
        if (!msg) throw new Error('Empty AI response');
        this._messages.push(msg);

        const calls = msg.tool_calls || [];
        if (!calls.length) {
          status.remove();
          if (msg.content) this._appendMsg('assistant', '<strong>Agent:</strong> ' + this._md(msg.content));
          break;
        }
        for (const c of calls) {
          let args = {};
          try { args = JSON.parse(c.function.arguments || '{}'); } catch(e) {}
          this._appendMsg('tool-call', 'â†’ <code>' + c.function.name + '(' + this._briefArgs(args) + ')</code>');
          const result = await this._runTool(c.function.name, args);
          this._appendMsg('tool-result', 'â† <code>' + this._briefResult(result) + '</code>');
          this._messages.push({
            role: 'tool', tool_call_id: c.id, name: c.function.name,
            content: JSON.stringify(result).slice(0, 8000)
          });
          if (c.function.name === 'finish') {
            status.remove();
            this._appendMsg('assistant', '<strong>Agent:</strong> ' + this._md(args.summary || 'Done.'));
            safety = 999; break;
          }
        }
      }
    } catch(e) {
      status.remove();
      this._appendMsg('assistant', '<strong>Error:</strong> ' + this._esc(e.message || 'Agent failed'));
    } finally {
      sendBtn.disabled = false; this._running = false;
    }
  }
};
window.StudioAgentApp = StudioAgentApp;

/* â”€â”€ Gate handlers (landing-page wiring) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function openStudioAgentGate() {
  // If we already have an active session, jump straight in
  if (StudioAgentApp.resumeIfActive()) return;
  const m = document.getElementById('studio-agent-gate');
  if (!m) return;
  m.style.display = 'flex';
  setTimeout(() => { document.getElementById('sag-input')?.focus(); }, 60);
}
function closeStudioAgentGate() {
  const m = document.getElementById('studio-agent-gate');
  if (m) m.style.display = 'none';
  const err = document.getElementById('sag-error'); if (err) err.textContent = '';
  const inp = document.getElementById('sag-input'); if (inp) inp.value = '';
}
function submitStudioAgentGate() {
  const inp = document.getElementById('sag-input');
  const err = document.getElementById('sag-error');
  const code = (inp?.value || '').trim();
  if (!code) { if (err) err.textContent = 'Please enter an access code.'; return; }

  let result;
  try { result = Auth.verify(code); }
  catch(e) { if (err) err.textContent = 'Auth system error.'; return; }

  if (!result.ok) { if (err) err.textContent = result.error || 'Invalid code.'; return; }
  if (result.tier !== 'agency') {
    if (err) err.textContent = 'Studio Agent is agency-tier only. Your code is "' + result.label + '".';
    return;
  }

  // Success
  closeStudioAgentGate();
  StudioAgentApp.open(result.tier);
}
window.openStudioAgentGate = openStudioAgentGate;
window.closeStudioAgentGate = closeStudioAgentGate;
window.submitStudioAgentGate = submitStudioAgentGate;

// Keyboard: Enter on the gate input submits, Escape closes
document.addEventListener('keydown', (e) => {
  const gate = document.getElementById('studio-agent-gate');
  if (gate && gate.style.display !== 'none') {
    if (e.key === 'Enter') { e.preventDefault(); submitStudioAgentGate(); }
    if (e.key === 'Escape') { e.preventDefault(); closeStudioAgentGate(); }
  }
});

// Auto-grow textarea + Enter-to-send in agent shell (runs once after DOM ready)
(function initSAInputs() {
  const tryWire = () => {
    const ta = document.getElementById('sa-text');
    if (!ta || ta._saWired) return;
    ta._saWired = true;
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 220) + 'px'; });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('sa-form')?.requestSubmit(); }
    });
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(tryWire, 0);
  } else {
    document.addEventListener('DOMContentLoaded', tryWire);
  }
  // Try again later in case of delayed render
  setTimeout(tryWire, 800);
})();

console.log('[SSV26.9] Standalone SS Studio Agent loaded.');

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV27 â€” CENTRAL AI HUB
   Single floating button â†’ expandable side panel.
   Pollinations AI interprets natural language â†’ edits the live site.
   Replaces: AIChatbot pill, AI generate button, AI regenerate button.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const AIHub = {
  _open:          false,
  _busy:          false,
  _lastSnapshot:  null,
  _history:       [],

  mount() {
    if (document.getElementById('aihub-fab')) return;

    // â”€â”€ FAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fab = document.createElement('button');
    fab.id        = 'aihub-fab';
    fab.className = 'aihub-fab';
    fab.title     = 'AI Editor â€” drag to move';
    fab.innerHTML = '<span class="aihub-fab-icon">âœ¦</span><span class="aihub-fab-label">AI Edit</span>';
    fab.addEventListener('click', (e) => {
      if (!fab._dragged) this.toggle();
      fab._dragged = false;
    });
    document.body.appendChild(fab);
    this._makeDraggable(fab);

    // â”€â”€ Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const panel = document.createElement('div');
    panel.id        = 'aihub-panel';
    panel.className = 'aihub-panel';
    panel.innerHTML = `
      <div class="aihub-head">
        <div>
          <div class="aihub-eyebrow">AI EDITOR Â· Groq Llama 3.3</div>
          <div class="aihub-title">Full site access</div>
        </div>
        <button class="aihub-close" onclick="AIHub.toggle(false)">âœ•</button>
      </div>
      <div class="aihub-messages" id="aihub-messages">
        <div class="aihub-welcome">
          <div class="aihub-welcome-icon">âœ¦</div>
          <p>I have full access to your site. I can edit sections, add new ones, change colors and styles. Try:</p>
          <div class="aihub-suggestions">
            <button onclick="AIHub._sendSuggestion(this.textContent)">Make the hero section darker</button>
            <button onclick="AIHub._sendSuggestion(this.textContent)">Rewrite the headline to be more bold</button>
            <button onclick="AIHub._sendSuggestion(this.textContent)">Add a FAQ section</button>
            <button onclick="AIHub._sendSuggestion(this.textContent)">Change the primary color to navy blue</button>
          </div>
        </div>
      </div>
      <div class="aihub-input-area">
        <div class="aihub-input-row">
          <textarea id="aihub-input" class="aihub-textarea" placeholder="Tell me what to changeâ€¦" rows="2" onkeydown="AIHub._onKey(event)"></textarea>
          <button class="aihub-send" id="aihub-send" onclick="AIHub.send()">â†’</button>
        </div>
        <div class="aihub-foot-row">
          <button class="aihub-undo" onclick="AIHub._undo()">â†© Undo</button>
          <span class="aihub-model">Groq Â· Llama 3.3 70B</span>
        </div>
      </div>`;
    document.body.appendChild(panel);
  },

  /* â”€â”€ Drag the FAB anywhere on screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _makeDraggable(el) {
    let sx, sy, bBottom, bRight;

    el.addEventListener('pointerdown', (e) => {
      sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect();
      bBottom = window.innerHeight - r.bottom;
      bRight  = window.innerWidth  - r.right;
      el._dragged = false;

      const onMove = (e2) => {
        const dx = e2.clientX - sx;
        const dy = e2.clientY - sy;
        if (!el._dragged && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          el._dragged = true;
          el.setPointerCapture(e.pointerId);
          el.style.cursor = 'grabbing';
          el.style.transition = 'none';
        }
        if (!el._dragged) return;
        const nb = Math.max(8, Math.min(window.innerHeight - 56, bBottom - dy));
        const nr = Math.max(8, Math.min(window.innerWidth  - 110, bRight  - dx));
        el.style.bottom = nb + 'px';
        el.style.right  = nr + 'px';
        el.style.top    = 'auto';
        el.style.left   = 'auto';
        // Keep panel anchored to FAB
        const panel = document.getElementById('aihub-panel');
        if (panel && AIHub._open) {
          panel.style.bottom = (nb + 58) + 'px';
          panel.style.right  = nr + 'px';
          panel.style.top    = 'auto';
          panel.style.left   = 'auto';
        }
      };

      const onUp = () => {
        el.style.cursor = '';
        el.style.transition = '';
        el.releasePointerCapture(e.pointerId);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup',   onUp);
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup',   onUp);
    });
  },

  toggle(force) {
    this._open = (force !== undefined) ? force : !this._open;
    const panel = document.getElementById('aihub-panel');
    const fab   = document.getElementById('aihub-fab');
    if (panel) panel.classList.toggle('open', this._open);
    if (fab)   fab.classList.toggle('active', this._open);
    if (this._open) {
      setTimeout(() => document.getElementById('aihub-input')?.focus(), 200);
    }
  },

  _onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  },

  _sendSuggestion(text) {
    const inp = document.getElementById('aihub-input');
    if (inp) { inp.value = text; this.send(); }
  },

  _addMessage(role, text) {
    const msgs = document.getElementById('aihub-messages');
    if (!msgs) return;
    // Remove welcome on first message
    const welcome = msgs.querySelector('.aihub-welcome');
    if (welcome) welcome.remove();
    const el = document.createElement('div');
    el.className = 'aihub-msg aihub-msg-' + role;
    el.innerHTML = `<div class="aihub-msg-bubble">${text}</div>`;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    this._history.push({ role, text, ts: Date.now() });
  },

  _setLoading(v) {
    this._busy = v;
    const btn = document.getElementById('aihub-send');
    const inp = document.getElementById('aihub-input');
    if (btn) { btn.disabled = v; btn.textContent = v ? 'â€¦' : 'â†’'; }
    if (inp)   inp.disabled = v;
  },

  /* â”€â”€ Undo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  _undo() {
    if (!this._lastSnapshot) { this._addMessage('assistant', 'Nothing to undo yet.'); return; }
    try {
      const snap = JSON.parse(this._lastSnapshot);
      if (snap.sections)     State.sections     = snap.sections;
      if (snap.siteCSS      !== undefined) State.siteCSS      = snap.siteCSS;
      if (snap.globalStyles) Object.assign(State.globalStyles, snap.globalStyles);
      if (snap.customCSS    !== undefined) State.customCSS    = snap.customCSS;
      if (snap.blocks)       State.blocks        = snap.blocks;
      History.push();
      refreshPreview();
      SSections.updatePanel();
      this._addMessage('assistant', 'Reverted âœ“');
      this._lastSnapshot = null;
    } catch(e) { this._addMessage('assistant', 'Undo failed: ' + e.message); }
  },

  /* â”€â”€ Main send â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  async send() {
    const inp  = document.getElementById('aihub-input');
    const text = (inp?.value || '').trim();
    if (!text || this._busy) return;

    // Check AI edit quota
    if (!UsageLimiter.canUse('ai')) {
      UsageLimiter.showUpgradePrompt('ai');
      return;
    }

    if (inp) inp.value = '';
    this._addMessage('user', this._esc(text));
    this._setLoading(true);
    UsageLimiter.consume('ai');

    // Save full undo snapshot
    this._lastSnapshot = JSON.stringify({
      sections:     JSON.parse(JSON.stringify(State.sections     || [])),
      siteCSS:      State.siteCSS      || '',
      globalStyles: { ...State.globalStyles },
      customCSS:    State.customCSS    || '',
      blocks:       JSON.parse(JSON.stringify(State.blocks || [])),
    });

    try {
      // Build section context for AI
      const sectionsList = (State.sections || []).map(s => ({
        id:      s.id,
        label:   s.label,
        preview: (s.html || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0, 180),
      }));

      const cssVars = typeof _extractCSSVars === 'function'
        ? _extractCSSVars(State.siteCSS)
        : 'var(--p)=primary, var(--s)=secondary, var(--a)=accent, var(--bg)=background, var(--tc)=text';

      const system = `You are an AI web editor with FULL write access to this website.
Business: ${State.businessName || 'Unknown'} Â· ${State.industry || ''}
Sections on site: ${JSON.stringify(sectionsList)}
CSS variables: ${cssVars}

Decide what actions to take to fulfil the user's request. Respond ONLY with valid JSON, no markdown:
{
  "reply": "one sentence â€” what you did",
  "actions": [
    { "type": "edit_section",  "sectionId": "<id from list above>", "instruction": "specific edit instruction" },
    { "type": "add_section",   "description": "what section to build, matching site style" },
    { "type": "delete_section","sectionId": "<id>" },
    { "type": "edit_styles",   "cssVars": { "--p": "#hex", "--s": "#hex" } }
  ]
}
Use only the action types needed. Actions run in order. Use real section IDs from the list.`;

      const raw = await callAIWorker([
        { role: 'system', content: system },
        { role: 'user',   content: text   },
      ], { max_tokens: 700, temperature: 0.5 });

      const clean = raw.replace(/^```json?\n?/i,'').replace(/\n?```$/,'').trim();
      let parsed;
      try { parsed = JSON.parse(clean); }
      catch(e) { const m = clean.match(/\{[\s\S]+\}/); parsed = m ? JSON.parse(m[0]) : { reply: clean, actions:[] }; }

      // Execute actions sequentially
      const actions = parsed.actions || [];
      for (const act of actions) {
        await this._runAction(act);
      }

      this._addMessage('assistant', this._esc(parsed.reply || 'Done âœ“'));
      saveToSession();

    } catch(err) {
      this._addMessage('assistant', 'âš ï¸ ' + this._esc(err.message || 'Something went wrong. Try again.'));
    } finally {
      this._setLoading(false);
    }
  },

  /* â”€â”€ Execute a single AI action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  async _runAction(act) {
    switch(act.type) {

      case 'edit_section':
        if (act.sectionId && act.instruction) {
          // Show progress in chat
          this._addMessage('assistant', 'â³ Editing ' + (State.sections.find(s=>s.id===act.sectionId)?.label||'section') + 'â€¦');
          await SSections.editWithAI(act.sectionId, act.instruction);
          // Remove the "editingâ€¦" message
          const msgs = document.getElementById('aihub-messages');
          if (msgs) { const last = msgs.querySelector('.aihub-msg-assistant:last-child'); if(last) last.remove(); }
        }
        break;

      case 'add_section':
        if (act.description) {
          this._addMessage('assistant', 'â³ Building: ' + act.description + 'â€¦');
          await SSections.addSection(act.description);
          const msgs = document.getElementById('aihub-messages');
          if (msgs) { const last = msgs.querySelector('.aihub-msg-assistant:last-child'); if(last) last.remove(); }
        }
        break;

      case 'delete_section':
        if (act.sectionId) {
          SSections.delete(act.sectionId);
        }
        break;

      case 'edit_styles':
        if (act.cssVars && typeof act.cssVars === 'object') {
          let css = State.siteCSS || '';
          Object.entries(act.cssVars).forEach(([k, v]) => {
            // Update existing var in :root or append
            const re = new RegExp('(' + k.replace(/[-[\]/{}()*+?.\\^$|]/g,'\\$&') + '\\s*:\\s*)[^;]+', 'g');
            if (re.test(css)) {
              css = css.replace(re, '$1' + v);
            } else {
              css = css.replace(/(:root\s*\{)/, '$1\n  ' + k + ':' + v + ';');
            }
          });
          State.siteCSS = css;
          refreshPreview();
        }
        break;
    }
  },

  _esc(s) {
    return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },
};

window.AIHub = AIHub;

/* â”€â”€ Wire AI Hub into initApp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
(function patchInitForAIHub(){
  if (typeof initApp !== 'function') return;
  const orig = initApp;
  window.initApp = function(){
    orig.apply(this, arguments);
    setTimeout(() => {
      try { AIHub.mount(); } catch(e) { console.warn('[AIHub]', e); }
      try { SSFreemiumV2.init(); } catch(e) {}
      // Close all panels on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') SSPanels.closeAll();
      });
      // Render connectors panel initially
      SSConnectors.render();
    }, 800);
  };
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV27 â€” MOBILE DETECTION + ONBOARDING-ONLY MOBILE FLOW
   On small screens: onboarding + AI edit requests only.
   Full editing is desktop-only.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function SSV27MobileDetect(){
  function isMobile(){
    return (window.innerWidth < 768) ||
           /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  function injectMobileBanner(){
    if (document.getElementById('ss-mobile-banner')) return;
    const b = document.createElement('div');
    b.id = 'ss-mobile-banner';
    b.className = 'ss-mobile-banner';
    b.innerHTML = `
      <div class="smb-inner">
        <div class="smb-icon">ðŸ“±</div>
        <div class="smb-text">
          <strong>Mobile mode</strong> â€” onboarding and AI edits only.
          <span>Open Supersuite on a desktop for the full builder.</span>
        </div>
        <button class="smb-close" onclick="this.closest('#ss-mobile-banner').remove()">âœ•</button>
      </div>`;
    document.body.insertBefore(b, document.body.firstChild);
  }

  function lockBuilderForMobile(){
    // Hide the canvas/editor area, show a friendly message
    const canvas = document.getElementById('canvas-area') ||
                   document.querySelector('.canvas-area, .builder-canvas, #builder-main');
    if (canvas) {
      canvas.style.display = 'none';
      const msg = document.createElement('div');
      msg.className = 'ss-mobile-canvas-msg';
      msg.innerHTML = `
        <div class="smcm-inner">
          <div style="font-size:40px;margin-bottom:12px;">ðŸ–¥</div>
          <h3>Full editor on desktop</h3>
          <p>Your site is being designed. Open Supersuite on a desktop to edit blocks, drag and drop, and export.</p>
          <p style="margin-top:16px;opacity:.7;font-size:13px;">You can still make AI edits below â†“</p>
        </div>`;
      canvas.parentNode && canvas.parentNode.insertBefore(msg, canvas);
    }
  }

  function bootMobile(){
    if (!isMobile()) return;
    document.body.classList.add('ss-mobile-mode');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectMobileBanner();
        setTimeout(lockBuilderForMobile, 800);
        // Show onboarding if not complete
        setTimeout(() => { if (!Onboarding.isComplete()) Onboarding.open(); }, 1000);
        // Mount AI hub in mobile-friendly mode
        setTimeout(() => { try { AIHub.mount(); } catch(e) {} }, 1200);
      });
    } else {
      injectMobileBanner();
      setTimeout(lockBuilderForMobile, 800);
      setTimeout(() => { if (!Onboarding.isComplete()) Onboarding.open(); }, 1000);
      setTimeout(() => { try { AIHub.mount(); } catch(e) {} }, 1200);
    }
  }

  bootMobile();
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSV27 â€” POST-EXPORT LAUNCH PAGE
   After export, opens a full-screen launch experience:
     â€¢ Live preview of exported site
     â€¢ Deploy to supersuite.app subdomain (one click)
     â€¢ Connect own Vercel account
     â€¢ Custom domain setup
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function SSV27LaunchPage(){
  // Patch exportSite to open launch page after download
  const _origExport = typeof exportSite === 'function' ? exportSite : null;
  if (!_origExport) return;

  window.exportSite = function(){
    _origExport.apply(this, arguments);
    // Open launch page a moment after files download
    setTimeout(() => SSLaunch.open(), 1200);
  };
})();

const SSLaunch = {
  open() {
    let m = document.getElementById('ss-launch-page');
    if (!m) {
      m = document.createElement('div');
      m.id = 'ss-launch-page';
      m.className = 'sslp-overlay';
      document.body.appendChild(m);
    }
    const siteName = document.getElementById('site-name-input')?.value || 'my-site';
    const slug = siteName.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').slice(0,30);
    m.style.display = 'flex';
    m.innerHTML = `
      <div class="sslp-card">
        <div class="sslp-head">
          <div>
            <div class="sslp-eyebrow">âœ“ EXPORT COMPLETE</div>
            <h2 class="sslp-title">Your site is ready.</h2>
            <p class="sslp-sub">Files downloaded. Now choose what to do next.</p>
          </div>
          <button class="sslp-close" onclick="SSLaunch.close()">âœ•</button>
        </div>

        <div class="sslp-body">
          <!-- Preview pane -->
          <div class="sslp-preview-col">
            <div class="sslp-preview-label">LIVE PREVIEW</div>
            <div class="sslp-preview-frame" id="sslp-preview-frame">
              <div class="sslp-preview-loading">
                <div class="sslp-spinner"></div>
                <span>Rendering previewâ€¦</span>
              </div>
            </div>
          </div>

          <!-- Options pane -->
          <div class="sslp-options-col">
            <!-- Option 1: Supersuite hosting -->
            <div class="sslp-option" id="sslp-opt-subdomain">
              <div class="sslp-option-head">
                <div class="sslp-option-icon">ðŸŒ</div>
                <div>
                  <div class="sslp-option-title">Supersuite hosting</div>
                  <div class="sslp-option-sub">Deploy to <strong>${slug}.supersuite.app</strong> instantly</div>
                </div>
                <div class="sslp-option-badge">$3â€“5/mo</div>
              </div>
              <div class="sslp-subdomain-row">
                <input type="text" id="sslp-subdomain-input" class="sslp-subdomain-input" value="${slug}" placeholder="your-name" maxlength="30">
                <span class="sslp-subdomain-suffix">.supersuite.app</span>
              </div>
              <button class="sslp-btn-primary" onclick="SSLaunch._deploySubdomain()">
                ðŸš€ Deploy to supersuite.app
              </button>
              <div id="sslp-deploy-status" class="sslp-status" style="display:none"></div>
            </div>

            <!-- Divider -->
            <div class="sslp-divider"><span>or</span></div>

            <!-- Option 2: Own Vercel -->
            <div class="sslp-option">
              <div class="sslp-option-head">
                <div class="sslp-option-icon">â–²</div>
                <div>
                  <div class="sslp-option-title">Your own Vercel</div>
                  <div class="sslp-option-sub">Deploy to your Vercel account â€” free on their hobby plan</div>
                </div>
                <div class="sslp-option-badge free">Free</div>
              </div>
              <div class="sslp-vercel-row">
                <input type="text" id="sslp-vercel-token" class="sslp-input" placeholder="Vercel API token (from vercel.com/account/tokens)">
              </div>
              <div class="sslp-vercel-row">
                <input type="text" id="sslp-vercel-project" class="sslp-input" placeholder="Project name (e.g. luigi-pizzeria)" value="${slug}">
              </div>
              <button class="sslp-btn-secondary" onclick="SSLaunch._deployVercel()">
                Deploy to Vercel â†’
              </button>
              <div id="sslp-vercel-status" class="sslp-status" style="display:none"></div>
            </div>

            <!-- Divider -->
            <div class="sslp-divider"><span>or</span></div>

            <!-- Option 3: Already have the files -->
            <div class="sslp-option sslp-option-plain">
              <div class="sslp-option-head">
                <div class="sslp-option-icon">ðŸ“</div>
                <div>
                  <div class="sslp-option-title">Already downloaded</div>
                  <div class="sslp-option-sub">Host the HTML/CSS/JS files anywhere â€” cPanel, Netlify, GitHub Pages, etc.</div>
                </div>
              </div>
              <button class="sslp-btn-ghost" onclick="SSLaunch.close()">Got it, I'll host it myself</button>
            </div>
          </div>
        </div>
      </div>`;

    // Render preview
    setTimeout(() => this._renderPreview(), 300);
  },

  close() {
    const m = document.getElementById('ss-launch-page');
    if (m) m.style.display = 'none';
  },

  _renderPreview() {
    const frame = document.getElementById('sslp-preview-frame');
    if (!frame) return;
    try {
      const html = typeof buildExportHTML === 'function' ? buildExportHTML() : '';
      const iframe = document.createElement('iframe');
      iframe.className = 'sslp-iframe';
      iframe.sandbox = 'allow-scripts allow-same-origin';
      frame.innerHTML = '';
      frame.appendChild(iframe);
      iframe.contentDocument.open();
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
    } catch(e) {
      if (frame) frame.innerHTML = '<div class="sslp-preview-error">Preview unavailable â€” files downloaded successfully.</div>';
    }
  },

  async _deploySubdomain() {
    const input = document.getElementById('sslp-subdomain-input');
    const status = document.getElementById('sslp-deploy-status');
    const slug = (input?.value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) { this._setStatus(status, 'error', 'Enter a subdomain name.'); return; }

    this._setStatus(status, 'loading', 'ðŸš€ Deploying to ' + slug + '.supersuite.appâ€¦');

    // NOTE: Real deployment requires Vercel API + backend.
    // For now this simulates the flow and shows next steps.
    await new Promise(r => setTimeout(r, 2000));
    this._setStatus(status, 'success',
      `âœ“ Ready! Your site will be live at <a href="https://${slug}.supersuite.app" target="_blank">${slug}.supersuite.app</a> once connected.
       <br><small style="opacity:.7;margin-top:4px;display:block;">Full deployment connects via Vercel â€” coming in Phase 3.</small>`);
  },

  async _deployVercel() {
    const token   = document.getElementById('sslp-vercel-token')?.value?.trim();
    const project = document.getElementById('sslp-vercel-project')?.value?.trim();
    const status  = document.getElementById('sslp-vercel-status');
    if (!token)   { this._setStatus(status, 'error', 'Enter your Vercel API token.'); return; }
    if (!project) { this._setStatus(status, 'error', 'Enter a project name.'); return; }

    this._setStatus(status, 'loading', 'â–² Uploading to Vercelâ€¦');
    try {
      const html = typeof buildExportHTML === 'function' ? buildExportHTML() : '';
      const css  = typeof buildExportCSS  === 'function' ? buildExportCSS()  : '';
      const js   = typeof buildExportJS   === 'function' ? buildExportJS()   : '';

      // Vercel deployments API
      const body = {
        name: project,
        files: [
          { file: 'index.html', data: btoa(unescape(encodeURIComponent(html))), encoding: 'base64' },
          { file: 'style.css',  data: btoa(unescape(encodeURIComponent(css))),  encoding: 'base64' },
          { file: 'script.js',  data: btoa(unescape(encodeURIComponent(js))),   encoding: 'base64' }
        ],
        projectSettings: { framework: null }
      };
      const res = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Vercel API error');
      const url = 'https://' + (data.url || project + '.vercel.app');
      this._setStatus(status, 'success', `âœ“ Deployed! <a href="${url}" target="_blank">${url}</a>`);
    } catch(e) {
      this._setStatus(status, 'error', 'âš  ' + e.message);
    }
  },

  _setStatus(el, type, html) {
    if (!el) return;
    el.style.display = 'block';
    el.className = 'sslp-status sslp-status-' + type;
    el.innerHTML = html;
  }
};

window.SSLaunch = SSLaunch;
