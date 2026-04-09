import { supabaseAdmin } from "@/lib/supabase-admin";

export type FolderRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  children?: FolderRow[];
  document_count?: number;
};

export type DocumentRow = {
  id: string;
  display_name: string;
  storage_path: string;
  folder_id: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  uploader_name?: string;
};

// flat list of all folders with doc counts
export async function listFolders(): Promise<FolderRow[]> {
  const { data, error } = await supabaseAdmin
    .from("folder")
    .select("id, name, slug, parent_id, sort_order, document(count)")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listFolders failed", error);
    return [];
  }

  return (data ?? []).map((f) => {
    const countArr = f.document as unknown as { count: number }[];
    return {
      id: f.id,
      name: f.name,
      slug: f.slug,
      parent_id: f.parent_id,
      sort_order: f.sort_order,
      document_count: countArr?.[0]?.count ?? 0,
    };
  });
}

// build a nested tree from the flat list
export function buildFolderTree(folders: FolderRow[]): FolderRow[] {
  const map = new Map<string, FolderRow>();
  const roots: FolderRow[] = [];

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const f of map.values()) {
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children!.push(f);
    } else {
      roots.push(f);
    }
  }

  return roots;
}

// Walk a slug path like ["strata-documents", "bylaws", "2024"] to find the
// deepest folder, returning it along with the ancestor chain for breadcrumbs.
export async function getFolderBySlugPath(slugSegments: string[]): Promise<{
  folder: FolderRow;
  ancestors: { id: string; name: string; slug: string }[];
} | null> {
  if (slugSegments.length === 0) return null;

  const ancestors: { id: string; name: string; slug: string }[] = [];
  let parentId: string | null = null;

  for (let i = 0; i < slugSegments.length; i++) {
    let query = supabaseAdmin
      .from("folder")
      .select("id, name, slug, parent_id, sort_order")
      .eq("slug", slugSegments[i]);

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("getFolderBySlugPath failed", error);
      return null;
    }
    if (!data) return null;

    // last segment is the target folder, everything before is an ancestor
    if (i < slugSegments.length - 1) {
      ancestors.push({ id: data.id, name: data.name, slug: data.slug });
    } else {
      return { folder: data, ancestors };
    }

    parentId = data.id;
  }

  return null;
}

export async function listDocuments(folderId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("document")
    .select(
      `id, display_name, storage_path, folder_id, file_size, mime_type,
       uploaded_by, uploaded_at,
       uploader:uploaded_by ( first_name, last_name )`,
    )
    .eq("folder_id", folderId)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("listDocuments failed", error);
    return [];
  }

  return (data ?? []).map((d) => {
    const uploader = d.uploader as unknown as {
      first_name: string;
      last_name: string;
    } | null;
    return {
      id: d.id,
      display_name: d.display_name,
      storage_path: d.storage_path,
      folder_id: d.folder_id,
      file_size: d.file_size,
      mime_type: d.mime_type,
      uploaded_by: d.uploaded_by,
      uploaded_at: d.uploaded_at,
      uploader_name: uploader
        ? `${uploader.first_name} ${uploader.last_name}`
        : undefined,
    };
  });
}

export async function createSignedDownloadUrl(
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(storagePath, 60); // 60 second expiry

  if (error) {
    console.error("createSignedUrl failed", error);
    return null;
  }
  return data.signedUrl;
}
