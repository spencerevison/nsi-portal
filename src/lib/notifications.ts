import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

const BLOCKED_DOMAINS = ["example.com", "example.org", "example.net"];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isDeliverable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && !BLOCKED_DOMAINS.includes(domain);
}

const portalUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nsiportal.ca";

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
