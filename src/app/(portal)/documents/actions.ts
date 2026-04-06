"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability, getCurrentAppUser } from "@/lib/current-user";
import { createSignedDownloadUrl } from "@/lib/documents";

type ActionResult = { ok: true } | { ok: false; error: string };

// --- Folder CRUD ---

export async function createFolder(
  name: string,
  parentId: string | null,
): Promise<ActionResult & { folderId?: string }> {
  await requireCapability("documents.write");
  const user = await getCurrentAppUser();

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

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

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

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

  // cascade deletes documents (FK constraint), but we should also
  // clean up storage. Get doc paths first.
  const { data: docs } = await supabaseAdmin
    .from("document")
    .select("storage_path")
    .eq("folder_id", folderId);

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.storage_path);
    await supabaseAdmin.storage.from("documents").remove(paths);
  }

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

// --- Document operations ---

export async function uploadDocument(
  formData: FormData,
): Promise<ActionResult> {
  await requireCapability("documents.write");
  const user = await getCurrentAppUser();

  const file = formData.get("file") as File | null;
  const folderId = formData.get("folderId") as string | null;

  if (!file || !folderId) return { ok: false, error: "File and folder required" };

  // generate a unique storage path preserving extension
  const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
  const storagePath = `${crypto.randomUUID()}${ext}`;

  // read file into buffer for server-side upload
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
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

export async function createDocument(input: {
  displayName: string;
  storagePath: string;
  folderId: string;
  fileSize: number;
  mimeType: string;
}): Promise<ActionResult> {
  await requireCapability("documents.write");
  const user = await getCurrentAppUser();

  const { error } = await supabaseAdmin.from("document").insert({
    display_name: input.displayName,
    storage_path: input.storagePath,
    folder_id: input.folderId,
    file_size: input.fileSize,
    mime_type: input.mimeType,
    uploaded_by: user?.id,
  });

  if (error) {
    console.error("createDocument failed", error);
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

  // delete from storage
  await supabaseAdmin.storage.from("documents").remove([doc.storage_path]);

  // delete the row
  const { error } = await supabaseAdmin
    .from("document")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("deleteDocument failed", error);
    return { ok: false, error: "Failed to delete document" };
  }

  revalidatePath("/documents");
  return { ok: true };
}

export async function getDownloadUrl(
  storagePath: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  // any authenticated member with documents.read can download
  await requireCapability("documents.read");

  const url = await createSignedDownloadUrl(storagePath);
  if (!url) return { ok: false, error: "Failed to generate download link" };

  return { ok: true, url };
}
