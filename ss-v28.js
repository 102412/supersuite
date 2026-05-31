/* ═══════════════════════════════════════════════════════════════════
   SUPERSUITE V28 — AI PROMPT ENGINE
   Single prompt → AI generates full unique site → live preview gate
   → payment → unlock full inline editing
   Powered by: Cloudflare Worker → Groq llama-3.3-70b-versatile
═══════════════════════════════════════════════════════════════════ */
'use strict';

const SSV28 = (function(){

  const WORKER_URL = 'https://supersuite-ai.rylandritchie12.workers.dev/';
  const SESSION_KEY = 'ss_v28_generated_site';
  const PROMPT_KEY  = 'ss_v28_last_prompt';

  /* ── State ─────────────────────────────────────────────────── */
  let generatedSite = null;  // { html, prompt, businessName, industry, sections[] }
  let generating    = false;

  /* ── Public: focus the prompt input ───────────────────────── */
  function focusPrompt(){
    const inp = document.getElementById('lp-prompt-input');
    if (inp) { inp.focus(); inp.scrollIntoView({ behavior:'smooth', block:'center' }); }
  }

  /* ── Public: use an example chip ──────────────────────────── */
  function useChip(btn){
    const inp = document.getElementById('lp-prompt-input');
    if (!inp) return;
    inp.value = btn.textContent.replace(/^[^\w]+/, '').trim();
    inp.style.height = 'auto';
    inp.style.height = inp.scrollHeight + 'px';
    inp.focus();
    startFromPrompt();
  }

  /* ── Public: go back to prompt ─────────────────────────────── */
  function backToPrompt(){
    document.getElementById('lp-preview-gate').style.display = 'none';
    document.getElementById('lp-hero-inner-v28') && document.querySelector('.lp-hero-inner-v28').scrollIntoView({ behavior:'smooth' });
    const inp = document.getElementById('lp-prompt-input');
    if (inp) inp.focus();
  }

  /* ── Public: save generated site for after checkout ─────── */
  function saveForAfterCheckout(){
    if (!generatedSite) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        html:         generatedSite.html,
        prompt:       generatedSite.prompt,
        businessName: generatedSite.businessName,
        industry:     generatedSite.industry,
        sections:     generatedSite.sections,
        cssVars:      generatedSite.cssVars,
        savedAt:      Date.now()
      }));
    } catch(e) {}
  }

  /* ── Main: start from prompt ───────────────────────────────── */
  async function startFromPrompt(){
    const inp = document.getElementById('lp-prompt-input');
    const prompt = (inp?.value || '').trim();
    if (!prompt || generating) return;
    if (prompt.length < 10) {
      inp.style.border = '2px solid #f87171';
      inp.placeholder = 'Tell us a bit more about your business...';
      setTimeout(() => { inp.style.border = ''; }, 2000);
      return;
    }

    generating = true;
    try { localStorage.setItem(PROMPT_KEY, prompt); } catch(e){}

    // Show generating state
    showGenerating(true);

    try {
      // Step 1 — extract business info from prompt
      activateStep(1);
      const info = await extractBusinessInfo(prompt);

      // Step 2 — generate copy
      activateStep(2);
      const copy = await generateSiteCopy(prompt, info);

      // Step 3 — design decisions
      activateStep(3);
      const design = await generateDesignSpec(prompt, info);

      // Step 4 — build HTML
      activateStep(4);
      const html = buildSiteHTML(info, copy, design);

      // Step 5 — fetch Unsplash photos
      activateStep(5);
      const photos = await fetchUnsplashPhotos(info.industry || info.businessType);
      const finalHTML = injectPhotos(html, photos);

      // Store result
      generatedSite = {
        html: finalHTML,
        prompt,
        businessName: info.businessName,
        industry:     info.industry || info.businessType,
        sections:     design.sections,
        cssVars:      design.cssVars
      };

      // Show preview gate
      showGenerating(false);
      showPreviewGate(generatedSite);

    } catch(err) {
      console.error('[SSV28]', err);
      showGenerating(false);
      // Fallback — build a basic site from the prompt without AI
      const fallbackSite = buildFallbackSite(prompt);
      generatedSite = fallbackSite;
      showPreviewGate(fallbackSite);
    } finally {
      generating = false;
    }
  }

  /* ── AI Call: extract business info ───────────────────────── */
  async function extractBusinessInfo(prompt){
    const res = await callWorker([{
      role: 'system',
      content: 'You are a business analyst. Extract info from the user description. Respond ONLY with valid JSON, no markdown:\n{"businessName":"","businessType":"","industry":"","location":"","targetCustomers":"","primaryGoal":"get calls|get bookings|sell products|show portfolio|build trust","tone":"professional|friendly|bold|luxury|playful"}'
    },{
      role: 'user',
      content: prompt
    }], { max_tokens: 300, temperature: 0.3 });
    return safeParseJSON(res, {
      businessName: extractBusinessName(prompt),
      businessType: 'business',
      industry: 'business',
      location: '',
      targetCustomers: 'local customers',
      primaryGoal: 'get calls',
      tone: 'professional'
    });
  }

  /* ── AI Call: generate all site copy ──────────────────────── */
  async function generateSiteCopy(prompt, info){
    const res = await callWorker([{
      role: 'system',
      content: `You are a world-class copywriter. Write website copy for this business. Respond ONLY with valid JSON, no markdown:
{"heroHeadline":"","heroSubheadline":"","heroCTA":"","feature1Title":"","feature1Body":"","feature2Title":"","feature2Body":"","feature3Title":"","feature3Body":"","testimonialsHeading":"","testimonial1":"","testimonial1Author":"","testimonial2":"","testimonial2Author":"","ctaHeading":"","ctaBody":"","ctaCTA":"","footerTagline":"","navCTA":""}`
    },{
      role: 'user',
      content: `Business: ${JSON.stringify(info)}\nOriginal prompt: ${prompt}`
    }], { max_tokens: 800, temperature: 0.7 });
    return safeParseJSON(res, defaultCopy(info));
  }

  /* ── AI Call: generate design spec ────────────────────────── */
  async function generateDesignSpec(prompt, info){
    const res = await callWorker([{
      role: 'system',
      content: `You are a UI designer. Create a unique design spec. Respond ONLY with valid JSON, no markdown:
{"primaryColor":"#hexcode","secondaryColor":"#hexcode","accentColor":"#hexcode","bgColor":"#hexcode","textColor":"#hexcode","headingFont":"font name from Google Fonts","bodyFont":"font name from Google Fonts","borderRadius":"4px|10px|18px|28px","shadowStyle":"none|soft|medium|dramatic","buttonStyle":"filled|outlined|pill","sections":["nav","hero","features","testimonials","cta","footer"],"unsplashQuery":"2-4 word industry photo query","heroLayout":"centered|split|bold"}`
    },{
      role: 'user',
      content: `Tone: ${info.tone}. Industry: ${info.industry}. Goal: ${info.primaryGoal}. Prompt: ${prompt}`
    }], { max_tokens: 400, temperature: 0.8 });
    return safeParseJSON(res, defaultDesign(info));
  }

  /* ── Build full site HTML from specs ───────────────────────── */
  function buildSiteHTML(info, copy, design){
    const {
      primaryColor   = '#ff6b35',
      secondaryColor = '#1a1a2e',
      accentColor    = '#ffd166',
      bgColor        = '#ffffff',
      textColor      = '#1a1a2e',
      headingFont    = 'Syne',
      bodyFont       = 'DM Sans',
      borderRadius   = '10px',
      shadowStyle    = 'soft',
      buttonStyle    = 'filled',
      heroLayout     = 'centered'
    } = design;

    const shadow = shadowStyle === 'soft'     ? '0 4px 20px rgba(0,0,0,.08)'
                 : shadowStyle === 'medium'   ? '0 8px 32px rgba(0,0,0,.14)'
                 : shadowStyle === 'dramatic' ? '0 20px 60px rgba(0,0,0,.22)'
                 : 'none';

    const btnRadius = buttonStyle === 'pill' ? '100px' : buttonStyle === 'outlined' ? borderRadius : borderRadius;
    const btnBorder = buttonStyle === 'outlined' ? `2px solid ${primaryColor}` : 'none';
    const btnBg     = buttonStyle === 'outlined' ? 'transparent' : primaryColor;
    const btnColor  = buttonStyle === 'outlined' ? primaryColor : '#ffffff';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(info.businessName)} | ${esc(info.businessType)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@700;800&family=${encodeURIComponent(bodyFont)}:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --primary:${primaryColor};
  --secondary:${secondaryColor};
  --accent:${accentColor};
  --bg:${bgColor};
  --text:${textColor};
  --radius:${borderRadius};
  --shadow:${shadow};
  --font-h:'${headingFont}',sans-serif;
  --font-b:'${bodyFont}',sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--font-b);line-height:1.6}
