SUPERSUITE SSV27.5 — LAUNCH READY
===================================

BEFORE LAUNCH — DO THESE 3 THINGS:

1. RUN THIS SQL IN SUPABASE (SQL Editor):
-------------------------------------------
create table if not exists access_codes (
  id         uuid default gen_random_uuid() primary key,
  code       text unique not null,
  tier       text default 'single',
  email      text,
  issued_at  timestamptz default now(),
  expires_at timestamptz,
  used       boolean default false,
  used_at    timestamptz,
  source     text default 'gumroad'
);
alter table access_codes enable row level security;
create policy "anon all access_codes" on access_codes for all using (true) with check (true);

-- Also run the users/sites/exports policies if not done yet:
alter table users   enable row level security;
alter table sites   enable row level security;
alter table exports enable row level security;
create policy "anon all users"   on users   for all using (true) with check (true);
create policy "anon all sites"   on sites   for all using (true) with check (true);
create policy "anon all exports" on exports for all using (true) with check (true);


2. SET UP GUMROAD PRODUCTS:
----------------------------
Create 3 products on gumroad.com:
  - Single Site: $14.95 one-time
    Success URL: https://yourdomain.com/success.html?tier=single&email={email}
  - Pro Plan: $29.99/month
    Success URL: https://yourdomain.com/success.html?tier=pro&email={email}
  - Agency Plan: $97.70/month
    Success URL: https://yourdomain.com/success.html?tier=agency&email={email}

Then update the Gumroad URLs in index.html:
  supersuite.gumroad.com/l/single -> your actual product URL
  supersuite.gumroad.com/l/pro    -> your actual product URL
  supersuite.gumroad.com/l/agency -> your actual product URL


3. DEPLOY TO VERCEL:
---------------------
  vercel --prod
  (vercel.json already configured)


WHAT'S FIXED IN SSV27.5:
--------------------------
- AI onboarding NOW triggers on every fresh login (not skipped)
- AI chat (AIHub) works — wired to NVIDIA NIM Gemma 3 27B
- AIBridge wired to NIM (no more "failed to fetch")
- Session wipe on every load — must sign in fresh every time
- Gumroad buy buttons on landing page (real prices)
- success.html — generates unique code, logs to Supabase, guides user
- Code auto-fills in login modal when arriving from success page
- Collab/share fully removed

FLOW ON LAUNCH DAY:
--------------------
  Customer hits landing page
  -> Clicks "Buy Now" -> Gumroad overlay
  -> Pays -> Redirected to success.html
  -> Unique code generated + logged to Supabase
  -> Downloads Supersuite zip automatically
  -> Clicks "Open Supersuite" -> builder opens, code auto-fills
  -> Signs in -> AI onboarding runs (6-step brand interview)
  -> Gemma 3 27B generates 3 unique designs
  -> User picks one -> builds site -> exports
  -> Code dies, site files are theirs forever

ACCESS CODES (for testing):
  SS26, SSBASIC, SSPRO, SSAGENCY, AGENCYLAUNCH, POPPY

ADMIN CONSOLE:
  Open admin/index.html -> bootstrap first admin
  All users appear in real time via Supabase
