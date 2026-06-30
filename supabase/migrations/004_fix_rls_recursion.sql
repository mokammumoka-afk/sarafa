-- 004_fix_rls_recursion.sql
-- Run after 001, 002, and 003.
--
-- ROOT CAUSE: every "Admins ..." policy across the schema checked admin
-- status with an inline subquery like:
--   exists (select 1 from profiles where id = auth.uid() and is_admin = true)
-- For policies ON the profiles table itself, this is a SELECT policy whose
-- own USING clause queries profiles — Postgres must re-apply that same
-- policy to evaluate the inner query, which queries profiles again, forever:
-- "infinite recursion detected in policy for relation profiles".
-- It's not limited to profiles, either: ANY other table's admin policy that
-- subqueries profiles also has to evaluate profiles' own (recursive) policy
-- to check row visibility on that subquery — so this was latent everywhere,
-- not just on direct profiles queries.
--
-- FIX: a SECURITY DEFINER helper function. Functions like this run with the
-- privileges of their owner (not the calling user), so the query inside it
-- is not subject to RLS at all — no recursion is possible, because the
-- evaluation path never re-enters policy checking.

create or replace function is_admin()
returns boolean as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$ language sql security definer stable set search_path = public;

grant execute on function is_admin() to authenticated, anon;

-- Re-enable RLS on profiles (this migration assumes it was disabled as an
-- emergency workaround for the recursion above — safe to re-run either way).
alter table profiles enable row level security;
alter table profiles force row level security;

-- ---- profiles ----
drop policy if exists "Admins view all profiles" on profiles;
create policy "Admins view all profiles" on profiles for select using (is_admin());

drop policy if exists "Admins update all profiles" on profiles;
create policy "Admins update all profiles" on profiles for update using (is_admin());

-- ---- transactions ----
drop policy if exists "Admins view all transactions" on transactions;
create policy "Admins view all transactions" on transactions for select using (is_admin());

drop policy if exists "Admins update transactions" on transactions;
create policy "Admins update transactions" on transactions for update using (is_admin());

-- ---- exchange_rates ----
drop policy if exists "Admins manage rates" on exchange_rates;
create policy "Admins manage rates" on exchange_rates for all using (is_admin());

-- ---- support_tickets ----
drop policy if exists "Admins manage tickets" on support_tickets;
create policy "Admins manage tickets" on support_tickets for all using (is_admin());

-- ---- support_messages ----
drop policy if exists "Admins manage messages" on support_messages;
create policy "Admins manage messages" on support_messages for all using (is_admin());

-- ---- notifications ----
drop policy if exists "Admins manage notifications" on notifications;
create policy "Admins manage notifications" on notifications for all using (is_admin());

-- ---- activity_log ----
drop policy if exists "Admins view all activity" on activity_log;
create policy "Admins view all activity" on activity_log for select using (is_admin());

-- ---- audit_log ----
drop policy if exists "Admins view audit log" on audit_log;
create policy "Admins view audit log" on audit_log for select using (is_admin());

drop policy if exists "Admins insert audit log" on audit_log;
create policy "Admins insert audit log" on audit_log for insert with check (is_admin());

-- ---- referrals ----
drop policy if exists "Admins manage referrals" on referrals;
create policy "Admins manage referrals" on referrals for all using (is_admin());

-- ---- settings ----
drop policy if exists "Admins manage settings" on settings;
create policy "Admins manage settings" on settings for all using (is_admin());

-- ---- banners ----
drop policy if exists "Admins manage banners" on banners;
create policy "Admins manage banners" on banners for all using (is_admin());

-- ---- p2p_orders ----
drop policy if exists "Admins manage all p2p orders" on p2p_orders;
create policy "Admins manage all p2p orders" on p2p_orders for all using (is_admin());

-- ---- storage.objects ----
drop policy if exists "Admins manage banners storage" on storage.objects;
create policy "Admins manage banners storage" on storage.objects for all using (
  bucket_id = 'banners' and is_admin()
);

drop policy if exists "Users read own receipts" on storage.objects;
create policy "Users read own receipts" on storage.objects for select using (
  bucket_id = 'receipts' and (
    (storage.foldername(name))[2] = auth.uid()::text or is_admin()
  )
);
