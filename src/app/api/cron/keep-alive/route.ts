import { supabaseAdmin } from "@/lib/supabase-admin";

// Vercel Cron pings this every few days to keep the Supabase free-tier
// project from auto-pausing after 7 days of inactivity. Cheap HEAD count
// against app_user is enough to register as activity.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { count, error } = await supabaseAdmin
    .from("app_user")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("keep-alive query failed", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const timestamp = new Date().toISOString();
  console.log("keep-alive ok", { timestamp, count });

  return Response.json({ ok: true, timestamp, count: count ?? 0 });
}
