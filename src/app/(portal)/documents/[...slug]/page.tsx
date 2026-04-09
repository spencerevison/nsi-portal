import { Fragment } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFolderBySlugPath, listDocuments } from "@/lib/documents";
import { getCurrentCapabilities } from "@/lib/current-user";
import { FileRow } from "./file-row";
import { UploadZone, UploadButton } from "./upload-zone";

type Params = Promise<{ slug: string[] }>;

export default async function FolderPage({ params }: { params: Params }) {
  const { slug } = await params;

  const result = await getFolderBySlugPath(slug);
  if (!result) notFound();
  const { folder, ancestors } = result;

  const [docs, caps] = await Promise.all([
    listDocuments(folder.id),
    getCurrentCapabilities(),
  ]);

  const canWrite = caps.has("documents.write");

  return (
    <div className="border-border bg-card rounded-lg border">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            <Link href="/documents" className="hover:text-foreground">
              Documents
            </Link>
            {ancestors.map((a, i) => {
              const href =
                "/documents/" +
                ancestors
                  .slice(0, i + 1)
                  .map((x) => x.slug)
                  .join("/");
              return (
                <Fragment key={a.id}>
                  <span>/</span>
                  <Link href={href} className="hover:text-foreground">
                    {a.name}
                  </Link>
                </Fragment>
              );
            })}
            <span>/</span>
          </div>
          <h2 className="font-semibold">{folder.name}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {docs.length} {docs.length === 1 ? "file" : "files"}
          </p>
        </div>
        {canWrite && <UploadButton folderId={folder.id} />}
      </div>

      {/* Empty state with drag-and-drop */}
      {canWrite && docs.length === 0 && <UploadZone folderId={folder.id} />}

      {/* File list */}
      {docs.length === 0 && !canWrite && (
        <div className="text-muted-foreground py-12 text-center text-sm">
          No documents in this folder yet.
        </div>
      )}

      <div className="divide-border divide-y">
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
