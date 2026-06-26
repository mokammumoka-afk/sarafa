-- 001_initial_schema.sql
-- Run this via `supabase db push` or paste into the SQL editor.

create extension if not exists pgcrypto;

-- =========================================================
-- TABLES
-- =========================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text unique not null,
  email text,
  gpay_number text default '',
  gpay_wallet_id text default '',
  avatar_url text default '',
  balance_lyd decimal(14,2) default 0.00 check (balance_lyd >= 0),
  balance_usdt decimal(14,6) default 0.000000 check (balance_usdt >= 0),
  total_deposited_lyd decimal(14,2) default 0.00,
  total_withdrawn_lyd decimal(14,2) default 0.00,
  total_bought_usdt decimal(14,6) default 0.000000,
  total_sold_usdt decimal(14,6) default 0.000000,
  is_active boolean default true,
  is_admin boolean default false,
  is_super_admin boolean default false,
  preferred_language text default 'ar',
  notification_push boolean default true,
  notification_email boolean default false,
  two_factor_enabled boolean default false,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('deposit','buy_usdt','sell_usdt','withdraw','admin_adjustment','referral_bonus','fee')),
  subtype text,
  amount_lyd decimal(14,2) default 0.00,
  amount_usdt decimal(14,6) default 0.000000,
  fee_lyd decimal(14,2) default 0.00,
  fee_usdt decimal(14,6) default 0.000000,
  rate_used decimal(14,4),
  status text not null default 'pending' check (status in ('pending','processing','completed','cancelled','failed','refunded')),
  gpay_request_id uuid,
  gpay_transaction_id uuid,
  gpay_reference text,
  gpay_qr_code text,
  usdt_hash text,
  receipt_image text,
  usdt_wallet_address text,
  admin_id uuid references profiles(id),
  admin_note text,
  ip_address text,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_type on transactions(type);
create index idx_transactions_status on transactions(status);
create index idx_transactions_created_at on transactions(created_at desc);
create index idx_transactions_gpay_request on transactions(gpay_request_id);

create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  buy_rate decimal(14,4) not null,
  sell_rate decimal(14,4) not null,
  market_rate decimal(14,4),
  usdt_bank_rate decimal(14,4),
  source text default 'manual',
  updated_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  subject text not null,
  category text not null check (category in ('account','deposit','withdrawal','trade','technical','other')),
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  status text default 'open' check (status in ('open','in_progress','waiting_user','resolved','closed')),
  assigned_to uuid references profiles(id),
  last_reply_by uuid references profiles(id),
  last_reply_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_tickets_user on support_tickets(user_id);
create index idx_tickets_status on support_tickets(status);

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references support_tickets(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  sender_type text not null check (sender_type in ('user','admin','system')),
  message text not null,
  attachments text[] default '{}',
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_messages_ticket on support_messages(ticket_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  body text not null,
  type text not null check (type in ('deposit','withdrawal','trade','system','support','promo')),
  reference_type text,
  reference_id uuid,
  is_read boolean default false,
  is_pushed boolean default false,
  action_url text,
  created_at timestamptz default now()
);

create index idx_notifications_user on notifications(user_id, is_read);
create index idx_notifications_created on notifications(created_at desc);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb default '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_activity_user on activity_log(user_id);
create index idx_activity_created on activity_log(created_at desc);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id) not null,
  action text not null,
  target_type text,
  target_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  ip_address text,
  created_at timestamptz default now()
);

create index idx_audit_admin on audit_log(admin_id);
create index idx_audit_created on audit_log(created_at desc);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references profiles(id) not null,
  referred_id uuid references profiles(id) unique not null,
  code text not null,
  status text default 'pending' check (status in ('pending','completed','cancelled')),
  bonus_lyd decimal(14,2) default 0.00,
  bonus_usdt decimal(14,6) default 0.000000,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_referrals_referrer on referrals(referrer_id);

create table settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  description text,
  updated_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed sane defaults so the app isn't broken on first run
insert into settings (key, value, description) values
  ('deposit_limits', '{"min":50,"max":10000}', 'حدود الشحن'),
  ('withdraw_limits', '{"min":100,"max_daily":5000}', 'حدود السحب'),
  ('trade_limits', '{"min_buy_usdt":10,"min_sell_usdt":10}', 'حدود التداول'),
  ('company_info', '{"name":"صرافة ليبيا الرقمية","usdt_wallet":"","gpay_number":""}', 'بيانات الشركة');

