// Verifies role seed data and the capability-fetch logic used by
// getCurrentCapabilities(). Runs directly against Supabase, no dev server.
//
// usage: node scripts/test-roles-capabilities.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

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

const expected = {
  Admin: [
    "documents.read",
    "documents.write",
    "directory.read",
    "directory.manage",
    "email.send",
    "community.read",
    "community.write",
    "community.moderate",
    "admin.access",
    "groups.manage",
    "roles.manage",
  ],
  Council: [
    "documents.read",
    "directory.read",
    "email.send",
    "community.read",
    "community.write",
    "community.moderate",
  ],
  Member: [
    "documents.read",
    "directory.read",
    "community.read",
    "community.write",
  ],
};

let failures = 0;

for (const [roleName, expectedCaps] of Object.entries(expected)) {
  const { data: role } = await supabase
    .from("role")
    .select("id, is_default")
    .eq("name", roleName)
    .single();

  if (!role) {
    console.log(`FAIL: role "${roleName}" missing`);
    failures++;
    continue;
  }

  const { data: caps } = await supabase
    .from("role_capability")
    .select("capability")
    .eq("role_id", role.id);

  const actual = new Set((caps ?? []).map((c) => c.capability));
  const expectedSet = new Set(expectedCaps);

  const missing = [...expectedSet].filter((c) => !actual.has(c));
  const extra = [...actual].filter((c) => !expectedSet.has(c));

  if (missing.length || extra.length) {
    console.log(`FAIL: ${roleName}`);
    if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
    if (extra.length) console.log(`  extra:   ${extra.join(", ")}`);
    failures++;
  } else {
    console.log(`PASS: ${roleName} (${actual.size} capabilities)`);
  }
}

// is_default check — Member should be the default role
const { data: defaults } = await supabase
  .from("role")
  .select("name")
  .eq("is_default", true);

if (defaults?.length === 1 && defaults[0].name === "Member") {
  console.log("PASS: Member is the default role");
} else {
  console.log("FAIL: is_default not set correctly:", defaults);
  failures++;
}

// spot-check the simulated capability-fetch path used by getCurrentCapabilities
const { data: memberRole } = await supabase
  .from("role")
  .select("id")
  .eq("name", "Member")
  .single();

const { data: memberCaps } = await supabase
  .from("role_capability")
  .select("capability")
  .eq("role_id", memberRole.id);

const capSet = new Set(memberCaps.map((r) => r.capability));
const checks = [
  ["community.read", true],
  ["community.write", true],
  ["email.send", false],
  ["admin.access", false],
];

for (const [cap, shouldHave] of checks) {
  if (capSet.has(cap) === shouldHave) {
    console.log(`PASS: Member.${shouldHave ? "has" : "lacks"}(${cap})`);
  } else {
    console.log(`FAIL: Member capability check for ${cap}`);
    failures++;
  }
}

process.exit(failures ? 1 : 0);
