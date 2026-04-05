import { createClient } from "@supabase/supabase-js";

// server-only supabase client using the secret key.
// bypasses RLS — only import from server actions, route handlers, webhooks.
// never expose this to a client component.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error("Missing Supabase server env vars");
}

export const supabaseAdmin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
