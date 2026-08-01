-- Adopt supabase/rooms.json as the source of truth for public.rooms.
--
-- Three steps, applied as one transaction by the Supabase CLI:
--   1. Clear the four English demo rooms seeded in supabase/seed.sql. This
--      cascades to their bookings (bookings.room_id is ON DELETE CASCADE),
--      removing 5 test bookings — confirmed intentional, not real reservations.
--   2. Drop code/capacity/location/rules. rooms.json defines the column set and
--      carries none of them; dropping code also drops rooms_code_unique.
--   3. Insert the 6 real (Arabic-named) rooms. category_color is dealt from a
--      shuffled palette so no two rooms share a swatch.

delete from public.rooms;

alter table public.rooms
  drop column code,
  drop column capacity,
  drop column location,
  drop column rules;

insert into public.rooms (name, building, floor, room_type, amenities, category_color)
values
  ('قاعة أم النور', 'المبنى الرئيسي', 'الدور الأرضي', 'قاعة', array['بروجيكتور', 'صوتيات'], 'sky'),
  ('قاعة الخضراء', 'المبنى الرئيسي', 'الدور السفلي', 'قاعة', array['بروجيكتور', 'صوتيات'], 'lime'),
  ('قاعة الدور الثالث', 'المبنى الرئيسي', 'الدور الثالث', 'قاعة', array['بروجيكتور', 'صوتيات'], 'coral'),
  ('قاعة الدور الرابع', 'المبنى الرئيسي', 'الدور الرابع', 'قاعة', array['بروجيكتور'], 'violet'),
  ('قاعة الدور الخامس', 'المبنى الرئيسي', 'الدور الخامس', 'قاعة', array['بروجيكتور'], 'teal'),
  ('قاعة الدور السادس', 'المبنى الرئيسي', 'الدور السادس', 'قاعة', array['بروجيكتور'], 'rose');
