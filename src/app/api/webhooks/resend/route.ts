import { Webhook } from "svix";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Resend delivery webhook — tracks email delivery status.
// Events: email.delivered, email.bounced, email.complained

type ResendEvent = {
  type: string;
  data: {
    email_id: string;
    // other fields vary by event type
  };
};

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET not set");
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

  let evt: ResendEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEvent;
  } catch (err) {
    console.error("Resend webhook verification failed:", err);
    return new Response("Invalid signature", { status: 401 });
  }

  const eventType = evt.type;
  const emailId = evt.data.email_id;

  // map event type to a status key
  let statusKey: string | null = null;
  if (eventType === "email.delivered") statusKey = "delivered";
  else if (eventType === "email.bounced") statusKey = "bounced";
  else if (eventType === "email.complained") statusKey = "complained";

  if (!statusKey || !emailId) {
    return new Response(null, { status: 204 });
  }

  // find the email_log by resend_batch_id or matching email_id
  // Resend batch returns individual message IDs; we stored the first one
  // For now, match any email_log where resend_batch_id matches
  const { data: log } = await supabaseAdmin
    .from("email_log")
    .select("id, delivery_status")
    .eq("resend_batch_id", emailId)
    .maybeSingle();

  if (!log) {
    // try broader match — the email_id might be from a batch member
    // just log it and move on
    console.warn("No email_log found for resend email_id:", emailId);
    return new Response(null, { status: 204 });
  }

  // increment the counter for this status
  const current = (log.delivery_status as Record<string, number>) ?? {};
  current[statusKey] = (current[statusKey] ?? 0) + 1;

  await supabaseAdmin
    .from("email_log")
    .update({ delivery_status: current })
    .eq("id", log.id);

  return new Response(null, { status: 204 });
}
