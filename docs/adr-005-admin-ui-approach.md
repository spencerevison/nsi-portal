# ADR-005: Admin UI Approach

**Status:** Accepted
**Date:** 2026-04-04
**Author:** Spencer Campbell

## Context

The NSI Community Portal has two classes of users with different capabilities: regular members (browse documents, view directory, edit own profile, post on community board) and administrators (manage members, upload documents, send group emails, manage roles and groups). Allison is the primary admin and will handle day-to-day content management. Spencer has full admin access for technical administration.

The question is how to surface admin functionality in the UI: as a separate admin application, or as capability-gated elements within the same interface members use.

The capability-based permission system (defined in the design spec) assigns capabilities to roles, and roles to users. Admin-specific UI elements are shown or hidden based on whether the current user's role includes the required capability — e.g., `documents.write`, `email.send`, `admin.access`.

## Options Considered

### Option A: Shared UI with capability-gated admin features

A single application where admin controls (upload buttons, member management, role editing) appear inline alongside the member-facing content, visible only to users with the appropriate capabilities. An "Admin" section in the navigation provides access to member management, group management, and role configuration — but it lives in the same app, same deployment, same codebase.

**Pros:**

- One codebase, one deployment, one URL — minimal maintenance surface
- Allison sees the portal exactly as members do, plus admin controls — she can spot issues from the member's perspective while managing content
- Admin actions happen in context: uploading a document happens inside the document library, not in a separate admin panel
- Shared components (navigation, layout, design system) reduce code duplication
- The prototype already validates this approach across all screens

**Cons:**

- Permission checks must be thorough — every admin-only element needs proper capability gating in both the UI and API layer to prevent unauthorized access
- The UI must cleanly handle the visual difference between admin and member views without feeling cluttered for members or incomplete for admins
- No separation of concerns between member-facing and admin-facing code at the deployment level

**Cost:** No additional infrastructure or tooling.

### Option B: Separate admin application

A standalone admin dashboard (e.g., at a different URL or subdomain) with its own UI optimized for content management — member tables, document upload workflows, email compose, role management. Members never see it; admins switch between the portal and the admin app.

**Pros:**

- Clean separation between member experience and admin tooling
- Admin UI can be optimized for data-heavy tasks (tables, bulk operations, dashboards) without affecting the member-facing design
- Permission model is simpler — if you can access the admin app, you have admin permissions

**Cons:**

- Doubles the UI surface area to build and maintain — separate layouts, navigation, routing, and potentially separate deployment
- Context switching for Allison: managing a document means leaving the portal, opening the admin app, making the change, then returning to verify
- Shared state and data fetching logic would need to be extracted into a shared package or duplicated
- Overkill for a two-admin, 14-property community

**Cost:** Significant additional development time. No additional infrastructure cost (could be deployed as a separate route within the same Next.js app), but meaningful code and maintenance overhead.

### Option C: Third-party CMS or admin panel (e.g., Retool, AdminJS)

An off-the-shelf admin panel connected to the Supabase database, providing auto-generated CRUD interfaces for managing members, documents, and groups.

**Pros:**

- Near-zero admin UI development time — auto-generated from the database schema
- Purpose-built for data management tasks

**Cons:**

- Adds another service, another login, and another tool for Allison to learn
- Limited customization for NSI-specific workflows (invitation flow, group email compose, document folder management)
- Disconnected from the portal — Allison manages content in one tool and views the result in another
- Contradicts the handoff principle — a future maintainer needs to understand and maintain an additional platform

**Cost:** $0–50/month depending on the tool. But the hidden cost is integration complexity and the cognitive overhead of a separate system.

## Decision

**Shared UI with capability-gated admin features (Option A).**

This decision was validated during the prototype phase — the high-fidelity prototype demonstrates all admin functionality (member management, document upload, group management, email compose, role configuration) integrated into the same interface members use, with admin-only elements gated behind capability checks.

The primary driver is simplicity. For a community with two admins and ~70–112 members, a separate admin application is unnecessary complexity. Allison's admin workflows — uploading a document, inviting a member, sending a group email — are infrequent, low-volume tasks that don't require a dedicated data management interface. They happen naturally within the same portal she'd be browsing anyway.

The secondary driver is maintenance burden. One codebase, one deployment, one set of components. A separate admin app would mean two sets of layouts, two navigation structures, and shared data access logic that needs to be kept in sync. For a volunteer-maintained project, this is unjustifiable overhead.

The "Admin" navigation item (gated behind `admin.access` capability) provides a dedicated section for member management, group management, and role configuration — tasks that don't have a natural home in the member-facing pages. All other admin actions (document upload, email compose, post moderation) happen inline in the same views members use, with additional controls rendered conditionally based on capabilities.

## Implementation Notes

### Capability gating

Admin-only UI elements are gated at two levels:

1. **Client-side rendering** — React components check the current user's capabilities before rendering admin controls (upload buttons, edit actions, admin nav items). This provides a clean member experience with no visible admin clutter.
2. **Server-side enforcement** — API routes and server actions verify capabilities before executing admin operations. Client-side gating is a UX convenience, not a security boundary. The API layer is the source of truth for authorization.

### Admin section structure

The "Admin" nav item (visible only with `admin.access` capability) leads to:

- **Members** — table of all members with status, role, groups, and invitation management
- **Groups** — group CRUD, member assignment
- **Roles** — role CRUD, capability assignment
- **Custom Fields** — manage directory fields (future)

### Inline admin controls

These appear contextually within member-facing pages:

- **Document Library** — upload button, folder creation, file deletion (requires `documents.write`)
- **Community Board** — pin/unpin, delete others' posts (requires `community.moderate`)
- **Email Compose** — accessible from navigation (requires `email.send`)

## Consequences

**Enables:**

- Single codebase and deployment for the entire portal
- Admin workflows happen in context alongside the member experience
- Allison sees what members see, plus her admin controls — no context switching
- Reduced development and maintenance time compared to a separate admin app

**Constrains:**

- Every admin-only element requires explicit capability checks in both the UI and API layer
- The member-facing UI must gracefully accommodate the presence or absence of admin controls without layout shifts or visual clutter

**Accepts:**

- No physical separation between admin and member code at the deployment level — security relies on capability checks, not network boundaries
- Admin UI is optimized for simplicity and Allison's specific workflows, not for general-purpose data management — complex database operations (bulk imports, schema changes) will be done through Supabase Studio or CLI
