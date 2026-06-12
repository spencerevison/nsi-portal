-- Family graph: nodes (members + placeholders) and links (parent/partner only).
-- Siblings, grandparents, cousins etc. are derived in src/lib/family.ts —
-- never stored, so they can never disagree with the parent/partner facts.

create table if not exists public.family_node (
  id           uuid primary key default gen_random_uuid(),
  -- set for members, null for placeholders. on delete set null keeps the
  -- person in the tree when an account is removed (name frozen by app code).
  app_user_id  uuid unique references public.app_user(id) on delete set null,
  display_name text,
  birth_year   integer,
  death_year   integer,
  gender       text check (gender in ('m', 'f')),
  created_at   timestamptz not null default now()
);

create table if not exists public.family_link (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('parent', 'partner')),
  -- parent: from = parent, to = child. partner: canonical order from < to.
  from_node  uuid not null references public.family_node(id) on delete cascade,
  to_node    uuid not null references public.family_node(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint family_link_no_self check (from_node <> to_node),
  constraint family_link_partner_ordered
    check (type <> 'partner' or from_node < to_node),
  constraint family_link_unique unique (type, from_node, to_node)
);

create index if not exists family_link_from_idx on public.family_link (from_node);
create index if not exists family_link_to_idx   on public.family_link (to_node);

alter table public.family_node enable row level security;
alter table public.family_link enable row level security;
