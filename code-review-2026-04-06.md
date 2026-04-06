# NSI Portal -- Code Review (2026-04-06)

Three independent review passes (architecture, security, code quality) identified overlapping issues. This document consolidates and deduplicates them into a prioritized fix list. The app is pre-launch for a ~70-member strata community, so the window to fix foundational issues is now.

---

## Priority 1: Critical Bugs & Security (fix before any real usage)

### 1a. `getCurrentAppUser` writes to DB on every page load
- **File:** `src/lib/current-user.ts` ~line 37
- **Bug:** `avatar_url` is missing from the `.select()` clause, so `needsSync` is always `true`, triggering an UPDATE on every request.
- **Fix:** Add `avatar_url` to the select list.

### 1b. Resend webhook delivery tracking is broken (2 issues)
- **File:** `src/app/(portal)/email/compose/actions.ts` ~line 60
- **File:** `src/app/api/webhooks/resend/route.ts` ~lines 60-83
- **Bug 1:** `resend_batch_id` stores the first email's ID, not a batch ID. Delivery events for recipients 2..N never match.
- **Bug 2:** Read-modify-write race on `delivery_status` counters -- concurrent webhook events lose increments.
- **Fix:** Store all returned email IDs (new `email_delivery` table or JSONB array on `email_log`). Use atomic Postgres increment for counters (SQL function or `jsonb_set`).

### 1c. Clerk webhook overwrites `clerk_id` -- account takeover vector
- **File:** `src/app/api/webhooks/clerk/route.ts` ~lines 80-95
- **File:** `src/lib/current-user.ts` ~lines 87-106 (self-heal fallback)
- **Bug:** If a Clerk account is created with an email matching an already-linked member, the webhook silently overwrites `clerk_id`, hijacking the account.
- **Fix:** In webhook: reject update when `clerk_id` is already set to a different value. In self-heal: only link when `clerk_id` is null.

### 1d. `getDownloadUrl` accepts raw storage path -- IDOR / path traversal
- **File:** `src/app/(portal)/documents/actions.ts` ~line 218
- **Bug:** Any authenticated member with `documents.read` can generate signed URLs for arbitrary storage paths.
- **Fix:** Change to accept `documentId`, look up `storage_path` from the DB.

### 1e. Remove dead `createDocument` server action
- **File:** `src/app/(portal)/documents/actions.ts` ~line 158
- **Bug:** Exposed `"use server"` function accepts raw `storagePath` from client. No UI calls it.
- **Fix:** Delete the function entirely.

### 1f. Deactivated users retain capabilities
- **File:** `src/lib/current-user.ts` ~line 123 (`getCurrentCapabilities`)
- **Bug:** No `active` check -- a deactivated member with a valid Clerk session can still call server actions.
- **Fix:** Return empty capability set when `!user.active`.

### 1g. `deleteFolder` orphans storage files in subfolders
- **File:** `src/app/(portal)/documents/actions.ts` ~lines 77-104
- **Bug:** Only deletes storage files for documents directly in the folder, not in child folders. DB cascade removes rows but blobs remain.
- **Fix:** Recursively collect all document storage paths in the folder subtree before deletion.

---

## Priority 2: Data Integrity & Correctness

### 2a. Group email recipients not filtered for active/accepted status
- **File:** `src/lib/groups.ts` ~lines 149-155
- **Bug:** The group-specific path doesn't filter `active = true` / `accepted_at IS NOT NULL`. Deactivated members receive emails.
- **Fix:** Add `.eq("app_user.active", true).not("app_user.accepted_at", "is", null)` to the group query.

### 2b. HTML injection in email via unescaped sender name
- **File:** `src/app/(portal)/email/compose/actions.ts` ~line 48
- **Bug:** `user.first_name` and `user.last_name` interpolated into HTML without escaping.
- **Fix:** Apply `escapeHtml()` to sender name fields.

### 2c. `deriveStatus` priority order is wrong
- **File:** `src/lib/members.ts` ~lines 38-49
- **Bug:** `!row.active` is checked before `row.revoked_at`, so revoked+deactivated members show "Inactive" instead of "Revoked", breaking admin action buttons.
- **Fix:** Check `revoked_at` before `active`.

