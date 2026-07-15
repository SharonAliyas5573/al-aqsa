-- Al Aqsa Tailor OMS — core schema
-- Apply in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('owner', 'counter', 'tailor');
create type public.payment_status as enum ('paid', 'partial', 'pending');
create type public.payment_mode as enum ('cash', 'upi');

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holds role. Created by the owner via the
-- create-staff edge function (which also creates the auth user).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'counter',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  whatsapp_number text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);
create index customers_name_idx on public.customers using gin (to_tsvector('simple', name));
create index customers_phone_idx on public.customers (phone);

-- ---------------------------------------------------------------------------
-- customer_measurements: master measurement set per customer (Thobe fields).
-- One row per customer; per-order tweaks live on order_items (never overwrite).
-- ---------------------------------------------------------------------------
create table public.customer_measurements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers (id) on delete cascade,
  length numeric,
  shoulder numeric,
  chest numeric,
  waist numeric,
  sleeve numeric,
  neck numeric,
  wrist numeric,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- fabrics / inventory
-- ---------------------------------------------------------------------------
create table public.fabrics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  colour text,
  stock_metres numeric not null default 0,
  min_threshold numeric not null default 0,
  supplier_name text,
  supplier_contact text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- orders
-- order_no is a human-friendly sequence like AQ-<YYMM>-0001, assigned by a
-- trigger from a global sequence.
-- ---------------------------------------------------------------------------
create sequence public.order_no_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  expected_delivery date,
  assigned_tailor uuid references public.profiles (id) on delete set null,
  current_stage smallint not null default 1 check (current_stage between 1 and 9),
  total_amount numeric not null default 0,
  payment_status public.payment_status not null default 'pending',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_stage_idx on public.orders (current_stage);
create index orders_tailor_idx on public.orders (assigned_tailor);

-- ---------------------------------------------------------------------------
-- order_items: measurements snapshot stored as jsonb so per-order edits don't
-- touch the customer's master measurements.
-- ---------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  garment_type text not null default 'Thobe',
  quantity int not null default 1 check (quantity > 0),
  fabric_id uuid references public.fabrics (id) on delete set null,
  fabric_metres numeric,
  colour text,
  design_notes text,
  measurements jsonb
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- order_stage_history: audit trail + drives WhatsApp triggers.
-- ---------------------------------------------------------------------------
create table public.order_stage_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  stage smallint not null check (stage between 1 and 9),
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index stage_history_order_idx on public.order_stage_history (order_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount numeric not null check (amount > 0),
  mode public.payment_mode not null default 'cash',
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);
create index payments_order_idx on public.payments (order_id);
