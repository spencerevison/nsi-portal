// Dev-only: build a demo family around TEST_USER_EMAIL so /directory and
// /family/* have content. Idempotent — deletes its own placeholders first
// (matched by the SEED_TAG prefix in display_name... kidding, by exact names).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const SEED_NAMES = [
  "Gordon Seedling",
  "Marge Seedling",
  "Pat Seedling",
  "Sam Seedling Jr",
];

const { data: me } = await supabase
  .from("app_user")
  .select("id, first_name, last_name")
  .ilike("email", env.TEST_USER_EMAIL ?? "")
  .maybeSingle();
if (!me) {
  console.error("Test user not found — check TEST_USER_EMAIL in .env.local");
  process.exit(1);
}

// wipe previous seed placeholders (links cascade)
const { error: wipeErr } = await supabase
  .from("family_node")
  .delete()
  .in("display_name", SEED_NAMES);
if (wipeErr) {
  console.error("wipe failed:", wipeErr.message);
  process.exit(1);
}

async function node(fields) {
  const { data, error } = await supabase
    .from("family_node")
    .insert(fields)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
async function link(type, from, to) {
  const f = type === "partner" && from > to ? to : from;
  const t = type === "partner" && from > to ? from : to;
  const { error } = await supabase
    .from("family_link")
    .insert({ type, from_node: f, to_node: t });
  if (error && error.code !== "23505") throw new Error(error.message);
}

let { data: myNode } = await supabase
  .from("family_node")
  .select("id")
  .eq("app_user_id", me.id)
  .maybeSingle();
const meId = myNode?.id ?? (await node({ app_user_id: me.id }));

const gordon = await node({
  display_name: "Gordon Seedling",
  gender: "m",
  birth_year: 1938,
  death_year: 2011,
});
const marge = await node({
  display_name: "Marge Seedling",
  gender: "f",
  birth_year: 1941,
});
const pat = await node({
  display_name: "Pat Seedling",
  gender: "f",
  birth_year: 1968,
});
const kid = await node({
  display_name: "Sam Seedling Jr",
  gender: "m",
  birth_year: 2014,
});

await link("partner", gordon, marge);
await link("parent", gordon, meId);
await link("parent", marge, meId);
await link("parent", gordon, pat);
await link("parent", marge, pat);
await link("parent", meId, kid);

console.log(
  `Seeded demo family around ${me.first_name} ${me.last_name}: parents, sibling, child.`,
);
