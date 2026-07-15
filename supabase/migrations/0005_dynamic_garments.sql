-- Al Aqsa Tailor OMS — dynamic garment types, model photo-cards & split billing
-- Requires 0001–0003. Replaces the fixed-column measurement design with a
-- garment-type-driven system, adds fabric rate, split cloth/stitch billing on
-- order_items, button-hole tracking on orders, a model-photos storage bucket,
-- and RLS for the new tables.
--
-- NOTE: this is destructive to customer_measurements and order_items (fresh
-- build — no real data to preserve). Apply in the Supabase SQL editor.

-- ===========================================================================
-- Enums
-- ===========================================================================
create type public.measurement_input as enum (
  'number',        -- plain numeric (Length, Shoulder…)
  'model',         -- pick a photo-card model only
  'model_number',  -- photo-card model + a number (Neck, Collar, Wrist, Pocket)
  'text'           -- free text
);

-- ===========================================================================
-- garment_types — one per garment the shop stitches (Kandhura, Shirt, …).
-- Owner-managed from the UI. Do NOT seed here; the owner creates them in-app.
-- ===========================================================================
create table public.garment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- measurement_fields — the field template for a garment type.
-- ===========================================================================
create table public.measurement_fields (
  id uuid primary key default gen_random_uuid(),
  garment_type_id uuid not null references public.garment_types (id) on delete cascade,
  key text not null,                       -- slug, unique within a garment type
  label text not null,                     -- e.g. "Neck"
  input_type public.measurement_input not null default 'number',
  unit text,                               -- 'cm' | 'in' | null
  required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (garment_type_id, key)
);
create index measurement_fields_type_idx
  on public.measurement_fields (garment_type_id);

-- ===========================================================================
-- field_models — photo-card options. field_id null = garment-level model
-- (e.g. "Kandhura Model #3"); field_id set = a per-field model (Neck shapes…).
-- ===========================================================================
create table public.field_models (
  id uuid primary key default gen_random_uuid(),
  garment_type_id uuid not null references public.garment_types (id) on delete cascade,
  field_id uuid references public.measurement_fields (id) on delete cascade,
  name text not null,
  photo_path text,                         -- storage key in the model-photos bucket
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index field_models_type_idx on public.field_models (garment_type_id);
create index field_models_field_idx on public.field_models (field_id);

-- ===========================================================================
-- customer_measurements — REDEFINED. One reusable row per (customer, garment
-- type). `values` is keyed by measurement_fields.key so adding a field later
-- never breaks old rows.
--   values shape:
--     { "<field key>": { "value": number|null,
--                        "model_id": uuid|null,
--                        "note": string|null } }
-- ===========================================================================
drop table if exists public.customer_measurements cascade;

create table public.customer_measurements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  garment_type_id uuid not null references public.garment_types (id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  unique (customer_id, garment_type_id)
);
create index customer_measurements_customer_idx
  on public.customer_measurements (customer_id);

-- ===========================================================================
-- fabrics — add rate per metre (name / stock_metres / min_threshold exist).
-- ===========================================================================
alter table public.fabrics
  add column if not exists rate_per_metre numeric not null default 0;

-- ===========================================================================
-- orders — add outsourced button-hole tracking (stages 5 "Button Fix Given"
-- and 6 "Button Fixed"). total_amount stays the computed cloth + stitch sum.
-- ===========================================================================
alter table public.orders
  add column if not exists buttonhole_given int,
  add column if not exists buttonhole_returned int;

-- ===========================================================================
-- order_items — REDEFINED for dynamic garments + split billing.
-- measurements is snapshotted at order time (same shape as customer_measurements
-- values) so editing the master set later never changes a placed/printed order.
-- ===========================================================================
drop table if exists public.order_items cascade;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  garment_type_id uuid references public.garment_types (id) on delete set null,
  garment_model_id uuid references public.field_models (id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  -- cloth
  fabric_id uuid references public.fabrics (id) on delete set null,
  fabric_metres numeric,
  colour text,
  -- stitching
  stitch_note text,
  stitch_amount numeric not null default 0,
  -- captured measurements snapshot
  measurements jsonb not null default '{}'::jsonb,
  design_notes text
);
create index order_items_order_idx on public.order_items (order_id);

-- Re-create the stock-deduction trigger dropped with the table above.
create trigger trg_deduct_fabric_stock
  after insert on public.order_items
  for each row execute function public.deduct_fabric_stock();

-- ===========================================================================
-- Storage bucket for model photos (public read; writes gated by RLS below).
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('model-photos', 'model-photos', true)
on conflict (id) do nothing;

-- Anyone can read; only owners can upload/update/delete objects in this bucket.
-- (drop-if-exists keeps this migration safe to re-run.)
drop policy if exists "model_photos_read" on storage.objects;
drop policy if exists "model_photos_owner_write" on storage.objects;
drop policy if exists "model_photos_owner_update" on storage.objects;
drop policy if exists "model_photos_owner_delete" on storage.objects;
create policy "model_photos_read" on storage.objects
  for select using (bucket_id = 'model-photos');
create policy "model_photos_owner_write" on storage.objects
  for insert with check (bucket_id = 'model-photos' and public.is_owner());
create policy "model_photos_owner_update" on storage.objects
  for update using (bucket_id = 'model-photos' and public.is_owner());
create policy "model_photos_owner_delete" on storage.objects
  for delete using (bucket_id = 'model-photos' and public.is_owner());

-- ===========================================================================
-- RLS for the new tables (mirrors 0003 conventions).
--   garment_types / measurement_fields / field_models: read any authenticated,
--     write owner only.
--   customer_measurements: read any authenticated, write owner/counter.
--   order_items: re-declare policies (table was recreated).
-- ===========================================================================
alter table public.garment_types enable row level security;
alter table public.measurement_fields enable row level security;
alter table public.field_models enable row level security;
alter table public.customer_measurements enable row level security;
alter table public.order_items enable row level security;

-- garment_types
create policy garment_types_select on public.garment_types
  for select using (auth.uid() is not null);
create policy garment_types_write on public.garment_types
  for all using (public.is_owner()) with check (public.is_owner());

-- measurement_fields
create policy measurement_fields_select on public.measurement_fields
  for select using (auth.uid() is not null);
create policy measurement_fields_write on public.measurement_fields
  for all using (public.is_owner()) with check (public.is_owner());

-- field_models
create policy field_models_select on public.field_models
  for select using (auth.uid() is not null);
create policy field_models_write on public.field_models
  for all using (public.is_owner()) with check (public.is_owner());

-- customer_measurements
create policy measurements_select on public.customer_measurements
  for select using (auth.uid() is not null);
create policy measurements_write on public.customer_measurements
  for all
  using (public.current_role_name() in ('owner', 'counter'))
  with check (public.current_role_name() in ('owner', 'counter'));

-- order_items (same visibility as parent order; write owner/counter)
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          public.current_role_name() in ('owner', 'counter')
          or o.assigned_tailor = auth.uid()
        )
    )
  );
create policy order_items_write on public.order_items
  for all
  using (public.current_role_name() in ('owner', 'counter'))
  with check (public.current_role_name() in ('owner', 'counter'));
