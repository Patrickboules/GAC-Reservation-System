-- Local/dev seed data: sample rooms and an admin profile for testing.
-- Applied automatically by `supabase db reset` after migrations run, or via
-- `psql -f supabase/seed.sql` against a local Supabase instance.

insert into public.rooms (name, capacity, amenities, location, building, floor, room_type, rules)
values
  ('Antonious Hall', 150, array['projector', 'stage', 'sound system'], 'Main Building, Ground Floor', 'Main Building', 'Ground Floor', 'Hall', 'Requires setup/cleanup crew; no food without prior approval.'),
  ('Gawargious Room', 40, array['whiteboard', 'tv screen'], 'Main Building, 1st Floor', 'Main Building', '1st Floor', 'Meeting Room', 'Suitable for meetings and small classes.'),
  ('Youth Room', 25, array['tables', 'chairs'], 'Annex Building', 'Annex Building', null, 'Classroom', 'Furniture may be rearranged; return to original layout after use.'),
  ('Choir Room', 20, array['piano', 'music stands'], 'Main Building, 2nd Floor', 'Main Building', '2nd Floor', 'Practice Room', 'No food or drink permitted.')
on conflict do nothing;

-- Seed one admin user for local testing. Inserting directly into auth.users
-- mirrors what Supabase Auth does on signup, so the on_auth_user_created
-- trigger fires and creates the matching profiles row; we then promote it.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@gac-reservations.local',
  crypt('ChangeMe123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"GAC Admin"}',
  now(), now(), '', '', '', ''
where not exists (
  select 1 from auth.users where email = 'admin@gac-reservations.local'
);

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  now(), now(), now()
from auth.users u
where u.email = 'admin@gac-reservations.local'
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

update public.profiles
set role = 'admin', display_name = coalesce(display_name, 'GAC Admin')
where id = (select id from auth.users where email = 'admin@gac-reservations.local');
