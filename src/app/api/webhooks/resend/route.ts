import { Webhook } from "svix";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ResendEvent = {
  type: string;
  data: {
    email_id: string;
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

  // map event type to status key
  let statusKey: string | null = null;
  if (evt.type === "email.delivered") statusKey = "delivered";
  else if (evt.type === "email.bounced") statusKey = "bounced";
  else if (evt.type === "email.complained") statusKey = "complained";

  if (!statusKey || !evt.data.email_id) {
    return new Response(null, { status: 204 });
  }

  // find email_log containing this email ID in the resend_email_ids array
  const { data: log } = await supabaseAdmin
    .from("email_log")
    .select("id")
    .contains("resend_email_ids", [evt.data.email_id])
    .maybeSingle();

  if (!log) {
    return new Response(null, { status: 204 });
  }

  // atomic increment — no read-modify-write race
  await supabaseAdmin.rpc("increment_delivery_status", {
    log_id: log.id,
    status_key: statusKey,
  });

  return new Response(null, { status: 204 });
}
