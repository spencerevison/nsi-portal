import { createClient } from "@supabase/supabase-js";

// single shared client for server-side data access.
// RLS + Clerk session guard the data; this key is the publishable one.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase env vars");
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
