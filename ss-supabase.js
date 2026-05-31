/* ═══════════════════════════════════════════════════════════════════
   SUPERSUITE · SUPABASE INTEGRATION (SSV27.2)
   Real-time backend sync for users, sites, and exports.
   Every event on any device → Supabase → admin panel sees it live.
═══════════════════════════════════════════════════════════════════ */
'use strict';

const SSBase = (function(){
  const URL  = 'https://xcsypbpmiqmwfujrdjvb.supabase.co';
  const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjc3lwYnBtaXFtd2Z1anJkanZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDU0NjQsImV4cCI6MjA5NDY4MTQ2NH0.07Bk0YSYySfRAGdlvX50nFXtE9T9cgDdD9t2sHhQyPc';

  const headers = {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  };

  async function query(table, method, body, params){
    let endpoint = URL + '/rest/v1/' + table;
    if (params) endpoint += '?' + new URLSearchParams(params).toString();
    const opts = { method: method || 'GET', headers };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(endpoint, opts);
      if (!res.ok) {
        const err = await res.text();
        console.warn('[SSBase]', method, table, res.status, err);
        return null;
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch(e) {
      console.warn('[SSBase] fetch failed:', e.message);
      return null;
    }
  }

  /* ── Upsert a user record ──────────────────────────────────── */
  async function upsertUser(data){
    return query('users', 'POST', {
      email:          data.email        || '',
      business:       data.business     || '',
      tier:           data.tier         || 'free',
      industry:       data.industry     || '',
      last_seen:      new Date().toISOString(),
      sites_count:    data.sitesCount   || 0,
      exports_count:  data.exportsCount || 0,
      code:           data.code         || null
    });
  }

  /* ── Log a site build ──────────────────────────────────────── */
  async function logSite(data){
    return query('sites', 'POST', {
      owner_email:  data.email    || '',
      name:         data.name     || 'Untitled',
      industry:     data.industry || '',
      blocks_count: data.blocks   || 0,
      status:       data.status   || 'draft',
      updated_at:   new Date().toISOString()
    });
  }

  /* ── Log an export ─────────────────────────────────────────── */
  async function logExport(data){
    return query('exports', 'POST', {
      owner_email:  data.email    || '',
      site_name:    data.name     || 'Untitled',
      tier:         data.tier     || 'free',
      exported_at:  new Date().toISOString()
    });
  }

  /* ── Fetch all users (for admin) ───────────────────────────── */
  async function getUsers(){
    return query('users', 'GET', null, { order: 'joined_at.desc' }) || [];
  }

  /* ── Fetch all sites ───────────────────────────────────────── */
  async function getSites(){
    return query('sites', 'GET', null, { order: 'updated_at.desc' }) || [];
  }

  /* ── Fetch all exports ─────────────────────────────────────── */
  async function getExports(){
    return query('exports', 'GET', null, { order: 'exported_at.desc' }) || [];
  }

  /* ── Update a user's tier (admin action) ───────────────────── */
  async function setUserTier(email, tier){
    return query('users', 'PATCH', { tier }, { email: 'eq.' + email });
  }

  /* ── Delete a user ─────────────────────────────────────────── */
  async function deleteUser(email){
    return query('users', 'DELETE', null, { email: 'eq.' + email });
  }

  /* ── Hook into Supersuite events ───────────────────────────── */
  let _authHooked   = false;
  let _exportHooked = false;

  function hookAuth() {
    if (_authHooked) return;
    if (typeof Auth === 'undefined' || !Auth.verify) return;
    _authHooked = true;

    const _origVerify = Auth.verify.bind(Auth);
    Auth.verify = function(input){
      const result = _origVerify(input);
      if (result && result.ok) {
        // Collect everything available at this moment
        setTimeout(() => {
          const email    = (typeof State !== 'undefined' && State.userEmail) || localStorage.getItem('ss_user_email') || '';
          const business = (typeof State !== 'undefined' && State.businessName) || localStorage.getItem('ss_business_name') || '';
          const industry = (typeof State !== 'undefined' && State.industry) || '';
          const tier     = result.tier || 'free';
          if (!email) return;
          upsertUser({ email, business, tier, industry }).catch(()=>{});
          // Store email for later use
          try { localStorage.setItem('ss_user_email', email); } catch(e){}
        }, 500);
      }
      return result;
    };
    console.log('[SSBase] Auth.verify hooked');
  }

  function hookExport() {
    if (_exportHooked) return;
    if (typeof window.exportSite !== 'function') return;
    _exportHooked = true;

    const _origExport = window.exportSite;
    window.exportSite = function(){
      const result   = _origExport.apply(this, arguments);
      const email    = (typeof State !== 'undefined' && State.userEmail) || localStorage.getItem('ss_user_email') || '';
      const siteName = (document.getElementById('site-name-input') || {}).value || (typeof State !== 'undefined' && State.businessName) || 'Untitled';
      const tier     = (typeof State !== 'undefined' && State.userTier) || 'free';
      const blocks   = (typeof State !== 'undefined' && State.blocks && State.blocks.length) || 0;
      const industry = (typeof State !== 'undefined' && State.industry) || '';
      logExport({ email, name: siteName, tier }).catch(()=>{});
      logSite({ email, name: siteName, industry, blocks, status: 'exported' }).catch(()=>{});
      if (email) {
        query('users', 'PATCH', { exports_count: 'exports_count + 1', last_seen: new Date().toISOString() }, { email: 'eq.' + email }).catch(()=>{});
      }
      return result;
    };
    console.log('[SSBase] exportSite hooked');
  }

  // Also expose a direct login event so the builder can call it explicitly
  window.SSBaseOnLogin = function(email, tier, business, industry) {
    if (!email) return;
    upsertUser({ email, tier: tier||'free', business: business||'', industry: industry||'' }).catch(()=>{});
    try { localStorage.setItem('ss_user_email', email); } catch(e){}
  };

  // Retry hook attachment every 300ms for 15s
  let _hookAttempts = 0;
  const _hookInterval = setInterval(() => {
    _hookAttempts++;
    try { hookAuth(); } catch(e){}
    try { hookExport(); } catch(e){}
    if ((_authHooked && _exportHooked) || _hookAttempts > 50) {
      clearInterval(_hookInterval);
    }
  }, 300);

  // Periodic last_seen ping
  setInterval(() => {
    const email = localStorage.getItem('ss_user_email') || '';
    if (!email) return;
    query('users', 'PATCH', { last_seen: new Date().toISOString() }, { email: 'eq.' + email }).catch(()=>{});
  }, 5 * 60 * 1000);

  return { upsertUser, logSite, logExport, getUsers, getSites, getExports, setUserTier, deleteUser, query };
})();

window.SSBase = SSBase;
