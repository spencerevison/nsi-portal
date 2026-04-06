-- Phase 3: Document Library — Folder and Document tables + seed data

create table if not exists public.folder (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  parent_id   uuid references public.folder(id) on delete cascade,
  sort_order  integer not null default 0,
  created_by  uuid references public.app_user(id),
  created_at  timestamptz not null default now(),

  -- slug must be unique within the same parent
  unique (parent_id, slug)
);

create index if not exists folder_parent_id_idx on public.folder (parent_id);

create table if not exists public.document (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  storage_path  text not null unique,
  folder_id     uuid not null references public.folder(id) on delete cascade,
  file_size     bigint,
  mime_type     text,
  uploaded_by   uuid references public.app_user(id),
  uploaded_at   timestamptz not null default now()
);

create index if not exists document_folder_id_idx on public.document (folder_id);

-- RLS
alter table public.folder   enable row level security;
alter table public.document enable row level security;

-- Seed: top-level folders from the design spec
-- Two-level max: top-level categories, with sub-folders added by admin later
insert into public.folder (name, slug, sort_order) values
  ('Strata Documents', 'strata-documents', 1),
  ('Meeting Minutes',  'meeting-minutes',  2),
  ('Financial',        'financial',        3),
  ('Insurance',        'insurance',        4),
  ('Forms',            'forms',            5),
  ('Community',        'community',        6)
on conflict do nothing;
