# Sarafa Libya — USDT Exchange Wallet

A mobile-first, RTL, dark/gold wallet app for buying/selling USDT against Libyan Dinar, with GPAY
deposit/withdrawal, P2P trading, referrals, and an independent admin panel. Built on Supabase + React 19
+ Vite + Tailwind CSS 3.4, deployable for $0/month on Supabase free tier + Cloudflare Pages/Vercel, and
packageable as an Android APK via Capacitor.

Sign-in for the user-facing app is via **Google OAuth** (no phone/OTP). The separate `/admin` panel still
uses email + password, deliberately independent of the consumer auth flow.

## ⚠️ Critical fix in this update — blank pages + Google sign-in not completing
Both symptoms had the **same root cause**: a previous round of Capacitor/Android prep set
`base: './'` in `vite.config.js` (a relative asset base, needed for the Android WebView build). That's
wrong for a normal web deployment. With a relative base, the built `index.html` references its JS bundle
as `./assets/index-xxx.js`. The home page (`/`) works because `./assets/...` resolves correctly at the
root — but visiting (or refreshing, or being redirected to) any other path, like `/deposit` or
`/auth/callback`, makes the browser resolve that same relative path against the *current URL*, e.g.
`/deposit/assets/index-xxx.js`, which 404s. The JS bundle never loads, so React never mounts — nothing
but the `<body>` background color renders. And since the Google OAuth code-exchange logic lives inside
that same JS bundle, landing on `/auth/callback` with no JS loaded meant the redirect "did nothing."

**Fix**: `vite.config.js` now uses an absolute base path (`/`) for normal builds, and only switches to a
relative base under a dedicated `npm run build:capacitor` script (`vite build --mode capacitor`) for the
Android target. Always deploy to Vercel/Cloudflare Pages with the plain `npm run build`.

## ⚠️ Critical fix in this update — RLS infinite recursion
The reported workaround (disabling RLS on `profiles`) was masking a real bug, not fixing it, and left
`profiles` fully exposed to any authenticated user. The actual cause: every "Admins ..." policy across
every table checked admin status with an inline subquery —
`exists (select 1 from profiles where id = auth.uid() and is_admin = true)`.
For policies defined **on `profiles` itself**, this is a SELECT policy whose own condition queries
`profiles` — Postgres has to re-apply that same policy to evaluate the inner query, which queries
`profiles` again, forever: `infinite recursion detected in policy for relation "profiles"`. It wasn't
limited to direct profile lookups either — any other table's admin policy that subqueries `profiles` also
has to evaluate `profiles`' own (recursive) policy to filter that subquery, so the bug was latent across
nearly every "admin can see everything" policy in the schema, not just the one that happened to surface it.

**Fix**: migration `004_fix_rls_recursion.sql` adds an `is_admin()` SQL function marked
`security definer`. Functions like this run with the privileges of their owner, so the query inside them
is **not subject to RLS at all** — there's no policy re-entry, so no recursion is possible. Every admin
policy across every table (profiles, transactions, exchange_rates, support_tickets, support_messages,
notifications, activity_log, audit_log, referrals, settings, banners, p2p_orders, storage.objects) is
redefined to call `is_admin()` instead of the inline subquery, and RLS is explicitly re-enabled (and
`FORCE`d) on `profiles`.

---

## What's new in this update
1. **Register no longer gets "stuck."** Fixed a real race condition (see below) — confirming registration
   now reliably lands on `/dashboard`.
2. **Referral system, fully wired**: real `referral_code` per user (generated server-side), a `/referral`
   page that explains how/when/how-much you earn, automatic reward crediting hooked into the deposit and
   buy flows, and admin controls (enable, reward type/amount, trigger) in `/admin/settings`.
3. **Banner image display bug fixed** — root cause and fix explained below.
4. **P2P market fully activated**: browse/filter open sell offers, post your own offer, buy with one tap,
   seller-confirms-payment completion flow, admin oversight page, all through atomic RPCs with RLS.
5. Reviewed the original spec for gaps: added admin **CSV export** for transactions/users (the "reports"
   section), a **welcome notification** on signup, and **admin broadcast / per-user notifications** (also
   from the original spec, never wired up before).
6. **Splash screen** on cold app load, image + duration controlled from `/admin/settings`.
7. **Admin panel upgrade**: grouped sidebar with pending-item badges, more dashboard stats (new users
   today, daily volume, estimated profit), a user-growth chart, and a P2P oversight page.
8. **Capacitor/Android groundwork**: `capacitor.config.json`, relative Vite `base`, and the one external
   dependency that wasn't GPAY/Google (a third-party avatar placeholder service) replaced with a fully
   local initials-avatar component. See the Android section below for what's still manual.
9. **Deposit simplified**: goes through `request_manual_deposit` only — no more calling the GPAY Edge
   Function from this screen (the automated path still exists in `supabase/functions` for later, but the
   app no longer depends on it being deployed).

## Bug fixes — root causes explained

**1. Register → dashboard did nothing.** `Register.jsx` called `navigate('/dashboard')` immediately after
saving, but `MainLayout`'s `needsOnboarding` check reads `profile` from `AuthContext`, which only updated
via a realtime `postgres_changes` event — a network round-trip that hadn't arrived yet. So the navigate
fired, `MainLayout` saw a still-stale profile, and bounced straight back to `/register`. Fixed by adding
`patchProfileLocal()` to `AuthContext`, which updates the local profile state synchronously right after a
successful write, before navigating.

