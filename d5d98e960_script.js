/* ═══════════════════════════════════════════════════════════════════
   SUPERSUITE — WEBSITE BUILDER ENGINE SSV26.1
   Landing · Auth · Builder · Blocks · Export · Collab · Projects · Dashboard
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────────
   STATE STORE
────────────────────────────────────────────────────────────────── */
const State = {
  authenticated: false,
  userTier: 'free',
  currentTemplate: 'glass',
  currentDevice: 'desktop',
  zoomLevel: 100,
  blocks: [],
  selectedBlockId: null,
  globalStyles: {
    '--primary':      '#ff6b35',
    '--secondary':    '#1a1a2e',
    '--accent':       '#ffd700',
    '--bg':           '#ffffff',
    '--text':         '#1a1a2e',
    '--font-heading': "'Syne', sans-serif",
    '--font-body':    "'DM Sans', sans-serif",
    '--font-base':    '16px',
    '--line-height':  '1.6',
    '--btn-radius':   '8px',
    '--section-pad':  '60px',
    '--container':    '1200px',
    '--radius':       '12px',
    '--shadow':       '0 8px 24px rgba(0,0,0,0.15)',
  },
  customCSS: '',
  uploadedImages: {},
  blockIdCounter: 1,
  glassMode: 'pure',      // 'pure' | 'soft'
  collabCode: null,
  versions: [],           // array of version snapshots
  projects: [],           // array of saved project objects
  currentProjectId: null,
  builderPoints: 0,
};

/* ──────────────────────────────────────────────────────────────────
   PASSWORD DATABASE
────────────────────────────────────────────────────────────────── */
const SS_PASSWORD_DB = {
  free:   { SS26:     { note: 'Free trial access' } },
  basic:  { SSBASIC:  { note: 'Basic plan' } },
  pro:    { SSPRO:    { note: 'Pro plan' }, ROASRYE: { note: 'Dev access' } },
  agency: { SSAGENCY: { note: 'Agency plan' } },
};

/* ──────────────────────────────────────────────────────────────────
   AUTH
────────────────────────────────────────────────────────────────── */
const Auth = {
  version: 'SSV26.1',
  tiers: {
    free:   { label: 'Free Trial', sitesPerWeek: 1,   sitesPerDay: 0,   sessionMinutes: 30,   weekly: true  },
    basic:  { label: 'Basic',      sitesPerWeek: 0,   sitesPerDay: 1,   sessionMinutes: 60,   weekly: false },
    pro:    { label: 'Pro',        sitesPerWeek: 0,   sitesPerDay: 3,   sessionMinutes: 180,  weekly: false },
    agency: { label: 'Agency',     sitesPerWeek: 0,   sitesPerDay: 999, sessionMinutes: 9999, weekly: false },
  },
  verify(code) {
    const norm = code.trim().toUpperCase();
    if (!norm) return { ok: false, error: 'Please enter an access code.' };
    for (const [tierKey, entries] of Object.entries(SS_PASSWORD_DB)) {
      for (const [dbCode, meta] of Object.entries(entries)) {
        if (dbCode.toUpperCase() === norm) {
          const cfg = this.tiers[tierKey] || this.tiers.free;
          return { ok: true, tier: tierKey, label: cfg.label, note: meta.note || '' };
        }
      }
    }
    return { ok: false, error: 'Invalid access code. Check your invite email or see plans below.' };
  },
  getTierConfig(tier) { return this.tiers[tier] || this.tiers.free; },
};

