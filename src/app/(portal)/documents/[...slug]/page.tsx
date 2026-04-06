import { notFound } from "next/navigation";
import Link from "next/link";
import { getFolderBySlug, listDocuments } from "@/lib/documents";
import { getCurrentCapabilities } from "@/lib/current-user";
import { FileRow } from "./file-row";
import { UploadZone, UploadButton } from "./upload-zone";

type Params = Promise<{ slug: string[] }>;

export default async function FolderPage({ params }: { params: Params }) {
  const { slug } = await params;
  const parentSlug = slug.length > 1 ? slug[0] : undefined;
  const folderSlug = slug[slug.length - 1];

  const folder = await getFolderBySlug(folderSlug, parentSlug);
  if (!folder) notFound();

  const [docs, caps] = await Promise.all([
    listDocuments(folder.id),
    getCurrentCapabilities(),
  ]);

  const canWrite = caps.has("documents.write");

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/documents" className="hover:text-foreground">
              Documents
            </Link>
            {parentSlug && (
              <>
                <span>/</span>
                <span>{parentSlug}</span>
              </>
            )}
            <span>/</span>
          </div>
          <h2 className="font-semibold">{folder.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {docs.length} {docs.length === 1 ? "file" : "files"}
          </p>
        </div>
        {canWrite && <UploadButton folderId={folder.id} />}
      </div>

      {/* Empty state with drag-and-drop */}
      {canWrite && docs.length === 0 && <UploadZone folderId={folder.id} />}

      {/* File list */}
      {docs.length === 0 && !canWrite && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No documents in this folder yet.
        </div>
      )}

      <div className="divide-y divide-border">
        {docs.map((doc) => (
          <FileRow key={doc.id} doc={doc} canWrite={canWrite} />
        ))}
      </div>

      {/* Compact drop zone when folder has files */}
      {canWrite && docs.length > 0 && (
        <UploadZone folderId={folder.id} compact />
      )}
    </div>
  );
}
