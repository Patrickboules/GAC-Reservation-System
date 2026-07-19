-- Core schema for GAC Reservations: rooms, bookings, profiles.
create extension if not exists pgcrypto;

create type booking_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer,
  amenities text[] not null default '{}',
  location text,
  rules text,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  service text not null,
  notes text,
  status booking_status not null default 'pending',
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_end_after_start check (end_time > start_time)
);

create index bookings_room_date_idx on bookings (room_id, date);
create index bookings_user_id_idx on bookings (user_id);