.container{max-width:1160px;margin:0 auto;padding:0 24px}
a{color:inherit;text-decoration:none}

/* NAV */
nav{background:var(--bg);border-bottom:1px solid rgba(0,0,0,.07);padding:0;position:sticky;top:0;z-index:100;box-shadow:var(--shadow)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
.nav-logo{font-family:var(--font-h);font-weight:800;font-size:20px;color:var(--primary)}
.nav-links{display:flex;gap:28px;font-size:14px;font-weight:500;opacity:.75}
.nav-cta{background:var(--primary);color:#fff;padding:10px 22px;border-radius:var(--radius);font-weight:600;font-size:14px;border:none;cursor:pointer;transition:.15s}
.nav-cta:hover{opacity:.88;transform:translateY(-1px)}

/* HERO */
.hero{padding:100px 0 80px;text-align:${heroLayout === 'split' ? 'left' : 'center'};background:${heroLayout === 'bold' ? `linear-gradient(135deg,${primaryColor},${secondaryColor})` : 'var(--bg)'}; ${heroLayout === 'bold' ? 'color:#fff' : ''}}
.hero-inner{${heroLayout === 'split' ? 'display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center' : 'max-width:760px;margin:0 auto'}}
.hero h1{font-family:var(--font-h);font-size:clamp(38px,6vw,68px);font-weight:800;line-height:1.05;letter-spacing:-0.03em;margin-bottom:22px;${heroLayout !== 'bold' ? `color:var(--primary)` : 'color:#fff'}}
.hero-accent{color:var(--accent)}
.hero p{font-size:18px;opacity:.75;margin-bottom:32px;line-height:1.7}
.hero-btns{display:flex;gap:14px;${heroLayout !== 'split' ? 'justify-content:center' : ''};flex-wrap:wrap}
.btn-primary{background:${btnBg};color:${btnColor};border:${btnBorder};padding:15px 32px;border-radius:${btnRadius};font-weight:700;font-size:16px;cursor:pointer;transition:.15s;display:inline-block;box-shadow:0 6px 20px rgba(0,0,0,.15)}
.btn-primary:hover{transform:translateY(-2px);opacity:.9}
.btn-secondary{background:transparent;color:${heroLayout === 'bold' ? '#fff' : 'var(--primary)'};border:2px solid ${heroLayout === 'bold' ? 'rgba(255,255,255,.5)' : 'var(--primary)'};padding:13px 30px;border-radius:${btnRadius};font-weight:600;font-size:16px;cursor:pointer;transition:.15s;display:inline-block}
.btn-secondary:hover{background:${heroLayout === 'bold' ? 'rgba(255,255,255,.1)' : 'var(--primary)'};color:${heroLayout === 'bold' ? '#fff' : '#fff'}}
.hero-img{border-radius:calc(var(--radius) * 2);box-shadow:var(--shadow);overflow:hidden;aspect-ratio:4/3;background:${primaryColor}20}
.hero-img img{width:100%;height:100%;object-fit:cover}

/* FEATURES */
.features{padding:90px 0;background:${secondaryColor === '#1a1a2e' ? '#f8f9fc' : bgColor + '11'}}
.section-label{font-family:var(--font-b);font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--primary);margin-bottom:14px}
.section-title{font-family:var(--font-h);font-size:clamp(28px,4vw,44px);font-weight:800;letter-spacing:-0.02em;margin-bottom:16px}
.section-sub{font-size:17px;opacity:.65;max-width:560px;${heroLayout !== 'split' ? 'margin:0 auto 52px' : 'margin-bottom:52px'};line-height:1.7}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px}
.feat-card{background:#fff;border-radius:var(--radius);padding:32px;box-shadow:var(--shadow);border:1px solid rgba(0,0,0,.05);transition:.2s}
.feat-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.12)}
.feat-icon{font-size:36px;margin-bottom:16px}
.feat-title{font-family:var(--font-h);font-size:20px;font-weight:700;margin-bottom:10px}
.feat-body{font-size:15px;opacity:.7;line-height:1.6}

