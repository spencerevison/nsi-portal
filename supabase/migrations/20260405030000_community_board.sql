-- Phase 5: Community Board

create table if not exists public.post (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  author_id   uuid not null references public.app_user(id) on delete cascade,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists post_created_at_idx on public.post (created_at desc);
create index if not exists post_author_id_idx on public.post (author_id);

-- reuse the updated_at trigger
drop trigger if exists post_set_updated_at on public.post;
create trigger post_set_updated_at
  before update on public.post
  for each row execute function public.set_updated_at();

create table if not exists public.comment (
  id          uuid primary key default gen_random_uuid(),
  body        text not null,
  post_id     uuid not null references public.post(id) on delete cascade,
  author_id   uuid not null references public.app_user(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists comment_post_id_idx on public.comment (post_id);
create index if not exists comment_author_id_idx on public.comment (author_id);

alter table public.post    enable row level security;
alter table public.comment enable row level security;
