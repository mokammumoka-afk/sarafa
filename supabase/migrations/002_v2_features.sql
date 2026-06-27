-- 002_v2_features.sql
-- Run after 001_initial_schema.sql.
-- Adds: promotional banner slider, P2P scaffolding (tables only, market UI is
-- a "coming soon" placeholder for now), and a manual-deposit path that doesn't
-- depend on the GPAY edge function — so deposits keep working even before
-- GPAY credentials are configured.

-- =========================================================
-- BANNERS (home screen slider, admin-managed)
-- =========================================================

create table banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link_url text,
  title text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_banners_active_order on banners(is_active, sort_order);

alter table banners enable row level security;

create policy "Everyone view active banners" on banners for select using (true);
create policy "Admins manage banners" on banners for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- =========================================================
-- P2P ORDERS (schema only for now — market UI is "coming soon")
-- =========================================================

create table p2p_orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) not null,
  buyer_id uuid references profiles(id),
  amount_usdt decimal(14,6) not null check (amount_usdt > 0),
  price_per_usdt decimal(14,4) not null check (price_per_usdt > 0),
  total_lyd decimal(14,2) generated always as (amount_usdt * price_per_usdt) stored,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  payment_method text default 'gpay',
  notes text,
  created_at timestamptz default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

create index idx_p2p_seller on p2p_orders(seller_id);
create index idx_p2p_buyer on p2p_orders(buyer_id);
create index idx_p2p_status on p2p_orders(status);

alter table p2p_orders enable row level security;

create policy "Users view open orders or their own" on p2p_orders for select using (
  status = 'open' or auth.uid() = seller_id or auth.uid() = buyer_id
);
create policy "Users create own sell orders" on p2p_orders for insert with check (auth.uid() = seller_id);
create policy "Sellers update own orders" on p2p_orders for update using (auth.uid() = seller_id);
create policy "Buyers can take open orders" on p2p_orders for update using (
  status = 'open' or auth.uid() = buyer_id or auth.uid() = seller_id
);
create policy "Admins manage all p2p orders" on p2p_orders for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- =========================================================
-- P2P SETTINGS (commission + on/off switch, admin-managed)
-- =========================================================

insert into settings (key, value, description) values
  ('p2p_settings', '{"enabled": false, "commission_percent": 1}', 'إعدادات سوق P2P (قريباً)')
on conflict (key) do nothing;

-- =========================================================
-- MANUAL DEPOSIT (works without any GPAY credentials configured)
-- =========================================================

create or replace function request_manual_deposit(
  p_user_id uuid, p_amount_lyd decimal(14,2), p_reference text default null, p_receipt_image text default null
) returns uuid as $$
declare
  v_transaction_id uuid;
begin
  if p_amount_lyd <= 0 then
    raise exception 'مبلغ غير صالح' using errcode = 'AMT01';
  end if;

  insert into transactions (user_id, type, subtype, amount_lyd, gpay_reference, receipt_image, status)
  values (p_user_id, 'deposit', 'manual', p_amount_lyd, p_reference, p_receipt_image, 'pending')
  returning id into v_transaction_id;

  insert into activity_log (user_id, action, entity_type, entity_id, details)
  values (p_user_id, 'manual_deposit_request', 'transaction', v_transaction_id,
    jsonb_build_object('amount_lyd', p_amount_lyd, 'reference', p_reference));

  return v_transaction_id;
end;
$$ language plpgsql security definer;
