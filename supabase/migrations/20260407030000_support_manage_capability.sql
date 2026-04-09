-- Add support.manage capability to Admin role
insert into public.role_capability (role_id, capability)
select r.id, 'support.manage'
from public.role r
where r.name = 'Admin'
on conflict do nothing;
