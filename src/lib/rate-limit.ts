import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Durable rate limiter backed by the `rate_limit_event` table. Replaces the
// in-process Map we used to have, which reset on every lambda cold start.

export type RateLimitOptions = {
  bucket: string;
  userId: string;
  // per-user limits
  hourLimit?: number;
  dayLimit?: number;
  // optional system-wide daily ceiling (counts all users in this bucket)
  systemDayLimit?: number;
};

export type RateLimitReason = "user_hour" | "user_day" | "system_day";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: RateLimitReason };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Check the rate limits for the given bucket+user. If allowed, record an
 * event and return ok. The check + insert isn't transactional — under
 * heavy concurrency a user could squeak past by 1-2, which is fine for our
 * scale. Don't use this for anything where strict counts matter.
 */
export async function checkAndRecord(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  const hourCutoff = new Date(now - HOUR_MS).toISOString();
  const dayCutoff = new Date(now - DAY_MS).toISOString();

  if (opts.hourLimit !== undefined) {
    const { count } = await supabaseAdmin
      .from("rate_limit_event")
      .select("id", { count: "exact", head: true })
      .eq("bucket", opts.bucket)
      .eq("user_id", opts.userId)
      .gte("created_at", hourCutoff);

    if ((count ?? 0) >= opts.hourLimit) {
      return { ok: false, reason: "user_hour" };
    }
  }

  if (opts.dayLimit !== undefined) {
    const { count } = await supabaseAdmin
      .from("rate_limit_event")
      .select("id", { count: "exact", head: true })
      .eq("bucket", opts.bucket)
      .eq("user_id", opts.userId)
      .gte("created_at", dayCutoff);

    if ((count ?? 0) >= opts.dayLimit) {
      return { ok: false, reason: "user_day" };
    }
  }

  if (opts.systemDayLimit !== undefined) {
    const { count } = await supabaseAdmin
      .from("rate_limit_event")
      .select("id", { count: "exact", head: true })
      .eq("bucket", opts.bucket)
      .gte("created_at", dayCutoff);

    if ((count ?? 0) >= opts.systemDayLimit) {
      return { ok: false, reason: "system_day" };
    }
  }

  const { error } = await supabaseAdmin.from("rate_limit_event").insert({
    bucket: opts.bucket,
    user_id: opts.userId,
  });

  if (error) {
    // If we can't record, fail-open rather than blocking the user — we'd
    // rather let one extra send through than lock people out due to a DB
    // hiccup. The admin will see the issue in logs.
    console.error("rate-limit insert failed; allowing", {
      bucket: opts.bucket,
      error,
    });
  }

  return { ok: true };
}

export function rateLimitMessage(reason: RateLimitReason): string {
  switch (reason) {
    case "user_hour":
      return "Too many requests in the last hour. Please wait and try again.";
    case "user_day":
      return "Daily limit reached. Try again tomorrow.";
    case "system_day":
      return "The portal has hit its daily send limit. Try again tomorrow or contact an administrator.";
  }
}
