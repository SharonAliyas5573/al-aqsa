-- Al Aqsa Tailor OMS — Row Level Security
-- Requires 0001 + 0002.
--
-- Role matrix:
--   owner   : full access to everything
--   counter : customers/measurements/orders/items/payments/fabrics read+write;
--             NOT staff (profiles) management or fabric supplier deletes barred
--             beyond app UI — kept simple: counter can manage fabrics too.
--   tailor  : read orders assigned to them; update ONLY current_stage; read
--             customers/measurements/items; no writes elsewhere.

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_measurements enable row level security;
alter table public.fabrics enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_stage_history enable row level security;
alter table public.payments enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Everyone can read their own profile; owner can read all.
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_owner());
-- Only owner can insert/update/delete profiles (staff management).
create policy profiles_write on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- customers  (owner + counter write; tailor read)
-- ---------------------------------------------------------------------------
create policy customers_select on public.customers
  for select using (auth.uid() is not null);
create policy customers_write on public.customers
  for all
  using (public.current_role_name() in ('owner', 'counter'))
  with check (public.current_role_name() in ('owner', 'counter'));

-- ---------------------------------------------------------------------------
-- customer_measurements  (owner + counter write; tailor read)
-- ---------------------------------------------------------------------------
create policy measurements_select on public.customer_measurements
  for select using (auth.uid() is not null);
create policy measurements_write on public.customer_measurements
  for all
  using (public.current_role_name() in ('owner', 'counter'))
  with check (public.current_role_name() in ('owner', 'counter'));

-- ---------------------------------------------------------------------------
-- fabrics  (owner + counter write; tailor read)
-- ---------------------------------------------------------------------------
create policy fabrics_select on public.fabrics
  for select using (auth.uid() is not null);
create policy fabrics_write on public.fabrics
  for all
  using (public.current_role_name() in ('owner', 'counter'))
  with check (public.current_role_name() in ('owner', 'counter'));

-- ---------------------------------------------------------------------------
-- orders
--   read: owner/counter all; tailor only assigned
--   insert/delete: owner/counter
--   update: owner/counter full; tailor allowed (app restricts to stage only,
--           and the WITH CHECK keeps the row assigned to them)
-- ---------------------------------------------------------------------------
create policy orders_select on public.orders
  for select using (
    public.current_role_name() in ('owner', 'counter')
    or assigned_tailor = auth.uid()
  );
create policy orders_insert on public.orders
  for insert with check (public.current_role_name() in ('owner', 'counter'));
create policy orders_delete on public.orders
  for delete using (public.current_role_name() in ('owner', 'counter'));
create policy orders_update on public.orders
  for update using (
    public.current_role_name() in ('owner', 'counter')
    or assigned_tailor = auth.uid()
  ) with check (
    public.current_role_name() in ('owner', 'counter')
    or assigned_tailor = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- order_items  (read: same visibility as parent order; write: owner/counter)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- order_stage_history
--   read: same visibility as parent order
--   insert: any authenticated user whose role can update the order (covers the
--           trigger running as the tailor advancing a stage)
-- ---------------------------------------------------------------------------
create policy stage_history_select on public.order_stage_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_stage_history.order_id
        and (
          public.current_role_name() in ('owner', 'counter')
          or o.assigned_tailor = auth.uid()
        )
    )
  );
create policy stage_history_insert on public.order_stage_history
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_stage_history.order_id
        and (
          public.current_role_name() in ('owner', 'counter')
          or o.assigned_tailor = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- payments  (owner + counter only; tailors have no payment access)
-- ---------------------------------------------------------------------------
create policy payments_select on public.payments
  for select using (public.current_role_name() in ('owner', 'counter'));
create policy payments_write on public.payments
  for all
  using (public.current_role_name() in ('owner', 'counter'))
  with check (public.current_role_name() in ('owner', 'counter'));
