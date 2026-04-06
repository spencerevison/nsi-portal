# NSI Portal — Build Status

**Current Phase:** Phase 5 (ready to start)
**Last Updated:** 2026-04-05
**Last Session:** Phase 4 complete. Resolved profile/account UX overlap — Clerk owns name/email/avatar, our Settings page owns phone/lot/custom fields/notifications. Added Settings link to UserButton dropdown, Clerk→app_user field sync on every request.

---

## Progress

### Phase 0: Project Scaffolding
- [x] Initialize Next.js project (App Router, TypeScript, Tailwind CSS)
- [x] Create Clerk dev instance, configure middleware
- [x] Create Supabase project, run initial schema migration (applied via supabase CLI)
- [~] Create Resend account, verify sending domain (account created, API key in .env.local; domain verification deferred to DNS setup in Phase 8)
- [ ] Configure Vercel project with GitHub integration (deferred — not blocking local dev)
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
- [ ] Database migration: Post and Comment tables
- [ ] /community page: post feed (reverse chron, pinned first)
- [ ] /community/:id page: single post with comments
- [ ] Create post + comment forms
- [ ] Admin controls: pin/unpin, delete others' posts
- [ ] Notification emails via Resend (new post → notify_new_post users)
- [ ] Notification preferences on /profile page

### Phase 6: Group Email
- [ ] Database migration: Group, UserGroup, EmailLog tables
- [ ] /admin/groups page: group CRUD, member assignment
- [ ] /email/compose page: group selector, rich text, recipient preview, confirmation
- [ ] Send flow: resolve groups → React Email template → Resend batch API → EmailLog
- [ ] /email/history page: sent email log with delivery status
- [ ] Resend webhook handler: POST /api/webhooks/resend
- [ ] React Email templates: group broadcast template

### Phase 7: Admin — Roles & Permissions
- [ ] /admin/roles page: role list with capability summary
- [ ] Role detail/edit: capability checkbox grid
- [ ] Create/delete role with safeguards
- [x] Role assignment on member edit form (done in Phase 2 edit dialog)
- [ ] End-to-end capability verification

### Phase 8: Polish & Launch Prep
- [ ] Responsive design audit (375px, 768px, 1440px)
- [ ] Error state audit (per onboarding flow design doc)
- [ ] Loading states (skeleton loaders / spinners)
- [ ] First-login welcome experience
- [ ] Empty states
- [ ] Accessibility pass
- [ ] Supabase upgrade to Pro
- [ ] Domain setup + DNS
- [ ] Seed production data
- [ ] Welcome email template
- [ ] Admin guide for Allison

---

## Legend

✋ = Hand-coded by Spencer (interview prep — no AI code generation for these components)

---

## Known Issues

- **Mobile nav overflow:** At 375px, header nav links overflow horizontally. Needs hamburger menu below `md:` breakpoint. (Phase 8 responsive audit)
- **Mobile table truncation:** Members table columns cut off on small screens. Needs `overflow-x-auto` or responsive column hiding.
- **Phase 1 password reset:** Not explicitly tested but Clerk's `<SignIn />` includes "Forgot password?" link natively.

## Session Log

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
