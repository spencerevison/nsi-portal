import { listFolders, buildFolderTree } from "@/lib/documents";
import { getCurrentCapabilities } from "@/lib/current-user";
import { FolderTree } from "./folder-tree";

export async function FolderTreeLoader() {
  const [folders, caps] = await Promise.all([
    listFolders(),
    getCurrentCapabilities(),
  ]);

  const tree = buildFolderTree(folders);
  const canWrite = caps.has("documents.write");

  return <FolderTree tree={tree} canWrite={canWrite} />;
}
