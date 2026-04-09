"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability } from "@/lib/current-user";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateRequestStatus(input: {
  id: string;
  status: string;
}): Promise<ActionResult> {
  await requireCapability("support.manage");

  if (!["new", "read", "complete"].includes(input.status)) {
    return { ok: false, error: "Invalid status" };
  }

  const { error } = await supabaseAdmin
    .from("support_request")
    .update({ status: input.status })
    .eq("id", input.id);

  if (error) {
    console.error("updateRequestStatus failed", error);
    return { ok: false, error: "Failed to update status" };
  }

  revalidatePath("/admin/support", "layout");
  return { ok: true };
}

export async function deleteSupportRequest(id: string): Promise<ActionResult> {
  await requireCapability("support.manage");

  const { error } = await supabaseAdmin
    .from("support_request")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteSupportRequest failed", error);
    return { ok: false, error: "Failed to delete request" };
  }

  revalidatePath("/admin/support", "layout");
  return { ok: true };
}
