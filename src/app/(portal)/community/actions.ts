"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getCurrentAppUser,
  getCurrentCapabilities,
  requireCapability,
} from "@/lib/current-user";
import { notifyNewPost, notifyNewComment } from "@/lib/notifications";
import { validateAttachmentSet } from "@/lib/attachments";
import {
  createAttachmentSignedUrl,
  removeAttachmentBlobs,
  uploadAttachmentBlob,
} from "@/lib/attachments-server";

type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_POST_TITLE = 200;
const MAX_POST_BODY = 10000;
const MAX_COMMENT_BODY = 5000;

// Success path redirects server-side; only failure cases return here.
export async function createPost(formData: FormData): Promise<ActionResult> {
  await requireCapability("community.write");
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const files = formData.getAll("attachments").filter(isFile);

  if (!title || !body) return { ok: false, error: "Title and body required" };
  if (title.length > MAX_POST_TITLE)
    return { ok: false, error: "Title too long (max 200 characters)" };
  if (body.length > MAX_POST_BODY)
    return { ok: false, error: "Post too long (max 10,000 characters)" };

  const attCheck = validateAttachmentSet(
    files.map((f) => ({ size: f.size, type: f.type, name: f.name })),
  );
  if (!attCheck.ok) return { ok: false, error: attCheck.error };

  const { data: post, error } = await supabaseAdmin
    .from("post")
    .insert({ title, body, author_id: user.id })
    .select("id")
    .single();

  if (error || !post) {
    console.error("createPost failed", error);
    return { ok: false, error: "Failed to create post" };
  }

  if (files.length > 0) {
    const uploaded: string[] = [];
    try {
      const rows: PostAttachmentRow[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const blob = await uploadAttachmentBlob({
          kind: "post",
          ownerId: post.id,
          file: f,
        });
        uploaded.push(blob.storage_path);
        rows.push({
          post_id: post.id,
          display_name: blob.display_name,
          storage_path: blob.storage_path,
          file_size: blob.file_size,
          mime_type: blob.mime_type,
          uploaded_by: user.id,
          sort_order: i,
        });
      }

      const { error: attErr } = await supabaseAdmin
        .from("post_attachment")
        .insert(rows);
      if (attErr) throw attErr;
    } catch (err) {
      console.error("post attachment persistence failed", err);
      await removeAttachmentBlobs(uploaded);
      await supabaseAdmin.from("post").delete().eq("id", post.id);
      return { ok: false, error: "Failed to save attachments" };
    }
  }

  // Fire notifications before we redirect (server actions can't do work
  // after redirect() — it throws). Swallow errors; the post is already in.
  await notifyNewPost({
    postId: post.id,
    title,
    authorId: user.id,
    authorName: `${user.first_name} ${user.last_name}`,
  }).catch((err) => console.error("notifyNewPost error", err));

  // Invalidate the list cache so the new post shows on /community the next
  // time the user visits it. Do this before redirect() — redirect throws.
  revalidatePath("/community");

  // Server-side redirect avoids the client-side revalidate-then-push flash
  // where the list briefly re-renders before the detail page mounts.
  redirect(`/community/${post.id}`);
}

export async function createComment(formData: FormData): Promise<ActionResult> {
  await requireCapability("community.write");
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const files = formData.getAll("attachments").filter(isFile);

  if (!postId) return { ok: false, error: "Missing post" };
  if (!body && files.length === 0)
    return { ok: false, error: "Comment cannot be empty" };
  if (body.length > MAX_COMMENT_BODY)
    return { ok: false, error: "Comment too long (max 5,000 characters)" };

  const attCheck = validateAttachmentSet(
    files.map((f) => ({ size: f.size, type: f.type, name: f.name })),
  );
  if (!attCheck.ok) return { ok: false, error: attCheck.error };

  const { data: comment, error } = await supabaseAdmin
    .from("comment")
    .insert({ post_id: postId, body, author_id: user.id })
    .select("id")
    .single();

  if (error || !comment) {
    console.error("createComment failed", error);
    return { ok: false, error: "Failed to post comment" };
  }

  if (files.length > 0) {
    const uploaded: string[] = [];
    try {
      const rows: CommentAttachmentRow[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const blob = await uploadAttachmentBlob({
          kind: "comment",
          ownerId: comment.id,
          file: f,
        });
        uploaded.push(blob.storage_path);
        rows.push({
          comment_id: comment.id,
          display_name: blob.display_name,
          storage_path: blob.storage_path,
          file_size: blob.file_size,
          mime_type: blob.mime_type,
          uploaded_by: user.id,
          sort_order: i,
        });
      }

      const { error: attErr } = await supabaseAdmin
        .from("comment_attachment")
        .insert(rows);
      if (attErr) throw attErr;
    } catch (err) {
      console.error("comment attachment persistence failed", err);
      await removeAttachmentBlobs(uploaded);
      await supabaseAdmin.from("comment").delete().eq("id", comment.id);
      return { ok: false, error: "Failed to save attachments" };
    }
  }

  revalidatePath(`/community/${postId}`);

  const { data: post } = await supabaseAdmin
    .from("post")
    .select("title, author_id")
    .eq("id", postId)
    .single();

  if (post) {
    await notifyNewComment({
      postId,
      postTitle: post.title,
      postAuthorId: post.author_id,
      commenterName: `${user.first_name} ${user.last_name}`,
      commenterId: user.id,
    }).catch((err) => console.error("notifyNewComment error", err));
  }

  return { ok: true };
}

