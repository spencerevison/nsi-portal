alter table public.support_request
  add column status text not null default 'new';