insert into exchange_rates (buy_rate, sell_rate, source) values (5.20, 5.35, 'manual');

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table profiles enable row level security;
alter table transactions enable row level security;
alter table exchange_rates enable row level security;
alter table support_tickets enable row level security;
alter table support_messages enable row level security;
alter table notifications enable row level security;
alter table activity_log enable row level security;
alter table audit_log enable row level security;
alter table referrals enable row level security;
alter table settings enable row level security;

create policy "Users view own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Admins view all profiles" on profiles for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "Admins update all profiles" on profiles for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Users view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Admins view all transactions" on transactions for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "Admins update transactions" on transactions for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Everyone view rates" on exchange_rates for select using (true);
create policy "Admins manage rates" on exchange_rates for all using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Users view own tickets" on support_tickets for select using (auth.uid() = user_id);
create policy "Users create tickets" on support_tickets for insert with check (auth.uid() = user_id);
create policy "Admins manage tickets" on support_tickets for all using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Users view own messages" on support_messages for select using (
  exists (select 1 from support_tickets where support_tickets.id = support_messages.ticket_id and support_tickets.user_id = auth.uid())
);
create policy "Users send messages" on support_messages for insert with check (
  auth.uid() = sender_id and exists (select 1 from support_tickets where support_tickets.id = support_messages.ticket_id and support_tickets.user_id = auth.uid())
);
create policy "Admins manage messages" on support_messages for all using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Users view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on notifications for update using (auth.uid() = user_id);
create policy "Admins manage notifications" on notifications for all using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Users view own activity" on activity_log for select using (auth.uid() = user_id);
create policy "Admins view all activity" on activity_log for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Admins view audit log" on audit_log for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "Admins insert audit log" on audit_log for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Users view own referrals" on referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);
create policy "Admins manage referrals" on referrals for all using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Everyone view settings" on settings for select using (true);
create policy "Admins manage settings" on settings for all using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- =========================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, coalesce(new.phone, ''), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================
-- DATABASE FUNCTIONS (atomic money movement)
-- =========================================================

create or replace function buy_usdt_atomic(
  p_user_id uuid, p_amount_lyd decimal(14,2), p_sell_rate decimal(14,4)
) returns uuid as $$
declare
  v_usdt_amount decimal(14,6);
  v_current_balance decimal(14,2);
  v_transaction_id uuid;
begin
  select balance_lyd into v_current_balance from profiles where id = p_user_id for update;
  if v_current_balance < p_amount_lyd then
    raise exception 'رصيد غير كافٍ' using errcode = 'BAL01';
  end if;

  v_usdt_amount := p_amount_lyd / p_sell_rate;

  update profiles set balance_lyd = balance_lyd - p_amount_lyd,
    balance_usdt = balance_usdt + v_usdt_amount,
    total_bought_usdt = total_bought_usdt + v_usdt_amount,
    updated_at = now()
  where id = p_user_id;

  insert into transactions (user_id, type, amount_lyd, amount_usdt, rate_used, status, completed_at)
  values (p_user_id, 'buy_usdt', p_amount_lyd, v_usdt_amount, p_sell_rate, 'completed', now())
  returning id into v_transaction_id;

  insert into activity_log (user_id, action, entity_type, entity_id, details)
  values (p_user_id, 'buy_usdt', 'transaction', v_transaction_id,
    jsonb_build_object('amount_lyd', p_amount_lyd, 'amount_usdt', v_usdt_amount, 'rate', p_sell_rate));

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (p_user_id, '✅ تم الشراء', 'تم شراء ' || v_usdt_amount || ' USDT بنجاح', 'trade', 'transaction', v_transaction_id);

  return v_transaction_id;
end;
$$ language plpgsql security definer;

create or replace function confirm_deposit(
  p_transaction_id uuid, p_user_id uuid, p_amount_lyd decimal(14,2),
  p_gpay_transaction_id uuid default null, p_admin_id uuid default null
) returns void as $$
begin
  update profiles set balance_lyd = balance_lyd + p_amount_lyd,
    total_deposited_lyd = total_deposited_lyd + p_amount_lyd, updated_at = now()
  where id = p_user_id;

  update transactions set status = 'completed',
    gpay_transaction_id = coalesce(p_gpay_transaction_id, gpay_transaction_id),
    admin_id = p_admin_id, completed_at = now(), updated_at = now()
  where id = p_transaction_id and status = 'pending';

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (p_user_id, '✅ تم تأكيد الشحن', 'تم إضافة ' || p_amount_lyd || ' د.ل إلى رصيدك بنجاح', 'deposit', 'transaction', p_transaction_id);

  if p_admin_id is not null then
    insert into audit_log (admin_id, action, target_type, target_id, new_values)
    values (p_admin_id, 'confirm_deposit', 'transaction', p_transaction_id, jsonb_build_object('amount', p_amount_lyd));
  end if;
