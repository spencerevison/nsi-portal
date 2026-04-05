-- Track invitation revocation separately from deactivation.
-- Revoked = admin cancelled the invite before it was accepted.
-- Inactive = admin deactivated the member after acceptance.

alter table public.app_user
  add column if not exists revoked_at timestamptz;
