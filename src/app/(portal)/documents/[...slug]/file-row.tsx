"use client";

import { useTransition } from "react";
import { FileText, Download, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentRow } from "@/lib/documents";
import { getDownloadUrl, deleteDocument } from "../actions";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileRow({
  doc,
  canWrite,
}: {
  doc: DocumentRow;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const result = await getDownloadUrl(doc.storage_path);
      if (result.ok) {
        window.open(result.url, "_blank");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${doc.display_name}"?`)) return;
    startTransition(async () => {
      await deleteDocument(doc.id);
    });
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <FileText className="size-5 shrink-0 text-destructive/60" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{doc.display_name}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatFileSize(doc.file_size)} ·{" "}
          {new Date(doc.uploaded_at).toLocaleDateString()}
          {doc.uploader_name && <span> by {doc.uploader_name}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={handleDownload}
          disabled={pending}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <Download className="size-4" />
        </button>
        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-2 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100">
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
