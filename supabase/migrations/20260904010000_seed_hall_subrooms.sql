-- Hall subrooms (US-002): seed the 20 individually bookable subrooms for
-- the three subdivided halls (قاعة الدور الرابع، الخامس، السادس). Each
-- subroom's name is just its number; building/floor/category_color are
-- copied from its parent hall, and parent_room_id links it back so the
-- hierarchy-aware conflict checking added in 20260904000000 applies.

insert into public.rooms (name, building, floor, room_type, amenities, category_color, parent_room_id)
select
  subroom.name,
  hall.building,
  hall.floor,
  'قاعة',
  array[]::text[],
  hall.category_color,
  hall.id
from public.rooms hall
join (
  values
    ('قاعة الدور الرابع', '401'),
    ('قاعة الدور الرابع', '402'),
    ('قاعة الدور الرابع', '403'),
    ('قاعة الدور الرابع', '404'),
    ('قاعة الدور الرابع', '405'),
    ('قاعة الدور الرابع', '406'),
    ('قاعة الدور الخامس', '501'),
    ('قاعة الدور الخامس', '502'),
    ('قاعة الدور الخامس', '503'),
    ('قاعة الدور الخامس', '504'),
    ('قاعة الدور الخامس', '505'),
    ('قاعة الدور الخامس', '506'),
    ('قاعة الدور السادس', '601'),
    ('قاعة الدور السادس', '602'),
    ('قاعة الدور السادس', '603'),
    ('قاعة الدور السادس', '604'),
    ('قاعة الدور السادس', '605'),
    ('قاعة الدور السادس', '606'),
    ('قاعة الدور السادس', '607'),
    ('قاعة الدور السادس', '608')
) as subroom (hall_name, name) on subroom.hall_name = hall.name;
