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

export async function getFolderBySlug(
  slug: string,
  parentSlug?: string,
): Promise<FolderRow | null> {
  let query = supabaseAdmin
    .from("folder")
    .select("id, name, slug, parent_id, sort_order");

  if (parentSlug) {
    // subfolder: look up parent first
    const { data: parent } = await supabaseAdmin
      .from("folder")
      .select("id")
      .eq("slug", parentSlug)
      .is("parent_id", null)
      .maybeSingle();

    if (!parent) return null;
    query = query.eq("slug", slug).eq("parent_id", parent.id);
  } else {
    query = query.eq("slug", slug).is("parent_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("getFolderBySlug failed", error);
    return null;
  }
  return data;
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