/* ──────────────────────────────────────────────────────────────────
   USAGE TRACKER
────────────────────────────────────────────────────────────────── */
const UsageTracker = {
  _key: 'ss_usage_v261',
  _interval: null,
  init(tier) {
    const now = new Date();
    let r = this._load();
    if (r.date !== now.toDateString()) {
      r.date = now.toDateString(); r.sessionSeconds = 0; r.exportsToday = 0;
    }
    const wk = this._weekKey(now);
    if (r.week !== wk) { r.week = wk; r.exportsThisWeek = 0; }
    r.tier = tier;
    this._save(r);
    this._startTimer(r);
  },
  _load() {
    try { const r = localStorage.getItem(this._key); if (r) return JSON.parse(r); } catch(e) {}
    const now = new Date();
    return { date: now.toDateString(), week: this._weekKey(now), sessionSeconds: 0, exportsToday: 0, exportsThisWeek: 0, tier: 'free' };
  },
  _save(r) { try { localStorage.setItem(this._key, JSON.stringify(r)); } catch(e) {} },
  _weekKey(d) {
    const date = new Date(+d); date.setHours(0,0,0,0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const ys = new Date(date.getFullYear(),0,1);
    return date.getFullYear()+'-W'+Math.ceil((((date-ys)/86400000)+1)/7);
  },
  _startTimer(record) {
    if (this._interval) clearInterval(this._interval);
    let sec = record.sessionSeconds;
    const cfg = Auth.getTierConfig(record.tier);
    const limit = cfg.sessionMinutes * 60;
    this._interval = setInterval(() => {
      sec++;
      State.builderPoints = Math.floor(sec / 30);
      if (sec % 10 === 0) { const r = this._load(); r.sessionSeconds = sec; this._save(r); }
      this._updateUI(sec, limit);
      if (record.tier !== 'agency' && sec >= limit) {
        clearInterval(this._interval);
        this._showLimit('session');
      }
    }, 1000);
  },
  _updateUI(sec, limit) {
    const el = document.getElementById('nav-timer');
    if (!el) return;
    const mm = String(Math.floor(sec/60)).padStart(2,'0');
    const ss = String(sec%60).padStart(2,'0');
    el.textContent = mm+':'+ss;
    const rem = limit - sec;
    el.classList.toggle('warning', rem < 300 && rem > 0);
    el.classList.toggle('danger',  rem < 60  && rem > 0);
  },
  canExport() {
    const r = this._load();
    const cfg = Auth.getTierConfig(r.tier);
    if (r.tier === 'agency') return true;
    if (cfg.weekly) return r.exportsThisWeek < cfg.sitesPerWeek;
    return r.exportsToday < cfg.sitesPerDay;
  },
  recordExport() { const r = this._load(); r.exportsToday++; r.exportsThisWeek++; this._save(r); },
  showExportLimitModal() { this._showLimit('export'); },
  _showLimit(type) {
    const r = this._load();
    const cfg = Auth.getTierConfig(r.tier);
    const titleEl = document.getElementById('limit-title');
    const subEl   = document.getElementById('limit-sub');
    if (titleEl) titleEl.textContent = type === 'session' ? `Session limit reached (${cfg.sessionMinutes} min)` : 'Export limit reached';
    if (subEl)   subEl.textContent   = type === 'session'
      ? `Your ${cfg.label} plan allows ${cfg.sessionMinutes} minutes/day. Upgrade to continue.`
      : `Your ${cfg.label} plan allows ${cfg.weekly ? cfg.sitesPerWeek+' site/week' : cfg.sitesPerDay+' site(s)/day'}. Upgrade for more.`;
    const m = document.getElementById('limit-modal');
    if (m) m.style.display = 'flex';
  },
};

function closeLimitModal() { const m = document.getElementById('limit-modal'); if(m) m.style.display='none'; }

/* ──────────────────────────────────────────────────────────────────
   BLOCK DEFINITIONS
────────────────────────────────────────────────────────────────── */
const BlockDefs = {
  nav: {
    label: 'Navigation', icon: '🧭',
    defaultData: { logo:'Supersuite', links:['Home','Features','Pricing','Contact'], bgColor:'#ffffff', textColor:'#1a1a2e', sticky:true, ctaText:'Get Started', ctaLink:'#cta', ctaBgColor:'#ff6b35' }
  },
  hero: {
    label: 'Hero Section', icon: '⚡',
    defaultData: { heading:"Build Something Great", subheading:"The visual website builder that puts professional design in your hands — no code required.", bgType:'gradient', bgColor:'#1a1a2e', bgColor2:'#16213e', bgImage:'', textColor:'#ffffff', btnText:'Get Started Free', btnLink:'#', btnColor:'#ff6b35', btnTextColor:'#ffffff', btn2Text:'See How It Works', btn2Link:'#', showBadge:true, badgeText:'🚀 Now Live', alignment:'center', minHeight:'85vh' }
  },
  leadform: {
    label: 'Lead Form', icon: '📋',
    defaultData: { heading:'Get Early Access', subheading:'Join 5,000+ builders already on the waitlist.', fields:[{type:'text',placeholder:'Your full name',name:'name'},{type:'email',placeholder:'Work email address',name:'email'},{type:'text',placeholder:'Company name (optional)',name:'company'}], btnText:'Claim My Spot →', btnColor:'#ff6b35', bgColor:'#f8f8ff', textColor:'#1a1a2e', accentColor:'#ff6b35', privacyText:'🔒 No spam. Unsubscribe anytime.' }
  },
  testimonials: {
    label: 'Testimonials', icon: '💬',
    defaultData: { heading:'Loved by Builders Worldwide', subheading:'Real feedback from real users.', bgColor:'#ffffff', textColor:'#1a1a2e', accentColor:'#ff6b35', cards:[{name:'Sarah Chen',role:'Founder, Launchpad Co.',avatar:'',rating:5,quote:'Supersuite cut our launch time from weeks to hours. The visual editor is incredibly intuitive.',bgColor:'#ffffff'},{name:'Marcus Rivera',role:'Marketing Director',avatar:'',rating:5,quote:'We replaced our expensive agency with Supersuite. The revenue blocks alone increased our conversion rate by 34%.',bgColor:'#ffffff'},{name:'Emma Thompson',role:'Solo Entrepreneur',avatar:'',rating:5,quote:'As a non-technical founder, I had my entire website live in 2 hours. The templates are gorgeous out of the box.',bgColor:'#ffffff'}] }
  },
  pricing: {
    label: 'Pricing / Services', icon: '💎',
    defaultData: { heading:'Simple, Transparent Pricing', subheading:'Choose the plan that fits your ambition.', bgColor:'#0f0f13', textColor:'#ffffff', accentColor:'#ff6b35', plans:[{name:'Starter',price:'$0',period:'/month',description:'Perfect for testing the waters.',features:['3 pages','10 blocks','Custom domain','SSL included','Basic analytics'],ctaText:'Start Free',ctaLink:'#',featured:false,bgColor:'rgba(255,255,255,0.04)',borderColor:'rgba(255,255,255,0.1)'},{name:'Pro',price:'$29',period:'/month',description:'For serious builders.',features:['Unlimited pages','All blocks','Custom domain','SSL included','Advanced analytics','Priority support','Export code'],ctaText:'Start Pro Trial',ctaLink:'#',featured:true,bgColor:'#ff6b35',borderColor:'#ff6b35'},{name:'Agency',price:'$99',period:'/month',description:'Built for teams & agencies.',features:['Everything in Pro','10 team seats','White-label','Client handoff','API access','SLA guarantee'],ctaText:'Contact Sales',ctaLink:'#',featured:false,bgColor:'rgba(255,255,255,0.04)',borderColor:'rgba(255,255,255,0.1)'}] }
  },
  cta: {
    label: 'CTA Section', icon: '🎯',
    defaultData: { heading:"Ready to Build Something Amazing?", subheading:'Join thousands of businesses already growing with Supersuite.', bgType:'gradient', bgColor:'#ff6b35', bgColor2:'#ff3d00', bgImage:'', textColor:'#ffffff', btnText:"Start Building — It's Free", btnLink:'#', btnColor:'#ffffff', btnTextColor:'#ff6b35', btn2Text:'Book a Demo', btn2Link:'#', showBadge:false, badgeText:'✓ No credit card required' }
  },
  features: {
    label: 'Features', icon: '✨',
    defaultData: { heading:'Everything You Need to Launch', subheading:'Powerful features built for modern businesses.', bgColor:'#ffffff', textColor:'#1a1a2e', accentColor:'#ff6b35', columns:3, items:[{icon:'⚡',title:'Lightning Fast',description:'Pages load in under 1 second. Optimized for Core Web Vitals and maximum performance.'},{icon:'🎨',title:'Beautiful Design',description:'Professionally designed templates created by world-class designers.'},{icon:'📱',title:'Mobile First',description:'Every page looks perfect on any device — phone, tablet, or desktop.'},{icon:'🔌',title:'Integrations',description:'Connect with Stripe, Mailchimp, Zapier, and 100+ other tools.'},{icon:'📊',title:'Analytics',description:"Built-in analytics. See what's working and double down on what converts."},{icon:'🔒',title:'Enterprise Security',description:'SSL, DDoS protection, and automated backups keep your site safe.'}] }
  },
  gallery: {
    label: 'Gallery', icon: '🖼️',
    defaultData: { heading:'Our Work', subheading:'A selection of sites built with Supersuite.', bgColor:'#0f0f13', textColor:'#ffffff', columns:3, images:[{src:'',alt:'Project 1',caption:'E-commerce Store'},{src:'',alt:'Project 2',caption:'SaaS Landing Page'},{src:'',alt:'Project 3',caption:'Portfolio Site'},{src:'',alt:'Project 4',caption:'Agency Website'},{src:'',alt:'Project 5',caption:'Startup Launch'},{src:'',alt:'Project 6',caption:'Blog Platform'}] }
  },
  widget: {
    label: 'Widget / Embed', icon: '🔌',
    defaultData: { heading:'', embedCode:'', bgColor:'#ffffff', padding:'40px' }
  },
  footer: {
    label: 'Footer', icon: '📌',
    defaultData: { logo:'Supersuite', tagline:'Build. Launch. Grow.', bgColor:'#0a0a0f', textColor:'#9090b0', accentColor:'#ff6b35', columns:[{title:'Product',links:[{label:'Features',url:'#'},{label:'Pricing',url:'#'},{label:'Templates',url:'#'},{label:'Changelog',url:'#'}]},{title:'Company',links:[{label:'About',url:'#'},{label:'Blog',url:'#'},{label:'Careers',url:'#'},{label:'Press',url:'#'}]},{title:'Support',links:[{label:'Docs',url:'#'},{label:'Help Center',url:'#'},{label:'Contact',url:'#'},{label:'Status',url:'#'}]}], copyright:`© ${new Date().getFullYear()} Supersuite, Inc. All rights reserved.`, socialLinks:[{platform:'Twitter',icon:'𝕏',url:'#'},{platform:'LinkedIn',icon:'in',url:'#'},{platform:'GitHub',icon:'⬡',url:'#'}] }
  },
};

/* ──────────────────────────────────────────────────────────────────
   TEMPLATE CONFIGS
────────────────────────────────────────────────────────────────── */
const Templates = {
  glass: {
    name: 'Liquid Glass',
    overrides: { '--primary':'#ff6b35','--secondary':'#1a1a2e','--accent':'#a78bfa','--bg':'#f0f0f8','--text':'#1a1a2e','--font-heading':"'Syne', sans-serif",'--font-body':"'DM Sans', sans-serif",'--radius':'16px','--btn-radius':'50px','--shadow':'0 8px 32px rgba(0,0,0,0.12)' },
    extraCSS: `body{background:linear-gradient(135deg,#e8e8f8 0%,#f0e8f0 50%,#e8f0f8 100%)}.ss-block{backdrop-filter:blur(20px)}.ss-hero{background:linear-gradient(135deg,rgba(26,26,46,0.9) 0%,rgba(22,33,62,0.9) 100%)!important}.ss-card{background:rgba(255,255,255,0.5)!important;border:1px solid rgba(255,255,255,0.6)!important;backdrop-filter:blur(16px)!important;box-shadow:0 8px 32px rgba(31,38,135,0.15)!important}`
  },
  bold: {
    name: 'Classy Bold',
    overrides: { '--primary':'#1a1a2e','--secondary':'#ff6b35','--accent':'#ff6b35','--bg':'#fafaf8','--text':'#1a1a2e','--font-heading':"'Syne', sans-serif",'--font-body':"'DM Sans', sans-serif",'--radius':'4px','--btn-radius':'4px','--shadow':'4px 4px 0px rgba(26,26,46,0.15)' },
    extraCSS: `body{background:#fafaf8}.ss-hero{background:#1a1a2e!important}.ss-btn-primary{border:2px solid var(--primary)!important;box-shadow:4px 4px 0 var(--primary)!important}.ss-btn-primary:hover{transform:translate(-2px,-2px)!important;box-shadow:6px 6px 0 var(--primary)!important}.ss-card{border:2px solid #1a1a2e!important;box-shadow:4px 4px 0 #1a1a2e!important}.ss-section-title::after{content:'';display:block;width:60px;height:4px;background:var(--accent);margin-top:8px}`
  },
  custom: { name: 'Custom CSS', overrides: {}, extraCSS: '' }
};

/* ──────────────────────────────────────────────────────────────────
   BLOCK RENDERERS — HTML generators
────────────────────────────────────────────────────────────────── */
const BlockRenderers = {

  nav(data) {
    const links = (data.links||[]).map(l=>`<a href="#" style="color:${data.textColor};text-decoration:none;font-size:15px;font-weight:500;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">${l}</a>`).join('');
    return `
<nav class="ss-block ss-nav" style="background:${data.bgColor};color:${data.textColor};position:${data.sticky?'sticky':'relative'};top:0;z-index:100;border-bottom:1px solid rgba(0,0,0,0.06);padding:0 var(--section-pad);">
  <div class="ss-nav-inner" style="max-width:var(--container);margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:72px;gap:32px;">
    <div class="ss-nav-logo" style="font-family:var(--font-heading);font-weight:800;font-size:24px;color:${data.textColor};letter-spacing:-0.5px;">${data.logo}</div>
    <div class="ss-nav-links" style="display:flex;align-items:center;gap:32px;">${links}</div>
    <a href="${data.ctaLink}" style="background:${data.ctaBgColor};color:white;padding:10px 22px;border-radius:var(--btn-radius);font-size:14px;font-weight:600;text-decoration:none;transition:all 0.2s;display:inline-flex;align-items:center;gap:6px;" onmouseover="this.style.opacity='0.9';this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">${data.ctaText} →</a>
  </div>
</nav>`;
  },

  hero(data) {
    const bg = data.bgType==='image'&&data.bgImage ? `url('${data.bgImage}') center/cover no-repeat` : `linear-gradient(135deg,${data.bgColor} 0%,${data.bgColor2} 100%)`;
    return `
<section class="ss-block ss-hero" style="background:${bg};color:${data.textColor};padding:120px var(--section-pad);min-height:${data.minHeight};display:flex;align-items:center;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-100px;right:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(255,107,53,0.15),transparent 70%);border-radius:50%;pointer-events:none;"></div>
  <div style="position:absolute;bottom:-150px;left:-50px;width:400px;height:400px;background:radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%);border-radius:50%;pointer-events:none;"></div>
  <div style="max-width:var(--container);margin:0 auto;width:100%;text-align:${data.alignment};position:relative;z-index:1;">
    ${data.showBadge?`<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:50px;padding:6px 16px;font-size:13px;margin-bottom:24px;backdrop-filter:blur(8px);">${data.badgeText}</div>`:''}
    <h1 style="font-family:var(--font-heading);font-size:clamp(40px,6vw,80px);font-weight:800;line-height:1.1;margin-bottom:20px;letter-spacing:-2px;">${data.heading}</h1>
    <p style="font-size:clamp(16px,2vw,22px);opacity:0.8;max-width:600px;margin:0 ${data.alignment==='center'?'auto':'0'} 40px;line-height:1.6;">${data.subheading}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:${data.alignment==='center'?'center':'flex-start'};">
      <a href="${data.btnLink}" class="ss-btn-primary" style="background:${data.btnColor};color:${data.btnTextColor};padding:16px 36px;border-radius:var(--btn-radius);font-size:16px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:all 0.3s;box-shadow:0 8px 32px rgba(255,107,53,0.4);" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">${data.btnText} →</a>
      <a href="${data.btn2Link}" style="background:rgba(255,255,255,0.1);color:${data.textColor};padding:16px 36px;border-radius:var(--btn-radius);font-size:16px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.2);display:inline-flex;align-items:center;gap:8px;transition:all 0.3s;backdrop-filter:blur(8px);" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">${data.btn2Text}</a>
    </div>
  </div>
</section>`;
  },

  leadform(data) {
    const fields = (data.fields||[]).map(f=>`<input type="${f.type}" name="${f.name}" placeholder="${f.placeholder}" required style="width:100%;padding:14px 16px;background:white;border:1.5px solid #e5e7eb;border-radius:var(--radius);font-size:15px;font-family:var(--font-body);outline:none;transition:border-color 0.2s;color:${data.textColor};" onfocus="this.style.borderColor='${data.accentColor}'" onblur="this.style.borderColor='#e5e7eb'"/>`).join('');
    return `
<section class="ss-block ss-leadform" style="background:${data.bgColor};color:${data.textColor};padding:var(--section-pad) var(--section-pad);">
  <div style="max-width:560px;margin:0 auto;text-align:center;">
    <h2 class="ss-section-title" style="font-family:var(--font-heading);font-size:clamp(28px,4vw,44px);font-weight:800;margin-bottom:12px;letter-spacing:-1px;color:${data.textColor};">${data.heading}</h2>
    <p style="font-size:17px;opacity:0.7;margin-bottom:36px;">${data.subheading}</p>
    <form onsubmit="event.preventDefault();this.innerHTML='<div style=&quot;text-align:center;padding:24px;&quot;><span style=&quot;font-size:40px;&quot;>🎉</span><h3 style=&quot;margin-top:12px;font-family:var(--font-heading);&quot;>You\'re on the list!</h3><p style=&quot;opacity:0.7;margin-top:8px;&quot;>We\'ll be in touch soon.</p></div>';" style="display:flex;flex-direction:column;gap:12px;text-align:left;">
      ${fields}
      <button type="submit" style="background:${data.btnColor};color:white;padding:16px;border-radius:var(--btn-radius);font-size:16px;font-weight:700;border:none;cursor:pointer;transition:all 0.3s;font-family:var(--font-body);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">${data.btnText}</button>
      <p style="text-align:center;font-size:13px;opacity:0.5;margin-top:4px;">${data.privacyText}</p>
    </form>
  </div>
</section>`;
  },

  testimonials(data) {
    const cards = (data.cards||[]).map(c=>`
      <div class="ss-card ss-testimonial-card" style="background:${c.bgColor};border:1px solid rgba(0,0,0,0.06);border-radius:var(--radius);padding:28px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:16px;transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
        <div style="color:#ffd700;font-size:16px;">${'★'.repeat(c.rating)}</div>
        <p style="font-size:15px;line-height:1.7;color:${data.textColor};opacity:0.85;font-style:italic;">"${c.quote}"</p>
        <div style="display:flex;align-items:center;gap:12px;margin-top:auto;padding-top:12px;border-top:1px solid rgba(0,0,0,0.05);">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${data.accentColor},${data.accentColor}88);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:white;flex-shrink:0;">${c.name.charAt(0)}</div>
          <div><div style="font-weight:700;font-size:14px;color:${data.textColor};">${c.name}</div><div style="font-size:12px;color:${data.textColor};opacity:0.5;">${c.role}</div></div>
        </div>
      </div>`).join('');
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
    const plans = (data.plans||[]).map(p=>`
      <div class="ss-card ss-pricing-card" style="background:${p.bgColor};border:1px solid ${p.borderColor};border-radius:var(--radius);padding:32px;display:flex;flex-direction:column;gap:20px;position:relative;transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
        ${p.featured?`<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:white;color:${data.bgColor};padding:4px 16px;border-radius:50px;font-size:12px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;">MOST POPULAR ⭐</div>`:''}
        <div>
          <div style="font-size:14px;font-weight:600;color:${p.featured?'rgba(255,255,255,0.8)':data.textColor};opacity:0.7;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${p.name}</div>
          <div style="display:flex;align-items:baseline;gap:4px;">
            <span style="font-family:var(--font-heading);font-size:52px;font-weight:800;color:${p.featured?'white':data.textColor};line-height:1;">${p.price}</span>
            <span style="font-size:14px;color:${p.featured?'rgba(255,255,255,0.7)':data.textColor};opacity:0.6;">${p.period}</span>
          </div>
          <p style="font-size:14px;color:${p.featured?'rgba(255,255,255,0.7)':data.textColor};opacity:0.6;margin-top:8px;">${p.description}</p>
        </div>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;flex:1;">
          ${(p.features||[]).map(f=>`<li style="display:flex;align-items:center;gap:10px;font-size:14px;color:${p.featured?'rgba(255,255,255,0.9)':data.textColor};"><span style="color:${p.featured?'white':data.accentColor};font-size:16px;flex-shrink:0;">✓</span>${f}</li>`).join('')}
        </ul>
        <a href="${p.ctaLink}" style="background:${p.featured?'white':data.accentColor};color:${p.featured?data.accentColor:'white'};padding:14px 24px;border-radius:var(--btn-radius);text-align:center;font-size:15px;font-weight:700;text-decoration:none;transition:all 0.3s;display:block;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${p.ctaText}</a>
      </div>`).join('');
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
    const bg = data.bgType==='image'&&data.bgImage ? `url('${data.bgImage}') center/cover no-repeat` : `linear-gradient(135deg,${data.bgColor} 0%,${data.bgColor2} 100%)`;
    return `
<section class="ss-block ss-cta" style="background:${bg};color:${data.textColor};padding:100px var(--section-pad);text-align:center;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background:rgba(0,0,0,0.1);"></div>
  <div style="max-width:700px;margin:0 auto;position:relative;z-index:1;">
    ${data.showBadge?`<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:50px;padding:6px 16px;font-size:13px;margin-bottom:24px;backdrop-filter:blur(8px);">${data.badgeText}</div>`:''}
    <h2 style="font-family:var(--font-heading);font-size:clamp(32px,5vw,60px);font-weight:800;line-height:1.1;margin-bottom:16px;letter-spacing:-1.5px;">${data.heading}</h2>
    <p style="font-size:clamp(16px,2vw,20px);opacity:0.85;margin-bottom:40px;line-height:1.6;">${data.subheading}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
      <a href="${data.btnLink}" style="background:${data.btnColor};color:${data.btnTextColor};padding:16px 40px;border-radius:var(--btn-radius);font-size:16px;font-weight:700;text-decoration:none;transition:all 0.3s;display:inline-flex;align-items:center;gap:8px;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">${data.btnText}</a>
      <a href="${data.btn2Link}" style="background:rgba(255,255,255,0.15);color:${data.textColor};padding:16px 36px;border-radius:var(--btn-radius);font-size:16px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.3);display:inline-flex;align-items:center;gap:8px;transition:all 0.3s;backdrop-filter:blur(8px);" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">${data.btn2Text}</a>
    </div>
  </div>
</section>`;
  },

  features(data) {
    const items = (data.items||[]).map(it=>`
      <div class="ss-card ss-feature-item" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius);padding:28px;transition:all 0.3s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='${data.accentColor}33'" onmouseout="this.style.transform='translateY(0)';this.style.borderColor='rgba(255,255,255,0.08)'">
        <div style="font-size:32px;margin-bottom:16px;">${it.icon}</div>
        <h3 style="font-family:var(--font-heading);font-size:18px;font-weight:700;margin-bottom:10px;color:${data.textColor};">${it.title}</h3>
        <p style="font-size:14px;color:${data.textColor};opacity:0.65;line-height:1.7;">${it.description}</p>
      </div>`).join('');
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
    const colors = ['#ff6b35','#8b5cf6','#3b82f6','#22c55e','#f59e0b','#ef4444'];
    const imgs = (data.images||[]).map((img,i)=>{
      const bg = img.src ? `url('${img.src}') center/cover` : `linear-gradient(135deg,${colors[i%colors.length]}33,${colors[(i+1)%colors.length]}33)`;
      return `<div style="position:relative;overflow:hidden;border-radius:var(--radius);aspect-ratio:4/3;background:${bg};cursor:pointer;" onmouseover="this.querySelector('.go').style.opacity='1'" onmouseout="this.querySelector('.go').style.opacity='0'">
        ${!img.src?`<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;"><span style="font-size:32px;">${['🖼️','💻','✨','🚀','📱','🎨'][i%6]}</span><span style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:500;">Add Image</span></div>`:''}
        <div class="go" style="position:absolute;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;padding:16px;opacity:0;transition:opacity 0.3s;"><span style="color:white;font-size:14px;font-weight:600;">${img.caption}</span></div>
      </div>`;
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

  widget(data) {
    return `
<section class="ss-block ss-widget" style="background:${data.bgColor};padding:${data.padding} var(--section-pad);">
  <div style="max-width:var(--container);margin:0 auto;">
    ${data.heading?`<h2 style="font-family:var(--font-heading);font-size:28px;font-weight:800;margin-bottom:24px;letter-spacing:-0.5px;">${data.heading}</h2>`:''}
    ${data.embedCode||'<div style="border:2px dashed rgba(255,255,255,0.15);border-radius:12px;padding:40px;text-align:center;color:rgba(255,255,255,0.4);font-size:14px;">📎 Paste your embed code in the block settings</div>'}
  </div>
</section>`;
  },

  footer(data) {
    const cols = (data.columns||[]).map(col=>`
      <div>
        <h4 style="font-family:var(--font-heading);font-size:14px;font-weight:700;color:${data.accentColor};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px;">${col.title}</h4>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;">
          ${(col.links||[]).map(l=>`<li><a href="${l.url}" style="color:${data.textColor};opacity:0.6;font-size:14px;text-decoration:none;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">${l.label}</a></li>`).join('')}
        </ul>
      </div>`).join('');
    const socials = (data.socialLinks||[]).map(s=>`<a href="${s.url}" style="width:36px;height:36px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:${data.textColor};opacity:0.7;text-decoration:none;font-size:14px;font-weight:700;transition:all 0.2s;" onmouseover="this.style.opacity='1';this.style.background='${data.accentColor}'" onmouseout="this.style.opacity='0.7';this.style.background='rgba(255,255,255,0.06)'">${s.icon}</a>`).join('');
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
        <a href="#" style="font-size:13px;color:${data.textColor};opacity:0.4;text-decoration:none;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='0.4'">Privacy</a>
        <a href="#" style="font-size:13px;color:${data.textColor};opacity:0.4;text-decoration:none;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='0.4'">Terms</a>
      </div>
    </div>
  </div>
</footer>`;
  },
};

