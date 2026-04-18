import { supabaseAdmin } from "@/lib/supabase-admin";

export type AttachmentRow = {
  id: string;
  display_name: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  sort_order: number;
};

export type PostRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  comment_count: number;
  attachments: AttachmentRow[];
};

export type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  attachments: AttachmentRow[];
};

type AuthorJoin = {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
} | null;

export async function listPosts(): Promise<PostRow[]> {
  const { data, error } = await supabaseAdmin
    .from("post")
    .select(
      `id, title, body, pinned, created_at, updated_at, author_id,
       author:author_id ( first_name, last_name, avatar_url ),
       comment(count),
       post_attachment ( id, display_name, mime_type, file_size, width, height, sort_order )`,
    )
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listPosts failed", error);
    return [];
  }

  return (data ?? []).map((p) => {
    const author = p.author as unknown as AuthorJoin;
    const countArr = p.comment as unknown as { count: number }[];
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      pinned: p.pinned,
      created_at: p.created_at,
      updated_at: p.updated_at,
      author_id: p.author_id,
      author_name: author
        ? `${author.first_name} ${author.last_name}`
        : "Unknown",
      author_avatar: author?.avatar_url ?? null,
      comment_count: countArr?.[0]?.count ?? 0,
      attachments: sortAttachments(p.post_attachment),
    };
  });
}

export async function getPost(postId: string): Promise<PostRow | null> {
  const { data, error } = await supabaseAdmin
    .from("post")
    .select(
      `id, title, body, pinned, created_at, updated_at, author_id,
       author:author_id ( first_name, last_name, avatar_url ),
       comment(count),
       post_attachment ( id, display_name, mime_type, file_size, width, height, sort_order )`,
    )
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) return null;

  const author = data.author as unknown as AuthorJoin;
  const countArr = data.comment as unknown as { count: number }[];

  return {
    id: data.id,
    title: data.title,
    body: data.body,
    pinned: data.pinned,
    created_at: data.created_at,
    updated_at: data.updated_at,
    author_id: data.author_id,
    author_name: author
      ? `${author.first_name} ${author.last_name}`
      : "Unknown",
    author_avatar: author?.avatar_url ?? null,
    comment_count: countArr?.[0]?.count ?? 0,
    attachments: sortAttachments(data.post_attachment),
  };
}

export async function listComments(postId: string): Promise<CommentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("comment")
    .select(
      `id, body, created_at, author_id,
       author:author_id ( first_name, last_name, avatar_url ),
       comment_attachment ( id, display_name, mime_type, file_size, width, height, sort_order )`,
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listComments failed", error);
    return [];
  }

  return (data ?? []).map((c) => {
    const author = c.author as unknown as AuthorJoin;
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author_id: c.author_id,
      author_name: author
        ? `${author.first_name} ${author.last_name}`
        : "Unknown",
      author_avatar: author?.avatar_url ?? null,
      attachments: sortAttachments(c.comment_attachment),
    };
  });
}

function sortAttachments(raw: unknown): AttachmentRow[] {
  if (!Array.isArray(raw)) return [];
  return (raw as AttachmentRow[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

// re-export timeAgo from utils for backward compat
export { timeAgo } from "@/lib/utils";
