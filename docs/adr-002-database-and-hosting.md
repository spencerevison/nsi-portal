# ADR-002: Database and Hosting

**Status:** Accepted
**Date:** 2026-04-04
**Author:** Spencer Campbell

## Context

The NSI Community Portal needs a managed PostgreSQL database to store member profiles, roles and capabilities, groups, documents metadata, community board posts, and email logs. The data model is straightforward — roughly 8–10 tables, ~70–112 user records, and low write volume. Read traffic will be sporadic, with days or weeks of near-zero activity during the off-season.

The auth provider decision (ADR-001: Clerk) means the database does not need to handle authentication — Clerk owns identity, and the database owns profile data, authorization (roles/capabilities), and all application state. A Clerk `user.created` webhook bridges the two systems by matching incoming users to pre-seeded profile records.

The design principles prioritize managed services over self-hosted, low maintenance over low cost, and consolidated tooling over best-of-breed where reasonable. The approved budget is $500–945 CAD/year for all infrastructure.

## Options Considered

### Option A: Supabase (managed Postgres platform)

Supabase provides a managed PostgreSQL database alongside auto-generated REST APIs (PostgREST), a web-based database GUI (Supabase Studio), file storage, realtime subscriptions, and edge functions. It's a full backend platform, not just a database host.

**Pros:**

- Supabase Studio provides a web GUI for browsing tables, running queries, editing records, and inspecting data — useful for development, debugging, and eventual handoff to a non-technical maintainer
- Bundled file storage (Supabase Storage) could serve as the document storage layer, potentially simplifying ADR-004
- Auto-generated REST API via PostgREST means no ORM or manual API layer needed for basic CRUD — query directly from the client with `supabase.from('table').select()`
- Row Level Security (RLS) is built in, providing database-level access control
- Realtime subscriptions available if the community board needs live updates
- JS client library is well-documented and widely adopted
- Standard PostgreSQL underneath — data is always exportable via pg_dump
- Large community and ecosystem (99k+ GitHub stars)

**Cons:**

- Free tier pauses projects after 7 days of inactivity — unsuitable for production without mitigation
- Pro plan is $25 USD/month ($300+ CAD/year), consuming a significant portion of the infrastructure budget
- Using the Supabase client library for data access couples the application to Supabase's API layer, though the underlying data remains portable as standard Postgres
- We won't use Supabase Auth (Clerk handles this), so part of the platform's value proposition goes unused

**Cost:** $0/month (free tier) for development. $25 USD/month (Pro) for production — includes 8 GB database storage, 100 GB file storage, daily backups, no project pausing.

### Option B: Neon (serverless Postgres)

Neon is a serverless PostgreSQL provider with scale-to-zero capability, database branching, and a web-based SQL console. It provides only the database — no bundled storage, APIs, or backend services.

**Pros:**

- Scale-to-zero means the database suspends when idle and wakes on first query — well-suited to NSI's low-traffic pattern, no pausing concerns on the free tier
- Database branching enables instant copies for testing and development
- Generous free tier: 0.5 GB storage, 100 CU-hours/month, up to 20 projects
- Tight Vercel integration (Vercel's recommended Postgres provider)
- Pure database — no platform opinions on how you access your data

**Cons:**

- Database only — file storage, APIs, and any backend logic must be sourced separately
- Web console is functional but lighter than Supabase Studio (SQL editor and basic table browser, not a full data management GUI)
- Would require an ORM (Prisma or Drizzle) for type-safe data access, adding a dependency and build step
- No bundled file storage means a separate service (S3, R2, or similar) for document uploads, increasing the number of services to manage

**Cost:** $0/month (free tier) for development and potentially production. $19 USD/month (Launch) if more storage or compute is needed.

## Decision

**Supabase.**

The primary driver is platform consolidation. Supabase bundles the database, a web GUI, file storage, and auto-generated APIs into a single managed service. For a volunteer-maintained project, reducing the number of services to manage directly reduces ongoing maintenance burden. Choosing Neon would save money on the database but require sourcing file storage separately, adding an ORM for data access, and managing an additional service — trading infrastructure cost for maintenance cost, which contradicts the project's design principles.

The secondary driver is Supabase Studio. Having a web-based GUI for inspecting and editing data is valuable both during development and for long-term maintainability. A future maintainer can open Supabase Studio and understand what's in the database without needing CLI access or ORM knowledge.

The bundled file storage (Supabase Storage) is a significant convenience factor. Document management is a core feature of the portal, and being able to store files through the same platform that hosts the database means one fewer integration boundary, one fewer set of credentials, and one fewer service to monitor.

### Data access approach

The application will use the Supabase JS client library for data access rather than an ORM. The auto-generated REST API provides type-safe queries (`supabase.from('users').select('*').eq('role_id', roleId)`) without requiring schema definition files, migration tooling, or code generation steps that an ORM would introduce. SQL migrations will be managed through Supabase's migration tooling for schema changes.

This couples the data access layer to Supabase's client library, but the trade-off is acceptable: the underlying data is standard PostgreSQL and fully exportable. If Supabase were ever replaced, the migration effort would be rewriting queries against a different client or ORM — not restructuring the data itself.

## Implementation Notes

### Free tier for development, Pro for production

Development and build-phase work will use Supabase's free tier. The free tier pauses projects after 7 days of inactivity, which is acceptable during active development when the database is being accessed regularly.

Before launch, the project will upgrade to the Pro plan ($25 USD/month) to eliminate pausing, enable daily backups, and ensure reliable availability for community members. This cost is within the approved infrastructure budget.

### Webhook integration with Clerk

The Clerk `user.created` webhook will call a Supabase Edge Function or a Next.js API route that updates the pre-seeded profile record in Supabase (matching by email, setting `accepted_at` and storing the Clerk user ID). This is the bridge between the auth layer (Clerk) and the data layer (Supabase) described in ADR-001.

### Row Level Security

RLS policies will be implemented to enforce data access at the database level as a defense-in-depth measure, complementing the capability-based permission checks in the application layer. RLS is not a substitute for application-level authorization — the admin-configurable roles and capabilities system lives in application code — but it provides an additional layer of protection against data access bugs.

## Consequences

**Enables:**

- Single platform for database, file storage, and data management GUI
- Auto-generated API reduces boilerplate data access code
- Web-based Studio simplifies debugging and supports future maintainer handoff
- Bundled file storage simplifies the document management architecture (to be confirmed in ADR-004)
- RLS provides defense-in-depth for data access control

**Constrains:**

- Data access code is coupled to Supabase's JS client library — migrating to a different database host would require rewriting queries
- Production hosting requires the Pro plan at $25 USD/month (~$300 CAD/year)
- Part of the platform (Supabase Auth) goes unused since authentication is handled by Clerk

**Accepts:**

- Vendor dependency on Supabase for database hosting, though the underlying data is standard PostgreSQL and fully portable
- The Pro plan cost, while significant relative to the total budget, aligns with the design principle of paying for managed services over minimizing cost
- The Supabase client library is an additional abstraction over raw SQL, but it reduces code volume and is well-maintained
