-- Al Aqsa Tailor OMS — functions & triggers
-- Requires 0001_schema.sql.

-- ---------------------------------------------------------------------------
-- Role helper (SECURITY DEFINER so RLS policies can read the caller's role
-- without recursing into the profiles RLS policy).
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

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

-- ---------------------------------------------------------------------------
-- order_no generation: AQ-YYMM-NNNN (zero-padded from a global sequence).
-- ---------------------------------------------------------------------------
create or replace function public.set_order_no()
returns trigger
language plpgsql
as $$
begin
  if new.order_no is null then
    new.order_no := 'AQ-' || to_char(now(), 'YYMM') || '-' ||
      lpad(nextval('public.order_no_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trg_set_order_no
  before insert on public.orders
  for each row execute function public.set_order_no();

-- ---------------------------------------------------------------------------
-- Record stage history whenever an order's current_stage changes (and on
-- insert for the initial stage).
-- ---------------------------------------------------------------------------
create or replace function public.log_stage_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_stage_history (order_id, stage, changed_by)
    values (new.id, new.current_stage, auth.uid());
  elsif new.current_stage is distinct from old.current_stage then
    insert into public.order_stage_history (order_id, stage, changed_by)
    values (new.id, new.current_stage, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_log_stage_change_ins
  after insert on public.orders
  for each row execute function public.log_stage_change();

create trigger trg_log_stage_change_upd
  after update of current_stage on public.orders
  for each row execute function public.log_stage_change();

-- ---------------------------------------------------------------------------
-- Deduct fabric stock when an order_item referencing a fabric is inserted.
-- Uses fabric_metres * quantity if fabric_metres is set.
-- ---------------------------------------------------------------------------
create or replace function public.deduct_fabric_stock()
returns trigger
language plpgsql
as $$
begin
  if new.fabric_id is not null and coalesce(new.fabric_metres, 0) > 0 then
    update public.fabrics
      set stock_metres = stock_metres - (new.fabric_metres * new.quantity)
      where id = new.fabric_id;
  end if;
  return new;
end;
$$;

create trigger trg_deduct_fabric_stock
  after insert on public.order_items
  for each row execute function public.deduct_fabric_stock();

-- ---------------------------------------------------------------------------
-- Recompute payment_status after any payment change, based on total_amount
-- vs sum of payments for the order.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_payment_status(p_order uuid)
returns void
language plpgsql
as $$
declare
  v_total numeric;
  v_paid numeric;
  v_status public.payment_status;
begin
  select total_amount into v_total from public.orders where id = p_order;
  select coalesce(sum(amount), 0) into v_paid
    from public.payments where order_id = p_order;

  if v_paid <= 0 then
    v_status := 'pending';
  elsif v_paid >= v_total then
    v_status := 'paid';
  else
    v_status := 'partial';
  end if;

  update public.orders set payment_status = v_status where id = p_order;
end;
$$;

create or replace function public.on_payment_change()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_payment_status(coalesce(new.order_id, old.order_id));
  return coalesce(new, old);
end;
$$;

create trigger trg_payment_change
  after insert or update or delete on public.payments
  for each row execute function public.on_payment_change();

-- Also recompute when an order's total_amount is edited.
create or replace function public.on_order_total_change()
returns trigger
language plpgsql
as $$
begin
  if new.total_amount is distinct from old.total_amount then
    perform public.recompute_payment_status(new.id);
  end if;
  return new;
end;
$$;

create trigger trg_order_total_change
  after update of total_amount on public.orders
  for each row execute function public.on_order_total_change();
