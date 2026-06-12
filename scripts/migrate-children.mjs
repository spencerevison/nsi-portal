// One-time migration: Children custom-field values -> family graph.
// Each child entry becomes a placeholder node + parent link from the lister.
// Spouses who both list the same kid are deduped by (lot, normalized name,
// compatible birth year). Run with --dry-run first.
//
//   node scripts/migrate-children.mjs --dry-run
//   node scripts/migrate-children.mjs
//
// Writes a backup of all raw values to .family-migration-backup.json first.
// Idempotent-ish: skips a child if the lister already has a parent link to a
// placeholder with the same normalized name, and reuses orphaned placeholders
// left behind by a prior partial run.

import { readFileSync, writeFileSync } from "node:fs";
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

const dryRun = process.argv.includes("--dry-run");
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

const { data: field, error: fieldErr } = await supabase
  .from("custom_field")
  .select("id")
  .eq("name", "Children")
  .maybeSingle();
if (fieldErr) {
  console.error("custom_field lookup failed:", fieldErr.message);
  process.exit(1);
}
if (!field) {
  console.log("No Children custom field — nothing to migrate.");
  process.exit(0);
}

const { data: values, error: valuesErr } = await supabase
  .from("custom_field_value")
  .select("user_id, value")
  .eq("field_id", field.id);
if (valuesErr) {
  console.error("custom_field_value query failed:", valuesErr.message);
  process.exit(1);
}

const { data: users, error: usersErr } = await supabase
  .from("app_user")
  .select("id, first_name, last_name, lot_number");
if (usersErr) {
  console.error("app_user query failed:", usersErr.message);
  process.exit(1);
}
const userById = new Map((users ?? []).map((u) => [u.id, u]));

writeFileSync(
  ".family-migration-backup.json",
  JSON.stringify({ field_id: field.id, values: values ?? [] }, null, 2),
);
console.log(
  `Backed up ${values?.length ?? 0} values to .family-migration-backup.json`,
);

// entries: { lister, lot, name, birthYear }
const entries = [];
for (const v of values ?? []) {
  if (!v.value) continue;
  let parsed;
  try {
    parsed = JSON.parse(v.value);
  } catch {
    parsed = [{ name: v.value }];
  }
  if (!Array.isArray(parsed)) continue;
  const user = userById.get(v.user_id);
  for (const item of parsed) {
    const name = (item.name ?? "").trim();
    if (!name) continue;
    const by = parseInt(item.birthYear, 10);
    entries.push({
      lister: v.user_id,
      lot: user?.lot_number ?? null,
      name,
      birthYear: Number.isFinite(by) ? by : null,
    });
  }
}

// dedupe: same lot + same normalized name + compatible year => one placeholder
const groups = new Map();
for (const e of entries) {
  const key = `${e.lot ?? "?"}|${norm(e.name)}`;
  const g = groups.get(key);
  if (
    g &&
    (g.birthYear == null || e.birthYear == null || g.birthYear === e.birthYear)
  ) {
    g.birthYear = g.birthYear ?? e.birthYear;
    g.listers.add(e.lister);
  } else if (!g) {
    groups.set(key, {
      name: e.name,
      birthYear: e.birthYear,
      listers: new Set([e.lister]),
    });
  } else {
    // same name+lot but conflicting years — keep separate via suffixed key
    const yearKey = `${key}|${e.birthYear}`;
    const g2 = groups.get(yearKey);
    if (g2) {
      g2.listers.add(e.lister);
    } else {
      groups.set(yearKey, {
        name: e.name,
        birthYear: e.birthYear,
        listers: new Set([e.lister]),
      });
    }
  }
}

console.log(
  `${entries.length} child entries -> ${groups.size} unique children`,
);

// existing placeholder children per lister, to keep reruns from duplicating
const { data: existingLinks, error: linksErr } = await supabase
  .from("family_link")
  .select("from_node, to_node")
  .eq("type", "parent");
if (linksErr) {
  console.error("family_link query failed:", linksErr.message);
  process.exit(1);
}
const { data: existingNodes, error: nodesErr } = await supabase
  .from("family_node")
  .select("id, app_user_id, display_name, birth_year");
if (nodesErr) {
  console.error("family_node query failed:", nodesErr.message);
  process.exit(1);
}
const nodeById = new Map((existingNodes ?? []).map((n) => [n.id, n]));
const userNode = new Map(
  (existingNodes ?? [])
    .filter((n) => n.app_user_id)
    .map((n) => [n.app_user_id, n.id]),
);
const hasChildNamed = (listerUserId, childName) => {
  const listerNode = userNode.get(listerUserId);
  if (!listerNode) return false;
  return (existingLinks ?? []).some((l) => {
    if (l.from_node !== listerNode) return false;
    const child = nodeById.get(l.to_node);
    return (
      child &&
      !child.app_user_id &&
      norm(child.display_name ?? "") === norm(childName)
    );
  });
};

// placeholders left orphaned by a prior partial run (node created, link insert
// failed) — reuse instead of inserting a dupe
const linkedChildIds = new Set((existingLinks ?? []).map((l) => l.to_node));
const findOrphan = (g) =>
  (existingNodes ?? []).find(
    (n) =>
      !n.app_user_id &&
      !linkedChildIds.has(n.id) &&
      n.birth_year === g.birthYear &&
      norm(n.display_name ?? "") === norm(g.name),
  );

let created = 0;
let skipped = 0;
for (const g of groups.values()) {
  const listers = [...g.listers].filter((l) => !hasChildNamed(l, g.name));
  if (listers.length === 0) {
    skipped++;
    continue;
  }
  console.log(
    `${dryRun ? "[dry-run] " : ""}child "${g.name}"${g.birthYear ? ` (b. ${g.birthYear})` : ""} <- parents: ${listers
      .map((l) => {
        const u = userById.get(l);
        return u ? `${u.first_name} ${u.last_name}` : l;
      })
      .join(", ")}`,
  );
  if (dryRun) continue;

  let childId = findOrphan(g)?.id;
  if (childId) {
    linkedChildIds.add(childId); // don't hand the same orphan to another group
  } else {
    const { data: child, error: childErr } = await supabase
      .from("family_node")
      .insert({ display_name: g.name, birth_year: g.birthYear })
      .select("id")
      .single();
    if (childErr) {
      console.error("  node insert failed:", childErr.message);
      continue;
    }
    childId = child.id;
  }
  for (const lister of listers) {
    let parentNode = userNode.get(lister);
    if (!parentNode) {
      const { data: pn, error: pnErr } = await supabase
        .from("family_node")
        .insert({ app_user_id: lister })
        .select("id")
        .single();
      if (pnErr) {
        console.error("  parent node insert failed:", pnErr.message);
        continue;
      }
      parentNode = pn.id;
      userNode.set(lister, parentNode);
    }
    const { error: linkErr } = await supabase
      .from("family_link")
      .insert({ type: "parent", from_node: parentNode, to_node: childId });
    if (linkErr && linkErr.code !== "23505") {
      console.error("  link insert failed:", linkErr.message);
    }
  }
  created++;
}

console.log(
  dryRun
    ? `Dry run complete. Would create ${groups.size - skipped} children (${skipped} already present).`
    : `Done. Created ${created} children (${skipped} already present).`,
);
console.log(
  "Reminder: the Children custom_field row is deleted manually as final cleanup once seeding is verified.",
);
