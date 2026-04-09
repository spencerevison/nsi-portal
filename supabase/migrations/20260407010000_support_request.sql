create table if not exists public.support_request (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.app_user(id),
  category   text not null,
  subject    text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.support_request enable row level security;
