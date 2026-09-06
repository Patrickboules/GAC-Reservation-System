-- Hall subrooms (US-001): give rooms an optional parent (a hall's
-- subrooms point back at the hall) and make the database itself reject an
-- approved booking on a hall that overlaps an approved booking on one of
-- its own subrooms (or vice versa), while leaving sibling subrooms free to
-- be booked independently of each other and of unrelated rooms.

alter table public.rooms
  add column parent_room_id uuid references public.rooms (id) on delete restrict;

create index rooms_parent_room_id_idx on public.rooms (parent_room_id);

-- Enforce that the hierarchy is exactly two levels deep: a room that
-- already has a parent can never itself be used as another room's parent,
-- and a room that already has subrooms can never be given a parent of its
-- own (self-parenting is rejected too, as a degenerate one-room cycle).
create or replace function public.enforce_room_hierarchy_depth()
returns trigger
language plpgsql
as $$
declare
  v_parent_has_parent boolean;
begin
  if new.parent_room_id is null then
    return new;
  end if;

  if new.parent_room_id = new.id then
    raise exception 'A room cannot be its own parent';
  end if;

  select (parent_room_id is not null) into v_parent_has_parent
  from public.rooms
  where id = new.parent_room_id;

  if v_parent_has_parent then
    raise exception 'Room hierarchy is limited to two levels: room % already has a parent, so it cannot be used as a parent itself', new.parent_room_id;
  end if;

  if exists (select 1 from public.rooms where parent_room_id = new.id) then
    raise exception 'Room % already has subrooms and cannot be assigned a parent', new.id;
  end if;

  return new;
end;
$$;

create trigger rooms_enforce_hierarchy_depth
  before insert or update of parent_room_id on public.rooms
  for each row
  execute function public.enforce_room_hierarchy_depth();

-- The existing bookings_no_overlap exclusion constraint (20260824000000)
-- already blocks two overlapping approved bookings on the exact same
-- room_id via a GiST index. It cannot, by itself, express the additional
-- hall<->subroom rule (a hall and its own subrooms must never both hold an
-- overlapping approved booking, but two sibling subrooms of the same hall
-- must be allowed to) because that relationship isn't a simple equality
-- between the two rows' room_id — it depends on a lookup into `rooms` for
-- each row, and GiST exclusion constraints require the same immutable
-- expression compared on both sides of the index. This trigger supplements
-- the exclusion constraint with that lookup. It takes an advisory
-- transaction lock keyed on the hall id first, to close the same
-- check-then-act race the exclusion constraint was originally added to
-- close: without the lock, two concurrent transactions — one approving the
-- hall, one approving a subroom — could both read "no conflict" before
-- either commits.
--
-- security definer + a pinned search_path (mirroring public.is_admin(),
-- the existing security-definer pattern in this codebase) so the conflict
-- check sees every member's approved bookings on the parent/child rooms,
-- not just the caller's own rows under bookings_select_own's RLS policy.
create or replace function public.enforce_hall_subroom_no_overlap()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  v_parent_id uuid;
  v_lock_key uuid;
  v_conflict_id uuid;
begin
  if new.status <> 'approved' then
    return new;
  end if;

  select parent_room_id into v_parent_id
  from public.rooms
  where id = new.room_id;

  v_lock_key := coalesce(v_parent_id, new.room_id);
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key::text, 0));

  -- Conflict against an approved booking on the parent hall.
  if v_parent_id is not null then
    select b.id into v_conflict_id
    from public.bookings b
    where b.room_id = v_parent_id
      and b.status = 'approved'
      and b.date = new.date
      and b.id <> new.id
      and new.start_time < b.end_time
      and new.end_time > b.start_time
    limit 1;

    if v_conflict_id is not null then
      raise exception 'Booking conflicts with an approved booking on the parent room'
        using errcode = '23P01';
    end if;
  end if;

  -- Conflict against an approved booking on any child subroom.
  select b.id into v_conflict_id
  from public.bookings b
  join public.rooms r on r.id = b.room_id
  where r.parent_room_id = new.room_id
    and b.status = 'approved'
    and b.date = new.date
    and b.id <> new.id
    and new.start_time < b.end_time
    and new.end_time > b.start_time
  limit 1;

  if v_conflict_id is not null then
    raise exception 'Booking conflicts with an approved booking on a subroom'
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

create constraint trigger bookings_no_hall_subroom_overlap
  after insert or update on public.bookings
  for each row
  execute function public.enforce_hall_subroom_no_overlap();