/* ──────────────────────────────────────────────────────────────────
   PREVIEW ENGINE
────────────────────────────────────────────────────────────────── */
function buildPreviewHTML(forExport) {
  const tpl = Templates[State.currentTemplate];
  const styles = { ...State.globalStyles, ...tpl.overrides };
  const cssVars = Object.entries(styles).map(([k,v])=>`${k}: ${v};`).join('\n    ');

  const blocksHTML = State.blocks.map(block => {
    const renderer = BlockRenderers[block.type];
    if (!renderer) return '';
    const html = renderer(block.data);
    if (forExport) return `<!-- ${block.label} -->\n${html}`;
    return `<div class="ss-block-wrapper" data-block-id="${block.id}" style="position:relative;">
      ${html}
      <div class="ss-block-controls" style="position:absolute;top:8px;right:8px;display:none;z-index:200;gap:4px;flex-wrap:nowrap;">
        <button onclick="window.parent.openBlockSettings('${block.id}')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">✏️ Edit</button>
        <button onclick="window.parent.moveBlock('${block.id}','up')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">↑</button>
        <button onclick="window.parent.moveBlock('${block.id}','down')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">↓</button>
        <button onclick="window.parent.duplicateBlock('${block.id}')" style="background:#1a1a2e;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">⧉</button>
        <button onclick="window.parent.deleteBlock('${block.id}')" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">🗑</button>
      </div>
    </div>`;
  }).join('\n');

  const empty = State.blocks.length===0&&!forExport ? `
    <div style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#f8f8ff;font-family:DM Sans,sans-serif;">
      <div style="font-size:64px;">🏗️</div>
      <h2 style="font-size:24px;font-weight:700;color:#1a1a2e;font-family:Syne,sans-serif;">Your canvas is empty</h2>
      <p style="color:#666;font-size:16px;">Add blocks from the left panel to start building</p>
      <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;justify-content:center;">
        <button onclick="window.parent.addBlock('hero')" style="background:#ff6b35;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">+ Add Hero</button>
        <button onclick="window.parent.addBlock('nav')" style="background:#1a1a2e;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">+ Add Nav</button>
        <button onclick="window.parent.addBlock('features')" style="background:#1a1a2e;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">+ Add Features</button>
      </div>
    </div>` : '';

  const interactScript = !forExport ? `<script>
    document.querySelectorAll('.ss-block-wrapper').forEach(w=>{
      w.addEventListener('mouseenter',()=>{const c=w.querySelector('.ss-block-controls');if(c)c.style.display='flex';});
      w.addEventListener('mouseleave',()=>{const c=w.querySelector('.ss-block-controls');if(c)c.style.display='none';});
    });
  <\/script>` : '';

  const siteName = document.getElementById('site-name-input')?.value || 'My Site';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${siteName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{ ${cssVars} }
    html{scroll-behavior:smooth}
    body{font-family:var(--font-body);color:var(--text);background:var(--bg);font-size:var(--font-base);line-height:var(--line-height);-webkit-font-smoothing:antialiased;}
    .ss-section-title{margin-bottom:12px}
    @media(max-width:768px){
      [style*="grid-template-columns: repeat(3"]{grid-template-columns:repeat(2,1fr)!important}
      [style*="grid-template-columns: repeat(2"]{grid-template-columns:1fr!important}
      [style*="grid-template-columns: 1.5fr"]{grid-template-columns:1fr!important}
      .ss-nav-links{display:none!important}
      [style*="padding:120px"]{padding:64px 24px!important}
    }
    @media(max-width:480px){
      [style*="grid-template-columns"]{grid-template-columns:1fr!important}
    }
    ${tpl.extraCSS||''}
    ${State.customCSS}
  </style>
</head>
<body>
${empty}
${blocksHTML}
${interactScript}
</body>
</html>`;
}

function refreshPreview() {
  const frame = document.getElementById('preview-frame');
  if (!frame) return;
  const html = buildPreviewHTML(false);
  frame.srcdoc = html;
  frame.onload = () => {
    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      const h = Math.max(doc.body.scrollHeight, 600);
      frame.style.height = h + 'px';
    } catch(e) {}
  };
}

/* ──────────────────────────────────────────────────────────────────
   BLOCK MANAGEMENT
────────────────────────────────────────────────────────────────── */
function addBlock(type) {
  const def = BlockDefs[type];
  if (!def) return;
  const id = 'block_' + (State.blockIdCounter++);
  State.blocks.push({ id, type, label: def.label, icon: def.icon, data: JSON.parse(JSON.stringify(def.defaultData)), visible: true });
  refreshPreview(); updateLayers(); switchTab('layers');
  showToast('✅ Block added', def.label + ' added to your page', 'success');
  markProjectDirty();
  return id;
}

function deleteBlock(id) {
  const idx = State.blocks.findIndex(b=>b.id===id);
  if (idx===-1) return;
  const label = State.blocks[idx].label;
  State.blocks.splice(idx,1);
  refreshPreview(); updateLayers();
  showToast('🗑️ Removed', label+' deleted', 'info');
  markProjectDirty();
}

function moveBlock(id, dir) {
  const idx = State.blocks.findIndex(b=>b.id===id);
  if (idx===-1) return;
  const ni = dir==='up' ? idx-1 : idx+1;
  if (ni<0||ni>=State.blocks.length) return;
  [State.blocks[idx], State.blocks[ni]] = [State.blocks[ni], State.blocks[idx]];
  refreshPreview(); updateLayers(); markProjectDirty();
}

function duplicateBlock(id) {
  const orig = State.blocks.find(b=>b.id===id);
  if (!orig) return;
  const copy = JSON.parse(JSON.stringify(orig));
  copy.id = 'block_' + (State.blockIdCounter++);
  const idx = State.blocks.indexOf(orig);
  State.blocks.splice(idx+1, 0, copy);
  refreshPreview(); updateLayers();
  showToast('⧉ Duplicated', orig.label+' duplicated', 'info');
  markProjectDirty();
}

window.addBlock = addBlock;
window.deleteBlock = deleteBlock;
window.moveBlock = moveBlock;
window.duplicateBlock = duplicateBlock;

/* ──────────────────────────────────────────────────────────────────
   PUSH ALL CHANGES — applies global styles to all block data fields
────────────────────────────────────────────────────────────────── */
function pushAllChanges() {
  const gs = State.globalStyles;
  let pushed = 0;
  State.blocks.forEach(block => {
    const d = block.data;
    // Map global tokens → block-level field names
    const colorMap = {
      '--primary':   ['btnColor','ctaBgColor','accentColor'],
      '--secondary': ['bgColor'],
      '--text':      ['textColor'],
    };
    Object.entries(colorMap).forEach(([token, fields]) => {
      const val = gs[token];
      if (!val) return;
      fields.forEach(f => { if (f in d) d[f] = val; });
    });
    // Apply font to all heading-style fields (can't inject CSS vars into inline styles)
    pushed++;
  });
  refreshPreview(); updateLayers();
  showToast('⬇ Pushed', `Global styles applied to ${pushed} block(s)`, 'success');
  markProjectDirty();
}

/* ──────────────────────────────────────────────────────────────────
   LAYERS PANEL
────────────────────────────────────────────────────────────────── */
function updateLayers() {
  const list = document.getElementById('layers-list');
  if (!list) return;
  if (State.blocks.length===0) {
    list.innerHTML = '<p class="empty-layers">No blocks yet. Add blocks from the Blocks tab!</p>';
    return;
  }
  list.innerHTML = State.blocks.map((block,i) => `
    <div class="layer-item ${State.selectedBlockId===block.id?'active':''}" data-id="${block.id}"
         onclick="selectBlock('${block.id}')" draggable="true"
         ondragstart="layerDragStart(event,'${block.id}')"
         ondragover="layerDragOver(event,'${block.id}')"
         ondrop="layerDrop(event,'${block.id}')">
      <span class="layer-drag-handle">⠿</span>
      <span class="layer-icon">${block.icon}</span>
      <span class="layer-label">${block.label}</span>
      <div class="layer-actions">
        <button class="layer-btn" onclick="event.stopPropagation();openBlockSettings('${block.id}')" title="Edit">✏️</button>
        <button class="layer-btn" onclick="event.stopPropagation();moveBlock('${block.id}','up')" title="Up">↑</button>
        <button class="layer-btn" onclick="event.stopPropagation();moveBlock('${block.id}','down')" title="Down">↓</button>
        <button class="layer-btn danger" onclick="event.stopPropagation();deleteBlock('${block.id}')" title="Delete">🗑</button>
      </div>
    </div>`).join('');
}

function selectBlock(id) {
  State.selectedBlockId = id;
  updateLayers();
  openBlockSettings(id);
}

let _dragSrcId = null;
function layerDragStart(e,id) { _dragSrcId=id; e.dataTransfer.effectAllowed='move'; }
function layerDragOver(e,id)  { e.preventDefault(); e.dataTransfer.dropEffect='move'; }
function layerDrop(e,tid) {
  e.preventDefault();
  if (_dragSrcId===tid) return;
  const si = State.blocks.findIndex(b=>b.id===_dragSrcId);
  const ti = State.blocks.findIndex(b=>b.id===tid);
  const [m] = State.blocks.splice(si,1);
  State.blocks.splice(ti,0,m);
  _dragSrcId=null; refreshPreview(); updateLayers(); markProjectDirty();
}

/* ──────────────────────────────────────────────────────────────────
   BLOCK SETTINGS MODAL
────────────────────────────────────────────────────────────────── */
let _editingBlockId = null;
let _editingData    = null;

window.openBlockSettings = function(id) {
  const block = State.blocks.find(b=>b.id===id);
  if (!block) return;
  _editingBlockId = id;
  _editingData    = JSON.parse(JSON.stringify(block.data));
  document.getElementById('bsm-title').textContent = block.icon+' '+block.label+' Settings';
  document.getElementById('bsm-content').innerHTML = renderBlockSettingsForm(block.type, _editingData);
  document.getElementById('block-settings-modal').style.display = 'flex';
};

function renderBlockSettingsForm(type, data) {
  const forms = { hero:renderHeroForm, nav:renderNavForm, leadform:renderLeadFormForm, testimonials:renderTestimonialsForm, pricing:renderPricingForm, cta:renderCTAForm, features:renderFeaturesForm, gallery:renderGalleryForm, widget:renderWidgetForm, footer:renderFooterForm };
  return forms[type] ? forms[type](data) : '<p style="color:#888;padding:16px;">No settings for this block.</p>';
}

function renderHeroForm(data) {
  return `
    <div class="bsm-tabs">
      <button class="bsm-tab active" onclick="switchBSMTab(event,'bsmt-content')">Content</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'bsmt-design')">Design</button>
      <button class="bsm-tab" onclick="switchBSMTab(event,'bsmt-buttons')">Buttons</button>
    </div>
    <div id="bsmt-content" class="bsm-panel active">
      <div class="bsm-field"><label>Heading</label><textarea oninput="_editingData.heading=this.value">${data.heading}</textarea></div>
      <div class="bsm-field"><label>Subheading</label><textarea oninput="_editingData.subheading=this.value">${data.subheading}</textarea></div>
      <div class="bsm-field"><label>Badge Text</label><input type="text" value="${data.badgeText}" oninput="_editingData.badgeText=this.value"/></div>
      <div class="bsm-field"><label>Show Badge</label><select onchange="_editingData.showBadge=this.value==='true'"><option value="true" ${data.showBadge?'selected':''}>Yes</option><option value="false" ${!data.showBadge?'selected':''}>No</option></select></div>
      <div class="bsm-field"><label>Alignment</label><select onchange="_editingData.alignment=this.value"><option value="center" ${data.alignment==='center'?'selected':''}>Center</option><option value="left" ${data.alignment==='left'?'selected':''}>Left</option></select></div>
      <div class="bsm-field"><label>Min Height</label><select onchange="_editingData.minHeight=this.value"><option value="60vh" ${data.minHeight==='60vh'?'selected':''}>60vh</option><option value="85vh" ${data.minHeight==='85vh'?'selected':''}>85vh (default)</option><option value="100vh" ${data.minHeight==='100vh'?'selected':''}>100vh</option></select></div>
    </div>
    <div id="bsmt-design" class="bsm-panel">
      <div class="bsm-field"><label>Background Type</label><select onchange="_editingData.bgType=this.value"><option value="gradient" ${data.bgType==='gradient'?'selected':''}>Gradient</option><option value="solid" ${data.bgType==='solid'?'selected':''}>Solid Color</option><option value="image" ${data.bgType==='image'?'selected':''}>Image URL</option></select></div>
      <div class="bsm-field"><label>BG Color 1</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;this.nextElementSibling.value=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;this.previousElementSibling.value=this.value"/></div></div>
      <div class="bsm-field"><label>BG Color 2</label><div class="bsm-color-row"><input type="color" value="${data.bgColor2}" oninput="_editingData.bgColor2=this.value;this.nextElementSibling.value=this.value"/><input type="text" value="${data.bgColor2}" oninput="_editingData.bgColor2=this.value;this.previousElementSibling.value=this.value"/></div></div>
      <div class="bsm-field"><label>Image URL</label><input type="url" value="${data.bgImage||''}" placeholder="https://..." oninput="_editingData.bgImage=this.value"/></div>
      <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;this.nextElementSibling.value=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value;this.previousElementSibling.value=this.value"/></div></div>
    </div>
    <div id="bsmt-buttons" class="bsm-panel">
      <div class="bsm-field"><label>Primary Button Text</label><input type="text" value="${data.btnText}" oninput="_editingData.btnText=this.value"/></div>
      <div class="bsm-field"><label>Primary Button Link</label><input type="url" value="${data.btnLink}" oninput="_editingData.btnLink=this.value"/></div>
      <div class="bsm-field"><label>Button Color</label><div class="bsm-color-row"><input type="color" value="${data.btnColor}" oninput="_editingData.btnColor=this.value"/><input type="text" value="${data.btnColor}" oninput="_editingData.btnColor=this.value"/></div></div>
      <div class="bsm-field"><label>Button Text Color</label><div class="bsm-color-row"><input type="color" value="${data.btnTextColor}" oninput="_editingData.btnTextColor=this.value"/><input type="text" value="${data.btnTextColor}" oninput="_editingData.btnTextColor=this.value"/></div></div>
      <div class="bsm-field"><label>Secondary Button Text</label><input type="text" value="${data.btn2Text}" oninput="_editingData.btn2Text=this.value"/></div>
      <div class="bsm-field"><label>Secondary Button Link</label><input type="url" value="${data.btn2Link}" oninput="_editingData.btn2Link=this.value"/></div>
    </div>`;
}

function renderNavForm(data) {
  return `
    <div class="bsm-field"><label>Logo Text</label><input type="text" value="${data.logo}" oninput="_editingData.logo=this.value"/></div>
    <div class="bsm-field"><label>Nav Links (comma-separated)</label><input type="text" value="${(data.links||[]).join(',')}" oninput="_editingData.links=this.value.split(',').map(l=>l.trim())"/></div>
    <div class="bsm-field"><label>CTA Button Text</label><input type="text" value="${data.ctaText}" oninput="_editingData.ctaText=this.value"/></div>
    <div class="bsm-field"><label>CTA Button Link</label><input type="url" value="${data.ctaLink}" oninput="_editingData.ctaLink=this.value"/></div>
    <div class="bsm-field"><label>Background Color</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;this.nextElementSibling.value=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value;this.previousElementSibling.value=this.value"/></div></div>
    <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value;this.nextElementSibling.value=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value;this.previousElementSibling.value=this.value"/></div></div>
    <div class="bsm-field"><label>CTA Background Color</label><div class="bsm-color-row"><input type="color" value="${data.ctaBgColor}" oninput="_editingData.ctaBgColor=this.value;this.nextElementSibling.value=this.value"/><input type="text" value="${data.ctaBgColor}" oninput="_editingData.ctaBgColor=this.value;this.previousElementSibling.value=this.value"/></div></div>
    <div class="bsm-field"><label>Sticky Navigation</label><select onchange="_editingData.sticky=this.value==='true'"><option value="true" ${data.sticky?'selected':''}>Yes — stick to top</option><option value="false" ${!data.sticky?'selected':''}>No — static</option></select></div>`;
}

function renderLeadFormForm(data) {
  return `
    <div class="bsm-field"><label>Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value"/></div>
    <div class="bsm-field"><label>Subheading</label><textarea oninput="_editingData.subheading=this.value">${data.subheading}</textarea></div>
    <div class="bsm-field"><label>Button Text</label><input type="text" value="${data.btnText}" oninput="_editingData.btnText=this.value"/></div>
    <div class="bsm-field"><label>Privacy Note</label><input type="text" value="${data.privacyText}" oninput="_editingData.privacyText=this.value"/></div>
    <div class="bsm-field"><label>Background Color</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/></div></div>
    <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value"/></div></div>
    <div class="bsm-field"><label>Button Color</label><div class="bsm-color-row"><input type="color" value="${data.btnColor}" oninput="_editingData.btnColor=this.value"/><input type="text" value="${data.btnColor}" oninput="_editingData.btnColor=this.value"/></div></div>
    <div class="bsm-field"><label>Accent Color</label><div class="bsm-color-row"><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/><input type="text" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/></div></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0"/>
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:12px">Form Fields</p>
    ${(data.fields||[]).map((f,i)=>`<div class="bsm-list-item"><div class="bsm-list-item-head"><span>Field ${i+1}</span></div>
      <div class="bsm-field"><label>Type</label><select onchange="_editingData.fields[${i}].type=this.value"><option value="text" ${f.type==='text'?'selected':''}>Text</option><option value="email" ${f.type==='email'?'selected':''}>Email</option><option value="tel" ${f.type==='tel'?'selected':''}>Phone</option></select></div>
      <div class="bsm-field"><label>Placeholder</label><input type="text" value="${f.placeholder}" oninput="_editingData.fields[${i}].placeholder=this.value"/></div>
    </div>`).join('')}`;
}

function renderTestimonialsForm(data) {
  return `
    <div class="bsm-field"><label>Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value"/></div>
    <div class="bsm-field"><label>Subheading</label><input type="text" value="${data.subheading}" oninput="_editingData.subheading=this.value"/></div>
    <div class="bsm-field"><label>Background</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/></div></div>
    <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value"/></div></div>
    <div class="bsm-field"><label>Accent Color</label><div class="bsm-color-row"><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/><input type="text" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/></div></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0"/>
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:12px">Cards</p>
    ${(data.cards||[]).map((c,i)=>`<div class="bsm-list-item"><div class="bsm-list-item-head"><span>Card ${i+1}</span></div>
      <div class="bsm-field"><label>Name</label><input type="text" value="${c.name}" oninput="_editingData.cards[${i}].name=this.value"/></div>
      <div class="bsm-field"><label>Role</label><input type="text" value="${c.role}" oninput="_editingData.cards[${i}].role=this.value"/></div>
      <div class="bsm-field"><label>Quote</label><textarea oninput="_editingData.cards[${i}].quote=this.value">${c.quote}</textarea></div>
      <div class="bsm-field"><label>Rating</label><select onchange="_editingData.cards[${i}].rating=parseInt(this.value)">${[1,2,3,4,5].map(n=>`<option value="${n}" ${c.rating===n?'selected':''}>${n} ★</option>`).join('')}</select></div>
    </div>`).join('')}`;
}

function renderPricingForm(data) {
  return `
    <div class="bsm-field"><label>Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value"/></div>
    <div class="bsm-field"><label>Subheading</label><input type="text" value="${data.subheading}" oninput="_editingData.subheading=this.value"/></div>
    <div class="bsm-field"><label>Background</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/></div></div>
    <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value"/></div></div>
    <div class="bsm-field"><label>Accent Color</label><div class="bsm-color-row"><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/><input type="text" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/></div></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0"/>
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:12px">Plans</p>
    ${(data.plans||[]).map((p,i)=>`<div class="bsm-list-item"><div class="bsm-list-item-head"><span>Plan ${i+1}: ${p.name}</span></div>
      <div class="bsm-field"><label>Name</label><input type="text" value="${p.name}" oninput="_editingData.plans[${i}].name=this.value"/></div>
      <div class="bsm-field"><label>Price</label><input type="text" value="${p.price}" oninput="_editingData.plans[${i}].price=this.value"/></div>
      <div class="bsm-field"><label>Period</label><input type="text" value="${p.period}" oninput="_editingData.plans[${i}].period=this.value"/></div>
      <div class="bsm-field"><label>Description</label><input type="text" value="${p.description}" oninput="_editingData.plans[${i}].description=this.value"/></div>
      <div class="bsm-field"><label>Features (one per line)</label><textarea oninput="_editingData.plans[${i}].features=this.value.split('\\n').filter(l=>l.trim())">${(p.features||[]).join('\n')}</textarea></div>
      <div class="bsm-field"><label>CTA Text</label><input type="text" value="${p.ctaText}" oninput="_editingData.plans[${i}].ctaText=this.value"/></div>
      <div class="bsm-field"><label>CTA Link</label><input type="url" value="${p.ctaLink}" oninput="_editingData.plans[${i}].ctaLink=this.value"/></div>
      <div class="bsm-field"><label>Featured Plan?</label><select onchange="_editingData.plans[${i}].featured=this.value==='true'"><option value="false" ${!p.featured?'selected':''}>No</option><option value="true" ${p.featured?'selected':''}>Yes</option></select></div>
    </div>`).join('')}`;
}

function renderCTAForm(data) {
  return `
    <div class="bsm-field"><label>Heading</label><textarea oninput="_editingData.heading=this.value">${data.heading}</textarea></div>
    <div class="bsm-field"><label>Subheading</label><textarea oninput="_editingData.subheading=this.value">${data.subheading}</textarea></div>
    <div class="bsm-field"><label>Background Type</label><select onchange="_editingData.bgType=this.value"><option value="gradient" ${data.bgType==='gradient'?'selected':''}>Gradient</option><option value="solid" ${data.bgType==='solid'?'selected':''}>Solid</option></select></div>
    <div class="bsm-field"><label>BG Color 1</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/></div></div>
    <div class="bsm-field"><label>BG Color 2</label><div class="bsm-color-row"><input type="color" value="${data.bgColor2}" oninput="_editingData.bgColor2=this.value"/><input type="text" value="${data.bgColor2}" oninput="_editingData.bgColor2=this.value"/></div></div>
    <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value"/></div></div>
    <div class="bsm-field"><label>Primary Button Text</label><input type="text" value="${data.btnText}" oninput="_editingData.btnText=this.value"/></div>
    <div class="bsm-field"><label>Primary Button Link</label><input type="url" value="${data.btnLink}" oninput="_editingData.btnLink=this.value"/></div>
    <div class="bsm-field"><label>Secondary Button Text</label><input type="text" value="${data.btn2Text}" oninput="_editingData.btn2Text=this.value"/></div>
    <div class="bsm-field"><label>Secondary Button Link</label><input type="url" value="${data.btn2Link}" oninput="_editingData.btn2Link=this.value"/></div>
    <div class="bsm-field"><label>Show Badge</label><select onchange="_editingData.showBadge=this.value==='true'"><option value="false" ${!data.showBadge?'selected':''}>No</option><option value="true" ${data.showBadge?'selected':''}>Yes</option></select></div>
    <div class="bsm-field"><label>Badge Text</label><input type="text" value="${data.badgeText}" oninput="_editingData.badgeText=this.value"/></div>`;
}

function renderFeaturesForm(data) {
  return `
    <div class="bsm-field"><label>Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value"/></div>
    <div class="bsm-field"><label>Subheading</label><textarea oninput="_editingData.subheading=this.value">${data.subheading}</textarea></div>
    <div class="bsm-field"><label>Background</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/></div></div>
    <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value"/></div></div>
    <div class="bsm-field"><label>Accent Color</label><div class="bsm-color-row"><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/><input type="text" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/></div></div>
    <div class="bsm-field"><label>Columns</label><select onchange="_editingData.columns=parseInt(this.value)"><option value="2" ${data.columns===2?'selected':''}>2</option><option value="3" ${data.columns===3?'selected':''}>3</option><option value="4" ${data.columns===4?'selected':''}>4</option></select></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0"/>
    ${(data.items||[]).map((it,i)=>`<div class="bsm-list-item"><div class="bsm-list-item-head"><span>Feature ${i+1}</span></div>
      <div class="bsm-field"><label>Icon (emoji)</label><input type="text" value="${it.icon}" oninput="_editingData.items[${i}].icon=this.value" style="width:60px"/></div>
      <div class="bsm-field"><label>Title</label><input type="text" value="${it.title}" oninput="_editingData.items[${i}].title=this.value"/></div>
      <div class="bsm-field"><label>Description</label><textarea oninput="_editingData.items[${i}].description=this.value">${it.description}</textarea></div>
    </div>`).join('')}`;
}

function renderGalleryForm(data) {
  return `
    <div class="bsm-field"><label>Heading</label><input type="text" value="${data.heading}" oninput="_editingData.heading=this.value"/></div>
    <div class="bsm-field"><label>Subheading</label><input type="text" value="${data.subheading}" oninput="_editingData.subheading=this.value"/></div>
    <div class="bsm-field"><label>Background</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/></div></div>
    <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value"/></div></div>
    <div class="bsm-field"><label>Columns</label><select onchange="_editingData.columns=parseInt(this.value)"><option value="2" ${data.columns===2?'selected':''}>2</option><option value="3" ${data.columns===3?'selected':''}>3</option><option value="4" ${data.columns===4?'selected':''}>4</option></select></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0"/>
    ${(data.images||[]).map((img,i)=>`<div class="bsm-list-item"><div class="bsm-list-item-head"><span>Image ${i+1}</span></div>
      <div class="bsm-field"><label>URL</label><input type="url" value="${img.src}" placeholder="https://..." oninput="_editingData.images[${i}].src=this.value"/></div>
      <div class="bsm-field"><label>Caption</label><input type="text" value="${img.caption}" oninput="_editingData.images[${i}].caption=this.value"/></div>
    </div>`).join('')}`;
}

function renderWidgetForm(data) {
  return `
    <div class="bsm-field"><label>Section Heading (optional)</label><input type="text" value="${data.heading||''}" oninput="_editingData.heading=this.value"/></div>
    <div class="bsm-field"><label>Embed Code (HTML / iframe / script)</label><textarea style="font-family:monospace;font-size:12px;min-height:120px;" oninput="_editingData.embedCode=this.value">${(data.embedCode||'').replace(/</g,'&lt;')}</textarea></div>
    <div class="bsm-field"><label>Background Color</label><div class="bsm-color-row"><input type="color" value="${data.bgColor||'#ffffff'}" oninput="_editingData.bgColor=this.value"/><input type="text" value="${data.bgColor||'#ffffff'}" oninput="_editingData.bgColor=this.value"/></div></div>
    <div class="bsm-field"><label>Vertical Padding</label><select onchange="_editingData.padding=this.value"><option value="20px" ${data.padding==='20px'?'selected':''}>Compact (20px)</option><option value="40px" ${data.padding==='40px'?'selected':''}>Default (40px)</option><option value="80px" ${data.padding==='80px'?'selected':''}>Spacious (80px)</option></select></div>
    <p style="font-size:12px;color:#888;margin-top:12px;line-height:1.6;">Paste any embed code: Elfsight, Tidio, Cal.com, Stripe, YouTube, or any &lt;iframe&gt; / &lt;script&gt; snippet.</p>`;
}

function renderFooterForm(data) {
  return `
    <div class="bsm-field"><label>Logo Text</label><input type="text" value="${data.logo}" oninput="_editingData.logo=this.value"/></div>
    <div class="bsm-field"><label>Tagline</label><input type="text" value="${data.tagline}" oninput="_editingData.tagline=this.value"/></div>
    <div class="bsm-field"><label>Copyright</label><input type="text" value="${data.copyright}" oninput="_editingData.copyright=this.value"/></div>
    <div class="bsm-field"><label>Background</label><div class="bsm-color-row"><input type="color" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/><input type="text" value="${data.bgColor}" oninput="_editingData.bgColor=this.value"/></div></div>
    <div class="bsm-field"><label>Text Color</label><div class="bsm-color-row"><input type="color" value="${data.textColor}" oninput="_editingData.textColor=this.value"/><input type="text" value="${data.textColor}" oninput="_editingData.textColor=this.value"/></div></div>
    <div class="bsm-field"><label>Accent Color</label><div class="bsm-color-row"><input type="color" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/><input type="text" value="${data.accentColor}" oninput="_editingData.accentColor=this.value"/></div></div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0"/>
    ${(data.columns||[]).map((col,ci)=>`<div class="bsm-list-item"><div class="bsm-list-item-head"><span>Column ${ci+1}</span></div>
      <div class="bsm-field"><label>Title</label><input type="text" value="${col.title}" oninput="_editingData.columns[${ci}].title=this.value"/></div>
      <div class="bsm-field"><label>Links (label|url, one per line)</label><textarea oninput="_editingData.columns[${ci}].links=this.value.split('\\n').filter(l=>l.trim()).map(l=>{const[lb,u]=(l+'|#').split('|');return{label:lb.trim(),url:(u||'#').trim()}})">${(col.links||[]).map(l=>l.label+'|'+l.url).join('\n')}</textarea></div>
    </div>`).join('')}`;
}

function switchBSMTab(event, panelId) {
  const container = event.target.closest('.bsm-tabs').parentElement;
  container.querySelectorAll('.bsm-tab').forEach(t=>t.classList.remove('active'));
  container.querySelectorAll('.bsm-panel').forEach(p=>p.classList.remove('active'));
  event.target.classList.add('active');
  const panel = container.querySelector('#'+panelId);
  if (panel) panel.classList.add('active');
}

function closeBlockSettings() {
  document.getElementById('block-settings-modal').style.display='none';
  _editingBlockId=null; _editingData=null;
}

function applyBlockSettings() {
  if (!_editingBlockId||!_editingData) return;
  const block = State.blocks.find(b=>b.id===_editingBlockId);
  if (!block) return;
  block.data = JSON.parse(JSON.stringify(_editingData));
  closeBlockSettings();
  refreshPreview(); updateLayers();
  showToast('✅ Saved!', 'Block settings updated', 'success');
  markProjectDirty();
}

/* ──────────────────────────────────────────────────────────────────
   TEMPLATE MANAGEMENT
────────────────────────────────────────────────────────────────── */
function applyTemplate(key) {
  if (!Templates[key]) return;
  State.currentTemplate = key;
  document.querySelectorAll('.template-card').forEach(c=>c.classList.remove('active'));
  const clicks = document.querySelectorAll(`.template-card`);
  clicks.forEach(c=>{ if(c.getAttribute('onclick')?.includes(`'${key}'`)) c.classList.add('active'); });
  const customPanel = document.getElementById('custom-css-panel');
  if (customPanel) customPanel.style.display = key==='custom'?'block':'none';
  const ov = Templates[key].overrides;
  Object.entries(ov).forEach(([k,v])=>{ State.globalStyles[k]=v; });
  refreshPreview();
  showToast('🎨 Theme Applied', Templates[key].name, 'success');
}

/* ──────────────────────────────────────────────────────────────────
   GLOBAL STYLES
────────────────────────────────────────────────────────────────── */
function updateGlobalStyle(varName, value) {
  State.globalStyles[varName] = value;
  refreshPreview();
}

/* ──────────────────────────────────────────────────────────────────
   DEVICE SWITCHING
────────────────────────────────────────────────────────────────── */
function switchDevice(device) {
  State.currentDevice = device;
  document.querySelectorAll('.device-btn').forEach(b=>b.classList.toggle('active', b.dataset.device===device));
  const container = document.getElementById('canvas-container');
  container.className = 'canvas-container device-'+device;
}

/* ──────────────────────────────────────────────────────────────────
   ZOOM CONTROLS
────────────────────────────────────────────────────────────────── */
function changeZoom(delta) {
  State.zoomLevel = Math.max(40, Math.min(150, State.zoomLevel+delta));
  const frame = document.getElementById('preview-frame');
  const container = document.getElementById('canvas-container');
  if (frame) { frame.style.transform=`scale(${State.zoomLevel/100})`; frame.style.transformOrigin='top left'; }
  const zv = document.getElementById('zoom-val');
  if (zv) zv.textContent = State.zoomLevel+'%';
}

/* ──────────────────────────────────────────────────────────────────
   TAB SWITCHING
────────────────────────────────────────────────────────────────── */
function switchTab(tab) {
  document.querySelectorAll('.stab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.toggle('active', c.id==='tab-'+tab));
}

/* ──────────────────────────────────────────────────────────────────
   RIGHT PANEL
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
  document.getElementById('full-preview-modal').style.display='none';
}

/* ──────────────────────────────────────────────────────────────────
   EXPORT ENGINE
────────────────────────────────────────────────────────────────── */
function exportSite() {
  if (!UsageTracker.canExport()) { UsageTracker.showExportLimitModal(); return; }
  const siteName = document.getElementById('site-name-input').value || 'my-site';
  downloadFile(siteName+'-index.html', buildExportHTML(), 'text/html');
  setTimeout(()=>downloadFile(siteName+'-style.css', buildExportCSS(), 'text/css'), 200);
  setTimeout(()=>downloadFile(siteName+'-script.js', buildExportJS(), 'text/javascript'), 400);
  UsageTracker.recordExport();
  setTimeout(()=>{ document.getElementById('export-modal').style.display='flex'; }, 700);
  showToast('📦 Exporting…', 'Three files downloading now', 'success');
  markProjectDirty();
}

function buildExportHTML() {
  const siteName = document.getElementById('site-name-input').value || 'My Site';
  const tpl = Templates[State.currentTemplate];
  const styles = { ...State.globalStyles, ...tpl.overrides };
  const cssVars = Object.entries(styles).map(([k,v])=>`${k}: ${v};`).join('\n    ');
  const blocksHTML = State.blocks.map(b=>{ const r=BlockRenderers[b.type]; return r?`<!-- ${b.label} -->\n${r(b.data)}`:''; }).join('\n\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${siteName}</title>
  <meta name="description" content="Built with Supersuite — the better way to build."/>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23ff6b35'/%3E%3Ctext x='16' y='23' font-family='Arial Black,sans-serif' font-size='16' font-weight='900' text-anchor='middle' fill='white'%3ESS%3C/text%3E%3C/svg%3E"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="style.css"/>
</head>
<body>

${blocksHTML}

<script src="script.js"><\/script>
</body>
</html>`;
}

