-- Populate a first-time user's profile display_name from Google OAuth metadata.
-- Google sign-in stores the user's name under raw_user_meta_data 'full_name' /
-- 'name' (not 'display_name'), so the original trigger left display_name null for
-- OAuth users. Fall back through the available name fields to the email address.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
