-- Add a human-friendly auto-increment ID for support requests
alter table public.support_request
  add column request_number serial;

-- backfill existing rows in creation order
with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.support_request
)
update public.support_request sr
  set request_number = numbered.rn
  from numbered
  where sr.id = numbered.id;

-- ensure uniqueness going forward
create unique index support_request_number_idx on public.support_request (request_number);