end;
$$ language plpgsql security definer;

create or replace function request_sell_usdt(
  p_user_id uuid, p_amount_usdt decimal(14,6), p_buy_rate decimal(14,4),
  p_usdt_hash text, p_receipt_image text
) returns uuid as $$
declare
  v_amount_lyd decimal(14,2);
  v_transaction_id uuid;
  v_balance decimal(14,6);
begin
  select balance_usdt into v_balance from profiles where id = p_user_id for update;
  if v_balance < p_amount_usdt then
    raise exception 'رصيد USDT غير كافٍ' using errcode = 'BAL02';
  end if;

  v_amount_lyd := p_amount_usdt * p_buy_rate;

  insert into transactions (user_id, type, amount_lyd, amount_usdt, rate_used, usdt_hash, receipt_image, status)
  values (p_user_id, 'sell_usdt', v_amount_lyd, p_amount_usdt, p_buy_rate, p_usdt_hash, p_receipt_image, 'pending')
  returning id into v_transaction_id;

  update profiles set balance_usdt = balance_usdt - p_amount_usdt, updated_at = now() where id = p_user_id;

  insert into activity_log (user_id, action, entity_type, entity_id, details)
  values (p_user_id, 'sell_usdt_request', 'transaction', v_transaction_id,
    jsonb_build_object('amount_usdt', p_amount_usdt, 'amount_lyd', v_amount_lyd));

  return v_transaction_id;
end;
$$ language plpgsql security definer;

create or replace function confirm_sell(
  p_transaction_id uuid, p_admin_id uuid, p_admin_note text default null
) returns void as $$
declare
  v_user_id uuid;
  v_amount_lyd decimal(14,2);
  v_amount_usdt decimal(14,6);
begin
  select user_id, amount_lyd, amount_usdt into v_user_id, v_amount_lyd, v_amount_usdt
  from transactions where id = p_transaction_id and type = 'sell_usdt' and status = 'pending';

  if not found then
    raise exception 'معاملة غير موجودة أو منتهية' using errcode = 'TXN01';
  end if;

  update profiles set balance_lyd = balance_lyd + v_amount_lyd,
    total_sold_usdt = total_sold_usdt + v_amount_usdt, updated_at = now()
  where id = v_user_id;

  update transactions set status = 'completed', admin_id = p_admin_id, admin_note = p_admin_note,
    completed_at = now(), updated_at = now()
  where id = p_transaction_id;

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (v_user_id, '✅ تم تأكيد البيع', 'تم إضافة ' || v_amount_lyd || ' د.ل إلى رصيدك', 'trade', 'transaction', p_transaction_id);

  insert into audit_log (admin_id, action, target_type, target_id, new_values, reason)
  values (p_admin_id, 'confirm_sell', 'transaction', p_transaction_id, jsonb_build_object('amount_lyd', v_amount_lyd), p_admin_note);
end;
$$ language plpgsql security definer;

create or replace function reject_sell(
  p_transaction_id uuid, p_admin_id uuid, p_reason text
) returns void as $$
declare
  v_user_id uuid;
  v_amount_usdt decimal(14,6);
begin
  select user_id, amount_usdt into v_user_id, v_amount_usdt
  from transactions where id = p_transaction_id and type = 'sell_usdt' and status = 'pending';

  if not found then
    raise exception 'معاملة غير موجودة أو منتهية' using errcode = 'TXN01';
  end if;

  -- refund the held USDT back to the user
  update profiles set balance_usdt = balance_usdt + v_amount_usdt, updated_at = now() where id = v_user_id;

  update transactions set status = 'cancelled', admin_id = p_admin_id, admin_note = p_reason, updated_at = now()
  where id = p_transaction_id;

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (v_user_id, '❌ تم رفض طلب البيع', coalesce(p_reason, 'يرجى التواصل مع الدعم'), 'trade', 'transaction', p_transaction_id);

  insert into audit_log (admin_id, action, target_type, target_id, reason)
  values (p_admin_id, 'reject_sell', 'transaction', p_transaction_id, p_reason);
end;
$$ language plpgsql security definer;

create or replace function request_withdraw(
  p_user_id uuid, p_amount_lyd decimal(14,2), p_gpay_number text
) returns uuid as $$
declare
  v_transaction_id uuid;
  v_balance decimal(14,2);
