-- Track whether a member has reviewed their directory info.
-- Set on self-edit or explicit confirmation; cleared when an admin edits
-- their record so the member sees the change and re-confirms.
alter table public.app_user
  add column if not exists profile_confirmed_at timestamptz;