function buildExportCSS() {
  const tpl = Templates[State.currentTemplate];
  const styles = { ...State.globalStyles, ...tpl.overrides };
  const cssVars = Object.entries(styles).map(([k,v])=>`  ${k}: ${v};`).join('\n');
  return `/* ═══════════════════════════════════════════════════
   Generated by Supersuite SSV26.1 — supersuite.app
   Template: ${tpl.name}
═══════════════════════════════════════════════════ */

:root {\n${cssVars}\n}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font-body);color:var(--text);background:var(--bg);font-size:var(--font-base);line-height:var(--line-height);-webkit-font-smoothing:antialiased;}

/* Template: ${tpl.name} */
${tpl.extraCSS||''}

/* Custom CSS */
${State.customCSS}

/* Responsive */
@media(max-width:768px){
  [style*="grid-template-columns: repeat(3"]{grid-template-columns:repeat(2,1fr)!important}
  [style*="grid-template-columns: repeat(2"]{grid-template-columns:1fr!important}
  [style*="grid-template-columns: 1.5fr"]{grid-template-columns:1fr!important}
  .ss-nav-links{display:none!important}
  [style*="padding:120px"]{padding:64px 24px!important}
}
@media(max-width:480px){
  [style*="grid-template-columns"]{grid-template-columns:1fr!important}
}
`;
}