### 2d. `deleteDocument` deletes storage before DB row
- **File:** `src/app/(portal)/documents/actions.ts` ~lines 186-216
- **Bug:** If DB delete fails after storage delete, you get a record pointing to nothing.
- **Fix:** Reverse order -- delete DB row first, then storage.

### 2e. File upload has no server-side size or type validation
- **File:** `src/app/(portal)/documents/actions.ts` ~lines 108-156
- **Bug:** UI says "25 MB" and "PDF, DOC, images" but server accepts anything of any size. Malicious HTML files could be served back via signed URLs.
- **Fix:** Add size limit (25MB), MIME type allowlist, and force `Content-Disposition: attachment` on uploads.

---

## Priority 3: Code Organization & Tech Debt

### 3a. Extract shared `ActionResult` type
- **Files:** 5 separate `actions.ts` files each define `{ ok: true } | { ok: false; error: string }`
- **Fix:** Create `src/lib/action-result.ts`, import everywhere.

### 3b. Extract `slugify()` utility
- **Files:** `documents/actions.ts` and `admin/groups/actions.ts` (4 occurrences)
- **Fix:** Add `slugify()` to `src/lib/utils.ts`.

### 3c. Move `timeAgo()` to shared utils
- **File:** `src/lib/community.ts` ~lines 135-151
- **Fix:** Move to `src/lib/utils.ts` or `src/lib/format.ts`.

### 3d. Delete unused `src/lib/supabase.ts` (publishable key client)
- Never imported anywhere. Misleading to have it alongside `supabase-admin.ts`.
- **Fix:** Delete the file.

### 3e. Add `import "server-only"` to `supabase-admin.ts`
- **File:** `src/lib/supabase-admin.ts`
- Prevents accidental client-side import that would leak `SUPABASE_SECRET_KEY`.

### 3f. Batch profile save into single server action
- **File:** `src/app/(portal)/profile/profile-form.tsx` ~lines 41-61
- Currently makes N+2 sequential round-trips.
- **Fix:** Create a single `saveProfile()` action that handles everything server-side.

### 3g. Generate Supabase types
- 14+ `as unknown as` casts throughout data access layer.
- **Fix:** Run `npx supabase gen types typescript` and type the client.

---

## Priority 4: Hardening (pre-launch but lower urgency)

### 4a. Add error boundary and loading states
- No `error.tsx` or `loading.tsx` anywhere in `(portal)`.
- **Fix:** Add at least at the `(portal)` layout level.

### 4b. Add security headers
- **File:** `next.config.ts`
- Missing CSP, X-Frame-Options, HSTS, etc.
- **Fix:** Add `headers()` config.

### 4c. Add basic rate limiting on email sends
- No rate limiting anywhere. A user with `email.send` could spam all members.
- **Fix:** Add rate limiting (e.g., `@upstash/ratelimit`) at minimum on email send.

### 4d. Add input length validation to server actions
- No length limits on post bodies, email bodies, comments, etc.
- **Fix:** Add reasonable length caps.

### 4e. Add confirmation dialogs for post/comment deletion
- Community post and comment deletes fire immediately with no confirmation.
- **Fix:** Add confirmation dialogs matching the pattern used elsewhere.

### 4f. Create `.env.example`
- No template exists for environment variables.

### 4g. Remove dead "Roles" admin nav tab
- **File:** `src/app/(portal)/admin/admin-nav.tsx` ~line 11
- Links to `/admin/roles` which doesn't exist (Phase 7 work).
- **Fix:** Remove from nav until the page exists.

---

## What's Working Well

- Clean server/client boundary -- Server Components fetch data, Client Components handle interactivity
- Capability-based auth is consistently applied with `requireCapability()` on every server action
- Self-healing Clerk-to-Supabase link is a good resilience pattern
- Route group organization (`(portal)` / `(auth)`) is clean
- Co-located server actions next to their pages
- Consistent data access layer through `src/lib/*.ts`
- Webhook signature verification (Svix) on both endpoints
- Rollback patterns in `inviteMember` and `uploadDocument`
- Proper use of `cache()` on `getCurrentAppUser` / `getCurrentCapabilities`