/* TESTIMONIALS */
.testimonials{padding:90px 0;background:var(--bg);text-align:center}
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;margin-top:48px}
.testimonial{background:#fff;border-radius:var(--radius);padding:28px;border:1px solid rgba(0,0,0,.07);box-shadow:var(--shadow);text-align:left}
.testimonial-text{font-size:15px;line-height:1.7;opacity:.8;margin-bottom:18px;font-style:italic}
.testimonial-text::before{content:'"';font-size:40px;color:var(--primary);line-height:0;vertical-align:-16px;margin-right:4px}
.testimonial-author{font-weight:700;font-size:14px;color:var(--primary)}
.stars{color:#fbbf24;font-size:14px;margin-bottom:12px}

/* CTA SECTION */
.cta-section{padding:100px 0;background:linear-gradient(135deg,var(--primary),var(--secondary));text-align:center;color:#fff}
.cta-section h2{font-family:var(--font-h);font-size:clamp(30px,5vw,52px);font-weight:800;letter-spacing:-0.02em;margin-bottom:18px}
.cta-section p{font-size:18px;opacity:.85;margin-bottom:36px;max-width:520px;margin-left:auto;margin-right:auto}
.cta-section .btn-primary{background:#fff;color:var(--primary)}

/* FOOTER */
footer{background:var(--secondary);color:#fff;padding:48px 0 32px}
.footer-inner{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:32px;margin-bottom:36px}
.footer-brand{font-family:var(--font-h);font-size:22px;font-weight:800;margin-bottom:8px}
.footer-tagline{font-size:14px;opacity:.6}
.footer-links{display:flex;gap:24px;font-size:14px;opacity:.7;flex-wrap:wrap}
.footer-links a:hover{opacity:1}
.footer-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:24px;font-size:13px;opacity:.5;text-align:center}

@media(max-width:768px){
  .hero-inner{grid-template-columns:1fr!important}
  .hero-img{display:none}
  .nav-links{display:none}
  .hero h1{font-size:38px}
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="container">
    <div class="nav-inner">
      <div class="nav-logo">${esc(info.businessName)}</div>
      <div class="nav-links">
        <a href="#features">Services</a>
        <a href="#testimonials">Reviews</a>
        <a href="#cta">Contact</a>
      </div>
      <button class="nav-cta">${esc(copy.navCTA || 'Get in Touch')}</button>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="container">
    <div class="hero-inner">
      <div class="hero-text">
        <h1>${esc(copy.heroHeadline || info.businessName)}</h1>
        <p>${esc(copy.heroSubheadline || '')}</p>
        <div class="hero-btns">
          <a href="#cta" class="btn-primary">${esc(copy.heroCTA || 'Get Started')}</a>
          <a href="#features" class="btn-secondary">Learn More</a>
        </div>
      </div>
      ${heroLayout === 'split' ? `<div class="hero-img"><img id="hero-photo" src="" alt="${esc(info.businessName)}"></div>` : ''}
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="features" id="features">
  <div class="container">
    <div class="section-label">Why choose us</div>
    <h2 class="section-title">${esc(copy.feature1Title ? 'What makes ' + info.businessName + ' different' : 'Our Services')}</h2>
    <p class="section-sub">Serving ${esc(info.location || 'customers')} with exceptional ${esc(info.industry || 'service')}.</p>
    <div class="features-grid">
      <div class="feat-card">
        <div class="feat-icon">⚡</div>
        <div class="feat-title">${esc(copy.feature1Title || 'Fast & Reliable')}</div>
        <div class="feat-body">${esc(copy.feature1Body || '')}</div>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🏆</div>
        <div class="feat-title">${esc(copy.feature2Title || 'Expert Quality')}</div>
        <div class="feat-body">${esc(copy.feature2Body || '')}</div>
      </div>
      <div class="feat-card">
        <div class="feat-icon">💰</div>
        <div class="feat-title">${esc(copy.feature3Title || 'Fair Pricing')}</div>
        <div class="feat-body">${esc(copy.feature3Body || '')}</div>
      </div>
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->
<section class="testimonials" id="testimonials">
  <div class="container">
    <div class="section-label">Reviews</div>
    <h2 class="section-title">${esc(copy.testimonialsHeading || 'What our clients say')}</h2>
    <div class="testimonials-grid">
      <div class="testimonial">
        <div class="stars">★★★★★</div>
        <div class="testimonial-text">${esc(copy.testimonial1 || 'Outstanding service. Would highly recommend.')}</div>
        <div class="testimonial-author">${esc(copy.testimonial1Author || 'Happy Customer')}</div>
      </div>
      <div class="testimonial">
        <div class="stars">★★★★★</div>
        <div class="testimonial-text">${esc(copy.testimonial2 || 'Professional, fast, and reliable. Exactly what we needed.')}</div>
        <div class="testimonial-author">${esc(copy.testimonial2Author || 'Satisfied Client')}</div>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-section" id="cta">
  <div class="container">
    <h2>${esc(copy.ctaHeading || 'Ready to get started?')}</h2>
    <p>${esc(copy.ctaBody || 'Contact us today and we will get back to you within the hour.')}</p>
    <a href="tel:+1" class="btn-primary">${esc(copy.ctaCTA || 'Contact Us Now')}</a>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="container">
    <div class="footer-inner">
      <div>
        <div class="footer-brand">${esc(info.businessName)}</div>
        <div class="footer-tagline">${esc(copy.footerTagline || info.businessType + ' · ' + (info.location || ''))}</div>
      </div>
      <div class="footer-links">
        <a href="#features">Services</a>
        <a href="#testimonials">Reviews</a>
        <a href="#cta">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(info.businessName)}. All rights reserved.</div>
  </div>
</footer>

</body>
</html>`;
  }

  /* ── Fetch Unsplash photos ──────────────────────────────────── */
  async function fetchUnsplashPhotos(query){
    const KEY = '6cc194de6357f1e38c5ae89f32b6e4e49c9bc6d59e8d42e10d1cd3f85c5476c';
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${KEY}` } }
      );
      const data = await res.json();
      return (data.results || []).map(p => ({
        url:   p.urls.regular,
        thumb: p.urls.small,
        alt:   p.alt_description || query
      }));
    } catch(e) { return []; }
  }

  /* ── Inject Unsplash photos into HTML ──────────────────────── */
  function injectPhotos(html, photos){
    if (!photos.length) return html;
    // Hero split photo
    if (photos[0]) {
      html = html.replace(
        '<img id="hero-photo" src="" alt=',
        `<img id="hero-photo" src="${photos[0].url}" alt=`
      );
    }
    return html;
  }

  /* ── Show/hide generating state ────────────────────────────── */
  function showGenerating(show){
    const wrap      = document.getElementById('lp-prompt-wrap');
    const genState  = document.getElementById('lp-generating');
    const btn       = document.getElementById('lp-prompt-btn');
    const btnText   = document.getElementById('lp-prompt-btn-text');
    if (show) {
      if (wrap)     wrap.style.opacity = '0.4';
      if (wrap)     wrap.style.pointerEvents = 'none';
      if (genState) genState.style.display = 'flex';
      if (btnText)  btnText.textContent = 'Building...';
      if (btn)      btn.disabled = true;
      // Reset steps
      document.querySelectorAll('.lp-gen-step').forEach(s => s.classList.remove('active','done'));
    } else {
      if (wrap)     { wrap.style.opacity = ''; wrap.style.pointerEvents = ''; }
      if (genState) genState.style.display = 'none';
      if (btnText)  btnText.textContent = 'Build my site →';
      if (btn)      btn.disabled = false;
    }
  }

  function activateStep(n){
    for (let i = 1; i < n; i++) {
      const s = document.getElementById('gstep-' + i);
      if (s) { s.classList.remove('active'); s.classList.add('done'); s.textContent = '✓ ' + s.textContent.replace(/^[✦✓] /, ''); }
    }
    const curr = document.getElementById('gstep-' + n);
    if (curr) curr.classList.add('active');
  }

  /* ── Show preview gate ─────────────────────────────────────── */
  function showPreviewGate(site){
    const gate = document.getElementById('lp-preview-gate');
    if (!gate) return;
    gate.style.display = 'block';
    gate.scrollIntoView({ behavior:'smooth', block:'start' });

    // Set title
    const title = document.getElementById('lp-pg-title');
    if (title) title.textContent = site.businessName || 'Your site';

    // Set URL bar
    const urlBar = document.getElementById('lp-pg-url');
    if (urlBar) {
      const slug = (site.businessName || 'my-site').toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').slice(0,25);
      urlBar.textContent = slug + '.supersuite.app';
    }

    // Set site info
    const info = document.getElementById('lp-pg-site-info');
    if (info) {
      info.innerHTML = `
        <div class="lp-pg-info-row"><span>Business</span><strong>${esc(site.businessName || '—')}</strong></div>
        <div class="lp-pg-info-row"><span>Industry</span><strong>${esc(site.industry || '—')}</strong></div>
        <div class="lp-pg-info-row"><span>Sections</span><strong>${(site.sections || []).length} unique sections</strong></div>
        <div class="lp-pg-info-row"><span>AI-written copy</span><strong>✓ Personalized</strong></div>
        <div class="lp-pg-info-row"><span>Design</span><strong>✓ Unique to you</strong></div>
      `;
    }

    // Load iframe
    const iframe = document.getElementById('lp-preview-iframe');
    if (iframe) {
      iframe.srcdoc = site.html;
    }
  }

  /* ── Cloudflare Worker call ─────────────────────────────────── */
  async function callWorker(messages, opts){
    opts = opts || {};
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        max_tokens:  opts.max_tokens  || 1024,
        temperature: opts.temperature || 0.7,
        model:       opts.model       || 'llama-3.3-70b-versatile'
      })
    });
    if (!res.ok) throw new Error('Worker HTTP ' + res.status);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /* ── Helpers ────────────────────────────────────────────────── */
  function safeParseJSON(text, fallback){
    try {
      const match = text.match(/\{[\s\S]+\}/);
      return match ? JSON.parse(match[0]) : fallback;
    } catch(e) { return fallback; }
  }

  function extractBusinessName(prompt){
    const patterns = [
      /(?:called|named|my business is|business name is|we are|i run)\s+([A-Z][^\s,\.]+(?:\s+[A-Z][^\s,\.]+)*)/i,
      /^([A-Z][^\s,\.]+(?:'s)?(?:\s+[A-Z][^\s,\.]+)*)/
    ];
    for (const p of patterns) {
      const m = prompt.match(p);
      if (m) return m[1].trim();
    }
    return 'Your Business';
  }

  function esc(s){
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function defaultCopy(info){
    const n = info.businessName || 'Your Business';
    return {
      heroHeadline: n + ' — ' + (info.industry || 'Expert Services'),
      heroSubheadline: 'Serving ' + (info.location || 'customers') + ' with professional ' + (info.industry || 'services') + '.',
      heroCTA: info.primaryGoal === 'get calls' ? 'Call Now' : info.primaryGoal === 'get bookings' ? 'Book Now' : 'Get Started',
      feature1Title: 'Fast & Reliable',    feature1Body: 'Quick turnaround, results you can count on.',
      feature2Title: 'Expert Quality',      feature2Body: 'Years of experience in ' + (info.industry||'the industry') + '.',
      feature3Title: 'Fair Pricing',        feature3Body: 'Transparent quotes with no hidden fees.',
      testimonialsHeading: 'What our clients say',
      testimonial1: 'Outstanding service — exceeded all expectations.', testimonial1Author: 'Happy Customer',
      testimonial2: 'Professional, fast, and reliable. Highly recommend.', testimonial2Author: 'Satisfied Client',
      ctaHeading: 'Ready to get started?',
      ctaBody: 'Contact ' + n + ' today and we will get back to you within the hour.',
      ctaCTA: 'Contact Us Now',
      footerTagline: n + ' — ' + (info.industry||'services') + ' · ' + (info.location||''),
      navCTA: info.primaryGoal === 'get calls' ? 'Call Now' : 'Get in Touch'
    };
  }

  function defaultDesign(info){
    const palettes = {
      professional: { primaryColor:'#1a3a5c', secondaryColor:'#0f2540', accentColor:'#3b82f6', bgColor:'#f8fafc', textColor:'#1e293b' },
      friendly:     { primaryColor:'#16a34a', secondaryColor:'#14532d', accentColor:'#86efac', bgColor:'#f0fdf4', textColor:'#14532d' },
      bold:         { primaryColor:'#dc2626', secondaryColor:'#1c1c1c', accentColor:'#fbbf24', bgColor:'#ffffff', textColor:'#111111' },
      luxury:       { primaryColor:'#92400e', secondaryColor:'#1c1917', accentColor:'#d97706', bgColor:'#fffbeb', textColor:'#1c1917' },
      playful:      { primaryColor:'#7c3aed', secondaryColor:'#2e1065', accentColor:'#f472b6', bgColor:'#faf5ff', textColor:'#1e1b4b' }
    };
    const pal = palettes[info.tone] || palettes.professional;
    return {
      ...pal,
      headingFont: 'Syne', bodyFont: 'DM Sans',
      borderRadius: '10px', shadowStyle: 'soft', buttonStyle: 'filled',
      sections: ['nav','hero','features','testimonials','cta','footer'],
      unsplashQuery: info.industry || 'business',
      heroLayout: 'centered'
    };
  }

  function buildFallbackSite(prompt){
    const name = extractBusinessName(prompt);
    const info = { businessName: name, businessType: 'business', industry: 'business', location: '', primaryGoal: 'get calls', tone: 'professional' };
    const copy = defaultCopy(info);
    const design = defaultDesign(info);
    return {
      html: buildSiteHTML(info, copy, design),
      prompt,
      businessName: name,
      industry: 'business',
      sections: design.sections,
      cssVars: {}
    };
  }

  /* ── On load: restore saved site if returning from checkout ── */
  (function checkReturningFromCheckout(){
    try {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        // They came from success.html with a code — open the builder
        sessionStorage.setItem('ss_prefill_code', code);
        history.replaceState({}, '', window.location.pathname);
        // Try to restore their generated site
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const site = JSON.parse(saved);
          if (site && site.html && Date.now() - site.savedAt < 2 * 60 * 60 * 1000) {
            generatedSite = site;
            // Open builder with generated site
            if (typeof openLoginModal === 'function') {
              setTimeout(() => openLoginModal(), 500);
            }
          }
        }
      }
    } catch(e){}
  })();

  /* ── Public API ─────────────────────────────────────────────── */
  return { startFromPrompt, focusPrompt, useChip, backToPrompt, saveForAfterCheckout };

})();

window.SSV28 = SSV28;
