-- Al Aqsa Tailor OMS — collapse roles to owner/staff, add staff designation +
-- salary, username login support, and a salary-payments module.
-- Requires 0001–0003 + 0005.
--
-- Role model change: owner/counter/tailor  ->  owner/staff.
--   staff = counter-like: customers, orders, measurements, stages, order search.
--           NO money (payments/collections), NO settings/staff/salary.
--   owner = full access.
-- Existing counter + tailor accounts are remapped to 'staff'.

-- ===========================================================================
-- 1. Drop every RLS policy that references current_role_name()/is_owner() so we
--    can retype the role column + helper, then recreate them for 2 roles.
-- ===========================================================================
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_write on public.profiles;
drop policy if exists customers_select on public.customers;
drop policy if exists customers_write on public.customers;
drop policy if exists measurements_select on public.customer_measurements;
drop policy if exists measurements_write on public.customer_measurements;
drop policy if exists fabrics_select on public.fabrics;
drop policy if exists fabrics_write on public.fabrics;
drop policy if exists orders_select on public.orders;
drop policy if exists orders_insert on public.orders;
drop policy if exists orders_delete on public.orders;
drop policy if exists orders_update on public.orders;
drop policy if exists order_items_select on public.order_items;
drop policy if exists order_items_write on public.order_items;
drop policy if exists stage_history_select on public.order_stage_history;
drop policy if exists stage_history_insert on public.order_stage_history;
drop policy if exists payments_select on public.payments;
drop policy if exists payments_write on public.payments;
drop policy if exists garment_types_select on public.garment_types;
drop policy if exists garment_types_write on public.garment_types;
drop policy if exists measurement_fields_select on public.measurement_fields;
drop policy if exists measurement_fields_write on public.measurement_fields;
drop policy if exists field_models_select on public.field_models;
drop policy if exists field_models_write on public.field_models;

-- ===========================================================================
-- 2. Retype profiles.role from the user_role enum to text ('owner' | 'staff').
--    current_role_name() returns the enum today, so drop it (all dependent
--    policies were dropped above) and recreate it returning text.
-- ===========================================================================
drop function if exists public.current_role_name();
create function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

-- Remap values and switch the column type to a checked text.
alter table public.profiles alter column role drop default;
alter table public.profiles
  alter column role type text
  using (case when role::text = 'owner' then 'owner' else 'staff' end);
alter table public.profiles alter column role set default 'staff';
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'staff'));

drop type if exists public.user_role;

-- is_owner() unchanged in behaviour (role text compare now).
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and active
  );
$$;

-- ===========================================================================
-- 3. New staff fields: login username, free-text designation, monthly salary.
--    username is the login handle; the app maps it to a hidden internal email
--    (<username>@alaqsa.local) so staff never type an email.
-- ===========================================================================
alter table public.profiles
  add column if not exists username text,
  add column if not exists designation text,
  add column if not exists monthly_salary numeric not null default 0;
create unique index if not exists profiles_username_key
  on public.profiles (lower(username)) where username is not null;

-- ===========================================================================
-- 4. Salary payments — one row per (staff, month) marked paid by the owner.
--    period is the first day of the month (YYYY-MM-01) for easy grouping.
-- ===========================================================================
create table if not exists public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  period date not null,                    -- first day of the month
  amount numeric not null check (amount >= 0),
  mode public.payment_mode not null default 'cash',
  paid_at timestamptz not null default now(),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  unique (staff_id, period)
);
create index salary_payments_staff_idx on public.salary_payments (staff_id);
create index salary_payments_period_idx on public.salary_payments (period);

-- ===========================================================================
-- 5. Recreate RLS for the 2-role model.
--    Reads: any authenticated user (staff need customers/orders/measurements).
--    Writes: owner+staff for operational tables; owner-only for money/settings.
-- ===========================================================================

-- profiles: read own or owner; write owner only.
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_owner());
create policy profiles_write on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- customers: read all; write owner+staff.
create policy customers_select on public.customers
  for select using (auth.uid() is not null);
create policy customers_write on public.customers
  for all
  using (public.current_role_name() in ('owner', 'staff'))
  with check (public.current_role_name() in ('owner', 'staff'));

-- customer_measurements: read all; write owner+staff.
create policy measurements_select on public.customer_measurements
  for select using (auth.uid() is not null);
create policy measurements_write on public.customer_measurements
  for all
  using (public.current_role_name() in ('owner', 'staff'))
  with check (public.current_role_name() in ('owner', 'staff'));

-- fabrics: read all; write owner+staff.
create policy fabrics_select on public.fabrics
  for select using (auth.uid() is not null);
create policy fabrics_write on public.fabrics
  for all
  using (public.current_role_name() in ('owner', 'staff'))
  with check (public.current_role_name() in ('owner', 'staff'));

-- orders: read all authenticated; write owner+staff.
create policy orders_select on public.orders
  for select using (auth.uid() is not null);
create policy orders_insert on public.orders
  for insert with check (public.current_role_name() in ('owner', 'staff'));
create policy orders_delete on public.orders
  for delete using (public.current_role_name() in ('owner', 'staff'));
create policy orders_update on public.orders
  for update
  using (public.current_role_name() in ('owner', 'staff'))
  with check (public.current_role_name() in ('owner', 'staff'));

-- order_items: read all authenticated; write owner+staff.
create policy order_items_select on public.order_items
  for select using (auth.uid() is not null);
create policy order_items_write on public.order_items
  for all
  using (public.current_role_name() in ('owner', 'staff'))
  with check (public.current_role_name() in ('owner', 'staff'));

-- order_stage_history: read all authenticated; insert owner+staff.
create policy stage_history_select on public.order_stage_history
  for select using (auth.uid() is not null);
create policy stage_history_insert on public.order_stage_history
  for insert with check (public.current_role_name() in ('owner', 'staff'));

-- payments: OWNER ONLY (staff cannot see money).
create policy payments_select on public.payments
  for select using (public.is_owner());
create policy payments_write on public.payments
  for all using (public.is_owner()) with check (public.is_owner());

-- garment settings: read all authenticated; write owner only.
create policy garment_types_select on public.garment_types
  for select using (auth.uid() is not null);
create policy garment_types_write on public.garment_types
  for all using (public.is_owner()) with check (public.is_owner());
create policy measurement_fields_select on public.measurement_fields
  for select using (auth.uid() is not null);
create policy measurement_fields_write on public.measurement_fields
  for all using (public.is_owner()) with check (public.is_owner());
create policy field_models_select on public.field_models
  for select using (auth.uid() is not null);
create policy field_models_write on public.field_models
  for all using (public.is_owner()) with check (public.is_owner());

-- salary_payments: OWNER ONLY.
alter table public.salary_payments enable row level security;
create policy salary_payments_select on public.salary_payments
  for select using (public.is_owner());
create policy salary_payments_write on public.salary_payments
  for all using (public.is_owner()) with check (public.is_owner());
