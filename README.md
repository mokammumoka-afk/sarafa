# صرافة ليبيا الرقمية — USDT Exchange Wallet

A mobile-first, RTL, dark/gold wallet app for buying/selling USDT against Libyan Dinar, with GPAY
deposit/withdrawal integration and an independent admin panel. Built on Supabase + React 19 + Vite +
Tailwind 4, deployable for $0/month on Supabase free tier + Cloudflare Pages.

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
- An `auth.users` trigger that auto-creates the `profiles` row on signup (the spec described this in
  prose but didn't include the trigger).

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
3. **Set Edge Function secrets** (not in `.env` — see `.env.example` for the full list):
   `supabase secrets set GPAY_API_KEY=... GPAY_SECRET_KEY=... GPAY_PASSWORD=... SUPABASE_SERVICE_ROLE_KEY=...`
4. **Deploy the edge functions**: `supabase functions deploy create-deposit admin-withdraw check-pending-deposits`
5. **Schedule the polling job** (Supabase Cron / pg_cron) to call `check-pending-deposits` every 30s–1min.
6. **Enable Phone Auth** in Supabase Auth settings and configure your SMS/WhatsApp OTP provider.
7. Create your first admin: sign up normally, then in the SQL editor run
   `update profiles set is_admin = true, is_super_admin = true where phone = '+218XXXXXXXXX';`
   — admins log in at `/admin/login` with **email+password**, so also set a password for that user
   via Supabase Auth (Phone Auth users don't have one by default).
8. Copy `.env.example` to `.env`, fill in the `VITE_*` values, then `npm install && npm run dev`.
9. **Deploy to Cloudflare Pages**: connect the repo, build command `npm run build`, output `dist`.

## Before accepting real money
This handles real user funds and GPAY transfers — get the GPAY integration tested end-to-end in
their sandbox/staging environment first, and have someone review Libya's regulatory requirements for
operating a currency/crypto exchange service before launch. This template is a strong starting
codebase, not a substitute for that review.
