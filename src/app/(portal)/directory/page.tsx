import { listDirectoryMembers, listCustomFields } from "@/lib/directory";
import { getCurrentAppUser } from "@/lib/current-user";
import { DirectoryView } from "./directory-view";

export default async function DirectoryPage() {
  // sync current user's Clerk data (avatar, name, etc) before reading directory
  await getCurrentAppUser();

  const [members, fields] = await Promise.all([
    listDirectoryMembers(),
    listCustomFields(),
  ]);

  const directoryFields = fields.filter((f) => f.show_in_directory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Member Directory</h1>
          <p className="text-muted-foreground text-sm">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      <DirectoryView members={members} customFields={directoryFields} />
    </div>
  );
}
