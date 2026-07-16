-- ---------------------------------------------------------------------------
-- 0007: drop the "Received" stage — 9 stages become 8.
--
-- Measurements are captured during order creation, so "Received" never held an
-- order for any real time. Orders now open at "Measurement".
--
--   old 1 Received          -> merged into new 1 (Measurement)
--   old 2 Measurement       -> new 1
--   old 3 Cutting           -> new 2
--   old 4 Stitching         -> new 3
--   old 5 Button Fix Given  -> new 4
--   old 6 Button Fixed      -> new 5  (renamed "Button Fix Returned" in the app)
--   old 7 Ironing           -> new 6
--   old 8 Packed            -> new 7
--   old 9 Delivered         -> new 8
--
-- Stage names live in the app (ORDER_STAGES), not the DB — only the numeric
-- range and the shift are handled here.
-- ---------------------------------------------------------------------------

-- Drop the constraints first: the existing 1..9 checks would reject the shift.
alter table public.orders drop constraint if exists orders_current_stage_check;
alter table public.order_stage_history drop constraint if exists order_stage_history_stage_check;

-- Shift stages down by one. Old stages 1 and 2 both land on the new stage 1,
-- so anything at "Received" moves to "Measurement" rather than falling to 0.
update public.orders
  set current_stage = greatest(current_stage - 1, 1);

update public.order_stage_history
  set stage = greatest(stage - 1, 1);

-- Collapsing old 1+2 into new 1 can leave an order with two consecutive
-- "Measurement" history rows. Keep the earliest of each such run.
delete from public.order_stage_history h
where exists (
  select 1
  from public.order_stage_history prev
  where prev.order_id = h.order_id
    and prev.stage = h.stage
    and prev.changed_at < h.changed_at
    and h.stage = 1
);

-- Re-apply the constraints at the new 1..8 range.
alter table public.orders
  add constraint orders_current_stage_check
  check (current_stage between 1 and 8);

alter table public.order_stage_history
  add constraint order_stage_history_stage_check
  check (stage between 1 and 8);

-- New orders open at Measurement (new stage 1) — unchanged default value, but
-- restated here so the intent is explicit.
alter table public.orders alter column current_stage set default 1;

-- The outsourced button-hole given/returned counts are no longer tracked; the
-- Button Fix Given / Returned stages carry that status on their own.
alter table public.orders
  drop column if exists buttonhole_given,
  drop column if exists buttonhole_returned;