begin
  select balance_lyd into v_balance from profiles where id = p_user_id for update;
  if v_balance < p_amount_lyd then
    raise exception 'رصيد غير كافٍ' using errcode = 'BAL01';
  end if;

  insert into transactions (user_id, type, amount_lyd, status, metadata)
  values (p_user_id, 'withdraw', p_amount_lyd, 'pending', jsonb_build_object('gpay_number', p_gpay_number))
  returning id into v_transaction_id;

  update profiles set balance_lyd = balance_lyd - p_amount_lyd, updated_at = now() where id = p_user_id;

  return v_transaction_id;
end;
$$ language plpgsql security definer;

create or replace function confirm_withdraw(
  p_transaction_id uuid, p_admin_id uuid, p_gpay_transaction_id uuid default null, p_admin_note text default null
) returns void as $$
declare
  v_user_id uuid;
  v_amount_lyd decimal(14,2);
begin
  select user_id, amount_lyd into v_user_id, v_amount_lyd
  from transactions where id = p_transaction_id and type = 'withdraw' and status = 'pending';

  if not found then
    raise exception 'معاملة غير موجودة أو منتهية' using errcode = 'TXN01';
  end if;

  update transactions set status = 'completed', admin_id = p_admin_id, gpay_transaction_id = p_gpay_transaction_id,
    admin_note = p_admin_note, completed_at = now(), updated_at = now()
  where id = p_transaction_id;

  update profiles set total_withdrawn_lyd = total_withdrawn_lyd + v_amount_lyd, updated_at = now() where id = v_user_id;

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (v_user_id, '✅ تم السحب', 'تم تحويل ' || v_amount_lyd || ' د.ل إلى محفظة GPAY الخاصة بك', 'withdrawal', 'transaction', p_transaction_id);

  insert into audit_log (admin_id, action, target_type, target_id, new_values, reason)
  values (p_admin_id, 'confirm_withdraw', 'transaction', p_transaction_id,
    jsonb_build_object('amount', v_amount_lyd, 'gpay_txn', p_gpay_transaction_id), p_admin_note);
end;
$$ language plpgsql security definer;

create or replace function reject_withdraw(
  p_transaction_id uuid, p_admin_id uuid, p_reason text
) returns void as $$
declare
  v_user_id uuid;
  v_amount_lyd decimal(14,2);
begin
  select user_id, amount_lyd into v_user_id, v_amount_lyd
  from transactions where id = p_transaction_id and type = 'withdraw' and status = 'pending';

  if not found then
    raise exception 'معاملة غير موجودة أو منتهية' using errcode = 'TXN01';
  end if;

  -- refund the held balance back to the user
  update profiles set balance_lyd = balance_lyd + v_amount_lyd, updated_at = now() where id = v_user_id;

  update transactions set status = 'cancelled', admin_id = p_admin_id, admin_note = p_reason, updated_at = now()
  where id = p_transaction_id;

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (v_user_id, '❌ تم رفض طلب السحب', coalesce(p_reason, 'يرجى التواصل مع الدعم'), 'withdrawal', 'transaction', p_transaction_id);

  insert into audit_log (admin_id, action, target_type, target_id, reason)
  values (p_admin_id, 'reject_withdraw', 'transaction', p_transaction_id, p_reason);
end;
$$ language plpgsql security definer;

create or replace function adjust_balance(
  p_admin_id uuid, p_user_id uuid, p_amount_lyd decimal(14,2) default 0,
  p_amount_usdt decimal(14,6) default 0, p_reason text default null
) returns uuid as $$
declare
  v_transaction_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'السبب إجباري لتعديل الرصيد' using errcode = 'REQ01';
  end if;

  update profiles set balance_lyd = balance_lyd + p_amount_lyd,
    balance_usdt = balance_usdt + p_amount_usdt, updated_at = now()
  where id = p_user_id;

  insert into transactions (user_id, type, subtype, amount_lyd, amount_usdt, status, admin_id, admin_note, completed_at)
  values (p_user_id, 'admin_adjustment',
    case when p_reason ilike '%مكافأة%' then 'bonus' else 'adjustment' end,
    p_amount_lyd, p_amount_usdt, 'completed', p_admin_id, p_reason, now())
  returning id into v_transaction_id;

  insert into audit_log (admin_id, action, target_type, target_id, new_values, reason)
  values (p_admin_id, 'adjust_balance', 'user', p_user_id,
    jsonb_build_object('lyd_change', p_amount_lyd, 'usdt_change', p_amount_usdt), p_reason);

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (p_user_id, '🔔 تحديث الرصيد', p_reason, 'system', 'transaction', v_transaction_id);

  return v_transaction_id;
end;
$$ language plpgsql security definer;
