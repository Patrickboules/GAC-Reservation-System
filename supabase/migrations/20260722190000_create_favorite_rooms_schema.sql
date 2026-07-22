-- Favorite rooms: lets a member pin rooms they use often for quick access
-- in the room selector (mobile) and column order (desktop).

create table favorite_rooms (
  user_id uuid not null references auth.users (id) on delete cascade,
  room_id uuid not null references rooms (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, room_id)
);

create index favorite_rooms_user_id_idx on favorite_rooms (user_id);

alter table favorite_rooms enable row level security;

-- A user may only see, add, and remove their own favorites.
create policy favorite_rooms_select_own on favorite_rooms
  for select
  to authenticated
  using (user_id = auth.uid());

create policy favorite_rooms_insert_own on favorite_rooms
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy favorite_rooms_delete_own on favorite_rooms
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on favorite_rooms to authenticated;
grant select, insert, update, delete on favorite_rooms to service_role;
