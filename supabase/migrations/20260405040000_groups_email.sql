-- Phase 6: Groups and Email

create table if not exists public.group_ (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  slug        text unique not null,
  description text,
  created_at  timestamptz not null default now()
);

-- using group_ because "group" is a reserved keyword in SQL

create table if not exists public.user_group (
  user_id   uuid not null references public.app_user(id) on delete cascade,
  group_id  uuid not null references public.group_(id) on delete cascade,
  primary key (user_id, group_id)
);

create index if not exists user_group_group_id_idx on public.user_group (group_id);

create table if not exists public.email_log (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  body            text not null,
  sent_by         uuid references public.app_user(id),
  target_groups   text[] not null,
  recipient_count integer not null default 0,
  resend_batch_id text,
  sent_at         timestamptz not null default now()
);

alter table public.group_    enable row level security;
alter table public.user_group enable row level security;
alter table public.email_log enable row level security;

-- Seed groups matching the prototype
insert into public.group_ (name, slug) values
  ('Council',    'council'),
  ('First Gen',  'first-gen'),
  ('Second Gen', 'second-gen'),
  ('Third Gen',  'third-gen'),
  ('Work Party', 'work-party')
on conflict (name) do nothing;