function buildExportJS() {
  return `/* ═══════════════════════════════════════════════════
   Generated by Supersuite SSV26.1 — supersuite.app
   Site interactivity — animations, nav, forms
═══════════════════════════════════════════════════ */
'use strict';
function initScrollAnimations(){const o=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';o.unobserve(e.target);}});},{threshold:0.1,rootMargin:'0px 0px -60px 0px'});document.querySelectorAll('.ss-block').forEach((el,i)=>{el.style.opacity='0';el.style.transform='translateY(30px)';el.style.transition=\`opacity 0.6s ease \${i*0.1}s, transform 0.6s ease \${i*0.1}s\`;o.observe(el);});}
function initSmoothScroll(){document.querySelectorAll('a[href^="#"]').forEach(l=>{l.addEventListener('click',e=>{const t=document.querySelector(l.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}});});}
function initForms(){document.querySelectorAll('form').forEach(f=>{f.addEventListener('submit',e=>{e.preventDefault();const b=f.querySelector('button[type="submit"]');if(b){const o=b.textContent;b.textContent='✓ Submitted!';b.style.background='#22c55e';setTimeout(()=>{b.textContent=o;b.style.background='';},3000);}});});}
function initStickyNav(){const n=document.querySelector('.ss-nav');if(!n)return;window.addEventListener('scroll',()=>{if(window.scrollY>60){n.style.boxShadow='0 4px 24px rgba(0,0,0,0.15)';}else{n.style.boxShadow='';}});}
document.addEventListener('DOMContentLoaded',()=>{initScrollAnimations();initSmoothScroll();initForms();initStickyNav();});
`;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], {type:mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function closeExportModal() {
  document.getElementById('export-modal').style.display='none';
}

/* ──────────────────────────────────────────────────────────────────
   PROJECT LIBRARY
────────────────────────────────────────────────────────────────── */
const Projects = {
  _key: 'ss_projects_v261',
  load() { try { const r=localStorage.getItem(this._key); return r?JSON.parse(r):[]; } catch(e){ return []; } },
  save(projects) { try { localStorage.setItem(this._key, JSON.stringify(projects)); } catch(e){} },
  getAll() { return this.load(); },
  create(name) {
    const projects = this.load();
    const id = 'proj_'+Date.now();
    const proj = { id, name: name||'Untitled Project', created: new Date().toISOString(), updated: new Date().toISOString(), blocks:[], globalStyles:{...State.globalStyles}, currentTemplate:'glass', customCSS:'', siteName:'My Site', blockIdCounter:1 };
    projects.unshift(proj);
    this.save(projects);
    return proj;
  },
  update(id, data) {
    const projects = this.load();
    const idx = projects.findIndex(p=>p.id===id);
    if (idx===-1) return;
    projects[idx] = { ...projects[idx], ...data, updated: new Date().toISOString() };
    this.save(projects);
  },
  delete(id) {
    const projects = this.load().filter(p=>p.id!==id);
    this.save(projects);
  },
  duplicate(id) {
    const projects = this.load();
    const orig = projects.find(p=>p.id===id);
    if (!orig) return;
    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = 'proj_'+Date.now();
    copy.name = copy.name+' (copy)';
    copy.created = new Date().toISOString();
    copy.updated = new Date().toISOString();
    projects.unshift(copy);
    this.save(projects);
    return copy;
  }
};

function createNewProject() {
  const name = prompt('Project name:', 'New Project');
  if (!name) return;
  const proj = Projects.create(name);
  State.currentProjectId = proj.id;
  State.blocks = [];
  State.globalStyles = { '--primary':'#ff6b35','--secondary':'#1a1a2e','--accent':'#ffd700','--bg':'#ffffff','--text':'#1a1a2e','--font-heading':"'Syne', sans-serif",'--font-body':"'DM Sans', sans-serif",'--font-base':'16px','--line-height':'1.6','--btn-radius':'8px','--section-pad':'60px','--container':'1200px','--radius':'12px','--shadow':'0 8px 24px rgba(0,0,0,0.15)' };
  State.customCSS = '';
  State.blockIdCounter = 1;
  const sn = document.getElementById('site-name-input');
  if (sn) sn.value = name;
  refreshPreview(); updateLayers(); renderProjectsList();
  showToast('📁 New Project', '"'+name+'" created', 'success');
}

function openProject(id) {
  const proj = Projects.getAll().find(p=>p.id===id);
  if (!proj) return;
  State.currentProjectId = id;
  State.blocks = JSON.parse(JSON.stringify(proj.blocks||[]));
  State.globalStyles = { ...State.globalStyles, ...(proj.globalStyles||{}) };
  State.currentTemplate = proj.currentTemplate||'glass';
  State.customCSS = proj.customCSS||'';
  State.blockIdCounter = proj.blockIdCounter||1;
  const sn = document.getElementById('site-name-input');
  if (sn) sn.value = proj.siteName||proj.name;
  refreshPreview(); updateLayers(); renderProjectsList();
  showToast('📂 Project Loaded', '"'+proj.name+'" opened', 'success');
}

function saveCurrentProject() {
  if (!State.currentProjectId) {
    const name = document.getElementById('site-name-input')?.value || 'My Project';
    const proj = Projects.create(name);
    State.currentProjectId = proj.id;
  }
  Projects.update(State.currentProjectId, {
    blocks: JSON.parse(JSON.stringify(State.blocks)),
    globalStyles: { ...State.globalStyles },
    currentTemplate: State.currentTemplate,
    customCSS: State.customCSS,
    blockIdCounter: State.blockIdCounter,
    siteName: document.getElementById('site-name-input')?.value || 'My Site',
    name: document.getElementById('site-name-input')?.value || 'My Site',
  });
  renderProjectsList();
  showToast('💾 Saved', 'Project saved to library', 'success');
}

function markProjectDirty() {
  // Auto-save every 30 sec via interval; also save to session
  saveToSession();
}

function renderProjectsList() {
  const list = document.getElementById('projects-list');
  const countEl = document.getElementById('projects-count');
  if (!list) return;
  const projects = Projects.getAll();
  if (countEl) countEl.textContent = projects.length+' project'+(projects.length===1?'':'s');
  if (projects.length===0) {
    list.innerHTML = '<p class="empty-layers">No projects yet. Click "+ New" to create one.</p>';
    return;
  }
  list.innerHTML = projects.map(p=>`
    <div class="project-card ${State.currentProjectId===p.id?'active':''}" onclick="openProject('${p.id}')">
      <div class="project-card-name">${p.name}</div>
      <div class="project-card-meta">${(p.blocks||[]).length} blocks · ${new Date(p.updated).toLocaleDateString()}</div>
      <div class="project-card-actions">
        <button class="proj-act-btn" onclick="event.stopPropagation();renameProject('${p.id}')" title="Rename">✏️ Rename</button>
        <button class="proj-act-btn" onclick="event.stopPropagation();duplicateProject('${p.id}')" title="Duplicate">⧉ Dup</button>
        <button class="proj-act-btn danger" onclick="event.stopPropagation();deleteProject('${p.id}')" title="Delete">🗑 Del</button>
      </div>
    </div>`).join('');
}

function renameProject(id) {
  const proj = Projects.getAll().find(p=>p.id===id);
  if (!proj) return;
  const name = prompt('New name:', proj.name);
  if (!name) return;
  Projects.update(id, {name});
  if (State.currentProjectId===id) { const sn=document.getElementById('site-name-input'); if(sn) sn.value=name; }
  renderProjectsList();
  showToast('✏️ Renamed', '"'+name+'"', 'info');
}

function duplicateProject(id) {
  const copy = Projects.duplicate(id);
  if (copy) { renderProjectsList(); showToast('⧉ Duplicated', '"'+copy.name+'" created', 'info'); }
}

function deleteProject(id) {
  const proj = Projects.getAll().find(p=>p.id===id);
  if (!proj) return;
  if (!confirm('Delete "'+proj.name+'"? This cannot be undone.')) return;
  Projects.delete(id);
  if (State.currentProjectId===id) State.currentProjectId=null;
  renderProjectsList();
  showToast('🗑 Deleted', '"'+proj.name+'" removed', 'info');
}

/* ──────────────────────────────────────────────────────────────────
   VERSION HISTORY
────────────────────────────────────────────────────────────────── */
function saveVersion(label) {
  const name = label || prompt('Version name (or leave blank for auto):', 'v'+State.versions.length+' — '+(document.getElementById('site-name-input')?.value||'Save'));
  if (name===null) return; // cancelled
  const version = {
    id: 'ver_'+Date.now(),
    name: name || ('Auto-save '+new Date().toLocaleTimeString()),
    timestamp: new Date().toISOString(),
    blocks: JSON.parse(JSON.stringify(State.blocks)),
    globalStyles: { ...State.globalStyles },
    currentTemplate: State.currentTemplate,
    customCSS: State.customCSS,
    blockIdCounter: State.blockIdCounter,
    siteName: document.getElementById('site-name-input')?.value||'My Site',
    blockCount: State.blocks.length,
  };
  State.versions.unshift(version);
  if (State.versions.length > 20) State.versions.pop(); // keep max 20
  renderVersionsList();
  showToast('💾 Version Saved', '"'+version.name+'"', 'success');
  // Also persist to localStorage
  try { localStorage.setItem('ss_versions_'+State.currentProjectId, JSON.stringify(State.versions.slice(0,20))); } catch(e){}
}

function restoreVersion(id) {
  const ver = State.versions.find(v=>v.id===id);
  if (!ver) return;
  if (!confirm('Restore "'+ver.name+'"? Current unsaved changes will be lost.')) return;
  State.blocks = JSON.parse(JSON.stringify(ver.blocks));
  State.globalStyles = { ...ver.globalStyles };
  State.currentTemplate = ver.currentTemplate;
  State.customCSS = ver.customCSS;
  State.blockIdCounter = ver.blockIdCounter;
  const sn = document.getElementById('site-name-input');
  if (sn) sn.value = ver.siteName;
  refreshPreview(); updateLayers(); renderVersionsList();
  showToast('⏪ Restored', '"'+ver.name+'" restored', 'success');
}

function renderVersionsList() {
  const list = document.getElementById('versions-list');
  if (!list) return;
  if (State.versions.length===0) {
    list.innerHTML='<p class="empty-layers">No versions saved yet. Click "Save" to create a restore point.</p>';
    return;
  }
  list.innerHTML = State.versions.map(v=>`
    <div class="version-item">
      <div class="version-item-head">
        <span class="version-name">${v.name}</span>
        <span class="version-time">${new Date(v.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="version-meta">${v.blockCount} blocks · ${new Date(v.timestamp).toLocaleDateString()}</div>
      <div class="version-actions">
        <button class="ver-btn restore" onclick="restoreVersion('${v.id}')">⏪ Restore</button>
        <button class="ver-btn" onclick="previewVersion('${v.id}')">👁 Preview</button>
      </div>
    </div>`).join('');
}

function previewVersion(id) {
  const ver = State.versions.find(v=>v.id===id);
  if (!ver) return;
  const tmpBlocks = State.blocks;
  State.blocks = ver.blocks;
  const modal = document.getElementById('full-preview-modal');
  const frame = document.getElementById('full-preview-frame');
  frame.srcdoc = buildPreviewHTML(true);
  modal.style.display = 'flex';
  State.blocks = tmpBlocks; // restore immediately after building preview
}

/* ──────────────────────────────────────────────────────────────────
   COLLABORATION MODAL
────────────────────────────────────────────────────────────────── */
function openCollabModal() {
  if (!State.collabCode) generateCollabCode();
  document.getElementById('collab-code-display').textContent = State.collabCode;
  document.getElementById('collab-modal').style.display = 'flex';
}

function closeCollabModal() {
  document.getElementById('collab-modal').style.display='none';
}

function generateCollabCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  State.collabCode = Array.from({length:6}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  const el = document.getElementById('collab-code-display');
  if (el) el.textContent = State.collabCode;
  showToast('🔄 New Code', 'Share code generated: '+State.collabCode, 'info');
}

function copyCollabCode() {
  if (!State.collabCode) return;
  navigator.clipboard.writeText(State.collabCode).then(()=>{
    showToast('📋 Copied!', 'Share code copied to clipboard', 'success');
  }).catch(()=>{
    showToast('📋 Code', State.collabCode, 'info');
  });
}

function joinCollabSession() {
  const input = document.getElementById('collab-join-input');
  const code = input?.value.trim().toUpperCase();
  if (!code || code.length < 4) { showToast('❌ Invalid code', 'Enter a valid share code', 'error'); return; }
  // In production this would open a WebSocket connection
  showToast('🔗 Joining…', 'Connecting to session '+code+'…', 'info');
  setTimeout(()=>{
    showToast('✅ Connected', 'You\'re now viewing session '+code, 'success');
    const peers = document.getElementById('collab-peers');
    if (peers) peers.innerHTML += `<div class="collab-peer"><div class="collab-peer-dot idle"></div><span class="collab-peer-name">Guest (${code})</span><span class="collab-peer-role">Viewer</span></div>`;
  }, 1500);
  if (input) input.value = '';
}

/* ──────────────────────────────────────────────────────────────────
   DASHBOARD
────────────────────────────────────────────────────────────────── */
function openDashboard() {
  const tier = State.userTier;
  const cfg = Auth.getTierConfig(tier);
  const usage = UsageTracker._load();
  const projects = Projects.getAll();
  // Populate stats
  const fields = {
    'dash-plan':     cfg.label,
    'dash-session':  (() => { const s=usage.sessionSeconds||0; return Math.floor(s/60)+'m '+( s%60)+'s'; })(),
    'dash-exports':  (usage.exportsToday||0)+' / '+(tier==='agency'?'∞':cfg.sitesPerDay||cfg.sitesPerWeek||'0'),
    'dash-projects': projects.length,
    'dash-versions': State.versions.length,
  };
  Object.entries(fields).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.textContent=val; });
  // Points
  const pts = document.getElementById('dashboard-points');
  if (pts) pts.textContent = State.builderPoints;
  // Subtitle
  const sub = document.getElementById('dashboard-subtitle');
  if (sub) sub.textContent = cfg.label+' plan · Supersuite '+Auth.version;
  // Recent projects
  const pl = document.getElementById('dashboard-projects-list');
  if (pl) {
    if (projects.length===0) { pl.innerHTML='<p style="font-size:13px;color:#888;padding:8px 0;">No saved projects yet.</p>'; }
    else { pl.innerHTML = projects.slice(0,4).map(p=>`<div class="dashboard-stat-row" style="cursor:pointer;" onclick="closeDashboard();openProject('${p.id}')"><span class="dashboard-stat-label">${p.name}</span><span class="dashboard-stat-value" style="font-size:11px;font-weight:500;">${(p.blocks||[]).length} blocks</span></div>`).join(''); }
  }
  document.getElementById('dashboard-modal').style.display = 'flex';
}

