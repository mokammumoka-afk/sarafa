-- 003_final.sql
-- Run after 001_initial_schema.sql and 002_v2_features.sql.

-- =========================================================
-- STORAGE BUCKETS + POLICIES
-- This is the actual fix for "banner image uploads but doesn't show in the
-- app": Supabase buckets default to PRIVATE. The admin upload and the
-- `banners` table insert were both succeeding, but the public URL returned
-- by getPublicUrl() 403'd in the browser because nothing ever marked the
-- bucket public or added a read policy. Same root cause would eventually hit
-- avatars too. Creating/fixing buckets here means this works without anyone
-- having to remember a manual Dashboard step.
-- =========================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('banners', 'banners', true), ('receipts', 'receipts', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public read banners" on storage.objects;
create policy "Public read banners" on storage.objects for select using (bucket_id = 'banners');

drop policy if exists "Admins manage banners storage" on storage.objects;
create policy "Admins manage banners storage" on storage.objects for all using (
  bucket_id = 'banners' and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

drop policy if exists "Users upload own receipts" on storage.objects;
create policy "Users upload own receipts" on storage.objects for insert with check (
  bucket_id = 'receipts' and auth.uid() is not null and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users read own receipts" on storage.objects;
create policy "Users read own receipts" on storage.objects for select using (
  bucket_id = 'receipts' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
);

-- =========================================================
-- REFERRAL SYSTEM
-- =========================================================

alter table profiles add column if not exists referral_code text unique;

-- Backfill existing rows with a short random code.
update profiles set referral_code = upper(substr(md5(id::text || clock_timestamp()::text), 1, 8))
where referral_code is null;

insert into settings (key, value, description) values
  ('referral_settings', '{"enabled": true, "reward_type": "lyd", "reward_amount": 5, "trigger": "first_deposit"}', 'إعدادات نظام الإحالة')
on conflict (key) do nothing;

-- Redefine the signup trigger to also generate a referral_code and send a
-- welcome notification — both described in the original spec but never
-- actually wired up.
create or replace function handle_new_user()
returns trigger as $$
declare
  v_profile_id uuid;
begin
  insert into public.profiles (id, phone, email, full_name, avatar_url, referral_code)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    upper(substr(md5(new.id::text || clock_timestamp()::text), 1, 8))
  )
  returning id into v_profile_id;

  insert into notifications (user_id, title, body, type)
  values (v_profile_id, '👋 أهلاً بك في Sarafa Libya', 'أكمل بياناتك وابدأ بتداول USDT بسهولة وأمان.', 'system');

  return new;
end;
$$ language plpgsql security definer;

-- Called once, right after onboarding, if the visitor arrived via a referral
-- link (?ref=CODE captured in localStorage by Login.jsx). Silently no-ops on
-- bad codes or self-referral instead of raising, so it never blocks signup.
create or replace function register_referral(p_referred_id uuid, p_code text)
returns void as $$
declare
  v_referrer_id uuid;
begin
  select id into v_referrer_id from profiles where referral_code = upper(trim(p_code));
  if v_referrer_id is null or v_referrer_id = p_referred_id then
    return;
  end if;

  insert into referrals (referrer_id, referred_id, code, status)
  values (v_referrer_id, p_referred_id, upper(trim(p_code)), 'pending')
  on conflict (referred_id) do nothing;
end;
$$ language plpgsql security definer;

-- Internal: awards the referrer once the referred user hits the configured
-- trigger event (first confirmed deposit, or first buy). The referrals row's
-- own 'pending' -> 'completed' transition is what guarantees this only ever
-- fires once per referred user, with no extra counting logic needed.
create or replace function process_referral_reward(p_user_id uuid, p_trigger_event text)
returns void as $$
declare
  v_settings jsonb;
  v_referral referrals%rowtype;
  v_bonus_lyd decimal(14,2) := 0;
  v_bonus_usdt decimal(14,6) := 0;
begin
  select value into v_settings from settings where key = 'referral_settings';
  if v_settings is null or (v_settings->>'enabled')::boolean is not true then
    return;
  end if;
  if coalesce(v_settings->>'trigger', 'first_deposit') <> p_trigger_event then
    return;
  end if;

  select * into v_referral from referrals where referred_id = p_user_id and status = 'pending' for update;
  if not found then
    return;
  end if;

  if coalesce(v_settings->>'reward_type', 'lyd') = 'usdt' then
    v_bonus_usdt := (v_settings->>'reward_amount')::decimal;
  else
    v_bonus_lyd := (v_settings->>'reward_amount')::decimal;
  end if;

  update profiles set balance_lyd = balance_lyd + v_bonus_lyd, balance_usdt = balance_usdt + v_bonus_usdt, updated_at = now()
  where id = v_referral.referrer_id;

  update referrals set status = 'completed', completed_at = now(), bonus_lyd = v_bonus_lyd, bonus_usdt = v_bonus_usdt
  where id = v_referral.id;

  insert into transactions (user_id, type, amount_lyd, amount_usdt, status, completed_at)
  values (v_referral.referrer_id, 'referral_bonus', v_bonus_lyd, v_bonus_usdt, 'completed', now());

  insert into notifications (user_id, title, body, type)
  values (v_referral.referrer_id, '🎉 مكافأة إحالة',
    'حصلت على مكافأة إحالة بقيمة ' ||
    case when v_bonus_usdt > 0 then v_bonus_usdt || ' USDT' else v_bonus_lyd || ' د.ل' end,
    'system');
end;
$$ language plpgsql security definer;

-- Hook the reward check into the two existing atomic functions. Both are
-- CREATE OR REPLACE with the exact original signature from 001, so this is a
-- safe in-place upgrade — same logic as before, plus one extra call at the end.
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

  perform process_referral_reward(p_user_id, 'first_deposit');
end;
$$ language plpgsql security definer;

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

  perform process_referral_reward(p_user_id, 'first_buy');

  return v_transaction_id;
end;
$$ language plpgsql security definer;

-- =========================================================
-- P2P MARKET — full activation (was schema-only in 002)
-- =========================================================

-- 'p2p' is a new transaction type for buyer/seller ledger entries once a
-- trade completes. The original CHECK constraint on transactions.type didn't
-- name itself, so we look it up dynamically rather than guessing the
-- autogenerated name.
do $$
declare
  con_name text;
begin
  select con.conname into con_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'transactions' and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%''deposit''%' and pg_get_constraintdef(con.oid) ilike '%type%';
  if con_name is not null then
    execute format('alter table transactions drop constraint %I', con_name);
  end if;
end $$;

alter table transactions add constraint transactions_type_check check (type in (
  'deposit', 'buy_usdt', 'sell_usdt', 'withdraw', 'admin_adjustment', 'referral_bonus', 'fee', 'p2p'
));

-- Let a buyer/seller see each other's contact info (name + GPAY number) only
-- while they have an active in_progress order together — needed so the buyer
-- knows where to send the GPAY payment. Note: RLS is row-level, so this does
-- technically expose the counterpart's full profiles row (including balances)
-- rather than just the contact fields; tightening that to column-level would
-- need a dedicated view and is a reasonable follow-up, not done here.
drop policy if exists "P2P counterpart can view profile during active order" on profiles;
create policy "P2P counterpart can view profile during active order" on profiles for select using (
  exists (
    select 1 from p2p_orders
    where status = 'in_progress'
    and ((seller_id = profiles.id and buyer_id = auth.uid()) or (buyer_id = profiles.id and seller_id = auth.uid()))
  )
);

create or replace function create_p2p_order(
  p_seller_id uuid, p_amount_usdt decimal(14,6), p_price_per_usdt decimal(14,4)
) returns uuid as $$
declare
  v_settings jsonb;
  v_balance decimal(14,6);
  v_order_id uuid;
begin
  select value into v_settings from settings where key = 'p2p_settings';
  if v_settings is null or (v_settings->>'enabled')::boolean is not true then
    raise exception 'سوق P2P غير مفعّل حالياً' using errcode = 'P2P00';
  end if;
  if p_amount_usdt <= 0 or p_price_per_usdt <= 0 then
    raise exception 'قيم غير صالحة' using errcode = 'P2P01';
  end if;

  select balance_usdt into v_balance from profiles where id = p_seller_id for update;
  if v_balance < p_amount_usdt then
    raise exception 'رصيد USDT غير كافٍ' using errcode = 'BAL02';
  end if;

  -- Escrow: hold the USDT inside the platform the moment the order is listed,
  -- so a seller can't list more than they actually have or double-list it.
  update profiles set balance_usdt = balance_usdt - p_amount_usdt, updated_at = now() where id = p_seller_id;

  insert into p2p_orders (seller_id, amount_usdt, price_per_usdt, payment_method, status)
  values (p_seller_id, p_amount_usdt, p_price_per_usdt, 'gpay', 'open')
  returning id into v_order_id;

  return v_order_id;
end;
$$ language plpgsql security definer;

create or replace function take_p2p_order(p_order_id uuid, p_buyer_id uuid)
returns void as $$
declare
  v_order p2p_orders%rowtype;
begin
  select * into v_order from p2p_orders where id = p_order_id and status = 'open' for update;
  if not found then
    raise exception 'هذا العرض غير متاح حالياً' using errcode = 'P2P02';
  end if;
  if v_order.seller_id = p_buyer_id then
    raise exception 'لا يمكنك شراء عرضك الخاص' using errcode = 'P2P03';
  end if;

  update p2p_orders set buyer_id = p_buyer_id, status = 'in_progress' where id = p_order_id;

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (v_order.seller_id, '🤝 لديك مشترٍ جديد',
    'قام مستخدم بحجز عرض بيع ' || v_order.amount_usdt || ' USDT — تواصل عبر GPAY لإتمام الدفع',
    'system', 'p2p_order', p_order_id);
end;
$$ language plpgsql security definer;

create or replace function cancel_p2p_order(p_order_id uuid, p_user_id uuid)
returns void as $$
declare
  v_order p2p_orders%rowtype;
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from profiles where id = p_user_id;
  select * into v_order from p2p_orders where id = p_order_id for update;
  if not found then
    raise exception 'العرض غير موجود' using errcode = 'P2P04';
  end if;
  if v_order.seller_id <> p_user_id and not coalesce(v_is_admin, false) then
    raise exception 'غير مصرح بإلغاء هذا العرض' using errcode = 'P2P05';
  end if;
  if v_order.status not in ('open', 'in_progress') then
    raise exception 'لا يمكن إلغاء هذا العرض' using errcode = 'P2P06';
  end if;

  -- Release the escrowed USDT back to the seller.
  update profiles set balance_usdt = balance_usdt + v_order.amount_usdt, updated_at = now() where id = v_order.seller_id;
  update p2p_orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;

  if v_order.buyer_id is not null then
    insert into notifications (user_id, title, body, type, reference_type, reference_id)
    values (v_order.buyer_id, '❌ تم إلغاء العرض', 'قام البائع بإلغاء عرض البيع الذي حجزته', 'system', 'p2p_order', p_order_id);
  end if;
end;
$$ language plpgsql security definer;

-- Called by the seller once they've confirmed receiving the buyer's GPAY
-- payment off-platform. Releases the escrowed USDT to the buyer (minus
-- commission) and writes a ledger entry for both sides.
create or replace function complete_p2p_order(p_order_id uuid, p_seller_id uuid)
returns void as $$
declare
  v_order p2p_orders%rowtype;
  v_settings jsonb;
  v_commission_pct decimal(6,2);
  v_commission_usdt decimal(14,6);
  v_net_usdt decimal(14,6);
begin
  select * into v_order from p2p_orders where id = p_order_id and status = 'in_progress' for update;
  if not found then
    raise exception 'لا يمكن إكمال هذا العرض' using errcode = 'P2P07';
  end if;
  if v_order.seller_id <> p_seller_id then
    raise exception 'غير مصرح' using errcode = 'P2P08';
  end if;
  if v_order.buyer_id is null then
    raise exception 'لا يوجد مشترٍ لهذا العرض' using errcode = 'P2P09';
  end if;

  select value into v_settings from settings where key = 'p2p_settings';
  v_commission_pct := coalesce((v_settings->>'commission_percent')::decimal, 0);
  v_commission_usdt := v_order.amount_usdt * v_commission_pct / 100;
  v_net_usdt := v_order.amount_usdt - v_commission_usdt;

  update profiles set balance_usdt = balance_usdt + v_net_usdt, updated_at = now() where id = v_order.buyer_id;

  insert into transactions (user_id, type, subtype, amount_usdt, amount_lyd, rate_used, status, completed_at, metadata)
  values (v_order.buyer_id, 'p2p', 'buy', v_net_usdt, v_order.total_lyd, v_order.price_per_usdt, 'completed', now(),
    jsonb_build_object('order_id', p_order_id, 'commission_usdt', v_commission_usdt));

  insert into transactions (user_id, type, subtype, amount_usdt, amount_lyd, rate_used, status, completed_at, metadata)
  values (v_order.seller_id, 'p2p', 'sell', v_order.amount_usdt, v_order.total_lyd, v_order.price_per_usdt, 'completed', now(),
    jsonb_build_object('order_id', p_order_id, 'commission_usdt', v_commission_usdt));

  update p2p_orders set status = 'completed', completed_at = now() where id = p_order_id;

  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (v_order.buyer_id, '✅ تم إكمال الصفقة', 'تم إضافة ' || v_net_usdt || ' USDT إلى محفظتك', 'system', 'p2p_order', p_order_id);
  insert into notifications (user_id, title, body, type, reference_type, reference_id)
  values (v_order.seller_id, '✅ تم إكمال الصفقة', 'تم تأكيد بيع ' || v_order.amount_usdt || ' USDT بنجاح', 'system', 'p2p_order', p_order_id);
end;
$$ language plpgsql security definer;

-- =========================================================
-- SPLASH SCREEN SETTINGS
-- =========================================================

insert into settings (key, value, description) values
  ('splash_settings', '{"enabled": false, "image_url": "", "duration_seconds": 5}', 'شاشة البداية')
on conflict (key) do nothing;

-- =========================================================
-- ADMIN BROADCAST NOTIFICATIONS
-- =========================================================

create or replace function broadcast_notification(p_admin_id uuid, p_title text, p_body text)
returns int as $$
declare
  v_count int;
begin
  if not exists (select 1 from profiles where id = p_admin_id and is_admin = true) then
    raise exception 'صلاحيات غير كافية' using errcode = 'ADM01';
  end if;

  insert into notifications (user_id, title, body, type)
  select id, p_title, p_body, 'system' from profiles;

  select count(*) into v_count from profiles;
  return v_count;
end;
$$ language plpgsql security definer;
