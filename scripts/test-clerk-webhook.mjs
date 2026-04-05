// Local integration test for the Clerk webhook handler.
// Seeds an app_user row, signs a fake user.created payload with Svix,
// POSTs it to localhost:3000, then verifies the row got linked.
//
// usage: node scripts/test-clerk-webhook.mjs
// (dev server must be running)

import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// load .env.local manually (don't need dotenv)
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

const testEmail = `webhook-test-${Date.now()}@example.com`;
const fakeClerkId = `user_test_${randomUUID().replace(/-/g, "")}`;

console.log("1. seeding app_user with email:", testEmail);
const { data: role } = await supabase
  .from("role")
  .select("id")
  .eq("name", "Member")
  .single();

const { data: seeded, error: seedErr } = await supabase
  .from("app_user")
  .insert({
    email: testEmail,
    first_name: "Webhook",
    last_name: "Test",
    role_id: role.id,
    invited_at: new Date().toISOString(),
  })
  .select()
  .single();

if (seedErr) {
  console.error("seed failed:", seedErr);
  process.exit(1);
}
console.log("   seeded id:", seeded.id, "clerk_id:", seeded.clerk_id);

// build the clerk user.created payload
const payload = {
  type: "user.created",
  data: {
    id: fakeClerkId,
    primary_email_address_id: "idn_primary",
    email_addresses: [
      {
        id: "idn_primary",
        email_address: testEmail,
      },
    ],
  },
};

const body = JSON.stringify(payload);
const msgId = `msg_${randomUUID().replace(/-/g, "")}`;
const timestamp = new Date();
const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
const sig = wh.sign(msgId, timestamp, body);

console.log("2. POSTing signed webhook to localhost:3000");
const res = await fetch("http://localhost:3000/api/webhooks/clerk", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "svix-id": msgId,
    "svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
    "svix-signature": sig,
  },
  body,
});
console.log("   response:", res.status, await res.text());

if (res.status !== 204) {
  console.error("unexpected status");
  process.exit(1);
}

console.log("3. re-reading app_user row");
const { data: after } = await supabase
  .from("app_user")
  .select("id, email, clerk_id, accepted_at")
  .eq("id", seeded.id)
  .single();

console.log("   clerk_id:", after.clerk_id);
console.log("   accepted_at:", after.accepted_at);

const ok = after.clerk_id === fakeClerkId && after.accepted_at !== null;
console.log(ok ? "\nPASS" : "\nFAIL");

// cleanup
await supabase.from("app_user").delete().eq("id", seeded.id);
console.log("cleaned up test row");

process.exit(ok ? 0 : 1);
