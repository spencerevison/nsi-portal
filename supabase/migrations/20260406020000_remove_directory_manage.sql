-- Remove unused directory.manage capability
delete from public.role_capability where capability = 'directory.manage';
