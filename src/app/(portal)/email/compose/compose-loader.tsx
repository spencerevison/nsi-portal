import { listGroups } from "@/lib/groups";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ComposeForm } from "./compose-form";

export async function ComposeLoader() {
  const [groups, { count }] = await Promise.all([
    listGroups(),
    supabaseAdmin
      .from("app_user")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .not("accepted_at", "is", null)
      .not("email", "ilike", "%+clerk_test%"),
  ]);

  return <ComposeForm groups={groups} totalMembers={count ?? 0} />;
}
