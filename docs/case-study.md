# NSI Community Portal — Case Study

> A plain-English walkthrough of the decisions that mattered most on
> this project. Pairs with the [README](../README.md) (what it is),
> the [system design doc](nsi-portal-system-design.md) (how it works),
> and the [ADRs](adr-001-authentication-provider.md) (technology
> trail).

## The brief

North Secretary Island is a 14-property strata community on the BC
coast, about 70–112 people depending on how you count second-gen
owners and spouses. For years the community ran on long group email
threads with attachments — replies to replies, forwarded PDFs, no
canonical version of anything. The point of the portal was a single
place to browse strata documents, look up other members, and
reliably communicate with the whole community.

The membership skews older — plenty of 70-somethings — so the ease
bar was high: nothing clever, nothing that assumes you remember a
pattern from last week. The community has one near-full-time
non-technical admin and one backup. Traffic is low. There is no
engineering team. The whole thing has to keep running after I stop
touching it. The budget was about 600 CAD/year. I shipped on the
domain alone — ~20 CAD/year.

## Constraints that shaped everything

A few things were true from day one and ruled out a lot:

- **Free tiers across the stack** (Clerk dev, Supabase free, Resend
  free, Vercel hobby) had to carry it. That forced things like the
  [Vercel Cron keep-alive](../README.md#supabase-keep-alive-cron) to
  dodge Supabase's 7-day auto-pause.
- **Stable, trusted membership.** Members are known to the admin.
  The realistic threat model is "a member forgets their password" or
  "the admin invites the wrong email," not adversarial attack.
- **The admin is non-technical.** Every UI decision had to pass the
  "could the admin do this without me?" test.
- **It needs to outlive me.** Whoever inherits maintenance (probably
  nobody) will be reading the code cold a year from now. That
  favored boring, conventional choices.

## Splitting identity from everything else

The most load-bearing decision was the seam between Clerk and
Supabase. Clerk owns identity — name, email, password, sessions,
optional 2FA. Supabase owns everything else.

I could have built auth in Supabase Auth and kept one service. But
the invitation flow on every managed-auth product I evaluated
assumed self-onboarding from a public sign-up form. What NSI needed
was the reverse: an admin pre-creates a profile, the invitee gets an
email, clicks a link, and is in. Clerk's invitation API matches that
exactly. Building it on top of Supabase Auth would have meant my own
token email, sign-up page, expiry, resend — a category of work I'd
have to maintain forever.

The price is a webhook bridge. `user.created` fires when an invitee
finishes sign-up, and my handler links the new Clerk user to the
pre-seeded Supabase profile by email. Webhooks drop, so I added a
self-heal: if a member signs in and `clerk_id` isn't set, the next
request looks them up by primary email and links them inline. That
fallback has never fired in production, but it's the kind of code
you write once and never revisit.

## Skipping RLS in favor of server-action gates

Supabase pushes you hard toward Row-Level Security. It's the right
answer when the browser talks to the database directly. We don't do
that. Every read and write goes through a Next.js Server Action
using the service-role key, which bypasses RLS entirely.

So I made an explicit call: RLS is *enabled* on every table (so the
publishable key can't read anything), but no policies are *defined*.
Authorization lives in one helper, `requireCapability()`, that every
server action calls before touching the database.

This is the trade-off I'd push back on hardest in a code review of
someone else's project. RLS is defense in depth. A future engineer
could add a Server Component that forgets the gate. I chose against
RLS because the trusted-server-only access pattern means a missed
gate is the only leak path, and missed gates are grep-able across
~40 server actions. Mirroring an admin-editable role/capability
system into RLS policies would also mean regenerating policies on
every role change — a class of bug I didn't want to own.

I'd revisit if the trust model ever changed. Today's choice is sized
to today's reality.

## Bespoke, not whitelabel

There's a version of this where I built a generic "strata portal in
a box" — themeable branding, configurable seeds, multi-tenant
database. It would have tripled the work, shipped six months later,
and left me with one customer and a maintenance burden modeled on
imagined growth.

So the portal is hardcoded for NSI. Brand in code, not config.
Default folders ("Strata Documents", "Meeting Minutes") as seed
migrations. Groups ("Council", "First Gen", "Work Party")
opinionated. The discipline was noticing every time I reached for
generality and asking whether it served the project or just my
professional instincts. Usually the second.

## Pre-seeded profiles + the onboarding spine

The invitation flow was the failure point on every platform we
evaluated before settling on this stack. Squarespace Members and Wix
Members let you import emails but couldn't pre-populate a name or
lot, so the admin would enter every member's details twice. Most
"private community" SaaS assumes self-onboarding from a public form,
which is backwards for our scale.

What we built: the admin enters all 14 lots' worth of data once,
clicks "Send invitation" (individually or bulk via CSV), and each
member gets an email with a link to a fully populated profile. They
never type their own name or lot, and they never see a public
sign-up page someone outside the community could land on.

The Status field (`Draft --> Invited --> Active --> Revoked -->
Inactive`) is derived, not stored — computed from `invited_at`,
`accepted_at`, `active`, and `revoked_at` in one helper. The kind of
small thing that prevents whole categories of "badge says Invited
but the user is Active" bugs.

## Shared UI for members and admins

The original instinct was a separate admin app: members at `/portal`,
admin at `/admin`. Killed quickly — the admin is also a member, and
context-switching to upload a document then check it rendered would
be friction with no upside. Worse, it doubles every UI decision.

Instead, admin controls live inline in the same pages members use,
gated by capabilities. The "Add member" button is on the members
page. Document upload is on the folder view, visible only with
`documents.write`. The admin sees the portal exactly as members do,
plus her controls — so she catches member-facing issues from the
member's perspective, automatically.
([ADR-005](adr-005-admin-ui-approach.md) has the full reasoning.)

The one concession was an `/admin` section for genuinely
administrative tasks — roles, groups, support inbox — that don't
have a member-facing analog.

## What I'd build next

**Zod at the data boundary.** Supabase query results are currently
typed by hand-written interfaces kept in sync with the schema.
Adding Zod schemas that parse query results at the boundary would
catch DB drift at runtime and let me delete the manual types. Small
change, high payoff — I didn't do it pre-launch because the manual
types weren't slowing me down as solo dev.

**A real ORM (Drizzle).** Going further: Drizzle gives compile-time
column checks, managed migrations, type inference from schema. I'd
pick it over Prisma because it stays close to SQL — which matters
when the next person to touch the code already knows Postgres better
than they know an ORM.

Beyond those: managed migration for production (currently `supabase
db push` against a re-linked CLI, fine for solo dev), and
signed-payload verification on the Resend webhook if traffic ever
justified it.

## What this taught me about scale-appropriate engineering

At a larger scale almost every decision above would flip. At NSI's
scale they'd be over-built, and over-built systems decay the same
way under-built ones do — they just decay slower, into something
nobody understands well enough to fix. The version that ships is
the version where the admin can do her job without me, the code
reads in an afternoon, and the running cost is the domain.
