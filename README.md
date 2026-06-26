# Sarafa Libya — USDT Exchange Wallet

A mobile-first, RTL, dark/gold wallet app for buying/selling USDT against Libyan Dinar, with GPAY
deposit/withdrawal integration and an independent admin panel. Built on Supabase + React 19 + Vite +
Tailwind CSS 3.4 + shadcn-style components, deployable for $0/month on Supabase free tier + Cloudflare Pages.

Sign-in for the user-facing app is via **Google OAuth** (no phone/OTP). The separate `/admin` panel
still uses email + password, intentionally kept independent of the consumer auth flow.

## ⚠️ One important fix vs. the original spec

The original spec put the GPAY service file (with `secretKey`/`password`) under `src/lib`, which is
**part of the React bundle that ships to every visitor's browser** — that would leak your GPAY
credentials publicly. This build moves all GPAY calls into Supabase **Edge Functions**
(`supabase/functions/_shared/gpay.service.ts`), which run server-side only. The browser never sees
`GPAY_SECRET_KEY` or `GPAY_PASSWORD`. Treat this as non-optional before going live.

Two related additions not explicit in the spec but required for correctness:
- `reject_sell()` / `reject_withdraw()` DB functions — refund the user's held USDT/LYD when an admin
  rejects a pending sell or withdrawal (the original flow deducted/held funds on submission but had
  no path to give them back on rejection).
- An `auth.users` trigger that auto-creates the `profiles` row on signup, now reading `full_name` and
  `avatar_url` out of the Google OAuth metadata (`raw_user_meta_data`) instead of a phone number.

## Auth: Google OAuth instead of phone/OTP
The consumer app now signs users in with **Google OAuth only** — there's no phone/OTP screen anymore.
- `profiles.phone` is nullable; it's no longer collected at signup, but the column and an optional
  field in **Profile → Edit** remain in case you want it later (e.g. for SMS notifications).
- `profiles.email` is populated automatically from the Google account via the `handle_new_user()` trigger.
- Onboarding (`/register`) now only asks for full name (prefilled from Google when available) and the
  GPAY number — that's the only gate before reaching the dashboard.
- The `/admin` panel is untouched and still uses email + password via `supabase.auth.signInWithPassword`,
  deliberately separate from the consumer Google flow (see step 7 below for creating an admin).

## Tailwind CSS version pin
This project intentionally pins **Tailwind CSS v3.4.17**, not v4:
- `tailwindcss` lives in `dependencies` (not `devDependencies`) at `^3.4.17`.
- `postcss.config.js` uses the classic `tailwindcss: {}` plugin (not `@tailwindcss/postcss`, which is v4-only).
- `src/index.css` starts with the v3 `@tailwind base; @tailwind components; @tailwind utilities;`
  directives (not the v4 `@import "tailwindcss";` syntax).
- `tailwind.config.js` uses a standard ESM `export default` (the repo's `package.json` has
  `"type": "module"`, so the typography plugin is brought in via `import`, not `require`).

## What's fully built
Auth (phone OTP), onboarding, dashboard, deposit (GPAY QR + realtime confirmation), buy/sell USDT,
withdraw, transaction history + detail, support tickets with realtime chat, profile, settings,
notifications, referrals — and the full admin panel: dashboard with charts, user management +
manual balance adjustment, transaction approval queue (deposit/sell/withdraw), rate management,
support inbox, audit log, general settings. Every money-moving action goes through an atomic
Postgres function and is written to `activity_log` / `audit_log`.

## What's intentionally a stub
`Terms`, `Privacy`, `FAQ` pages have placeholder legal copy — write your actual terms before launch.
Exportable PDF/CSV reports (section 5.9 of the spec) aren't wired up; the data for them is all in
`transactions`/`profiles` if you want to add `jspdf`/`papaparse` exports later.

## Setup
1. **Create a Supabase project**, then run `supabase/migrations/001_initial_schema.sql` in the SQL editor
   (or `supabase db push`).
2. **Create two storage buckets**: `avatars` (public read) and `receipts` (private — add a policy so
   only the owner and admins can read, since receipts are sensitive).
3. **Enable Google as an Auth provider**: Supabase Dashboard → Authentication → Providers → Google.
   You'll need a Google Cloud OAuth Client ID/Secret (OAuth consent screen + "Web application" credential).
   Add these redirect URLs in the Google Cloud console:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (required by Supabase)
   - `https://your-app.pages.dev/auth/callback` and `http://localhost:5173/auth/callback` (your app's own callback page, used to route new users into onboarding)
4. **Set Edge Function secrets** (not in `.env` — see `.env.example` for the full list):
   `supabase secrets set GPAY_API_KEY=... GPAY_SECRET_KEY=... GPAY_PASSWORD=... SUPABASE_SERVICE_ROLE_KEY=...`
5. **Deploy the edge functions**: `supabase functions deploy create-deposit admin-withdraw check-pending-deposits`
6. **Schedule the polling job** (Supabase Cron / pg_cron) to call `check-pending-deposits` every 30s–1min.
7. Create your first admin: sign in normally via Google once so your `profiles` row exists, then in the
   SQL editor run `update profiles set is_admin = true, is_super_admin = true where email = 'you@gmail.com';`
   — admins log in at `/admin/login` with **email + password**, which is a *separate* credential from your
   Google sign-in. Create that password for the same email via Supabase Dashboard → Authentication → Users
   → your user → "Send password reset" (or set one directly), since Google sign-ins don't have a password
   by default.
8. Copy `.env.example` to `.env`, fill in the `VITE_*` values, then `npm install && npm run dev`.
9. **Deploy to Cloudflare Pages**: connect the repo, build command `npm run build`, output `dist`.

## Before accepting real money
This handles real user funds and GPAY transfers — get the GPAY integration tested end-to-end in
their sandbox/staging environment first, and have someone review Libya's regulatory requirements for
operating a currency/crypto exchange service before launch. This template is a strong starting
codebase, not a substitute for that review.
