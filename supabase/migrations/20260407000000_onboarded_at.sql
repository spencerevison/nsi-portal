-- Track when a user dismisses the welcome banner
alter table app_user add column onboarded_at timestamptz;
