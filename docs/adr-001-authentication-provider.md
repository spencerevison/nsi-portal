# ADR-001: Authentication Provider

**Status:** Accepted
**Date:** 2026-04-04
**Author:** Spencer Campbell

## Context

The NSI Community Portal requires invite-based authentication: admins add members by email, the system sends an invitation, and the member sets a password to activate their account. This flow must work flawlessly on first attempt — failed invitations were the documented failure point across every platform evaluated during the 3-month evaluation phase (HOA Start's invitation emails didn't send; HOA Express required manual admin approval after self-registration).

The auth system needs to support:

- **Invite-based registration** — admin triggers invitation from within the app, member receives email, clicks link, sets password, account activates
- **Email/password login** with self-service password reset
- **Session management** — protected routes, middleware-level auth checks
- **Optional 2FA** — available but not required, no additional build effort
- **~70–112 total users**, very low traffic, single-tenant community portal
- **Pre-seeded member profiles** — admin populates profile data (lot number, role, groups) at invitation time, before the member accepts

Authorization (role-based capabilities, admin-configurable permissions) is handled separately in the application database, not by the auth provider. The auth provider is responsible only for authentication: identity verification, session tokens, and the invitation flow.

## Options Considered

### Option A: Clerk (managed auth service)

Clerk is a managed authentication service with a React SDK, Next.js middleware integration, pre-built UI components, and a server-side invitation API.

**Invitation flow:** Call `clerkClient.invitations.createInvitation()` from a Next.js API route or server action. Clerk sends the email. Member clicks the link, lands on the app's sign-up page with a `__clerk_ticket` query parameter. The app calls `signUp.create({ strategy: 'ticket' })` to complete registration. Email is automatically verified via the invitation token — no separate verification step.

**Bulk invitations:** `createInvitationBulk()` supports sending multiple invitations in a single API call, useful for initial community onboarding.

**Pre-built components:** `<SignIn />`, `<SignUp />`, `<UserButton />` provide login/signup/profile UI out of the box. Customizable via an `appearance` prop with three tiers: CSS variables for colors/fonts/radius, element-level CSS class targeting, or fully custom UI using Clerk Elements primitives with your own markup.

**Middleware:** `clerkMiddleware()` handles route protection, session verification, and redirect logic with minimal configuration.

**Pros:**

- Invitation flow is Clerk's core product — battle-tested, reliable email delivery
- Pre-built UI reduces frontend auth code to near-zero
- Middleware integration is clean and well-documented for Next.js App Router
- Optional 2FA available with no additional build effort (dashboard toggle)
- Social SSO (Google, Apple, etc.) can be enabled later via dashboard toggle if desired — no code changes required
- Externalizes security surface area: password hashing, brute force protection, session token rotation, rate limiting
- Free tier supports 10,000 MAU (NSI needs ~112 max)
- Reduces handoff complexity — future maintainer manages a Clerk account, not a custom auth implementation

**Cons:**

- Introduces an architectural seam: Clerk owns identity (email, password, sessions), Supabase owns profile data (lot number, role, groups, custom fields). User data lives in two systems, bridged by a webhook sync
- Vendor dependency — Clerk-specific imports in middleware, hooks, and components create coupling. Migration to another provider would require ~2–3 days of work (replacing middleware, auth hooks, invitation flow, sign-in/sign-up pages, webhook integration)
- "Secured by Clerk" branding on components unless on a paid plan (not a significant concern for a community portal)
- Pre-built components, while customizable, may not match the portal's design language precisely without Tier 2/3 customization effort

**Cost:** $0/month (free tier). Paid tier ($25/month) only needed for branding removal or enterprise SSO, neither of which NSI requires.

### Option B: Supabase Auth (bundled with database)

Supabase includes GoTrue-based authentication alongside its Postgres database, providing email/password login, magic links, and an admin invitation API via `supabase.auth.admin.inviteUserByEmail()`.

**Pros:**

- Single vendor for auth + database + storage — no webhook sync needed, user identity and profile data live in the same Postgres instance
- No additional cost (included in Supabase plan)
- Full control over the invitation flow — build exactly the UX you want
- Direct access to `auth.users` table alongside application tables

**Cons:**

- All auth UI must be built from scratch: login form, sign-up form, password reset flow, invitation acceptance page, session management in middleware, protected route handling
- Invitation flow is DIY: email template design, token expiration handling, re-invite logic, already-registered detection, error states — all the edge cases that broke on evaluated platforms
- Email deliverability on Supabase's built-in email service is acknowledged by Supabase as insufficient for production — custom SMTP (Resend, SendGrid) must be configured, partially negating the "single vendor" advantage
- Security surface area is owned by the developer: password hashing configuration, rate limiting, brute force protection
- Higher maintenance burden for a volunteer-maintained project

