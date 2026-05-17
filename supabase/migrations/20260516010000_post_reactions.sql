-- Reactions on posts and comments.
-- One row per (target, user, emoji). The composite PK doubles as the
-- "one of each emoji per user" uniqueness constraint.

create table if not exists public.post_reaction (
  post_id    uuid not null references public.post(id) on delete cascade,
  user_id    uuid not null references public.app_user(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create index if not exists post_reaction_post_id_idx on public.post_reaction (post_id);

create table if not exists public.comment_reaction (
  comment_id uuid not null references public.comment(id) on delete cascade,
  user_id    uuid not null references public.app_user(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);

create index if not exists comment_reaction_comment_id_idx on public.comment_reaction (comment_id);

alter table public.post_reaction    enable row level security;
alter table public.comment_reaction enable row level security;
