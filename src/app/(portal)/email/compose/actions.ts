"use server";

import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAppUser, requireCapability } from "@/lib/current-user";
import { resolveRecipients } from "@/lib/groups";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  if (input.groupSlugs.length === 0) {
    return { ok: false, error: "Select at least one group" };
  }
  if (!input.subject.trim() || !input.body.trim()) {
    return { ok: false, error: "Subject and message required" };
  }

  const recipients = await resolveRecipients(input.groupSlugs);
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
    emailIds =
      result.data?.data?.map((d: { id: string }) => d.id).filter(Boolean) ?? [];
  } catch (err) {
    console.error("resend send failed", err);
    return { ok: false, error: "Failed to send emails" };
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
