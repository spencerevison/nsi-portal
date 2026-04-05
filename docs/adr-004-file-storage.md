# ADR-004: File Storage

**Status:** Accepted
**Date:** 2026-04-04
**Author:** Spencer Campbell

## Context

The NSI Community Portal requires file storage for the document library — one of the three core MVP pillars. Admins upload community documents (bylaws, AGM minutes, insurance policies, emergency preparedness docs, webcam instructions) and members browse and download them through a nested folder hierarchy.

The storage requirements are modest:

- **Volume:** ~50–100 documents at launch, growing by a handful per year
- **File types:** Primarily PDFs, possibly Word docs and images
- **Total size:** Likely under 500 MB for the foreseeable future
- **Access pattern:** Admin upload, member download (read-only). No public access — all files are behind authentication
- **Folder structure:** Two-level hierarchy (e.g., Strata Resources > Bylaws, Other Resources > Dock Information)

The database decision (ADR-002: Supabase) means Supabase Storage is available as a bundled option at no additional cost.

## Options Considered

### Option A: Supabase Storage (bundled with Supabase)

Supabase Storage is an S3-compatible file storage service included in the Supabase platform. It provides buckets, folder organization, access control via Row Level Security policies, and a web GUI for file management through Supabase Studio.

**Pros:**

- Already included in the Supabase plan — no additional cost, no additional credentials, no additional service to monitor
- Access control via RLS policies on the `storage.objects` table — files can be restricted to authenticated users using the same patterns as database access control
- Supabase Studio provides a visual file browser for inspecting and managing uploads during development
- JS client integration: `supabase.storage.from('documents').upload()` and `.download()` use the same client library as database queries
- S3-compatible API underneath — files could be migrated to raw S3 or R2 if ever needed
- Free tier includes 1 GB storage; Pro plan includes 100 GB — far more than NSI will ever need

**Cons:**

- File size limit on the free tier is 50 MB per file — sufficient for documents but would limit large media uploads if that became a future need
- Coupled to Supabase — though the underlying storage is S3-compatible, the access control layer and URL generation are Supabase-specific
- Less granular CDN/edge caching than a dedicated storage provider — not relevant for NSI's access patterns

**Cost:** $0 additional (included in Supabase plan).

### Option B: AWS S3 or Cloudflare R2

Dedicated object storage services with global CDN, fine-grained access policies, and mature ecosystems.

**Pros:**

- Industry-standard, battle-tested at any scale
- R2 has no egress fees (Cloudflare's differentiator)
- More granular control over caching, CDN distribution, and access policies
- Fully independent of the database provider

**Cons:**

- Adds a separate service with its own credentials, billing, and management console
- Requires building upload/download infrastructure: signed URLs, access control middleware, bucket policies
- AWS console complexity is disproportionate to NSI's simple storage needs
- R2's free tier (10 GB storage, 10 million reads/month) is generous but unnecessary when Supabase Storage is already available
- Contradicts the design principle of platform consolidation established in ADR-002

**Cost:** Effectively $0 at NSI's scale for either S3 or R2. But the hidden cost is integration complexity and an additional service to maintain.

## Decision

**Supabase Storage.**

This follows directly from ADR-002's decision to consolidate on Supabase. The document library's storage needs are simple — upload, organize by folder, download, restrict to authenticated users. Supabase Storage handles all of this through the same client library and access control patterns already in use for database access.

Adding S3 or R2 would mean managing a separate service, separate credentials, and separate access control logic for zero practical benefit at NSI's scale. The design principles prioritize reducing the number of services to manage, and Supabase Storage is already paid for.

## Implementation Notes

### Bucket structure

A single private bucket (`documents`) will hold all uploaded files. The folder hierarchy is managed in the database (`Folder` table with `parent_id` for nesting), not through S3 key prefixes. Files are stored with a generated key (e.g., `documents/{uuid}.pdf`) and linked to their folder via a `Document` record in Supabase.

This separation means:
- Renaming or moving a folder is a database update, not a file rename
- File metadata (upload date, uploader, file size, display name) lives in the database where it can be queried, sorted, and filtered
- The storage layer is a simple blob store — no business logic in bucket organization

### Access control

The `documents` bucket will be configured as private (no public access). RLS policies on `storage.objects` will restrict access to authenticated users. Download URLs will be generated server-side using `supabase.storage.from('documents').createSignedUrl()`, producing time-limited URLs that expire after a short window.

This ensures that even if a URL is shared outside the portal, it expires and cannot be used for persistent unauthorized access.

### Upload flow

1. Admin navigates to a folder in the document library
2. Selects files via file picker or drag-and-drop
3. Client uploads to Supabase Storage via `supabase.storage.from('documents').upload()`
4. On successful upload, a `Document` record is created in Supabase with the file's storage path, display name, folder reference, file size, and upload metadata

### File size limits

Supabase's free tier limits individual file uploads to 50 MB. The Pro plan supports up to 5 GB per file. For NSI's document types (PDFs, Word docs), 50 MB is more than sufficient — most community documents are under 5 MB.

## Consequences

**Enables:**

- Document storage with no additional services, credentials, or cost
- Access control through the same RLS patterns used for database access
- File management via Supabase Studio during development and debugging
- Simple upload/download integration through the existing Supabase JS client

**Constrains:**

- File storage is coupled to Supabase — migrating to a different database host would also require migrating stored files (though the S3-compatible API makes this straightforward)
- 50 MB per-file limit on the free tier (5 GB on Pro) — sufficient for documents but would limit future media-heavy features like video hosting

**Accepts:**

- Full dependency on Supabase for both data and file storage — a single point of failure, mitigated by the platform's reliability track record and the portability of standard Postgres + S3-compatible storage
- No CDN edge caching for file downloads — acceptable for a 70-person community with sporadic access patterns
