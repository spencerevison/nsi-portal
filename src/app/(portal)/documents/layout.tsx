import { listFolders, buildFolderTree } from "@/lib/documents";
import { getCurrentCapabilities } from "@/lib/current-user";
import { FolderTree } from "./folder-tree";

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [folders, caps] = await Promise.all([
    listFolders(),
    getCurrentCapabilities(),
  ]);

  const tree = buildFolderTree(folders);
  const canWrite = caps.has("documents.write");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documents</h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 md:w-72">
          <FolderTree tree={tree} canWrite={canWrite} />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
