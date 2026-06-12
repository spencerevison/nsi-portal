import { listDirectoryMembers, listCustomFields } from "@/lib/directory";
import { requireCapability, getCurrentAppUser } from "@/lib/current-user";
import {
  getDirectoryFamilySummaries,
  listFamilies,
  loadFamilyGraph,
} from "@/lib/family-data";
import { DirectoryView } from "./directory-view";

export async function DirectoryLoader() {
  await requireCapability("directory.read");
  const viewer = await getCurrentAppUser();

  // load the family graph once, then derive both the per-member summaries and
  // the families dropdown from it (previously each did its own full graph load)
  const [members, fields, graph] = await Promise.all([
    listDirectoryMembers(),
    listCustomFields(),
    loadFamilyGraph(),
  ]);
  const families = await getDirectoryFamilySummaries(viewer?.id ?? "", graph);
  const familyList = await listFamilies(graph);

  // Children renders as a derived column from the family graph now
  const directoryFields = fields.filter(
    (f) => f.show_in_directory && f.name !== "Children",
  );

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {members.length} {members.length === 1 ? "member" : "members"}
      </p>
      <DirectoryView
        members={members}
        customFields={directoryFields}
        families={families}
        familyList={familyList}
        viewerId={viewer?.id ?? null}
      />
    </>
  );
}
