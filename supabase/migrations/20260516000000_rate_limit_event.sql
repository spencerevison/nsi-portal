-- Durable rate limiter. We were using an in-process Map<userId, timestamps[]>
-- before, which doesn't survive lambda cold starts on Vercel — meaning a user
-- could effectively burst as many sends as there are warm containers. This
-- gives us a real source of truth.
--
-- We deliberately don't reference app_user.id with a FK because purging an
-- app_user shouldn't block on cleaning these up; the rows are short-lived.

create table if not exists public.rate_limit_event (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,                       -- null for system-wide buckets
  bucket      text not null,              -- e.g. 'email.broadcast', 'support.submit'
  created_at  timestamptz not null default now()
);

-- The hot query: count events for (bucket, user) since some cutoff.
create index if not exists rate_limit_event_bucket_user_created_idx
  on public.rate_limit_event (bucket, user_id, created_at desc);

-- Used by the system-wide check and by the cleanup helper.
create index if not exists rate_limit_event_bucket_created_idx
  on public.rate_limit_event (bucket, created_at desc);

alter table public.rate_limit_event enable row level security;
