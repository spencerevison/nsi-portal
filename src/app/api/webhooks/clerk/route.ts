import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Clerk → app_user link.
// Svix verifies the signature, then we match by email and write clerk_id.

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  let evt: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Invalid signature", { status: 401 });
  }

  if (evt.type === "user.updated") {
    return handleUserUpdated(evt.data);
  }

  if (evt.type === "user.created") {
    return handleUserCreated(evt.data);
  }

  return new Response(null, { status: 204 });
}

// --- user.updated: sync profile fields back to app_user ---
// Clerk's WebhookEvent["data"] doesn't expose all fields we need, so
// we cast through Record to access them safely.
/* eslint-disable @typescript-eslint/no-explicit-any */

async function handleUserUpdated(data: WebhookEvent["data"] & { id: string }) {
  const clerkId = data.id;

  const { data: user, error: selErr } = await supabaseAdmin
    .from("app_user")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (selErr) {
    console.error("user.updated lookup failed", selErr);
    return new Response("DB error", { status: 500 });
  }
  if (!user) {
    // not linked yet — nothing to sync
    return new Response(null, { status: 204 });
  }

  const primaryEmailId = (data as any).primary_email_address_id;
  const emailObj = (data as any).email_addresses?.find(
    (e: any) => e.id === primaryEmailId,
  );
  const email = emailObj?.email_address?.toLowerCase() as string | undefined;
  const hasImage = (data as any).has_image as boolean;
  const avatarUrl = hasImage ? ((data as any).image_url as string) : null;

  const { error: updErr } = await supabaseAdmin
    .from("app_user")
    .update({
      first_name: (data as any).first_name ?? undefined,
      last_name: (data as any).last_name ?? undefined,
      ...(email ? { email } : {}),
      avatar_url: avatarUrl,
    })
    .eq("id", user.id);

  if (updErr) {
    console.error("user.updated sync failed", updErr);
    return new Response("DB error", { status: 500 });
  }

  return new Response(null, { status: 204 });
}

// --- user.created: link clerk account to pre-seeded app_user ---

async function handleUserCreated(data: WebhookEvent["data"] & { id: string }) {
  const clerkId = data.id;
  const primaryEmailId = (data as any).primary_email_address_id;
  const emailObj = (data as any).email_addresses?.find(
    (e: any) => e.id === primaryEmailId,
  );
  const email = emailObj?.email_address?.toLowerCase() as string | undefined;

  if (!email) {
    console.error("user.created event had no primary email", { clerkId });
    return new Response("No primary email", { status: 400 });
  }

  // Link the clerk user to a pre-seeded app_user by email.
  // If no row exists, the member was not invited through the admin flow —
  // we reject rather than auto-creating, to keep membership gated.
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("app_user")
    .select("id, clerk_id")
    .ilike("email", email)
    .maybeSingle();

  if (selErr) {
    console.error("app_user lookup failed", selErr);
    return new Response("DB error", { status: 500 });
  }

  if (!existing) {
    // not a pre-seeded member — shouldn't normally happen since invites
    // are only sent after admin creates the app_user row
    console.warn("user.created for un-seeded email", { email, clerkId });
    return new Response("No matching profile", { status: 404 });
  }

  // already linked to a DIFFERENT clerk account? reject to prevent takeover
  if (existing.clerk_id && existing.clerk_id !== clerkId) {
    console.error(
      "app_user already linked to a different clerk_id — rejecting",
      {
        email,
        existing: existing.clerk_id,
        incoming: clerkId,
      },
    );
    return new Response("Already linked to another account", { status: 409 });
  }

  const hasImage = (data as any).has_image as boolean;
  const avatarUrl = hasImage ? ((data as any).image_url as string) : null;

  // idempotent: same clerk_id is fine (re-delivered webhook)
  const { error: updErr } = await supabaseAdmin
    .from("app_user")
    .update({
      clerk_id: clerkId,
      accepted_at: new Date().toISOString(),
      avatar_url: avatarUrl,
    })
    .eq("id", existing.id);

  if (updErr) {
    console.error("app_user link update failed", updErr);
    return new Response("DB error", { status: 500 });
  }

  return new Response(null, { status: 204 });
}
