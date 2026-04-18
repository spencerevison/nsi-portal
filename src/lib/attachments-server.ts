import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildStoragePath, type AttachmentKind } from "@/lib/attachments";

const BUCKET = "attachments";

export type UploadedBlob = {
  storage_path: string;
  display_name: string;
  file_size: number;
  mime_type: string;
};

// Upload a single file; returns the row shape we can splat into
// post_attachment / comment_attachment / email_attachment.
export async function uploadAttachmentBlob(opts: {
  kind: AttachmentKind;
  ownerId: string;
  file: File;
}): Promise<UploadedBlob> {
  const { kind, ownerId, file } = opts;
  const storage_path = buildStoragePath(kind, ownerId, file.name);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storage_path, buffer, {
      contentType: file.type,
      upsert: false,
      duplex: "half",
      metadata: { contentDisposition: "inline" },
    });
  if (error) {
    throw new Error(`attachment upload failed: ${error.message}`);
  }

  return {
    storage_path,
    display_name: file.name,
    file_size: file.size,
    mime_type: file.type,
  };
}

export async function removeAttachmentBlobs(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
  if (error) {
    // best-effort cleanup; log + swallow so callers aren't forced to handle
    console.error("removeAttachmentBlobs failed", { paths, error });
  }
}

// Signed URL for inline viewing (short TTL; we don't embed these into SSR
// output so staleness isn't a concern).
export async function createAttachmentSignedUrl(
  storagePath: string,
  opts?: { downloadName?: string },
): Promise<string | null> {
  const signOpts = opts?.downloadName ? { download: opts.downloadName } : {};
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60, signOpts);
  if (error) {
    console.error("createAttachmentSignedUrl failed", error);
    return null;
  }
  return data.signedUrl;
}

// For email sending — pull the blob and base64-encode so Resend can
// inline it in `content`.
export async function loadAttachmentForEmail(
  storagePath: string,
): Promise<{ content: string; size: number } | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(storagePath);
  if (error || !data) {
    console.error("loadAttachmentForEmail failed", { storagePath, error });
    return null;
  }
  const buf = Buffer.from(await data.arrayBuffer());
  return { content: buf.toString("base64"), size: buf.length };
}
