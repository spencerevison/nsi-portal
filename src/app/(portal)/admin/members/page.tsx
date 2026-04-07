import { listMembers, listRoles } from "@/lib/members";
import { AddMemberForm } from "./add-member-form";
import { MembersTable } from "./members-table";

export default async function MembersPage() {
  const [members, roles] = await Promise.all([listMembers(), listRoles()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        <span className="text-muted-foreground text-sm">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </div>

      <AddMemberForm roles={roles} />

      <MembersTable members={members} roles={roles} />
    </div>
  );
}
