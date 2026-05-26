# Changelog

All notable changes are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project
follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-05-25

First public release. Live at <https://nsiportal.ca> and in use by the
NSI community.

### Added

- **Document library** — folder tree, drag-and-drop upload, signed-URL
  downloads (60s expiry) backed by Supabase Storage
- **Member directory** — search by name/lot/email, admin-defined custom
  fields, per-field visibility toggles owned by each member
- **Community board** — posts, comments, pinned announcements,
  per-user notification preferences
- **Group email** — admin compose UI, Resend batch API, delivery-event
  tracking via Resend webhooks
- **Admin tooling** — member CRUD with bulk CSV import, invitation
  lifecycle (Draft --> Invited --> Active --> Revoked --> Inactive),
  group CRUD, roles + capability grid, support inbox
- **Auth and onboarding** — Clerk-managed invitations, pre-seeded
  Supabase profiles linked via `user.created` webhook with a
  self-healing email-fallback if the webhook drops
- **Authorization** — capability-based, enforced in every server
  action via `requireCapability()`
- **Operational stop-gap** — Vercel Cron keep-alive to dodge Supabase
  free-tier auto-pause until the Pro upgrade lands

### Documentation

- 5 ADRs covering auth provider, database/hosting, email, file
  storage, and admin UI approach
- System design, onboarding flow design, and build sequence docs
- Admin guide for non-technical operation
- [Case study](docs/case-study.md) walking through the
  highest-leverage decisions and trade-offs
- Build log frozen at v1.0

[1.0.0]: https://github.com/spencerevison/nsi-portal/releases/tag/v1.0.0
