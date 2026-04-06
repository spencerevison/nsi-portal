-- Phase 4: Member Directory — custom fields + phone column

-- app_user needs a phone column (prototype shows it in directory)
alter table public.app_user
  add column if not exists phone text;

-- Custom field definitions (admin-configurable)
create table if not exists public.custom_field (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  field_type        text not null default 'text',
  options           jsonb,
  show_in_directory boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

-- Per-user custom field values with visibility toggle
create table if not exists public.custom_field_value (
  user_id   uuid not null references public.app_user(id) on delete cascade,
  field_id  uuid not null references public.custom_field(id) on delete cascade,
  value     text,
  visible   boolean not null default true,
  primary key (user_id, field_id)
);

create index if not exists cfv_field_id_idx on public.custom_field_value (field_id);

alter table public.custom_field       enable row level security;
alter table public.custom_field_value enable row level security;

-- Seed: Children and Dogs
insert into public.custom_field (name, field_type, show_in_directory, sort_order) values
  ('Children', 'text', true, 1),
  ('Dogs',     'text', true, 2)
on conflict do nothing;
