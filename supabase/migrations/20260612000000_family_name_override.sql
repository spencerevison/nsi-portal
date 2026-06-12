-- Per-component custom family title. A "family" is a connected component with
-- no stored identity, so the override lives on nodes and is resolved per
-- component (at most one node in a component should carry it).
alter table public.family_node
  add column if not exists family_name_override text;
