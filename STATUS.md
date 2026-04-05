# NSI Portal — Build Status

**Current Phase:** Phase 2 (in progress)
**Last Updated:** 2026-04-04
**Last Session:** Phase 1 verified end-to-end (real Clerk sign-in + self-heal). Started Phase 2: /admin layout w/ capability gate, /admin/members read-only table, revoked_at column migration.

---

## Progress

### Phase 0: Project Scaffolding
- [x] Initialize Next.js project (App Router, TypeScript, Tailwind CSS)
- [x] Create Clerk dev instance, configure middleware
- [x] Create Supabase project, run initial schema migration (applied via supabase CLI)
- [ ] Create Resend account, verify sending domain (deferred to Phase 5/6)
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
- [ ] Password reset flow

### Phase 2: Admin — Member Management
- [x] /admin layout with admin.access capability gate
- [~] /admin/members page: members table with status badges (search + sort TODO)
- [x] Add Member form: individual invitation with profile pre-seeding
- [ ] Row actions: send, resend, revoke, edit, deactivate/reactivate
- [ ] Bulk import: CSV upload, validation, batch create, batch invite
- [ ] Status tracking: Draft → Invited → Active → Revoked → Inactive

### Phase 3: Document Library ✋
- [ ] Database migration: Folder and Document tables
- [ ] Supabase Storage: private documents bucket with RLS
- [ ] /documents page: folder tree with expand/collapse
- [ ] /documents/:slug page: file listing
- [ ] Document download: signed URL generation
- [ ] Admin inline controls: upload, drag-and-drop, folder CRUD, file delete
- [ ] Seed data: folder hierarchy from design spec

### Phase 4: Member Directory ✋
- [ ] /directory page: table/list view of active members
- [ ] Search: filter by name, lot number, email
- [ ] Custom fields system: CustomField + CustomFieldValue tables
- [ ] Seed "Kids" and "Dogs" as initial custom fields
- [ ] /profile page: edit own profile, custom fields, visibility toggles
- [ ] Admin: member edit form with custom fields
- [ ] Dynamic field rendering in directory based on CustomField definitions

### Phase 5: Community Board
- [ ] Database migration: Post and Comment tables
- [ ] /community page: post feed (reverse chron, pinned first)
- [ ] /community/:id page: single post with comments
- [ ] Create post + comment forms
- [ ] Admin controls: pin/unpin, delete others' posts
- [ ] Notification emails via Resend (new post → notify_new_post users)
- [ ] Notification preferences on /profile page

### Phase 6: Group Email ✋
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
- [ ] Role assignment on member edit form
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

## Session Log

### 2026-04-04
- Completed all project documentation: 5 ADRs, system design doc, onboarding flow design, build sequence
- Created CLAUDE.md and STATUS.md for Claude Code workflow
- Decisions made: Clerk (auth), Supabase (database + storage), Resend (email), shared UI (admin)
- Ready to begin Phase 0
