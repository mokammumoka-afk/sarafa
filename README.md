# Sarafa Libya — USDT Exchange Wallet

A mobile-first, RTL, dark/gold wallet app for buying/selling USDT against Libyan Dinar, with GPAY
deposit/withdrawal integration and an independent admin panel. Built on Supabase + React 19 + Vite +
Tailwind CSS 3.4, deployable for $0/month on Supabase free tier + Cloudflare Pages or Vercel.

Sign-in for the user-facing app is via **Google OAuth** (no phone/OTP). The separate `/admin` panel
still uses email + password, intentionally kept independent of the consumer auth flow.

## What's new in this update
- **Professional redesign**: 5-tab bottom navigation (الرئيسية | المحفظة | المعاملات | الدعم | الحساب),
  a unified header with the user's avatar on every screen, a back-arrow `PageHeader` on every secondary
  page, and framer-motion page transitions.
- **Dedicated Wallet tab** (`/wallet`) with a proper hero balance card (LYD + USDT + USD-equivalent +
  last-updated timestamp) and the deposit/withdraw/buy/sell actions in one place.
- **Home screen banner slider**, fully admin-managed (`/admin/banners`) — add images, set a link, reorder,
  toggle active/inactive.
- **P2P scaffolding**: `p2p_orders` table + RLS, a `/p2p` "coming soon" page, and a commission/enable
  toggle in `/admin/settings`. No trading UI yet by design — this is groundwork for a future release.
- **Three real bugs fixed** — see "Bug fixes in this update" below.

## ⚠️ Bug fixes in this update
1. **Edge Functions had no CORS headers.** `create-deposit` and `admin-withdraw` are called directly
   from the browser, which requires `Access-Control-Allow-Origin` and OPTIONS-preflight handling — without
   it, the browser blocks the request before Supabase ever sees it, which is almost certainly why deposit/
   withdraw "showed errors despite the env vars being set." Fixed via a shared `supabase/functions/_shared/cors.ts`
   helper used by every function.
2. **Profile page got stuck on an infinite skeleton.** `AuthContext` fetched the profile row exactly once
   with no retry and no error state. Right after a brand-new Google sign-in there's a short race — the
   `handle_new_user` trigger needs a moment to insert the row — and that one missed read used to leave
   `profile` at `null` forever. Fixed with a retry loop (5 attempts, backing off) plus a proper error state
   and "إعادة المحاولة" button instead of a permanent loading skeleton.
3. **Deposit had no fallback when GPAY isn't configured.** Buy/sell already called the atomic RPCs
   correctly (`buy_usdt_atomic`, `request_sell_usdt`) and didn't need fixing, but deposit had only the GPAY
   path. It now tries GPAY first and, if it's not configured (or the call fails), automatically falls back
   to a manual deposit form (transfer + reference + receipt upload → `request_manual_deposit()` RPC →
   admin confirms from `/admin/transactions` exactly like a manual sell). All client-side limits (deposit/
   withdraw/trade) now read live from the `settings` table via `useSettings()` instead of being hardcoded
   or silently unused `VITE_*` values.

## Auth: Google OAuth instead of phone/OTP
- `profiles.phone` is nullable; it's no longer collected at signup, but the column and an optional field
  in **Profile → Edit** remain in case you want it later (e.g. SMS notifications).
- `profiles.email`, `full_name`, and `avatar_url` are populated automatically from the Google account via
  the `handle_new_user()` trigger.
- Onboarding (`/register`) only asks for full name (prefilled from Google when available) and the GPAY
  number.
- `/admin` is untouched — still email + password via `supabase.auth.signInWithPassword`, deliberately
  separate from the consumer Google flow (see setup step 8).

## Tailwind CSS version pin
This project intentionally pins **Tailwind CSS v3.4.17**, not v4:
- `tailwindcss` lives in `dependencies` (not `devDependencies`) at `^3.4.17`.
- `postcss.config.js` uses the classic `tailwindcss: {}` plugin (not `@tailwindcss/postcss`, which is v4-only).
- `src/index.css` starts with the v3 `@tailwind base; @tailwind components; @tailwind utilities;` directives.
- `tailwind.config.js` uses a standard ESM `export default` (the repo's `package.json` has
  `"type": "module"`, so the typography plugin is brought in via `import`, not `require`).

## What's fully built
Auth (Google OAuth), onboarding, dashboard with banner slider, dedicated wallet tab, deposit (GPAY QR +
manual fallback), buy/sell USDT, withdraw, transaction history + detail, support tickets with realtime
chat, profile/account hub, settings, notifications, referrals, P2P placeholder — and the full admin panel:
dashboard with charts, user management + manual balance adjustment, transaction approval queue (deposit/
sell/withdraw with refund-on-reject), rate management, banner/slider management, P2P settings, support
inbox, audit log, general settings. Every money-moving action goes through an atomic Postgres function
and is written to `activity_log` / `audit_log`.

## What's intentionally a stub
`Terms`, `Privacy`, `FAQ` pages have placeholder legal copy — write your actual terms before launch.
The P2P market itself is schema-only (`p2p_orders` table + RLS) with a "coming soon" page — no order
creation/matching UI yet. Exportable PDF/CSV reports aren't wired up; the data is all in `transactions`/
`profiles` if you want to add `jspdf`/`papaparse` exports later.

## Setup
1. **Create a Supabase project**, then run both migrations in order in the SQL editor (or `supabase db push`):
   `supabase/migrations/001_initial_schema.sql` then `supabase/migrations/002_v2_features.sql`.
2. **Create three storage buckets**: `avatars` (public read), `banners` (public read), and `receipts`
   (private — add a policy so only the owner and admins can read, since receipts are sensitive).
3. **Enable Google as an Auth provider**: Supabase Dashboard → Authentication → Providers → Google.
   You'll need a Google Cloud OAuth Client ID/Secret. Add these redirect URLs in the Google Cloud console:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (required by Supabase)
   - `https://your-app-domain/auth/callback` and `http://localhost:5173/auth/callback` (your app's own callback page)
4. **Set Edge Function secrets** (not in `.env` — see `.env.example`):
   `supabase secrets set GPAY_API_KEY=... GPAY_SECRET_KEY=... GPAY_PASSWORD=... SUPABASE_SERVICE_ROLE_KEY=...`
   — until these are set, deposits/withdrawals automatically use the manual fallback flow, so the app is
   fully usable without GPAY configured yet.
5. **Deploy the edge functions**: `supabase functions deploy create-deposit admin-withdraw check-pending-deposits`
6. **Schedule the polling job** (Supabase Cron / pg_cron) to call `check-pending-deposits` every 30s–1min.
7. Copy `.env.example` to `.env`, fill in the `VITE_*` values, then `npm install && npm run dev`.
8. Create your first admin: sign in normally via Google once so your `profiles` row exists, then in the
   SQL editor run `update profiles set is_admin = true, is_super_admin = true where email = 'you@gmail.com';`
   — admins log in at `/admin/login` with **email + password**, a *separate* credential from Google sign-in.
   Set that password for the same email via Supabase Dashboard → Authentication → Users → your user.
9. **Deploy**: either Cloudflare Pages (build command `npm run build`, output `dist`) or Vercel (the
   included `vercel.json` handles SPA client-side routing rewrites automatically).

## Before accepting real money
This handles real user funds and GPAY transfers — get the GPAY integration tested end-to-end in their
sandbox/staging environment first, and have someone review Libya's regulatory requirements for operating
a currency/crypto exchange service before launch. This template is a strong starting codebase, not a
substitute for that review.
