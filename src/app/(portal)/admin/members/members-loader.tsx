import { listMembers, listRoles } from "@/lib/members";
import { AddMemberForm } from "./add-member-form";
import { CsvImportDialog } from "./csv-import-dialog";
import { MembersTable } from "./members-table";

export async function MembersLoader() {
  const [members, roles] = await Promise.all([listMembers(), listRoles()]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        <span className="text-muted-foreground text-sm">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <AddMemberForm roles={roles} />
        <CsvImportDialog roles={roles} />
      </div>
      <MembersTable members={members} roles={roles} />
    </>
  );
}