function closeDashboard() {
  document.getElementById('dashboard-modal').style.display='none';
}

function toggleDashFaq(el) {
  const item = el.closest('.dashboard-faq-item');
  item.classList.toggle('open');
  const a = item.querySelector('.dashboard-faq-a');
  if (a) a.style.display = item.classList.contains('open') ? 'block' : 'none';
}

/* ──────────────────────────────────────────────────────────────────
   BLOCK SELECTOR MODAL
────────────────────────────────────────────────────────────────── */
const BlockSelector = {
  _key: 'ss_blockselector_v261',
  _allTypes: ['nav','hero','leadform','testimonials','pricing','cta','features','gallery','widget','footer'],
  getEnabled() { try { const r=localStorage.getItem(this._key); if(r) return JSON.parse(r); } catch(e){} return [...this._allTypes]; },
  save(enabled) { try { localStorage.setItem(this._key, JSON.stringify(enabled)); } catch(e){} },
  applyToSidebar() {
    const enabled = this.getEnabled();
    document.querySelectorAll('.block-card').forEach(card=>{
      const m = card.getAttribute('onclick')?.match(/addBlock\('(\w+)'\)/);
      if (m) card.style.display = enabled.includes(m[1]) ? '' : 'none';
    });
  },
};

function openBlockSelectorModal() {
  const enabled = BlockSelector.getEnabled();
  const list = document.getElementById('block-selector-list');
  if (!list) return;
  const meta = { nav:{icon:'🧭',label:'Navigation',desc:'Site header & menu'}, hero:{icon:'⚡',label:'Hero Section',desc:'Headline + CTA'}, leadform:{icon:'📋',label:'Lead Form',desc:'Capture leads'}, testimonials:{icon:'💬',label:'Testimonials',desc:'Social proof'}, pricing:{icon:'💎',label:'Pricing',desc:'Plans & tiers'}, cta:{icon:'🎯',label:'CTA Section',desc:'Drive conversions'}, features:{icon:'✨',label:'Features',desc:'Icon + text grid'}, gallery:{icon:'🖼️',label:'Gallery',desc:'Image grid'}, widget:{icon:'🔌',label:'Widget/Embed',desc:'Any iframe or script'}, footer:{icon:'📌',label:'Footer',desc:'Links & copyright'} };
  list.innerHTML = BlockSelector._allTypes.map(type=>`
    <div class="block-selector-item">
      <input type="checkbox" id="bst-${type}" ${enabled.includes(type)?'checked':''} onchange=""/>
      <label for="bst-${type}" style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;" onclick="">
        <span style="font-size:20px;">${meta[type]?.icon||'📦'}</span>
        <div class="block-selector-info"><strong>${meta[type]?.label||type}</strong><small>${meta[type]?.desc||''}</small></div>
      </label>
    </div>`).join('');
  document.getElementById('block-selector-modal').style.display='flex';
}

