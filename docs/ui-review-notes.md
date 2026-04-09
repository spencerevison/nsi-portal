# UI Review Notes — 2026-04-08

Screenshots captured via `node scripts/ui-test.mjs` across all portal routes at desktop (1280x900) and mobile (375x812).

## Desktop — All pages functional

- **Home**: Welcome banner, quick links grid (4-col), recent activity feed with avatars. Footer visible.
- **Admin > Members**: Import CSV button renders cleanly next to Add member. Table with search/sort. 
- **Admin > Groups**: 4 groups listed, Create group CTA, kebab menus.
- **Admin > Roles**: 3 roles with capability counts, default badge on Member role.
- **Admin > Support**: Empty state (no requests to show).
- **Directory**: Table layout with avatars, custom fields (Children, Dogs) as columns.
- **Profile**: Three-card layout — profile info, directory fields, notification prefs. Account Settings link.
- **Documents**: Two-panel layout, folder tree, drag-and-drop upload zone.
- **Community**: Post feed with avatars, timestamps, comment counts, kebab moderation menus.
- **Email Compose**: Group selector pills, subject/body fields.
- **Email History**: (empty — no sends yet)
- **Help & Support**: Category dropdown, subject, message textarea.

## Mobile — All pages functional

- **Home**: 2-col quick links grid, welcome banner wraps well, recent activity list.
- **Admin > Members**: Table correctly hides Email and Role columns. Name, Lot, Status, Actions visible.
- **Community**: Full-width New Post button, post cards stack cleanly.
- **Directory**: Card layout instead of table — name, lot, phone, email, custom fields.
- **Documents**: Stacked layout — folder tree above file panel.
- **Help**: Form renders full-width, no overflow.

## Mobile nav

Hamburger menu visible. "Community Portal" text hidden on narrow screens (only NSI logo). Confirmed admin link is present for admin users (visible via test user).

## No issues found

All pages render without overflow, broken layouts, or visual regressions. The known issues from STATUS.md (mobile nav overflow, mobile table truncation) are resolved.

## Minor observations (non-blocking)

1. **Sign-in screenshot redirects to home** when already authenticated — expected behavior, not a bug
2. **Community page h1**: When user has write permission, h1 is "Message Board" on desktop (visible in screenshot alongside New Post button). The sr-only h1 we added applies only when NewPostForm replaces the visible heading block — confirmed correct.
3. **Test data**: Some test posts have placeholder content ("foo", "42424242", "Test") — will be cleaned up before launch.
