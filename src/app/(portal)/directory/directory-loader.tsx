import { listDirectoryMembers, listCustomFields } from "@/lib/directory";
import { getCurrentAppUser } from "@/lib/current-user";
import { DirectoryView } from "./directory-view";

export async function DirectoryLoader() {
  await getCurrentAppUser();

  const [members, fields] = await Promise.all([
    listDirectoryMembers(),
    listCustomFields(),
  ]);

  const directoryFields = fields.filter((f) => f.show_in_directory);

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {members.length} {members.length === 1 ? "member" : "members"}
      </p>
      <DirectoryView members={members} customFields={directoryFields} />
    </>
  );
}
