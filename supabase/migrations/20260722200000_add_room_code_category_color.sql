-- Adds a short room code and calendar category color to rooms, ahead of the
-- room management CRUD UI (US-042/US-043). Additive and nullable; existing
-- rows are backfilled so admins have sane starting values to edit.
alter table rooms
  add column code text,
  add column category_color text;

alter table rooms
  add constraint rooms_code_unique unique (code);

alter table rooms
  add constraint rooms_category_color_check check (
    category_color is null
    or category_color in ('coral', 'amber', 'teal', 'violet', 'rose', 'lime', 'sky', 'slate')
  );

update rooms r
set
  code = sub.generated_code,
  category_color = sub.generated_color
from (
  select
    id,
    upper(left(regexp_replace(name, '[^A-Za-z]', '', 'g'), 3))
      || lpad((row_number() over (order by created_at))::text, 2, '0') as generated_code,
    (array['coral', 'amber', 'teal', 'violet', 'rose', 'lime', 'sky', 'slate'])
      [((row_number() over (order by created_at) - 1) % 8) + 1] as generated_color
  from rooms
) sub
where r.id = sub.id
  and r.code is null;
