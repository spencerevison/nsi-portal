"use client";

import { useState, useTransition } from "react";
import { FileText, Download, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDownload() {
    startTransition(async () => {
      const result = await getDownloadUrl(doc.id);
      if (result.ok) {
        window.open(result.url, "_blank");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteDocument(doc.id);
      setConfirmDelete(false);
    });
  }

  return (
    <>
      <div className="group hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors">
        <button
          onClick={handleDownload}
          disabled={pending}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left disabled:opacity-50"
        >
          <FileText className="text-destructive/60 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {doc.display_name}
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              {formatFileSize(doc.file_size)} ·{" "}
              {new Date(doc.uploaded_at).toLocaleDateString()}
              {doc.uploader_name && <span> by {doc.uploader_name}</span>}
            </div>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={handleDownload}
            disabled={pending}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors disabled:opacity-50"
          >
            <Download className="size-4" />
          </button>
          {canWrite && (
            <DropdownMenu>
              <DropdownMenuTrigger className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 opacity-0 transition-all group-hover:opacity-100">
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              Permanently delete &ldquo;{doc.display_name}&rdquo;? This removes
              the file from storage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
