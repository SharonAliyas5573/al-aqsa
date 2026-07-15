-- Al Aqsa Tailor OMS — bootstrap the first owner.
--
-- RLS lets ONLY an existing owner manage profiles, so the very first owner
-- must be created out-of-band. Steps:
--   1. In Supabase Dashboard → Authentication → Users → "Add user", create the
--      owner's email + password (confirm the email).
--   2. Copy that user's UUID.
--   3. Run the statement below with the UUID and name filled in.
--
-- After this, the owner can invite all other staff from the app's Staff screen.

insert into public.profiles (id, full_name, role, active)
values ('PASTE-OWNER-AUTH-UUID-HERE', 'Shop Owner', 'owner', true)
on conflict (id) do update
  set role = 'owner', active = true, full_name = excluded.full_name;
