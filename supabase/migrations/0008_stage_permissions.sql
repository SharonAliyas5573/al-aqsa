-- ---------------------------------------------------------------------------
-- 0008: per-staff stage permissions.
--
-- The owner can say which production stages each staff member may set — e.g. a
-- cutter only advances orders to "Cutting", a stitcher only to "Stitching".
--
-- profiles.allowed_stages holds the stage numbers (1..8, per 0007) that a staff
-- member may move an order to. NULL means "no restriction" — every existing
-- staff account keeps today's behaviour until the owner narrows it. Owners are
-- never restricted.
--
-- Requires 0001-0003 + 0005 + 0006 + 0007.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists allowed_stages smallint[];

comment on column public.profiles.allowed_stages is
  'Stage numbers (1..8) this staff member may set on an order. NULL = all stages allowed. Owners ignore this.';

-- Reject nonsense values up front rather than at permission-check time.
-- A CHECK constraint can't contain a subquery, so the range/duplicate test
-- lives in an IMMUTABLE helper the constraint can call.
create or replace function public.valid_allowed_stages(stages smallint[])
returns boolean
language sql
immutable
as $$
  select stages is null
      or (
        -- every entry a real stage, and no duplicates
        not exists (select 1 from unnest(stages) s where s < 1 or s > 8)
        and coalesce(array_length(stages, 1), 0) =
            (select count(distinct s) from unnest(stages) s)
      );
$$;

alter table public.profiles drop constraint if exists profiles_allowed_stages_check;
alter table public.profiles
  add constraint profiles_allowed_stages_check
  check (public.valid_allowed_stages(allowed_stages));

-- ---------------------------------------------------------------------------
-- Permission check. security definer so it can read profiles regardless of the
-- caller's own row-level visibility.
-- ---------------------------------------------------------------------------
create or replace function public.can_set_stage(target_stage smallint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and (
        p.role = 'owner'                       -- owners: every stage
        or p.allowed_stages is null            -- unrestricted staff
        or target_stage = any(p.allowed_stages)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Enforce on orders.update.
--
-- USING sees the row as it is now; WITH CHECK sees the row after the update.
-- Comparing the two lets a stage change be permission-checked while leaving
-- other order edits (delivery date, totals, assignment) alone.
--
-- Postgres has no "old row" reference inside WITH CHECK, so the stage guard
-- lives in a BEFORE UPDATE trigger, which can see OLD and NEW. RLS keeps
-- handling who may touch orders at all.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_stage_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.current_stage is distinct from old.current_stage then
    if not public.can_set_stage(new.current_stage::smallint) then
      raise exception 'You do not have permission to set this order stage'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_stage_permission on public.orders;
create trigger trg_enforce_stage_permission
  before update on public.orders
  for each row execute function public.enforce_stage_permission();
