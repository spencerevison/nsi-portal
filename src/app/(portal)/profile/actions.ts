"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAppUser } from "@/lib/current-user";
import type { ActionResult } from "@/lib/action-result";

// paths that may render the editing user's profile data — invalidated as a
// set whenever phone/lot/address/custom fields change. confirmProfile and
// updateNotifications use narrower sets since those don't affect /directory.
const PROFILE_CHANGE_PATHS = ["/", "/profile", "/directory"] as const;

function revalidateProfileChange() {
  for (const p of PROFILE_CHANGE_PATHS) revalidatePath(p);
}

export async function updateProfile(input: {
  phone: string;
  lotNumber: string;
  address: string;
}): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // self-edit counts as confirmation — they wouldn't be saving if it was wrong
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("app_user")
    .update({
      phone: input.phone.trim() || null,
      lot_number: input.lotNumber.trim() || null,
      address: input.address.trim() || null,
      profile_confirmed_at: now,
      onboarded_at: user.onboarded_at ?? now,
    })
    .eq("id", user.id);

  if (error) {
    console.error("updateProfile failed", error);
    return { ok: false, error: "Failed to update profile" };
  }

  revalidateProfileChange();
  return { ok: true };
}

export async function updateCustomFieldValue(input: {
  fieldId: string;
  value: string | null;
  visible: boolean;
}): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabaseAdmin.from("custom_field_value").upsert(
    {
      user_id: user.id,
      field_id: input.fieldId,
      value: input.value,
      visible: input.visible,
    },
    { onConflict: "user_id,field_id" },
  );

  if (error) {
    console.error("updateCustomFieldValue failed", error);
    return { ok: false, error: "Failed to update" };
  }

  // editing a custom field is also a tacit confirmation
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("app_user")
    .update({
      profile_confirmed_at: now,
      onboarded_at: user.onboarded_at ?? now,
    })
    .eq("id", user.id);

  revalidateProfileChange();
  return { ok: true };
}

export async function confirmProfile(): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("app_user")
    .update({
      profile_confirmed_at: now,
      onboarded_at: user.onboarded_at ?? now,
    })
    .eq("id", user.id);

  if (error) {
    console.error("confirmProfile failed", error);
    return { ok: false, error: "Failed to confirm" };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true };
}

export async function updateNotifications(input: {
  notifyNewPost: boolean;
  notifyReplies: boolean;
}): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabaseAdmin
    .from("app_user")
    .update({
      notify_new_post: input.notifyNewPost,
      notify_replies: input.notifyReplies,
    })
    .eq("id", user.id);

  if (error) {
    console.error("updateNotifications failed", error);
    return { ok: false, error: "Failed to update" };
  }

  revalidatePath("/profile");
  return { ok: true };
}
