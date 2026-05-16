import { supabaseAdmin } from "@/lib/supabase-admin";

// Vercel Cron pings this daily to keep the Supabase free-tier project from
// auto-pausing after 7 days of inactivity. The endpoint is intentionally
// benign (no data exposure, idempotent) so we only enforce the bearer when
// CRON_SECRET is actually configured — that way a missing env var doesn't
// silently break the keep-alive (which is what burned us last time).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const ua = req.headers.get("user-agent") ?? "";

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return Response.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  } else {
    // Loud warning so this shows up in logs the next time someone looks.
    console.warn("keep-alive: CRON_SECRET not set, running unauthenticated", {
      ua,
    });
  }

  // Pull an actual row (not a head/count) so there's no ambiguity about
  // whether Supabase registers this as a real query.
  const { data, error } = await supabaseAdmin
    .from("app_user")
    .select("id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("keep-alive query failed", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const timestamp = new Date().toISOString();
  console.log("keep-alive ok", { timestamp, rows: data?.length ?? 0 });

  return Response.json({ ok: true, timestamp, rows: data?.length ?? 0 });
}
