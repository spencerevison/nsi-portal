# nsi-portal

## Operations

### Supabase keep-alive cron

A Vercel Cron pings `/api/cron/keep-alive` every 3 days at 12:00 UTC. The
handler runs a cheap `count` against `app_user` so Supabase registers
activity — without it, the free-tier project would auto-pause after 7 days
of idle traffic.

This is a stop-gap. Per [ADR-002](docs/adr-002-database-and-hosting.md) the
plan is still to upgrade to Supabase Pro at launch, which removes the
auto-pause behaviour entirely. The cron just buys time until then.

**Setup:**

1. Set `CRON_SECRET` in `.env.local` and in **Vercel → Project → Settings → Environment Variables** (any random string, just match between the two). Vercel sends it automatically as `Authorization: Bearer ${CRON_SECRET}` to scheduled cron requests.
2. The `crons` entry in `vercel.json` registers the schedule on next deploy.

**Verify it's running:**

- Vercel dashboard → project → **Crons** tab shows last run + next run.
- Function logs should show `keep-alive ok { timestamp, count }` after each invocation.
- Locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/keep-alive` — expect `{ ok: true, ... }`. Without the header it should 401.
