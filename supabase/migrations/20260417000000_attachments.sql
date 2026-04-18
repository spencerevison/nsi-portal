-- Attachments for posts, comments, and outgoing group emails.
-- Three sibling tables (not polymorphic) so Postgres can enforce FK + cascade
-- directly. Matches the shape of the existing `document` table.

create table if not exists public.post_attachment (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.post(id) on delete cascade,
  display_name  text not null,
  storage_path  text not null unique,
  file_size     bigint not null,
  mime_type     text not null,
  width         integer,
  height        integer,
  uploaded_by   uuid references public.app_user(id),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists post_attachment_post_id_idx
  on public.post_attachment (post_id, sort_order);

create table if not exists public.comment_attachment (
  id            uuid primary key default gen_random_uuid(),
  comment_id    uuid not null references public.comment(id) on delete cascade,
  display_name  text not null,
  storage_path  text not null unique,
  file_size     bigint not null,
  mime_type     text not null,
  width         integer,
  height        integer,
  uploaded_by   uuid references public.app_user(id),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists comment_attachment_comment_id_idx
  on public.comment_attachment (comment_id, sort_order);

-- Email attachments live in Supabase Storage so the email_log.body stays
-- small; server action re-reads them to base64 at send time.
create table if not exists public.email_attachment (
  id            uuid primary key default gen_random_uuid(),
  email_log_id  uuid not null references public.email_log(id) on delete cascade,
  display_name  text not null,
  storage_path  text not null unique,
  file_size     bigint not null,
  mime_type     text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists email_attachment_email_log_id_idx
  on public.email_attachment (email_log_id, sort_order);

alter table public.post_attachment    enable row level security;
alter table public.comment_attachment enable row level security;
alter table public.email_attachment   enable row level security;
-- No policies; all reads/writes go through supabaseAdmin (service role),
-- matching the `document` table pattern.
