-- Store all per-recipient email IDs from Resend batch sends
alter table public.email_log
  add column if not exists resend_email_ids text[] not null default '{}';

-- Atomic delivery status increment (avoids read-modify-write race)
create or replace function public.increment_delivery_status(
  log_id uuid,
  status_key text
)
returns void
language plpgsql
as $$
begin
  update public.email_log
  set delivery_status = jsonb_set(
    delivery_status,
    array[status_key],
    to_jsonb(coalesce((delivery_status->>status_key)::int, 0) + 1)
  )
  where id = log_id;
end;
$$;
