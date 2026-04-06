import { listGroups } from "@/lib/groups";
import { getCurrentCapabilities } from "@/lib/current-user";
import { notFound } from "next/navigation";
import { ComposeForm } from "./compose-form";

export default async function ComposePage() {
  const caps = await getCurrentCapabilities();
  if (!caps.has("email.send")) notFound();

  const groups = await listGroups();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Send Email</h1>
        <p className="text-sm text-muted-foreground">
          Send a group email to community members
        </p>
      </div>

      <ComposeForm groups={groups} />
    </div>
  );
}