function closeBlockSelectorModal() {
  document.getElementById('block-selector-modal').style.display='none';
}

function saveBlockSelector() {
  const enabled = BlockSelector._allTypes.filter(type=>document.getElementById('bst-'+type)?.checked);
  BlockSelector.save(enabled);
  BlockSelector.applyToSidebar();
  closeBlockSelectorModal();
  showToast('✅ Block library updated', enabled.length+' block types visible', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
────────────────────────────────────────────────────────────────── */
function showToast(title, sub, type='info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><div class="toast-text"><div class="toast-title">${title}</div>${sub?`<div class="toast-sub">${sub}</div>`:''}</div>`;
  container.appendChild(toast);
  setTimeout(()=>{ toast.classList.add('removing'); setTimeout(()=>toast.remove(), 300); }, 3500);
}

/* ──────────────────────────────────────────────────────────────────
   LANDING PAGE FUNCTIONS
────────────────────────────────────────────────────────────────── */
function openLoginModal(planHint) {
  document.getElementById('login-modal').style.display='flex';
  const input = document.getElementById('gate-input');
  if (input) { input.value=''; setTimeout(()=>input.focus(), 100); }
  const err = document.getElementById('gate-error');
  if (err) err.textContent='';
  const hint = document.getElementById('login-tier-hint');
  if (hint) hint.style.display='none';
}

function closeLoginModal() {
  document.getElementById('login-modal').style.display='none';
}

function previewTierFromCode(val) {
  const hint = document.getElementById('login-tier-hint');
  if (!hint) return;
  const result = Auth.verify(val);
  if (val.length>=4 && result.ok) {
    hint.style.display='flex';
    hint.textContent='✓ '+result.label+' plan detected';
  } else {
    hint.style.display='none';
  }
}

function toggleFaq(btn) {
  const item = btn.closest('.lp-faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.lp-faq-item').forEach(i=>i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

function toggleLpNav() {
  const menu = document.getElementById('lp-nav-mobile');
  if (menu) menu.classList.toggle('open');
}

function setGlassMode(mode) {
  State.glassMode = mode;
  document.body.classList.toggle('glass-soft', mode==='soft');
  document.getElementById('gt-pure')?.classList.toggle('active', mode==='pure');
  document.getElementById('gt-soft')?.classList.toggle('active', mode==='soft');
  try { localStorage.setItem('ss_glass_mode', mode); } catch(e) {}
}

/* ──────────────────────────────────────────────────────────────────
   AUTH FLOW
────────────────────────────────────────────────────────────────── */
function checkPassword() {
  const input = document.getElementById('gate-input');
  const error = document.getElementById('gate-error');
  const val = input.value.trim();
  const result = Auth.verify(val);

  if (result.ok) {
    State.authenticated = true;
    State.userTier = result.tier;
    closeLoginModal();

    const landing = document.getElementById('landing-page');
    if (landing) { landing.style.opacity='0'; landing.style.transition='opacity 0.4s ease'; setTimeout(()=>{ landing.style.display='none'; }, 400); }

    const app = document.getElementById('app');
    if (app) { setTimeout(()=>{ app.style.display='flex'; initApp(); }, 420); }
  } else {
    error.textContent = '❌ '+result.error;
    error.style.animation='none';
    requestAnimationFrame(()=>{ error.style.animation='shake 0.4s ease both'; });
    input.value=''; input.focus();
  }
}

document.addEventListener('keydown', function(e) {
  const loginModal = document.getElementById('login-modal');
  if (loginModal && loginModal.style.display!=='none' && e.key==='Enter') { checkPassword(); return; }

  if (e.key==='Escape') {
    closeLoginModal();
    if (State.authenticated) {
      closeBlockSettings(); closeFullPreview(); closeExportModal();
      closeBlockSelectorModal(); closeCollabModal(); closeDashboard();
    }
    return;
  }

  if (!State.authenticated) return;
  if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveCurrentProject(); }
  if ((e.ctrlKey||e.metaKey) && e.key==='p') { e.preventDefault(); openFullPreview(); }
  if ((e.ctrlKey||e.metaKey) && e.key==='z') { showToast('⌛ Undo', 'Use Version History to roll back', 'info'); }
});

/* ──────────────────────────────────────────────────────────────────
   SESSION PERSISTENCE
────────────────────────────────────────────────────────────────── */
function saveToSession() {
  try {
    const data = { blocks:State.blocks, globalStyles:State.globalStyles, currentTemplate:State.currentTemplate, customCSS:State.customCSS, blockIdCounter:State.blockIdCounter, currentProjectId:State.currentProjectId, siteName:document.getElementById('site-name-input')?.value };
    sessionStorage.setItem('supersuite_session', JSON.stringify(data));
  } catch(e) {}
}

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem('supersuite_session');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.blocks || data.blocks.length===0) return false;
    State.blocks = data.blocks;
    State.globalStyles = { ...State.globalStyles, ...(data.globalStyles||{}) };
    State.currentTemplate = data.currentTemplate||'glass';
    State.customCSS = data.customCSS||'';
    State.blockIdCounter = data.blockIdCounter||1;
    State.currentProjectId = data.currentProjectId||null;
    const sn = document.getElementById('site-name-input');
    if (sn && data.siteName) sn.value = data.siteName;
    return true;
  } catch(e) { return false; }
}

