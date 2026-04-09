"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability } from "@/lib/current-user";

export type InviteMemberInput = {
  email: string;
  first_name?: string;
  last_name?: string;
  lot_number?: string;
  role_id: string;
};

export type InviteMemberResult =
  | { ok: true; user_id: string }
  | { ok: false; error: string };

export async function inviteMember(
  input: InviteMemberInput,
): Promise<InviteMemberResult> {
  await requireCapability("admin.access");

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Invalid email" };
  }
  if (!input.role_id) {
    return { ok: false, error: "Role required" };
  }

  // Pre-seed the app_user row first. If this fails (e.g. duplicate email),
  // we bail before bugging Clerk.
  const { data: existing } = await supabaseAdmin
    .from("app_user")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "A member with that email already exists" };
  }

  // Name is optional here — Clerk collects it at sign-up, then
  // getCurrentAppUser syncs it to Supabase on first login.
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("app_user")
    .insert({
      email,
      first_name: input.first_name?.trim() || "",
      last_name: input.last_name?.trim() || "",
      lot_number: input.lot_number?.trim() || null,
      role_id: input.role_id,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("app_user insert failed", insErr);
    return { ok: false, error: "Failed to create member record" };
  }

  // Fire the Clerk invitation. If this fails, roll back the app_user row
  // so the admin can retry cleanly.
  try {
    const clerk = await clerkClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${appUrl}/sign-up`,
      ignoreExisting: true,
    });
  } catch (err) {
    console.error("clerk invitation failed", err);
    await supabaseAdmin.from("app_user").delete().eq("id", inserted.id);
    return { ok: false, error: "Failed to send invitation email" };
  }

  // Mark as invited
  await supabaseAdmin
    .from("app_user")
    .update({ invited_at: new Date().toISOString() })
    .eq("id", inserted.id);

  revalidatePath("/admin/members");
  return { ok: true, user_id: inserted.id };
}

// --- Bulk import ---

export type BulkInviteRow = {
  email: string;
  first_name: string;
  last_name: string;
  lot_number?: string;
  role_id: string;
};

export type BulkInviteResult = {
  results: Array<{ email: string } & InviteMemberResult>;
};

export async function bulkInviteMembers(
  rows: BulkInviteRow[],
): Promise<BulkInviteResult> {
  await requireCapability("admin.access");

  if (rows.length > 200) {
    return {
      results: rows.map((r) => ({
        email: r.email,
        ok: false as const,
        error: "Max 200 rows per import",
      })),
    };
  }

  const results: BulkInviteResult["results"] = [];
  for (const row of rows) {
    const res = await inviteMember(row);
    results.push({ email: row.email, ...res });
  }

  revalidatePath("/admin/members");
  return { results };
}

export type UpdateMemberInput = {
  id: string;
  first_name: string;
  last_name: string;
  lot_number?: string;
  role_id: string;
};

export type UpdateMemberResult = { ok: true } | { ok: false; error: string };

export async function updateMember(
  input: UpdateMemberInput,
): Promise<UpdateMemberResult> {
  await requireCapability("admin.access");

  if (!input.first_name.trim() || !input.last_name.trim()) {
    return { ok: false, error: "First and last name required" };
  }
  if (!input.role_id) {
    return { ok: false, error: "Role required" };
  }

  const { error } = await supabaseAdmin
    .from("app_user")
    .update({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      lot_number: input.lot_number?.trim() || null,
      role_id: input.role_id,
    })
    .eq("id", input.id);

  if (error) {
    console.error("updateMember failed", error);
    return { ok: false, error: "Failed to update member" };
  }

  revalidatePath("/admin/members");
  return { ok: true };
}

// --- Custom fields (admin) ---

export async function getAdminMemberCustomFields(userId: string) {
  await requireCapability("admin.access");

  // get all field defs
  const { data: fields } = await supabaseAdmin
    .from("custom_field")
    .select("id, name, field_type, sort_order")
    .order("sort_order");

  // get this user's values
  const { data: values } = await supabaseAdmin
    .from("custom_field_value")
    .select("field_id, value, visible")
    .eq("user_id", userId);

  const valueMap = new Map(
    (values ?? []).map((v) => [
      v.field_id,
      { value: v.value, visible: v.visible },
    ]),
  );

  return (fields ?? []).map((f) => ({
    field_id: f.id,
    field_name: f.name,
    value: valueMap.get(f.id)?.value ?? null,
    visible: valueMap.get(f.id)?.visible ?? true,
  }));
}

export async function adminUpdateCustomFieldValue(input: {
  userId: string;
  fieldId: string;
  value: string | null;
  visible: boolean;
}): Promise<ActionResult> {
  await requireCapability("admin.access");

  const { error } = await supabaseAdmin.from("custom_field_value").upsert(
    {
      user_id: input.userId,
      field_id: input.fieldId,
      value: input.value,
      visible: input.visible,
    },
    { onConflict: "user_id,field_id" },
  );

  if (error) {
    console.error("adminUpdateCustomFieldValue failed", error);
    return { ok: false, error: "Failed to update" };
  }

  revalidatePath("/admin/members");
  revalidatePath("/directory");
  return { ok: true };
}

// --- Row actions ---

type ActionResult = { ok: true } | { ok: false; error: string };

export async function resendInvitation(userId: string): Promise<ActionResult> {
  await requireCapability("admin.access");

  const { data: user, error } = await supabaseAdmin
    .from("app_user")
    .select("id, email, accepted_at")
    .eq("id", userId)
    .single();

  if (error || !user) return { ok: false, error: "Member not found" };
  if (user.accepted_at) return { ok: false, error: "Already accepted" };

  try {
    const clerk = await clerkClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await clerk.invitations.createInvitation({
      emailAddress: user.email,
      redirectUrl: `${appUrl}/sign-up`,
      ignoreExisting: false,
    });
  } catch {
    // if invitation already exists, try revoking and re-creating
    try {
      const clerk = await clerkClient();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const invitations = await clerk.invitations.getInvitationList({
        query: user.email,
        status: "pending",
      });
      for (const inv of invitations.data) {
        await clerk.invitations.revokeInvitation(inv.id);
      }
      await clerk.invitations.createInvitation({
        emailAddress: user.email,
        redirectUrl: `${appUrl}/sign-up`,
      });
    } catch (err) {
      console.error("resend invitation failed", err);
      return { ok: false, error: "Failed to resend invitation" };
    }
  }

  await supabaseAdmin
    .from("app_user")
    .update({ invited_at: new Date().toISOString(), revoked_at: null })
    .eq("id", userId);

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function revokeInvitation(userId: string): Promise<ActionResult> {
  await requireCapability("admin.access");

  const { data: user, error } = await supabaseAdmin
    .from("app_user")
    .select("id, email, accepted_at")
    .eq("id", userId)
    .single();

  if (error || !user) return { ok: false, error: "Member not found" };
  if (user.accepted_at)
    return { ok: false, error: "Cannot revoke — already accepted" };

  // revoke in Clerk
  try {
    const clerk = await clerkClient();
    const invitations = await clerk.invitations.getInvitationList({
      query: user.email,
      status: "pending",
    });
    for (const inv of invitations.data) {
      await clerk.invitations.revokeInvitation(inv.id);
    }
  } catch (err) {
    console.error("clerk revoke failed", err);
  }

  await supabaseAdmin
    .from("app_user")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", userId);

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function deactivateMember(userId: string): Promise<ActionResult> {
  await requireCapability("admin.access");

  const { error } = await supabaseAdmin
    .from("app_user")
    .update({ active: false })
    .eq("id", userId);

  if (error) return { ok: false, error: "Failed to deactivate" };

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function reactivateMember(userId: string): Promise<ActionResult> {
  await requireCapability("admin.access");

  const { error } = await supabaseAdmin
    .from("app_user")
    .update({ active: true })
    .eq("id", userId);

  if (error) return { ok: false, error: "Failed to reactivate" };

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function deleteMember(userId: string): Promise<ActionResult> {
  await requireCapability("admin.access");

  const { data: user, error: fetchErr } = await supabaseAdmin
    .from("app_user")
    .select("id, active, clerk_id, accepted_at, revoked_at")
    .eq("id", userId)
    .single();

  if (fetchErr || !user) return { ok: false, error: "Member not found" };
  // allow delete for: inactive, revoked (never accepted), and draft (never invited)
  const neverAccepted = !user.accepted_at;
  const isRevoked = !!user.revoked_at && neverAccepted;
  const isDraft = neverAccepted && !user.revoked_at;
  if (user.active && !isRevoked && !isDraft)
    return { ok: false, error: "Deactivate the member before deleting" };

  // remove from Clerk if linked
  if (user.clerk_id) {
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(user.clerk_id);
    } catch (err) {
      console.error("clerk user delete failed (may already be gone)", err);
    }
  }

  const { error } = await supabaseAdmin
    .from("app_user")
    .delete()
    .eq("id", userId);

  if (error) return { ok: false, error: "Failed to delete" };

  revalidatePath("/admin/members");
  return { ok: true };
}
