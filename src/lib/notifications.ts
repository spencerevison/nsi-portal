import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { escapeHtml } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

export const BLOCKED_DOMAINS = ["example.com", "example.org", "example.net"];

export function isDeliverable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && !BLOCKED_DOMAINS.includes(domain);
}

const portalUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nsiportal.ca";

/**
 * Welcome email sent after a new member accepts their invitation.
 * Non-fatal — errors are logged but won't break the webhook.
 */
export async function sendWelcomeEmail(opts: {
  email: string;
  firstName: string;
}) {
  if (!isDeliverable(opts.email)) return;

  const fromAddress =
    process.env.RESEND_FROM_ADDRESS ?? "NSI Portal <noreply@resend.dev>";

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: opts.email,
      subject: "Welcome to the NSI Community Portal",
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h1 style="font-size: 20px;">Welcome, ${escapeHtml(opts.firstName)}!</h1>
          <p>Your account is set up and ready to go. Here's what you can do on the portal:</p>
          <ul style="line-height: 1.8;">
            <li><a href="${portalUrl}/documents" style="color: #0d7377;">Documents</a> — browse community files and strata documents</li>
            <li><a href="${portalUrl}/directory" style="color: #0d7377;">Member Directory</a> — find contact info for your neighbours</li>
            <li><a href="${portalUrl}/community" style="color: #0d7377;">Message Board</a> — read and post community discussions</li>
          </ul>
          <p>
            <a href="${portalUrl}" style="display:inline-block; background:#0d7377; color:#fff; padding:10px 20px; border-radius:4px; text-decoration:none;">
              Visit the Portal
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          <p style="color: #888; font-size: 12px;">
            You can update your profile and notification preferences in your
            <a href="${portalUrl}/profile" style="color: #888;">account settings</a>.
          </p>
        </div>
      `,
    });
    if (result.error) {
      console.error("sendWelcomeEmail: resend error", result.error);
    }
  } catch (err) {
    console.error("sendWelcomeEmail failed", err);
  }
}

/**
 * Send notification emails for a new community post.
 * Sends to all active members with notify_new_post = true, excluding the author
 * and test users.
 */
export async function notifyNewPost(opts: {
  postId: string;
  title: string;
  authorId: string;
  authorName: string;
}) {
  const { data: recipients, error } = await supabaseAdmin
    .from("app_user")
    .select("email")
    .eq("active", true)
    .eq("notify_new_post", true)
    .not("accepted_at", "is", null)
    .not("email", "ilike", "%+clerk_test%")
    .neq("id", opts.authorId);

  if (error || !recipients?.length) {
    if (error)
      console.error("notifyNewPost: failed to fetch recipients", error);
    return;
  }

  const emails = recipients
    .filter((r) => isDeliverable(r.email))
    .map((r) => r.email);

  if (emails.length === 0) return;

  const fromAddress =
    process.env.RESEND_FROM_ADDRESS ?? "NSI Portal <noreply@resend.dev>";
  const postUrl = `${portalUrl}/community/${opts.postId}`;

  try {
    const batch = emails.map((to) => ({
      from: fromAddress,
      to,
      subject: `New post: ${opts.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <p><strong>${escapeHtml(opts.authorName)}</strong> posted on the community board:</p>
          <p style="font-size: 18px; margin: 16px 0;">${escapeHtml(opts.title)}</p>
          <p><a href="${postUrl}" style="color: #0d7377;">View post</a></p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          <p style="color: #888; font-size: 12px;">
            You received this because you have new post notifications enabled.
            You can change this in your <a href="${portalUrl}/profile" style="color: #888;">profile settings</a>.
          </p>
        </div>
      `,
    }));

    const result = await resend.batch.send(batch);
    if (result.error) {
      console.error("notifyNewPost: resend batch error", result.error);
    }
  } catch (err) {
    console.error("notifyNewPost: send failed", err);
  }
}

/**
 * Send a notification email when someone comments on a post.
 * Only notifies the post author if they have notify_replies = true
 * and they're not the one commenting.
 */
export async function notifyNewComment(opts: {
  postId: string;
  postTitle: string;
  postAuthorId: string;
  commenterName: string;
  commenterId: string;
}) {
  // don't notify if author is commenting on their own post
  if (opts.postAuthorId === opts.commenterId) return;

  const { data: author, error } = await supabaseAdmin
    .from("app_user")
    .select("email, notify_replies, active")
    .eq("id", opts.postAuthorId)
    .single();

  if (error || !author) {
    if (error) console.error("notifyNewComment: failed to fetch author", error);
    return;
  }

  if (
    !author.active ||
    !author.notify_replies ||
    !isDeliverable(author.email)
  ) {
    return;
  }

  const fromAddress =
    process.env.RESEND_FROM_ADDRESS ?? "NSI Portal <noreply@resend.dev>";
  const postUrl = `${portalUrl}/community/${opts.postId}`;

  try {
    await resend.emails.send({
      from: fromAddress,
      to: author.email,
      subject: `${opts.commenterName} replied to your post`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <p><strong>${escapeHtml(opts.commenterName)}</strong> commented on your post <strong>${escapeHtml(opts.postTitle)}</strong>.</p>
          <p><a href="${postUrl}" style="color: #0d7377;">View post</a></p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          <p style="color: #888; font-size: 12px;">
            You received this because you have reply notifications enabled.
            You can change this in your <a href="${portalUrl}/profile" style="color: #888;">profile settings</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("notifyNewComment: send failed", err);
  }
}