setInterval(()=>{ if (State.authenticated) saveToSession(); }, 30000);

/* ──────────────────────────────────────────────────────────────────
   INIT APP (called after successful login)
────────────────────────────────────────────────────────────────── */
function initApp() {
  const tier = State.userTier;
  const cfg = Auth.getTierConfig(tier);

  // Set tier badge
  const badge = document.getElementById('nav-tier-badge');
  if (badge) { badge.textContent = cfg.label; badge.className = 'nav-tier-badge '+tier; }

  // Show dashboard button for paid tiers
  const dashBtn = document.getElementById('btn-dashboard');
  if (dashBtn && tier !== 'free') dashBtn.style.display = 'flex';

  // Start usage tracker
  UsageTracker.init(tier);

  // Load saved glass mode
  try { const gm=localStorage.getItem('ss_glass_mode'); if(gm) setGlassMode(gm); } catch(e){}

  // Apply block selector
  BlockSelector.applyToSidebar();

  // Load session or render demo
  applyTemplate('glass');
  if (loadFromSession()) {
    refreshPreview(); updateLayers();
    showToast('📂 Session Restored', 'Your previous work was loaded', 'info');
  } else {
    loadStarterDemo();
  }

  // Render project & version lists
  renderProjectsList();
  renderVersionsList();

  // Load saved versions for current project
  if (State.currentProjectId) {
    try { const raw=localStorage.getItem('ss_versions_'+State.currentProjectId); if(raw) State.versions=JSON.parse(raw); renderVersionsList(); } catch(e){}
  }

  // Switch to builder body class
  document.body.classList.remove('lp-active');
  document.body.classList.add('builder-active');

  showToast('🎉 Welcome to Supersuite!', cfg.label+' plan · '+Auth.version, 'success');
}

function loadStarterDemo() {
  const enabled = BlockSelector.getEnabled();
  const demo = ['nav','hero','features','testimonials','pricing','cta','footer'];
  demo.filter(t=>enabled.includes(t)).forEach(t=>addBlock(t));
}

/* ──────────────────────────────────────────────────────────────────
   DRAG & DROP FROM SIDEBAR
────────────────────────────────────────────────────────────────── */
document.querySelectorAll('.block-card[draggable]').forEach(card=>{
  card.addEventListener('dragstart', e=>{
    const m = card.getAttribute('onclick')?.match(/addBlock\('(\w+)'\)/);
    if (m) e.dataTransfer.setData('blockType', m[1]);
  });
});

const canvasWrapper = document.getElementById('canvas-wrapper');
if (canvasWrapper) {
  canvasWrapper.addEventListener('dragover', e=>e.preventDefault());
  canvasWrapper.addEventListener('drop', e=>{ e.preventDefault(); const t=e.dataTransfer.getData('blockType'); if(t) addBlock(t); });
}

/* ──────────────────────────────────────────────────────────────────
   BOOT — restore glass mode on landing page load
────────────────────────────────────────────────────────────────── */
(function boot() {
  try { const gm=localStorage.getItem('ss_glass_mode'); if(gm==='soft') { document.body.classList.add('glass-soft'); document.getElementById('gt-pure')?.classList.remove('active'); document.getElementById('gt-soft')?.classList.add('active'); State.glassMode='soft'; } } catch(e){}
})();
