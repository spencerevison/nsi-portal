"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability } from "@/lib/current-user";

export type InviteMemberInput = {
  email: string;
  first_name: string;
  last_name: string;
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
  if (!input.first_name.trim() || !input.last_name.trim()) {
    return { ok: false, error: "First and last name required" };
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

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("app_user")
    .insert({
      email,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
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

export type UpdateMemberInput = {
  id: string;
  first_name: string;
  last_name: string;
  lot_number?: string;
  role_id: string;
};

export type UpdateMemberResult =
  | { ok: true }
  | { ok: false; error: string };

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
  if (user.accepted_at) return { ok: false, error: "Cannot revoke — already accepted" };

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
    .select("id, active, clerk_id")
    .eq("id", userId)
    .single();

  if (fetchErr || !user) return { ok: false, error: "Member not found" };
  if (user.active) return { ok: false, error: "Deactivate the member before deleting" };

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
