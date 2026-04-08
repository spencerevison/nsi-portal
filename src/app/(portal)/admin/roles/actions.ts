"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability } from "@/lib/current-user";
import type { ActionResult } from "@/lib/action-result";

export async function createRole(
  name: string,
  description: string,
): Promise<ActionResult & { roleId?: string }> {
  await requireCapability("roles.manage");

  if (!name.trim()) return { ok: false, error: "Name required" };

  const { data, error } = await supabaseAdmin
    .from("role")
    .insert({
      name: name.trim(),
      description: description.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A role with that name already exists" };
    }
    console.error("createRole failed", error);
    return { ok: false, error: "Failed to create role" };
  }

  revalidatePath("/admin/roles");
  return { ok: true, roleId: data.id };
}

export async function updateRole(
  roleId: string,
  name: string,
  description: string,
): Promise<ActionResult> {
  await requireCapability("roles.manage");

  const { error } = await supabaseAdmin
    .from("role")
    .update({
      name: name.trim(),
      description: description.trim() || null,
    })
    .eq("id", roleId);

  if (error) {
    console.error("updateRole failed", error);
    return { ok: false, error: "Failed to update role" };
  }

  revalidatePath("/admin/roles");
  return { ok: true };
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  await requireCapability("roles.manage");

  // check if any members are assigned to this role
  const { count } = await supabaseAdmin
    .from("app_user")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);

  if (count && count > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${count} member${count > 1 ? "s" : ""} assigned to this role. Reassign them first.`,
    };
  }

  // delete capabilities first (cascade should handle this, but be explicit)
  await supabaseAdmin.from("role_capability").delete().eq("role_id", roleId);

  const { error } = await supabaseAdmin.from("role").delete().eq("id", roleId);

  if (error) {
    console.error("deleteRole failed", error);
    return { ok: false, error: "Failed to delete role" };
  }

  revalidatePath("/admin/roles");
  return { ok: true };
}

export async function updateCapabilities(
  roleId: string,
  capabilities: string[],
): Promise<ActionResult> {
  await requireCapability("roles.manage");

  // replace all capabilities: delete existing, insert new
  const { error: delErr } = await supabaseAdmin
    .from("role_capability")
    .delete()
    .eq("role_id", roleId);

  if (delErr) {
    console.error("delete capabilities failed", delErr);
    return { ok: false, error: "Failed to update capabilities" };
  }

  if (capabilities.length > 0) {
    const rows = capabilities.map((c) => ({
      role_id: roleId,
      capability: c,
    }));
    const { error: insErr } = await supabaseAdmin
      .from("role_capability")
      .insert(rows);

    if (insErr) {
      console.error("insert capabilities failed", insErr);
      return { ok: false, error: "Failed to update capabilities" };
    }
  }

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${roleId}`);
  return { ok: true };
}