**Cost:** $0 additional (included in Supabase plan).

### Option C: NextAuth.js / Auth.js (open-source library)

NextAuth is an open-source authentication library for Next.js that handles session management, JWT/cookie handling, and provider integration.

**Pros:**

- No vendor dependency — fully open-source, runs in your infrastructure
- Maximum flexibility and control
- Large community and ecosystem

**Cons:**

- No invitation system at all — the entire invitation flow must be built from scratch: token generation, email sending, token verification, account creation, state management
- All auth UI must be built from scratch
- Full security surface area ownership: password hashing, rate limiting, brute force protection, session invalidation, CSRF protection
- Most code to write, most to maintain, most to hand off
- Provides session management but not identity management — you own everything else

**Cost:** $0 (open-source).

## Decision

**Clerk.**

The primary driver is invitation reliability. The invitation flow is the single highest-risk feature in the portal — it's the first interaction every member has with the system, and it's the feature that failed on every evaluated platform. Clerk's invitation API is their core product, purpose-built for this exact use case. Building it from scratch with Supabase Auth or NextAuth means owning the same failure surface that broke HOA Start.

The secondary driver is maintenance burden. Spencer is volunteering indefinitely on this project, and the design principles explicitly prioritize paying for managed services over minimizing cost. Clerk externalizes password hashing, brute force protection, session management, token rotation, and email deliverability for invitation and password reset emails. A future maintainer inherits a Clerk account and SDK integration, not a custom auth implementation.

The architectural seam between Clerk (identity) and Supabase (profile/authorization) is a real trade-off, but it's a well-understood pattern. The seam is kept intentionally thin: Clerk answers "who is this person and are they logged in?", Supabase answers "what can they do?" This separation also reduces vendor lock-in — the entire authorization system (roles, capabilities, permission checks) is portable, and only the authentication layer is Clerk-specific.

NextAuth was eliminated because it provides the least functionality for the most code. The flexibility it offers isn't needed — NSI's auth requirements are straightforward.

## Implementation Notes

### Profile pre-seeding

When an admin invites a member through the portal's admin UI:

1. A Supabase profile record is created immediately with all admin-provided data (name, email, lot number, role, groups). The record has `invited_at` set and `accepted_at` null.
2. `clerkClient.invitations.createInvitation()` is called with the member's email and a `redirectUrl` pointing to the app's sign-up page.
3. Clerk sends the invitation email.
4. The member clicks the link, lands on the sign-up page, sets their password.
5. A Clerk `user.created` webhook fires. The webhook handler matches the Clerk user to the existing Supabase profile by email, sets `accepted_at`, and stores the Clerk user ID on the profile record for future lookups.

This approach means:
- Admin-provided profile data (lot number, role, groups) doesn't need to be stashed in Clerk's `publicMetadata` or a temporary table
- The admin member list shows all members including invited-but-not-yet-accepted, with accurate status badges
- The webhook handler updates an existing record rather than creating a new one

### Authorization boundary

Clerk handles: identity verification, session tokens, invitation emails, password reset emails, optional 2FA, optional social SSO.

The application handles: role-based capabilities, permission checks in middleware and API routes, admin-configurable role definitions, group membership, and all UI gating based on capabilities. This logic lives in Supabase tables (`Role`, `RoleCapability`, `User.role_id`) and is enforced in Next.js middleware and server-side checks.

### Social SSO

Not enabled at launch. The login screen will be email/password only to minimize confusion for less tech-savvy members. Google SSO can be enabled post-launch via a Clerk Dashboard toggle with no code changes. This decision can be revisited once the community is onboarded and comfortable with the portal.

## Consequences

**Enables:**

- Reliable, tested invitation flow with minimal custom code
- Pre-built auth UI components that can be themed to match the portal
- Optional 2FA and social SSO available as future toggles with no code changes
- Reduced ongoing security maintenance burden
- Cleaner handoff story for future maintainers

**Constrains:**

- Auth-related code (middleware, hooks, components) is coupled to Clerk's SDK — migrating to a different provider requires ~2–3 days of focused work
- User identity data lives in Clerk, profile data in Supabase — two systems to manage, bridged by webhooks
- Clerk is a US-based vendor; no Canadian hosting option (data residency is not a regulatory concern for a strata community portal, but worth noting)

**Accepts:**

- Dependency on a third-party service for a core function (authentication)
- The free tier could change, potentially requiring up to ~$25/month — within the project's approved budget
- "Secured by Clerk" branding on auth components in production (removable on paid plan if desired)
