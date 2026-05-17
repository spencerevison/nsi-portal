-- Make app_user.email case-insensitive at the column level.
--
-- We've been normalizing emails to lowercase in app code, but the column
-- itself is plain text with a vanilla unique constraint — so a future bug
-- that forgets the .toLowerCase() could let "Foo@bar.com" coexist with
-- "foo@bar.com", and the email-based Clerk linking would then have two
-- candidates with ambiguous winner. citext makes uniqueness and equality
-- comparisons case-insensitive at the storage layer.

create extension if not exists "citext";

-- Normalize existing rows first so the type conversion doesn't fail on
-- a duplicate (e.g. legacy data with mixed casing collapsing to the same
-- value under citext).
update public.app_user
   set email = lower(email)
 where email <> lower(email);

alter table public.app_user
  alter column email type citext using email::citext;
