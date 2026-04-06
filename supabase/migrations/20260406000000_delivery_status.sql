-- Add delivery tracking to email_log
alter table public.email_log
  add column if not exists delivery_status jsonb not null default '{}';
