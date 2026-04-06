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

  // We only care about user.created for the invite-linking flow right now.
  // Other events (user.updated, user.deleted, session.*) we'll handle later.
  if (evt.type !== "user.created") {
    return new Response(null, { status: 204 });
  }

  const clerkId = evt.data.id;
  const primaryEmailId = evt.data.primary_email_address_id;
  const emailObj = evt.data.email_addresses.find(
    (e) => e.id === primaryEmailId,
  );
  const email = emailObj?.email_address?.toLowerCase();

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

  // already linked? treat as idempotent success
  if (existing.clerk_id && existing.clerk_id !== clerkId) {
    console.warn("app_user already linked to a different clerk_id", {
      email,
      existing: existing.clerk_id,
      incoming: clerkId,
    });
  }

  const { error: updErr } = await supabaseAdmin
    .from("app_user")
    .update({
      clerk_id: clerkId,
      accepted_at: new Date().toISOString(),
      avatar_url: evt.data.image_url ?? null,
    })
    .eq("id", existing.id);

  if (updErr) {
    console.error("app_user link update failed", updErr);
    return new Response("DB error", { status: 500 });
  }

  return new Response(null, { status: 204 });
}
