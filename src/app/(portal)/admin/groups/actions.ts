"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability } from "@/lib/current-user";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

export async function createGroup(
  name: string,
  description: string,
): Promise<ActionResult & { groupId?: string }> {
  await requireCapability("groups.manage");

  const slug = slugify(name);

  if (!slug) return { ok: false, error: "Invalid group name" };

  const { data, error } = await supabaseAdmin
    .from("group_")
    .insert({
      name: name.trim(),
      slug,
      description: description.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A group with that name already exists" };
    }
    console.error("createGroup failed", error);
    return { ok: false, error: "Failed to create group" };
  }

  revalidatePath("/admin/groups");
  return { ok: true, groupId: data.id };
}

export async function updateGroup(
  groupId: string,
  name: string,
  description: string,
): Promise<ActionResult> {
  await requireCapability("groups.manage");

  const slug = slugify(name);

  const { error } = await supabaseAdmin
    .from("group_")
    .update({
      name: name.trim(),
      slug,
      description: description.trim() || null,
    })
    .eq("id", groupId);

  if (error) {
    console.error("updateGroup failed", error);
    return { ok: false, error: "Failed to update group" };
  }

  revalidatePath("/admin/groups");
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  await requireCapability("groups.manage");

  const { error } = await supabaseAdmin
    .from("group_")
    .delete()
    .eq("id", groupId);

  if (error) {
    console.error("deleteGroup failed", error);
    return { ok: false, error: "Failed to delete group" };
  }

  revalidatePath("/admin/groups");
  return { ok: true };
}

export async function addMemberToGroup(
  groupId: string,
  userId: string,
): Promise<ActionResult> {
  await requireCapability("groups.manage");

  const { error } = await supabaseAdmin
    .from("user_group")
    .insert({ user_id: userId, group_id: groupId });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Member already in group" };
    }
    console.error("addMemberToGroup failed", error);
    return { ok: false, error: "Failed to add member" };
  }

  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath("/admin/groups");
  return { ok: true };
}

export async function removeMemberFromGroup(
  groupId: string,
  userId: string,
): Promise<ActionResult> {
  await requireCapability("groups.manage");

  const { error } = await supabaseAdmin
    .from("user_group")
    .delete()
    .eq("user_id", userId)
    .eq("group_id", groupId);

  if (error) {
    console.error("removeMemberFromGroup failed", error);
    return { ok: false, error: "Failed to remove member" };
  }

  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath("/admin/groups");
  return { ok: true };
}
