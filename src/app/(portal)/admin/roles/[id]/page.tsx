import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRoleWithCapabilities, ALL_CAPABILITIES } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { CapabilityGrid } from "./capability-grid";

type Params = Promise<{ id: string }>;

export default async function RoleDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const role = await getRoleWithCapabilities(id);
  if (!role) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/roles"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to Roles
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{role.name}</h1>
          {role.is_default && <Badge variant="secondary">Default</Badge>}
        </div>
        {role.description && (
          <p className="text-muted-foreground text-sm">{role.description}</p>
        )}
        <p className="text-muted-foreground mt-1 text-sm">
          {role.member_count} member{role.member_count !== 1 ? "s" : ""} ·{" "}
          {role.capabilities.length} capabilities
        </p>
      </div>

      <CapabilityGrid
        roleId={role.id}
        currentCapabilities={role.capabilities}
        allCapabilities={ALL_CAPABILITIES.map((c) => ({
          key: c.key,
          label: c.label,
        }))}
      />
    </div>
  );
}
