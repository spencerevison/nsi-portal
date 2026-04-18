// Shared constants + validators for post/comment/email attachments.
// Client-safe — do not import server-only modules here.

export const ATTACHMENT_MIME_WHITELIST = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
] as const;

export type AllowedMimeType = (typeof ATTACHMENT_MIME_WHITELIST)[number];

// NB: these are all enforced server-side too. Keeping the constants
// identical on both sides makes drift-risk small.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image
export const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15 MB per non-image
export const MAX_AGGREGATE_BYTES = 15 * 1024 * 1024; // 15 MB combined per owner
export const MAX_ATTACHMENTS_PER_OWNER = 10;

// Compression target for images (only applies client-side)
export const COMPRESSION_MAX_SIZE_MB = 1;
export const COMPRESSION_MAX_DIMENSION = 2000;

export type AttachmentKind = "post" | "comment" | "email";

export type Attachmentish = { size: number; type: string; name?: string };

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isHeicMime(mime: string): boolean {
  return mime === "image/heic" || mime === "image/heif";
}

export function isAllowedMime(
  mime: string,
): mime is (typeof ATTACHMENT_MIME_WHITELIST)[number] {
  return (ATTACHMENT_MIME_WHITELIST as readonly string[]).includes(mime);
}

export function validateAttachment(
  f: Attachmentish,
): { ok: true } | { ok: false; error: string } {
  if (!f.type || !isAllowedMime(f.type)) {
    return { ok: false, error: `${f.name ?? "File"}: type not allowed` };
  }
  const cap = isImageMime(f.type) ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (f.size > cap) {
    const mb = (cap / 1024 / 1024).toFixed(0);
    return {
      ok: false,
      error: `${f.name ?? "File"}: exceeds ${mb} MB cap`,
    };
  }
  return { ok: true };
}

export function validateAttachmentSet(
  files: Attachmentish[],
): { ok: true } | { ok: false; error: string } {
  if (files.length > MAX_ATTACHMENTS_PER_OWNER) {
    return {
      ok: false,
      error: `Max ${MAX_ATTACHMENTS_PER_OWNER} attachments`,
    };
  }
  for (const f of files) {
    const r = validateAttachment(f);
    if (!r.ok) return r;
  }
  const total = files.reduce((acc, f) => acc + f.size, 0);
  if (total > MAX_AGGREGATE_BYTES) {
    return {
      ok: false,
      error: `Attachments total ${(total / 1024 / 1024).toFixed(1)} MB; cap is ${MAX_AGGREGATE_BYTES / 1024 / 1024} MB`,
    };
  }
  return { ok: true };
}

// keep filename for nicer download URLs; strip anything risky
export function safeFilename(name: string): string {
  // strip path separators + control chars, collapse whitespace, leave
  // dots and dashes alone so extensions survive
  const base = name.split(/[/\\]/).pop() ?? name;
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

export function buildStoragePath(
  kind: AttachmentKind,
  ownerId: string,
  filename: string,
): string {
  // per-attachment uuid prefix prevents collisions within a single owner
  return `${kindToPrefix(kind)}/${ownerId}/${crypto.randomUUID()}/${safeFilename(filename)}`;
}

function kindToPrefix(kind: AttachmentKind): string {
  switch (kind) {
    case "post":
      return "posts";
    case "comment":
      return "comments";
    case "email":
      return "emails";
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
