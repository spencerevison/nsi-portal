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
