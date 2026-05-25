-- Add mailing address to app_user.
-- Most members live elsewhere most of the year — the lot is the cabin, but
-- they have a primary residence we'd want to mail things to.
alter table public.app_user
  add column if not exists address text;
