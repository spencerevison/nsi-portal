# NSI Portal — Build Status

**Current Phase:** Phase 8 (ready to start)
**Last Updated:** 2026-04-06
**Last Session:** All code review items addressed (P1-P4). Phase 7 complete — admin roles/permissions with capability checkbox grid. Removed unused directory.manage capability.

---

## Progress

### Phase 0: Project Scaffolding
- [x] Initialize Next.js project (App Router, TypeScript, Tailwind CSS)
- [x] Create Clerk dev instance, configure middleware
- [x] Create Supabase project, run initial schema migration (applied via supabase CLI)
- [~] Create Resend account, verify sending domain (account created, API key in .env.local; domain verification deferred to DNS setup in Phase 8)
- [x] Configure Vercel project with GitHub integration (deferred — not blocking local dev)
- [x] Set up (auth) and (portal) route groups with layout shells
- [x] Confirm end-to-end: protected route → sign-in redirect working

### Phase 1: Invitation & Auth
- [x] /sign-in page with themed <SignIn />
- [x] /sign-up page with __clerk_ticket handling + error states
- [x] Webhook endpoint: POST /api/webhooks/clerk
- [x] Webhook handler: match Clerk user → Supabase profile by email
- [x] Self-healing fallback: email-based lookup if clerk_id not found
- [x] Portal layout: fetch user profile + capabilities (cached per-request; capability-gated nav links)
- [x] Middleware: check active flag, redirect deactivated users (done in portal layout; shows blocking screen with sign-out)
- [x] Password reset flow (handled natively by Clerk's SignIn component)

### Phase 2: Admin — Member Management
- [x] /admin layout with admin.access capability gate
- [~] /admin/members page: members table with status badges (search + sort deferred to Phase 8)
- [x] Add Member form: individual invitation with profile pre-seeding
- [x] Row actions: edit (modal), resend, revoke, deactivate/reactivate, delete (with confirmation)
- [ ] Bulk import: CSV upload, validation, batch create, batch invite (deferred to Phase 8 / pre-launch seeding)
- [x] Status tracking: Draft → Invited → Active → Revoked → Inactive (derived from app_user fields via deriveStatus())

### Phase 3: Document Library
- [x] Database migration: Folder and Document tables (applied)
- [x] Supabase Storage: private documents bucket with RLS (created)
- [x] /documents page: two-panel layout, folder tree with expand/collapse + empty state
- [x] /documents/[...slug] page: file listing with download, breadcrumb nav
- [x] Document download: signed URL generation (60s expiry)
- [x] Admin controls: upload (drag-and-drop + file picker), folder CRUD, file delete
- [x] Server-side file upload via uploadDocument action
- [x] Seed data: folder hierarchy from design spec (6 top-level folders)

### Phase 4: Member Directory
- [x] /directory page: table/list view of active members (desktop table + mobile cards)
- [x] Search: filter by name, lot number, email
- [x] Custom fields system: CustomField + CustomFieldValue tables (migration applied)
- [x] Seed "Kids" and "Dogs" as initial custom fields
- [x] /profile page: edit own profile, custom fields, visibility toggles, notification prefs
- [ ] Admin: member edit form with custom fields (deferred — edit dialog works, custom fields can be added later)
- [x] Dynamic field rendering in directory based on CustomField definitions

### Phase 5: Community Board
- [x] Database migration: Post and Comment tables (applied)
- [x] /community page: post feed (reverse chron, pinned first with amber styling)
- [x] /community/:id page: single post with comments
- [x] Create post + comment forms
- [x] Admin controls: pin/unpin, delete posts/comments (capability-gated)
- [ ] Notification emails via Resend (deferred — Resend integration in Phase 6)
- [x] Notification preferences on /profile page (UI done in Phase 4)

### Phase 6: Group Email
- [x] Database migration: Group, UserGroup, EmailLog tables (applied, 5 groups seeded)
- [x] /admin/groups page: group list with member counts
- [x] /email/compose page: group selector, subject, body, recipient count preview, confirmation dialog
- [x] Send flow: resolve groups → HTML email → Resend batch API → EmailLog
- [x] /email/history page: sent email log
- [x] Resend webhook handler: POST /api/webhooks/resend (delivery_status tracking on email_log)
- [x] Admin: group CRUD (create/edit/delete) + member assignment (add/remove via group detail page)

### Phase 7: Admin — Roles & Permissions
- [x] /admin/roles page: role list with capability count, member count, default badge
- [x] Role detail/edit: capability checkbox grid grouped by category
- [x] Create/delete role with safeguards (can't delete if members assigned)
- [x] Role assignment on member edit form (done in Phase 2 edit dialog)
- [x] Roles tab restored in admin nav

### Phase 8: Polish & Launch Prep
- [x] Responsive design — mobile hamburger nav, accent color theming (B2 style)
- [x] Error state audit — error.tsx + loading.tsx at portal level
- [x] Loading states — spinner at portal level
- [x] Home page dashboard (quick links, announcements, recent activity)
- [x] Button icons on primary CTAs
- [x] Members table: search + sort
- [ ] First-login welcome experience
- [ ] Accessibility pass
- [ ] Bulk CSV import (deferred from Phase 2)
- [x] Supabase upgrade to Pro
- [x] Domain setup + DNS (nsiportal.ca)
- [ ] Seed production data
- [ ] Welcome email template
- [ ] Admin guide for Allison

---

## Known Issues

- **Mobile nav overflow:** At 375px, header nav links overflow horizontally. Needs hamburger menu below `md:` breakpoint. (Phase 8 responsive audit)
- **Mobile table truncation:** Members table columns cut off on small screens. Needs `overflow-x-auto` or responsive column hiding.
- **Phase 1 password reset:** Not explicitly tested but Clerk's `<SignIn />` includes "Forgot password?" link natively.

## Session Log

### 2026-04-06
- Phase 5: community board — post feed, single post view, comments, create forms, admin pin/unpin/delete
- Phase 6: group email — compose UI, group selector, Resend batch send, email history, group CRUD + member assignment, Resend delivery webhook
- Phase 7: admin roles/permissions — role list, capability checkbox grid, create/delete with safeguards
- Code review: addressed all P1 (security), P2 (data integrity), P3 (refactors), P4 (hardening) items
- Removed unused directory.manage capability

### 2026-04-05
- shadcn/ui setup, theming fixes (dark mode, font, Turbopack→webpack, Button)
- Phase 2: admin nav tabs, row actions (edit/resend/revoke/deactivate/delete), edit member dialog
- Phase 3: document library — folder tree, file upload/download/delete, drag-and-drop, admin kebab menus, replaced native confirm/prompt with shadcn dialogs
- Phase 4: member directory with search + avatars, profile page with custom fields (Children/Dogs) + visibility toggles + notification prefs, CustomField/CustomFieldValue migration
- Resolved profile/account UX overlap: Clerk owns name/email/avatar (synced to app_user on every request), Settings page owns phone/lot/custom fields/notifications
- Added "Settings" link to Clerk UserButton dropdown via custom MenuItems
- Automated Playwright testing with @clerk/testing + +clerk_test test user

### 2026-04-04
- Completed all project documentation: 5 ADRs, system design doc, onboarding flow design, build sequence
- Created CLAUDE.md and STATUS.md for Claude Code workflow
- Decisions made: Clerk (auth), Supabase (database + storage), Resend (email), shared UI (admin)
- Phase 0: Next.js 16 scaffold, Clerk proxy, Supabase client, route groups, initial migration (role, role_capability, app_user), MVP role seeds
- Phase 1: Clerk webhook handler (verified 204/401/404), sign-in/sign-up pages, self-healing email-based fallback, getCurrentAppUser + getCurrentCapabilities (React.cache), portal layout with capability-gated nav + deactivation blocking
- Phase 2 started: /admin layout, members table, Add Member form + inviteMember server action, revoked_at migration
