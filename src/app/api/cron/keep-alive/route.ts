import { supabaseAdmin } from "@/lib/supabase-admin";

// Vercel Cron pings this daily to keep the Supabase free-tier project from
// auto-pausing after 7 days of inactivity. CRON_SECRET is required — without
// it the endpoint refuses to run rather than being open to the internet.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret) {
    console.error("keep-alive: CRON_SECRET is not configured");
    return Response.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 },
    );
  }

  if (auth !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
