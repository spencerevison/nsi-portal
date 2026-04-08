"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getCurrentAppUser,
  getCurrentCapabilities,
  requireCapability,
} from "@/lib/current-user";
import { notifyNewPost, notifyNewComment } from "@/lib/notifications";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createPost(input: {
  title: string;
  body: string;
}): Promise<ActionResult & { postId?: string }> {
  await requireCapability("community.write");
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.title.trim() || !input.body.trim()) {
    return { ok: false, error: "Title and body required" };
  }
  if (input.title.length > 200) {
    return { ok: false, error: "Title too long (max 200 characters)" };
  }
  if (input.body.length > 10000) {
    return { ok: false, error: "Post too long (max 10,000 characters)" };
  }

  const { data, error } = await supabaseAdmin
    .from("post")
    .insert({
      title: input.title.trim(),
      body: input.body.trim(),
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createPost failed", error);
    return { ok: false, error: "Failed to create post" };
  }

  revalidatePath("/community");

  // send notification emails (awaited so the runtime doesn't drop the promise)
  await notifyNewPost({
    postId: data.id,
    title: input.title.trim(),
    authorId: user.id,
    authorName: `${user.first_name} ${user.last_name}`,
  }).catch((err) => console.error("notifyNewPost error", err));

  return { ok: true, postId: data.id };
}

export async function createComment(input: {
  postId: string;
  body: string;
}): Promise<ActionResult> {
  await requireCapability("community.write");
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.body.trim()) {
    return { ok: false, error: "Comment cannot be empty" };
  }
  if (input.body.length > 5000) {
    return { ok: false, error: "Comment too long (max 5,000 characters)" };
  }

  const { error } = await supabaseAdmin.from("comment").insert({
    post_id: input.postId,
    body: input.body.trim(),
    author_id: user.id,
  });

  if (error) {
    console.error("createComment failed", error);
    return { ok: false, error: "Failed to post comment" };
  }

  revalidatePath(`/community/${input.postId}`);

  // notify post author
  const { data: post } = await supabaseAdmin
    .from("post")
    .select("title, author_id")
    .eq("id", input.postId)
    .single();

  if (post) {
    await notifyNewComment({
      postId: input.postId,
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

export async function deletePost(postId: string): Promise<ActionResult> {
  await requireCapability("community.moderate");

  const { error } = await supabaseAdmin.from("post").delete().eq("id", postId);

  if (error) return { ok: false, error: "Failed to delete post" };

  revalidatePath("/community");
  return { ok: true };
}

export async function editComment(input: {
  commentId: string;
  postId: string;
  body: string;
}): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.body.trim()) return { ok: false, error: "Comment cannot be empty" };
  if (input.body.length > 5000)
    return { ok: false, error: "Comment too long (max 5,000 characters)" };

  // only the comment author can edit
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
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const caps = await getCurrentCapabilities();

  // moderators can delete any comment; authors can delete their own
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

  const { error } = await supabaseAdmin
    .from("comment")
    .delete()
    .eq("id", commentId);

  if (error) return { ok: false, error: "Failed to delete comment" };

  revalidatePath(`/community/${postId}`);
  return { ok: true };
}
