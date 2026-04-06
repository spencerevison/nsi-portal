import { supabaseAdmin } from "@/lib/supabase-admin";

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
};

export type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
};

export async function listPosts(): Promise<PostRow[]> {
  const { data, error } = await supabaseAdmin
    .from("post")
    .select(
      `id, title, body, pinned, created_at, updated_at, author_id,
       author:author_id ( first_name, last_name, avatar_url ),
       comment(count)`,
    )
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listPosts failed", error);
    return [];
  }

  return (data ?? []).map((p) => {
    const author = p.author as unknown as {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    } | null;
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
    };
  });
}

export async function getPost(postId: string): Promise<PostRow | null> {
  const { data, error } = await supabaseAdmin
    .from("post")
    .select(
      `id, title, body, pinned, created_at, updated_at, author_id,
       author:author_id ( first_name, last_name, avatar_url ),
       comment(count)`,
    )
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) return null;

  const author = data.author as unknown as {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
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
  };
}

export async function listComments(postId: string): Promise<CommentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("comment")
    .select(
      `id, body, created_at, author_id,
       author:author_id ( first_name, last_name, avatar_url )`,
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listComments failed", error);
    return [];
  }

  return (data ?? []).map((c) => {
    const author = c.author as unknown as {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    } | null;
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author_id: c.author_id,
      author_name: author
        ? `${author.first_name} ${author.last_name}`
        : "Unknown",
      author_avatar: author?.avatar_url ?? null,
    };
  });
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