export async function togglePin(postId: string): Promise<ActionResult> {
  await requireCapability("community.moderate");

  const { data: post } = await supabaseAdmin
    .from("post")
    .select("pinned")
    .eq("id", postId)
    .single();

  if (!post) return { ok: false, error: "Post not found" };

  const { error } = await supabaseAdmin
    .from("post")
    .update({ pinned: !post.pinned })
    .eq("id", postId);

  if (error) return { ok: false, error: "Failed to update pin" };

  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return { ok: true };
}

// Success path redirects server-side; only failure cases return here.
export async function deletePost(postId: string): Promise<ActionResult> {
  await requireCapability("community.moderate");

  // gather storage paths before delete — FK cascade wipes the rows but
  // leaves the blobs behind.
  const [{ data: postAtts }, { data: commentAtts }] = await Promise.all([
    supabaseAdmin
      .from("post_attachment")
      .select("storage_path")
      .eq("post_id", postId),
    supabaseAdmin
      .from("comment_attachment")
      .select("storage_path, comment!inner(post_id)")
      .eq("comment.post_id", postId),
  ]);

  const { error } = await supabaseAdmin.from("post").delete().eq("id", postId);
  if (error) return { ok: false, error: "Failed to delete post" };

  const paths = [
    ...(postAtts ?? []).map((p) => p.storage_path),
    ...(commentAtts ?? []).map((p) => p.storage_path),
  ];
  await removeAttachmentBlobs(paths);

  revalidatePath("/community");
  // Send the user back to the list whether they deleted from the list or
  // the detail page. Detail page would 404 otherwise (post is gone).
  redirect("/community");
}

export async function editComment(input: {
  commentId: string;
  postId: string;
  body: string;
}): Promise<ActionResult> {
  await requireCapability("community.write");
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.body.trim())
    return { ok: false, error: "Comment cannot be empty" };
  if (input.body.length > MAX_COMMENT_BODY)
    return { ok: false, error: "Comment too long (max 5,000 characters)" };

  const { data: comment } = await supabaseAdmin
    .from("comment")
    .select("author_id")
    .eq("id", input.commentId)
    .single();

  if (!comment) return { ok: false, error: "Comment not found" };
  if (comment.author_id !== user.id)
    return { ok: false, error: "You can only edit your own comments" };

  const { error } = await supabaseAdmin
    .from("comment")
    .update({ body: input.body.trim() })
    .eq("id", input.commentId);

  if (error) return { ok: false, error: "Failed to update comment" };

  revalidatePath(`/community/${input.postId}`);
  return { ok: true };
}

export async function deleteComment(
  commentId: string,
  postId: string,
): Promise<ActionResult> {
  await requireCapability("community.write");
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const caps = await getCurrentCapabilities();

  if (!caps.has("community.moderate")) {
    const { data: comment } = await supabaseAdmin
      .from("comment")
      .select("author_id")
      .eq("id", commentId)
      .single();

    if (!comment) return { ok: false, error: "Comment not found" };
    if (comment.author_id !== user.id)
      return { ok: false, error: "You can only delete your own comments" };
  }

  // gather attachment paths before cascade drops them
  const { data: atts } = await supabaseAdmin
    .from("comment_attachment")
    .select("storage_path")
    .eq("comment_id", commentId);

  const { error } = await supabaseAdmin
    .from("comment")
    .delete()
    .eq("id", commentId);

  if (error) return { ok: false, error: "Failed to delete comment" };

  await removeAttachmentBlobs((atts ?? []).map((a) => a.storage_path));

  revalidatePath(`/community/${postId}`);
  return { ok: true };
}

// Signed-URL fetcher used by AttachmentList on click. Any authenticated
// community member can view; we're not gating per-post here because posts
// are already visible to every logged-in member.
export async function getCommunityAttachmentUrl(
  kind: "post" | "comment",
  attachmentId: string,
  opts?: { download?: boolean },
): Promise<string | null> {
  await requireCapability("community.write");
  const table = kind === "post" ? "post_attachment" : "comment_attachment";
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("storage_path, display_name")
    .eq("id", attachmentId)
    .single();
  if (error || !data) return null;
  return createAttachmentSignedUrl(data.storage_path, {
    downloadName: opts?.download ? data.display_name : undefined,
  });
}

// narrow the FormDataEntryValue union down to File; guards against the
// stray stringified fields Next's action runtime sometimes includes.
function isFile(v: FormDataEntryValue): v is File {
  return typeof v !== "string" && v instanceof File && v.size > 0;
}

type PostAttachmentRow = {
  post_id: string;
  display_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  sort_order: number;
};

type CommentAttachmentRow = {
  comment_id: string;
  display_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  sort_order: number;
};
