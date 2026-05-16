# nsi-portal

## Operations

### Supabase keep-alive cron

A Vercel Cron pings `/api/cron/keep-alive` daily at 12:00 UTC. The handler
reads one row from `app_user` so Supabase registers activity — without it,
the free-tier project auto-pauses after 7 days of idle traffic.

This is a stop-gap. Per [ADR-002](docs/adr-002-database-and-hosting.md) the
plan is still to upgrade to Supabase Pro at launch, which removes the
auto-pause behaviour entirely. The cron just buys time until then.

Daily (not every 3 days) so a couple of missed runs don't trip the 7-day
pause. We learned this the hard way once.

**Setup:**

1. Set `CRON_SECRET` in `.env.local` and in **Vercel → Project → Settings → Environment Variables** (any random string, just match between the two). Vercel sends it automatically as `Authorization: Bearer ${CRON_SECRET}` to scheduled cron requests. If the var is missing on Vercel the handler still runs (and logs a warning) so the keep-alive isn't silently broken — but you should set it.
2. The `crons` entry in `vercel.json` registers the schedule on next deploy.

**Verify it's running:**

- Vercel dashboard → project → **Crons** tab shows last run + next run.
- Function logs should show `keep-alive ok { timestamp, rows }` after each invocation. (Hobby plan only retains ~1h of logs, so check soon after a run.)
- Locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/keep-alive` — expect `{ ok: true, ... }`. Without the header it should 401 (assuming `CRON_SECRET` is set locally).
