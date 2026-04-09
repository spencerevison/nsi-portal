"use server";

import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAppUser } from "@/lib/current-user";

const resend = new Resend(process.env.RESEND_API_KEY);

const VALID_CATEGORIES = ["bug", "feature", "question", "other"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  bug: "Bug / Issue",
  feature: "Feature Request",
  question: "General Question",
  other: "Other",
};

// rate limit: 3 support requests per hour per user
const submitLog = new Map<string, number[]>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 60 * 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (submitLog.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW,
  );
  submitLog.set(userId, timestamps);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  return true;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BLOCKED_DOMAINS = ["example.com", "example.org", "example.net"];

type ActionResult = { ok: true } | { ok: false; error: string };

export async function submitSupportRequest(input: {
  category: string;
  subject: string;
  message: string;
}): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!checkRateLimit(user.id)) {
    return {
      ok: false,
      error: "Too many requests. Please wait before submitting again.",
    };
  }

  // validate category
  if (!VALID_CATEGORIES.includes(input.category as Category)) {
    return { ok: false, error: "Please select a category" };
  }
  const category = input.category as Category;

  const subject = input.subject.trim();
  const message = input.message.trim();

  if (!subject) return { ok: false, error: "Subject is required" };
  if (subject.length > 200)
    return { ok: false, error: "Subject too long (max 200 characters)" };
  if (!message) return { ok: false, error: "Message is required" };
  if (message.length > 10000)
    return { ok: false, error: "Message too long (max 10,000 characters)" };

  // insert to DB
  const { error: insertErr } = await supabaseAdmin
    .from("support_request")
    .insert({
      user_id: user.id,
      category,
      subject,
      message,
    });

  if (insertErr) {
    console.error("submitSupportRequest: insert failed", insertErr);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  // find admin emails
  const { data: adminRoles } = await supabaseAdmin
    .from("role_capability")
    .select("role_id")
    .eq("capability", "admin.access");

  const adminRoleIds = (adminRoles ?? []).map((r) => r.role_id);

  if (adminRoleIds.length > 0) {
    const { data: admins } = await supabaseAdmin
      .from("app_user")
      .select("email")
      .in("role_id", adminRoleIds)
      .eq("active", true)
      .not("accepted_at", "is", null)
      .not("email", "ilike", "%+clerk_test%");

    const adminEmails = (admins ?? [])
      .map((a) => a.email)
      .filter((email) => {
        const domain = email.split("@")[1]?.toLowerCase();
        return domain && !BLOCKED_DOMAINS.includes(domain);
      });

    if (adminEmails.length > 0) {
      const fromAddress =
        process.env.RESEND_FROM_ADDRESS ?? "NSI Portal <noreply@resend.dev>";
      const portalUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "https://nsiportal.ca";
      const senderName = `${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}`;

      try {
        const batch = adminEmails.map((to) => ({
          from: fromAddress,
          replyTo: user.email,
          to,
          subject: `[Support] ${subject}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <p><strong>${senderName}</strong> (${escapeHtml(user.email)}) submitted a support request:</p>
              <table style="margin: 12px 0; font-size: 14px;">
                <tr><td style="color: #888; padding-right: 12px;">Category</td><td>${escapeHtml(CATEGORY_LABELS[category])}</td></tr>
                <tr><td style="color: #888; padding-right: 12px;">Subject</td><td>${escapeHtml(subject)}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
              <div style="white-space: pre-wrap;">${escapeHtml(message)}</div>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
              <p style="color: #888; font-size: 12px;">
                Reply directly to this email to respond to ${escapeHtml(user.first_name)}.
                <br />
                <a href="${portalUrl}" style="color: #888;">NSI Community Portal</a>
              </p>
            </div>
          `,
        }));

        const result = await resend.batch.send(batch);
        if (result.error) {
          console.error("submitSupportRequest: resend error", result.error);
        }
      } catch (err) {
        // email failure is non-fatal — request is already saved
        console.error("submitSupportRequest: email send failed", err);
      }
    }
  }

  return { ok: true };
}
