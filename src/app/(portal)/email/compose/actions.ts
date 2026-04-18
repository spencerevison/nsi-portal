"use server";

import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAppUser, requireCapability } from "@/lib/current-user";
import { resolveRecipients } from "@/lib/groups";
import { escapeHtml } from "@/lib/utils";
import { isDeliverable } from "@/lib/notifications";
import { validateAttachmentSet } from "@/lib/attachments";
import {
  removeAttachmentBlobs,
  uploadAttachmentBlob,
} from "@/lib/attachments-server";

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

export async function sendGroupEmail(formData: FormData): Promise<SendResult> {
  await requireCapability("email.send");
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!checkRateLimit(user.id)) {
    return {
      ok: false,
      error: "Too many emails sent. Please wait before sending again.",
    };
  }

  const groupSlugs = formData.getAll("groupSlugs").map(String).filter(Boolean);
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const files = formData.getAll("attachments").filter(isFile);

  if (groupSlugs.length === 0)
    return { ok: false, error: "Select at least one group" };
  if (!subject || !body)
    return { ok: false, error: "Subject and message required" };
  if (subject.length > 200)
    return { ok: false, error: "Subject too long (max 200 characters)" };
  if (body.length > 50000)
    return { ok: false, error: "Message too long (max 50,000 characters)" };

  const attCheck = validateAttachmentSet(
    files.map((f) => ({ size: f.size, type: f.type, name: f.name })),
  );
  if (!attCheck.ok) return { ok: false, error: attCheck.error };

  // filter out test/invalid email domains that Resend will reject
  const allRecipients = await resolveRecipients(groupSlugs);
  const recipients = allRecipients.filter((r) => isDeliverable(r.email));
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients in selected group(s)" };
  }

  // Read every file once: base64 string for Resend (their API expects
  // base64-encoded binary data; the SDK does NOT encode Buffers for you)
  // + we also upload to storage for the history view. Using a random
  // sendUuid (rather than email_log.id) lets us upload BEFORE inserting
  // the log row, so a failed send doesn't leave an orphaned row behind.
  const sendUuid = crypto.randomUUID();
  const attachmentPayloads: Array<{
    filename: string;
    contentType: string;
    base64: string;
  }> = [];
  const uploadedPaths: string[] = [];
  const attachmentRows: Array<{
    display_name: string;
    storage_path: string;
    file_size: number;
    mime_type: string;
    sort_order: number;
  }> = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const buf = Buffer.from(await f.arrayBuffer());
      attachmentPayloads.push({
        filename: f.name,
        contentType: f.type,
        base64: buf.toString("base64"),
      });
      const blob = await uploadAttachmentBlob({
        kind: "email",
        ownerId: sendUuid,
        file: f,
      });
      uploadedPaths.push(blob.storage_path);
      attachmentRows.push({
        display_name: blob.display_name,
        storage_path: blob.storage_path,
        file_size: blob.file_size,
        mime_type: blob.mime_type,
        sort_order: i,
      });
    }
  } catch (err) {
    console.error("attachment staging failed", err);
    await removeAttachmentBlobs(uploadedPaths);
    return { ok: false, error: "Failed to stage attachments" };
  }

  // send via Resend batch API (max 100 per call)
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS ?? "NSI Portal <noreply@resend.dev>";
  let emailIds: string[] = [];
  const senderName = `${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}`;

  const resendAttachments = attachmentPayloads.map((a) => ({
    filename: a.filename,
    content: a.base64,
    contentType: a.contentType,
  }));

  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <p>From: ${senderName}</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
      <div style="white-space: pre-wrap;">${escapeHtml(body)}</div>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
      <p style="color: #888; font-size: 12px;">
        Sent via NSI Community Portal to ${groupSlugs.includes("all") ? "all members" : groupSlugs.join(", ")}
      </p>
    </div>
  `;

  try {
    if (resendAttachments.length > 0) {
      // Resend's batch endpoint has historically been flaky with attachments
      // across SDK versions. Individual sends are guaranteed to work.
      const results = await Promise.all(
        recipients.map((r) =>
          resend.emails.send({
            from: fromAddress,
            replyTo: user.email,
            to: r.email,
            subject,
            html,
            attachments: resendAttachments,
          }),
        ),
      );
      const errors = results.filter((r) => r.error).map((r) => r.error);
      if (errors.length > 0) {
        console.error("resend individual send errors", errors);
        if (errors.length === results.length) {
          // complete failure — roll back
          await removeAttachmentBlobs(uploadedPaths);
          return {
            ok: false,
            error:
              "Something went wrong sending your email. Please try again or contact an administrator.",
          };
        }
        // partial failure — keep the sent ones in the log, surface a warning
      }
      emailIds = results.map((r) => r.data?.id).filter((v): v is string => !!v);
    } else {
      // No attachments → batch is fine (single API call for up to 100).
      const emails = recipients.map((r) => ({
        from: fromAddress,
        replyTo: user.email,
        to: r.email,
        subject,
        html,
      }));
      const result = await resend.batch.send(emails);
      if (result.error) {
        console.error("resend batch error", result.error);
        return {
          ok: false,
          error:
            "Something went wrong sending your email. Please try again or contact an administrator.",
        };
      }
      emailIds =
        result.data?.data?.map((d: { id: string }) => d.id).filter(Boolean) ??
        [];
    }
  } catch (err) {
    console.error("resend send failed", err);
    await removeAttachmentBlobs(uploadedPaths);
    return {
      ok: false,
      error: "Something went wrong sending your email. Please try again.",
    };
  }

  // log it — store all email IDs so webhook can match any of them
  const { data: log, error: logErr } = await supabaseAdmin
    .from("email_log")
    .insert({
      subject,
      body,
      sent_by: user.id,
      target_groups: groupSlugs,
      recipient_count: recipients.length,
      resend_batch_id: emailIds.length > 0 ? emailIds[0] : null,
      resend_email_ids: emailIds,
    })
    .select("id")
    .single();

  if (logErr || !log) {
    // email already went out; we don't clean up storage since the user
    // may still want to retrieve the attachments. Log loudly and continue.
    console.error("email_log insert failed after successful send", logErr);
    return { ok: true, recipientCount: recipients.length };
  }

  if (attachmentRows.length > 0) {
    const { error: attInsertErr } = await supabaseAdmin
      .from("email_attachment")
      .insert(attachmentRows.map((r) => ({ ...r, email_log_id: log.id })));
    if (attInsertErr) {
      console.error("email_attachment insert failed", attInsertErr);
    }
  }

  return { ok: true, recipientCount: recipients.length };
}

function isFile(v: FormDataEntryValue): v is File {
  return typeof v !== "string" && v instanceof File && v.size > 0;
}
