"use server";

import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAppUser, requireCapability } from "@/lib/current-user";
import { resolveRecipients } from "@/lib/groups";
import { escapeHtml } from "@/lib/utils";
import { isDeliverable } from "@/lib/notifications";

const resend = new Resend(process.env.RESEND_API_KEY);

// simple rate limiter: max 5 sends per user per hour
const sendLog = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (sendLog.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW,
  );
  sendLog.set(userId, timestamps);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  return true;
}

type SendResult =
  | { ok: true; recipientCount: number }
  | { ok: false; error: string };

export async function sendGroupEmail(input: {
  groupSlugs: string[];
  subject: string;
  body: string;
}): Promise<SendResult> {
  await requireCapability("email.send");
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!checkRateLimit(user.id)) {
    return {
      ok: false,
      error: "Too many emails sent. Please wait before sending again.",
    };
  }

  if (input.groupSlugs.length === 0) {
    return { ok: false, error: "Select at least one group" };
  }
  if (!input.subject.trim() || !input.body.trim()) {
    return { ok: false, error: "Subject and message required" };
  }
  if (input.subject.length > 200) {
    return { ok: false, error: "Subject too long (max 200 characters)" };
  }
  if (input.body.length > 50000) {
    return { ok: false, error: "Message too long (max 50,000 characters)" };
  }

  // filter out test/invalid email domains that Resend will reject
  const allRecipients = await resolveRecipients(input.groupSlugs);
  const recipients = allRecipients.filter((r) => isDeliverable(r.email));
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients in selected group(s)" };
  }

  // send via Resend batch API (max 100 per call)
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS ?? "NSI Portal <noreply@resend.dev>";
  let emailIds: string[] = [];
  const senderName = `${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}`;

  try {
    const emails = recipients.map((r) => ({
      from: fromAddress,
      replyTo: user.email,
      to: r.email,
      subject: input.subject.trim(),
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <p>From: ${senderName}</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          <div style="white-space: pre-wrap;">${escapeHtml(input.body.trim())}</div>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          <p style="color: #888; font-size: 12px;">
            Sent via NSI Community Portal to ${input.groupSlugs.includes("all") ? "all members" : input.groupSlugs.join(", ")}
          </p>
        </div>
      `,
    }));

    const result = await resend.batch.send(emails);

    // Resend SDK returns errors in result.error instead of throwing
    if (result.error) {
      console.error("resend batch error", result.error);
      return {
        ok: false,
        error:
          "Something went wrong sending your email. Please try again or contact an adminstrator.",
      };
    }

    emailIds =
      result.data?.data?.map((d: { id: string }) => d.id).filter(Boolean) ?? [];
  } catch (err) {
    console.error("resend send failed", err);
    return {
      ok: false,
      error: "Something went wrong sending your email. Please try again.",
    };
  }

  // log it — store all email IDs so webhook can match any of them
  await supabaseAdmin.from("email_log").insert({
    subject: input.subject.trim(),
    body: input.body.trim(),
    sent_by: user.id,
    target_groups: input.groupSlugs,
    recipient_count: recipients.length,
    resend_batch_id: emailIds.length > 0 ? emailIds[0] : null,
    resend_email_ids: emailIds,
  });

  return { ok: true, recipientCount: recipients.length };
}
