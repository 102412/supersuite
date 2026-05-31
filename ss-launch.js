/* ═══════════════════════════════════════════════════════════════════
   SUPERSUITE — LAUNCH MODULE (SSV26.13)
   Adds:
    • Per-user generated 1-month access codes
    • Launch Day (June 1, 2026) auto-mint of free 1-month Agency code
    • Dynamic per-user / per-day AI-style theme (palette, fonts, radii)
    • Daily-fresh "Ready to Improve" panel on builder entry
    • Dynamic revenue-block styling per user (no hard-coded look)
═══════════════════════════════════════════════════════════════════ */
'use strict';

(function(){
  const LAUNCH_DATE = new Date('2026-06-01T00:00:00Z');
  const MS_MONTH    = 1000 * 60 * 60 * 24 * 30;
  const STORE_KEY   = 'ss_generated_codes_v1';
  const SEED_KEY    = 'ss_user_seed_v1';
  const LAST_DAY    = 'ss_last_open_day_v1';

  /* ── 1. Generated code store ──────────────────────────────────── */
  const Codes = {
    load(){ try { return JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); } catch(_){ return {}; } },
    save(db){ localStorage.setItem(STORE_KEY, JSON.stringify(db)); },
    mint(tier, opts){
      opts = opts || {};
      const db = this.load();
      const code = (opts.code || ('SS-' + this._rand(4) + '-' + this._rand(4))).toUpperCase();
      const now = Date.now();
      db[code] = {
        tier: tier,
        note: opts.note || 'Generated 1-month access',
        issuedAt: now,
        expiresAt: now + MS_MONTH,
        owner: opts.owner || ''
      };
      this.save(db);
      return { code, ...db[code] };
    },
    lookup(code){
      const db = this.load();
      const rec = db[(code||'').trim().toUpperCase()];
      if (!rec) return null;
      if (Date.now() > rec.expiresAt) return { expired: true, ...rec };
      return rec;
    },
    _rand(n){
      const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s='';
      for(let i=0;i<n;i++) s += A[Math.floor(Math.random()*A.length)];
      return s;
    }
  };
  window.SSCodes = Codes;

  /* ── 2. Patch Auth.verify to honor generated codes ───────────── */
  function patchAuth(){
    if (typeof Auth === 'undefined' || Auth.__sslaunchPatched) return;
    const original = Auth.verify.bind(Auth);
    Auth.verify = function(input){
      const r = original(input);
      if (r && r.ok) return r;
      const rec = Codes.lookup(input);
      if (!rec) return r;
      if (rec.expired) return { ok:false, error:'This 1-month access code has expired. Generate a new one or upgrade.' };
      const cfg = Auth.getTierConfig(rec.tier);
      const daysLeft = Math.max(0, Math.ceil((rec.expiresAt - Date.now())/86400000));
      return { ok:true, tier: rec.tier, label: cfg.label + ' · ' + daysLeft + 'd left', note: rec.note };
    };
    Auth.__sslaunchPatched = true;
  }

  /* ── 3. Launch-day promo card on landing ─────────────────────── */
  function isLaunchDay(){
    const now = new Date();
    return now.toISOString().slice(0,10) === '2026-06-01';
  }
  function daysUntilLaunch(){
    return Math.ceil((LAUNCH_DATE.getTime() - Date.now())/86400000);
  }
  function injectLaunchBanner(){
    if (document.getElementById('ss-launch-banner')) return;
    const nav = document.querySelector('.lp-nav'); if (!nav) return;
    const live = isLaunchDay();
    const d = daysUntilLaunch();
    const banner = document.createElement('div');
    banner.id = 'ss-launch-banner';
    banner.innerHTML = live
      ? `🎉 <b>Launch Day is here.</b> Every new account gets <b>1 month of Agency tier — free</b>. <button id="ss-claim-btn">Claim my code</button>`
      : (d > 0
        ? `🚀 Supersuite launches <b>June 1, 2026</b> — every new account gets <b>1 month Agency free</b>. <span style="opacity:.75">${d} day${d===1?'':'s'} to go.</span> <button id="ss-claim-btn">Reserve my code</button>`
        : `🚀 Launch promo active — claim your <b>1-month Agency code</b>. <button id="ss-claim-btn">Claim my code</button>`);
    nav.parentNode.insertBefore(banner, nav.nextSibling);
    document.getElementById('ss-claim-btn').addEventListener('click', claimLaunchCode);
  }

  function claimLaunchCode(){
    // Eligibility: launch day OR after launch day. Pre-launch reserves a code.
    const eligible = isLaunchDay() || Date.now() >= LAUNCH_DATE.getTime();
    const tier = eligible ? 'agency' : 'pro';
    const note = eligible ? 'Launch Day promo · 1 month Agency' : 'Reserved pre-launch · 1 month Pro';
    const minted = Codes.mint(tier, { note });
    showClaimDialog(minted, eligible);
  }

  function showClaimDialog(minted, eligible){
    const exp = new Date(minted.expiresAt).toLocaleDateString();
    const wrap = document.createElement('div');
    wrap.className = 'ss-claim-overlay';
    wrap.innerHTML = `
      <div class="ss-claim-card">
        <div class="ss-claim-mark">SS</div>
        <h2>${eligible ? 'Your 1-month Agency code' : 'Your reserved code'}</h2>
        <p>Save this code. It unlocks the full builder for <b>30 days</b>, expiring <b>${exp}</b>.</p>
        <div class="ss-claim-code" id="ss-claim-code">${minted.code}</div>
        <div class="ss-claim-row">
          <button id="ss-claim-copy">Copy code</button>
          <button id="ss-claim-enter">Enter Builder →</button>
        </div>
        <button class="ss-claim-x" aria-label="Close">×</button>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('.ss-claim-x').onclick = ()=> wrap.remove();
    wrap.querySelector('#ss-claim-copy').onclick = ()=>{
      navigator.clipboard.writeText(minted.code).then(()=>{
        wrap.querySelector('#ss-claim-copy').textContent = 'Copied ✓';
      });
    };
    wrap.querySelector('#ss-claim-enter').onclick = ()=>{
      wrap.remove();
      if (typeof openLoginModal === 'function') openLoginModal();
      setTimeout(()=>{
        const inp = document.getElementById('password-input') || document.querySelector('input[type="password"], input[type="text"]');
        if (inp) { inp.value = minted.code; inp.focus(); }
      }, 250);
    };
  }

  /* ── 4. Per-user / per-day dynamic theme seed ─────────────────── */
  function hash(str){
    let h = 2166136261 >>> 0;
    for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function pick(arr, h){ return arr[h % arr.length]; }
  function dayKey(){ return new Date().toISOString().slice(0,10); }

  const PALETTES = [
    { name:'Citrus Pulse',   primary:'#ff6b35', secondary:'#ffd166', accent:'#06d6a0', bg:'#fff8f0', text:'#1a1a2e' },
    { name:'Deep Ocean',     primary:'#0077b6', secondary:'#00b4d8', accent:'#90e0ef', bg:'#f0faff', text:'#03045e' },
    { name:'Forest Bloom',   primary:'#2d6a4f', secondary:'#95d5b2', accent:'#ffba08', bg:'#f7fff4', text:'#1b4332' },
    { name:'Studio Plum',    primary:'#7209b7', secondary:'#f72585', accent:'#4cc9f0', bg:'#fff5fb', text:'#240046' },
    { name:'Mono Slate',     primary:'#222831', secondary:'#393e46', accent:'#ff5722', bg:'#fafafa', text:'#111418' },
    { name:'Sunset Coral',   primary:'#ef476f', secondary:'#ffd166', accent:'#118ab2', bg:'#fff7f4', text:'#073b4c' },
    { name:'Electric Mint',  primary:'#06d6a0', secondary:'#118ab2', accent:'#ff6b6b', bg:'#f1fffb', text:'#0b3d2e' },
    { name:'Brutalist Gold', primary:'#000000', secondary:'#ffd60a', accent:'#003566', bg:'#ffffff', text:'#000000' }
  ];
  const FONT_PAIRS = [
    { heading:"'Syne', sans-serif",            body:"'DM Sans', sans-serif" },
    { heading:"'Space Grotesk', sans-serif",   body:"'DM Sans', sans-serif" },
    { heading:"'Playfair Display', serif",     body:"'Raleway', sans-serif" },
    { heading:"'Raleway', sans-serif",         body:"'Nunito', sans-serif" },
    { heading:"'Nunito', sans-serif",          body:"'DM Sans', sans-serif" }
  ];
  const RADII   = ['4px','10px','18px','28px'];
  const SHADOWS = [
    '0 4px 14px rgba(0,0,0,.08)',
    '0 12px 32px rgba(0,0,0,.12)',
    '0 24px 48px -12px rgba(0,0,0,.18)',
    '0 2px 0 rgba(0,0,0,.9)' // brutalist
  ];

  function loadOrMakeSeed(){
    let seed = null;
    try { seed = JSON.parse(localStorage.getItem(SEED_KEY)||'null'); } catch(_){}
    const userKey = (typeof State !== 'undefined' && State.businessName) ? State.businessName : (localStorage.getItem('ss_user_email') || 'guest');
    if (!seed || seed.userKey !== userKey){
      seed = { userKey, createdAt: Date.now() };
    }
    seed.day = dayKey();
    // re-derive daily flavor — palette stays per-user, accent rotates daily
    const baseH    = hash(userKey + '|brand');
    const dailyH   = hash(userKey + '|' + seed.day);
    seed.palette   = pick(PALETTES, baseH);
    seed.fonts     = pick(FONT_PAIRS, baseH >> 3);
    seed.radius    = pick(RADII, dailyH);
    seed.shadow    = pick(SHADOWS, dailyH >> 2);
    seed.gradient  = `linear-gradient(135deg, ${seed.palette.primary}, ${seed.palette.secondary})`;
    seed.heroLayout= ['split','centered','asymmetric','editorial'][dailyH % 4];
    localStorage.setItem(SEED_KEY, JSON.stringify(seed));
    return seed;
  }
  window.SSSeed = { current: loadOrMakeSeed, regenerate: ()=>{ localStorage.removeItem(SEED_KEY); return loadOrMakeSeed(); } };

  /* ── 5. Apply seed to State.globalStyles + dynamic block CSS ── */
  function applySeedToBuilder(){
    if (typeof State === 'undefined') return;
    const s = loadOrMakeSeed();
    State.globalStyles['--primary']      = s.palette.primary;
    State.globalStyles['--secondary']    = s.palette.secondary;
    State.globalStyles['--accent']       = s.palette.accent;
    State.globalStyles['--bg']           = s.palette.bg;
    State.globalStyles['--text']         = s.palette.text;
    State.globalStyles['--font-heading'] = s.fonts.heading;
    State.globalStyles['--font-body']    = s.fonts.body;
    State.globalStyles['--radius']       = s.radius;
    State.globalStyles['--btn-radius']   = s.radius;
    State.globalStyles['--shadow']       = s.shadow;
    // Inject dynamic CSS the preview iframe will inherit via customCSS hook
    State.customCSS = (State.customCSS||'') + `\n/* SS daily seed ${s.day} */\n`
      + `.block, .rev-block, [class*="block-"]{ border-radius: ${s.radius}; box-shadow: ${s.shadow}; }\n`
      + `.btn, button.cta, .lp-cta{ border-radius: ${s.radius}; background: ${s.gradient} !important; }\n`
      + `h1,h2,h3{ font-family: ${s.fonts.heading}; }\n`
      + `body{ font-family: ${s.fonts.body}; background: ${s.palette.bg}; color: ${s.palette.text}; }\n`;
    if (typeof refreshPreview === 'function') refreshPreview();
  }

  /* ── 6. Daily "Ready to Improve" panel ──────────────────────── */
  const SUGGESTIONS = [
    'Try a sharper hero headline focused on the outcome, not the feature.',
    'Add a 3-step "How it works" block — visitors love a clear path.',
    'Swap the primary CTA copy for a verb + benefit ("Get my free quote").',
    'Pull one customer quote into the hero for instant social proof.',
    'Try the new asymmetric hero layout — fresh today.',
    'Tighten your pricing block: 3 plans, 1 highlighted as recommended.',
    'Add a sticky bottom CTA on mobile to lift conversions.',
    'Test a brutalist headline with a single accent color.',
    'Replace stock imagery with one strong product photo.',
    'Shorten paragraphs to 2 lines max — visitors skim, never read.',
    'Add an FAQ block — it crushes objections silently.',
    'Try a darker section divider for editorial rhythm.'
  ];
  function todaysSuggestions(seed){
    const h = hash(seed.userKey + '|sugg|' + seed.day);
    const out = [];
    for (let i=0; i<3; i++) out.push(SUGGESTIONS[(h + i*7) % SUGGESTIONS.length]);
    return out;
  }

  function showReadyToImprove(){
    const today = dayKey();
    const last  = localStorage.getItem(LAST_DAY);
    if (last === today) return; // only first builder entry of the day
    localStorage.setItem(LAST_DAY, today);

    const seed = loadOrMakeSeed();
    const sugg = todaysSuggestions(seed);
    const panel = document.createElement('div');
    panel.className = 'ss-ready-panel';
    panel.innerHTML = `
      <div class="ss-ready-head">
        <div>
          <div class="ss-ready-eyebrow">Today · ${today}</div>
          <div class="ss-ready-title">Ready to improve</div>
        </div>
        <button class="ss-ready-x" aria-label="Close">×</button>
      </div>
      <div class="ss-ready-theme">
        Today's design seed → <b>${seed.palette.name}</b> · ${seed.heroLayout} hero · radius ${seed.radius}
      </div>
      <ul class="ss-ready-list">
        ${sugg.map(s=>`<li>${s}</li>`).join('')}
      </ul>
      <div class="ss-ready-row">
        <button id="ss-apply-seed">Apply today's design</button>
        <button id="ss-reroll-seed">Re-roll</button>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector('.ss-ready-x').onclick = ()=> panel.remove();
    panel.querySelector('#ss-apply-seed').onclick = ()=>{ applySeedToBuilder(); panel.remove(); };
    panel.querySelector('#ss-reroll-seed').onclick = ()=>{
      window.SSSeed.regenerate(); panel.remove(); showReadyToImprove();
    };
  }

  /* ── 7. Wrap initApp to inject builder-entry behaviors ──────── */
  function wrapInitApp(){
    if (typeof window.initApp !== 'function' || window.__ssWrappedInit) return;
    const orig = window.initApp;
    window.initApp = function(){
      patchAuth();
      const r = orig.apply(this, arguments);
      try { applySeedToBuilder(); } catch(e){ console.warn('[ss-launch seed]', e); }
      setTimeout(()=>{ try { showReadyToImprove(); } catch(e){ console.warn('[ss-launch ready]', e); } }, 1400);
      return r;
    };
    window.__ssWrappedInit = true;
  }

  /* ── 8. Boot ────────────────────────────────────────────────── */
  function boot(){
    patchAuth();
    wrapInitApp();
    if (document.getElementById('landing-page')) injectLaunchBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  // patchAuth/wrapInit may need a retry once script.js finishes defining things
  setTimeout(boot, 50);
  setTimeout(boot, 500);
})();