**2. Banner image uploads but never shows.** Not a frontend bug — `BannerSlider`/`useBanners` were always
correct. Supabase storage buckets default to **private**. The admin upload and the `banners` table insert
both succeeded, but the public URL from `getPublicUrl()` 403'd in the browser because nothing had marked
the bucket public or added a storage read policy. Migration `003_final.sql` creates/fixes the `avatars`,
`banners` (public) and `receipts` (private, owner+admin only) buckets and their `storage.objects` RLS
policies directly via SQL, so this isn't a manual Dashboard step anymore.

## Referral system — how it works
- `profiles.referral_code` is generated server-side (in the `handle_new_user` trigger) — an 8-character
  code, not derived from the user's UUID.
- A referral link points to `/login?ref=CODE` (the only page an unauthenticated visitor can land on).
  `Login.jsx` stashes the code in `localStorage` before the Google redirect; `Register.jsx` reads it back
  and calls `register_referral()` once the profile exists.
- The reward is granted by `process_referral_reward()`, called from inside `confirm_deposit()` or
  `buy_usdt_atomic()` depending on the admin-configured trigger. The referral row's own
  `pending → completed` transition is what guarantees the reward fires exactly once — no separate
  "is this their first deposit" counting logic needed.

## P2P market — how it works
- `create_p2p_order`: escrows the seller's USDT immediately (so they can't oversell), order status `open`.
- `take_p2p_order`: buyer reserves it → `in_progress`, buyer_id set.
- The actual LYD payment happens **off-platform via GPAY**, peer-to-peer — the app's job is to hold the
  USDT escrow and reveal contact info once matched. A new `profiles` RLS policy lets a buyer/seller see
  each other's name + GPAY number only while they have an active `in_progress` order together.
  ⚠️ Known limitation: RLS is row-level, so this technically exposes the counterpart's whole profile row
  (including balances), not just the contact fields — tightening that to column-level would need a
  dedicated Postgres view. Reasonable for a v1, worth revisiting before scaling.
- `complete_p2p_order`: seller confirms they received payment → buyer's USDT is released (minus the
  configured commission), both sides get a `p2p`-type transaction row.
- `cancel_p2p_order`: seller (or admin) can cancel from `open` or `in_progress`, always refunding the
  escrow.

## Android / Capacitor — what's done vs. what's manual
Done: `capacitor.config.json`, relative `base: './'` in `vite.config.js`, no external links besides
Google/GPAY (the avatar placeholder service was removed). Capacitor packages are in `package.json`.

**Still manual** (can't be done from this environment — no Android SDK/network here):
1. `npx cap init` (already mostly pre-filled via `capacitor.config.json`), then `npx cap add android`.
2. `npm run build:capacitor && npx cap sync android`, then open/build in Android Studio. (Plain
   `npm run build` now produces an absolute-base bundle meant for web hosting — don't feed that into
   `cap sync`, or you'll hit the same blank-page issue inside the WebView.)
3. **Google OAuth in a WebView is the one real gotcha.** Google blocks OAuth inside plain embedded
   WebViews. For a Capacitor app you generally need the `@capacitor/browser` plugin to open the Google
   sign-in in the system browser (or an in-app SFSafariViewController/Chrome Custom Tab) and a deep link
   (`@capacitor/app` + an `appId`-based custom scheme) to bring the user back into the app afterward. This
   needs native-side wiring this environment can't build or test — budget time for it before shipping.

## Setup
1. **Create a Supabase project**, then run all four migrations in order in the SQL editor (or
   `supabase db push`): `001_initial_schema.sql`, `002_v2_features.sql`, `003_final.sql`,
   `004_fix_rls_recursion.sql`. If RLS is currently disabled on `profiles` from the emergency workaround,
   migration 004 re-enables it correctly — make sure it's the last one applied.
   Migration 003 also creates the `avatars`/`banners`/`receipts` storage buckets and their policies.
2. **Enable Google as an Auth provider**: Supabase Dashboard → Authentication → Providers → Google.
   Add these redirect URLs in Google Cloud console:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (required by Supabase)
   - `https://your-app-domain/auth/callback` and `http://localhost:5173/auth/callback`
3. **Set Edge Function secrets** if/when you want automated GPAY deposits (optional — manual deposit works
   without this): `supabase secrets set GPAY_API_KEY=... GPAY_SECRET_KEY=... GPAY_PASSWORD=... SUPABASE_SERVICE_ROLE_KEY=...`
   then `supabase functions deploy create-deposit admin-withdraw check-pending-deposits`.
4. Copy `.env.example` to `.env`, fill in the `VITE_*` values, then `npm install && npm run dev`.
5. Create your first admin: sign in via Google once so your `profiles` row exists, then in the SQL editor:
   `update profiles set is_admin = true, is_super_admin = true where email = 'you@gmail.com';`
   Admins log in at `/admin/login` with **email + password** — set that password for the same email via
   Supabase Dashboard → Authentication → Users.
6. **Deploy**: Cloudflare Pages (build `npm run build`, output `dist`) or Vercel (`vercel.json` included).

## What's intentionally still a stub
`Terms`, `Privacy`, `FAQ` pages have placeholder legal copy. P2P disputes (buyer claims they paid, seller
says they didn't) have no resolution flow beyond "admin force-cancels from `/admin/p2p`" — there's no
chat/evidence system. CSV export covers transactions and users; there's no PDF generator.

## Before accepting real money
This handles real user funds, GPAY transfers, and peer-to-peer trades — get GPAY tested end-to-end in
sandbox first, and get a regulatory review for operating a currency/crypto exchange in Libya before
launch. This is a strong starting codebase, not a substitute for that review.
