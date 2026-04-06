"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAppUser, requireCapability } from "@/lib/current-user";

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

  const { error } = await supabaseAdmin
    .from("post")
    .delete()
    .eq("id", postId);

  if (error) return { ok: false, error: "Failed to delete post" };

  revalidatePath("/community");
  return { ok: true };
}

export async function deleteComment(commentId: string, postId: string): Promise<ActionResult> {
  await requireCapability("community.moderate");

  const { error } = await supabaseAdmin
    .from("comment")
    .delete()
    .eq("id", commentId);

  if (error) return { ok: false, error: "Failed to delete comment" };

  revalidatePath(`/community/${postId}`);
  return { ok: true };
}
