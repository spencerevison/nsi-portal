import { listGroups } from "@/lib/groups";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentCapabilities } from "@/lib/current-user";
import { notFound } from "next/navigation";
import { ComposeForm } from "./compose-form";

export default async function ComposePage() {
  const caps = await getCurrentCapabilities();
  if (!caps.has("email.send")) notFound();

  const [groups, { count }] = await Promise.all([
    listGroups(),
    supabaseAdmin
      .from("app_user")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .not("accepted_at", "is", null),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Send Email</h1>
        <p className="text-muted-foreground text-sm">
          Send a group email to community members
        </p>
      </div>

      <ComposeForm groups={groups} totalMembers={count ?? 0} />
    </div>
  );
}
