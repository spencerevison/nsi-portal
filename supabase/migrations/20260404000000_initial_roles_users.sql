-- Initial schema: User, Role, RoleCapability
-- Capability model: Users have one Role; Roles have many Capabilities (strings).
-- Enforcement is primarily in server actions; RLS is defense-in-depth.

create extension if not exists "pgcrypto";

-- Role
create table if not exists public.role (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- RoleCapability (join)
create table if not exists public.role_capability (
  role_id    uuid not null references public.role(id) on delete cascade,
  capability text not null,
  primary key (role_id, capability)
);

create index if not exists role_capability_capability_idx
  on public.role_capability (capability);

-- User
-- clerk_id is nullable because we pre-seed profiles before the invite is accepted.
create table if not exists public.app_user (
  id              uuid primary key default gen_random_uuid(),
  clerk_id        text unique,
  email           text unique not null,
  first_name      text not null,
  last_name       text not null,
  phone           text,
  lot_number      text,
  role_id         uuid references public.role(id),
  invited_at      timestamptz,
  accepted_at     timestamptz,
  last_login      timestamptz,
  notify_new_post boolean not null default true,
  notify_replies  boolean not null default true,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists app_user_role_id_idx on public.app_user (role_id);
create index if not exists app_user_clerk_id_idx on public.app_user (clerk_id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_user_set_updated_at on public.app_user;
create trigger app_user_set_updated_at
  before update on public.app_user
  for each row execute function public.set_updated_at();

-- RLS — enabled on all tables. Policies will be added as the app wires up
-- proper JWT-based capability checks. For now, no policies = no access via
-- the anon/publishable key, which is what we want while building.
alter table public.role            enable row level security;
alter table public.role_capability enable row level security;
alter table public.app_user        enable row level security;

-- Seed: MVP roles
insert into public.role (name, description, is_default) values
  ('Admin',   'Full access to all features and admin tools', false),
  ('Council', 'Council members — can send group email, access docs and directory', false),
  ('Member',  'Standard community member', true)
on conflict (name) do nothing;

-- Seed: capabilities per role
-- Admin gets everything
insert into public.role_capability (role_id, capability)
select r.id, c.capability
from public.role r
cross join (values
  ('documents.read'),
  ('documents.write'),
  ('directory.read'),
  ('directory.manage'),
  ('email.send'),
  ('community.read'),
  ('community.write'),
  ('community.moderate'),
  ('admin.access'),
  ('groups.manage'),
  ('roles.manage')
) as c(capability)
where r.name = 'Admin'
on conflict do nothing;

-- Council
insert into public.role_capability (role_id, capability)
select r.id, c.capability
from public.role r
cross join (values
  ('documents.read'),
  ('directory.read'),
  ('email.send'),
  ('community.read'),
  ('community.write'),
  ('community.moderate')
) as c(capability)
where r.name = 'Council'
on conflict do nothing;

-- Member
insert into public.role_capability (role_id, capability)
select r.id, c.capability
from public.role r
cross join (values
  ('documents.read'),
  ('directory.read'),
  ('community.read'),
  ('community.write')
) as c(capability)
where r.name = 'Member'
on conflict do nothing;
