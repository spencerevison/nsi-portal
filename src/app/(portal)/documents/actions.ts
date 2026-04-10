"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability, getCurrentAppUser } from "@/lib/current-user";
import { createSignedDownloadUrl } from "@/lib/documents";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

// --- Folder CRUD ---

export async function createFolder(
  name: string,
  parentId: string | null,
): Promise<ActionResult & { folderId?: string }> {
  await requireCapability("documents.write");
  const user = await getCurrentAppUser();

  const slug = slugify(name);

  if (!slug) return { ok: false, error: "Invalid folder name" };

  const { data, error } = await supabaseAdmin
    .from("folder")
    .insert({
      name: name.trim(),
      slug,
      parent_id: parentId,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A folder with that name already exists here",
      };
    }
    console.error("createFolder failed", error);
    return { ok: false, error: "Failed to create folder" };
  }

  revalidatePath("/documents");
  return { ok: true, folderId: data.id };
}

export async function renameFolder(
  folderId: string,
  name: string,
): Promise<ActionResult> {
  await requireCapability("documents.write");

  const slug = slugify(name);

  const { error } = await supabaseAdmin
    .from("folder")
    .update({ name: name.trim(), slug })
    .eq("id", folderId);

  if (error) {
    console.error("renameFolder failed", error);
    return { ok: false, error: "Failed to rename folder" };
  }

  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteFolder(folderId: string): Promise<ActionResult> {
  await requireCapability("documents.write");

  // collect all folder IDs in the subtree (recursive)
  const folderIds = [folderId];
  let frontier = [folderId];
  while (frontier.length > 0) {
    const { data: children } = await supabaseAdmin
      .from("folder")
      .select("id")
      .in("parent_id", frontier);
    if (!children || children.length === 0) break;
    const childIds = children.map((c) => c.id);
    folderIds.push(...childIds);
    frontier = childIds;
  }

  // get ALL document storage paths across the entire subtree
  const { data: docs } = await supabaseAdmin
    .from("document")
    .select("storage_path")
    .in("folder_id", folderIds);

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.storage_path);
    await supabaseAdmin.storage.from("documents").remove(paths);
  }

  // cascade delete removes child folders + documents in DB
  const { error } = await supabaseAdmin
    .from("folder")
    .delete()
    .eq("id", folderId);

  if (error) {
    console.error("deleteFolder failed", error);
    return { ok: false, error: "Failed to delete folder" };
  }

  revalidatePath("/documents");
  return { ok: true };
}

// --- Folder reordering ---

export async function reorderFolders(
  orderedIds: string[],
): Promise<ActionResult> {
  await requireCapability("documents.write");

  // batch update sort_order to match array position
  const updates = orderedIds.map((id, i) =>
    supabaseAdmin.from("folder").update({ sort_order: i }).eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("reorderFolders failed", failed.error);
    return { ok: false, error: "Failed to reorder folders" };
  }

  revalidatePath("/documents");
  return { ok: true };
}

// --- Document operations ---

export async function uploadDocument(
  formData: FormData,
): Promise<ActionResult> {
  await requireCapability("documents.write");
  const user = await getCurrentAppUser();

  const file = formData.get("file") as File | null;
  const folderId = formData.get("folderId") as string | null;

  if (!file || !folderId)
    return { ok: false, error: "File and folder required" };

  // server-side validation
  const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "File too large (max 25 MB)" };
  }

  const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "text/plain",
  ];
  if (!file.type || !ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "File type not allowed" };
  }

  // uuid prefix prevents collisions, original name shows in URLs
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${crypto.randomUUID()}/${safeName}`;

  // read file into buffer for server-side upload
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
      duplex: "half",
      metadata: { contentDisposition: "inline" },
    });

  if (uploadErr) {
    console.error("storage upload failed", uploadErr);
    return { ok: false, error: "Failed to upload file" };
  }

  const { error: dbErr } = await supabaseAdmin.from("document").insert({
    display_name: file.name,
    storage_path: storagePath,
    folder_id: folderId,
    file_size: file.size,
    mime_type: file.type || null,
    uploaded_by: user?.id,
  });

  if (dbErr) {
    // cleanup the uploaded file
    await supabaseAdmin.storage.from("documents").remove([storagePath]);
    console.error("document insert failed", dbErr);
    return { ok: false, error: "Failed to save document record" };
  }

  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteDocument(
  documentId: string,
): Promise<ActionResult> {
  await requireCapability("documents.write");

  // get storage path before deleting the row
  const { data: doc } = await supabaseAdmin
    .from("document")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (!doc) return { ok: false, error: "Document not found" };

  // delete DB row first — if this fails, storage is still intact
  const { error } = await supabaseAdmin
    .from("document")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("deleteDocument failed", error);
    return { ok: false, error: "Failed to delete document" };
  }

  // then clean up storage (orphaned blob is better than dangling DB record)
  await supabaseAdmin.storage.from("documents").remove([doc.storage_path]);

  revalidatePath("/documents");
  return { ok: true };
}

// Open inline (PDFs/images render in browser)
export async function getViewUrl(
  documentId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireCapability("documents.read");

  const { data: doc } = await supabaseAdmin
    .from("document")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (!doc) return { ok: false, error: "Document not found" };

  const url = await createSignedDownloadUrl(doc.storage_path);
  if (!url) return { ok: false, error: "Failed to generate link" };

  return { ok: true, url };
}

// Force download with original filename
export async function getDownloadUrl(
  documentId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireCapability("documents.read");

  const { data: doc } = await supabaseAdmin
    .from("document")
    .select("storage_path, display_name")
    .eq("id", documentId)
    .single();

  if (!doc) return { ok: false, error: "Document not found" };

  const url = await createSignedDownloadUrl(doc.storage_path, doc.display_name);
  if (!url) return { ok: false, error: "Failed to generate download link" };

  return { ok: true, url };
}
