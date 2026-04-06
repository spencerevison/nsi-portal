// One-off: seed an Admin app_user row by email.
// usage: node scripts/seed-admin.mjs you@example.com "First" "Last"

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const [, , email, first, last] = process.argv;
if (!email) {
  console.error(
    'usage: node scripts/seed-admin.mjs email@example.com "First" "Last"',
  );
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const { data: adminRole, error: roleErr } = await supabase
  .from("role")
  .select("id")
  .eq("name", "Admin")
  .single();

if (roleErr || !adminRole) {
  console.error("Admin role not found:", roleErr);
  process.exit(1);
}

const { data, error } = await supabase
  .from("app_user")
  .upsert(
    {
      email: email.toLowerCase(),
      first_name: first ?? "Admin",
      last_name: last ?? "User",
      role_id: adminRole.id,
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  )
  .select()
  .single();

if (error) {
  console.error("seed failed:", error);
  process.exit(1);
}

console.log("seeded:", data.id, data.email);
