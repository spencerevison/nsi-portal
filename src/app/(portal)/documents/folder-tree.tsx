"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, Folder, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FolderRow } from "@/lib/documents";
import { createFolder, renameFolder, deleteFolder } from "./actions";

type FolderDialog =
  | { type: "rename"; folderId: string; currentName: string }
  | { type: "add-subfolder"; parentId: string }
  | { type: "delete"; folderId: string; folderName: string }
  | null;

export function FolderTree({
  tree,
  canWrite,
}: {
  tree: FolderRow[];
  canWrite: boolean;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const folder of tree) {
      const match =
        pathname.startsWith(`/documents/${folder.slug}`) ||
        folder.children?.some((c) =>
          pathname.includes(`/documents/${folder.slug}/${c.slug}`),
        );
      if (match) init[folder.id] = true;
    }
    if (Object.keys(init).length === 0 && tree.length > 0) {
      init[tree[0].id] = true;
    }
    return init;
  });
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<FolderDialog>(null);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <>
      <div
        className={cn(
          "border-border bg-card rounded-lg border p-2",
          pending && "opacity-60",
        )}
      >
        {tree.map((folder) => (
          <div key={folder.id} className="mb-0.5">
            <div className="group flex items-center">
              <button
                onClick={() => toggle(folder.id)}
                className="text-muted-foreground hover:bg-muted shrink-0 rounded-md p-1"
              >
                {expanded[folder.id] ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              <Link
                href={`/documents/${folder.slug}`}
                className={cn(
                  "hover:bg-muted flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium",
                  pathname === `/documents/${folder.slug}`
                    ? "bg-muted text-foreground"
                    : "text-foreground",
                )}
              >
                <Folder className="text-primary size-4" />
                {folder.name}
                {(folder.document_count ?? 0) > 0 && (
                  <span className="text-muted-foreground ml-auto text-xs">
                    {folder.document_count}
                  </span>
                )}
              </Link>
              {canWrite && (
                <FolderMenu
                  onRename={() =>
                    setDialog({
                      type: "rename",
                      folderId: folder.id,
                      currentName: folder.name,
                    })
                  }
                  onAddSubfolder={() =>
                    setDialog({ type: "add-subfolder", parentId: folder.id })
                  }
                  onDelete={() =>
                    setDialog({
                      type: "delete",
                      folderId: folder.id,
                      folderName: folder.name,
                    })
                  }
                  isTopLevel
                />
              )}
            </div>

            {expanded[folder.id] && folder.children && (
              <div className="ml-8 space-y-0.5">
                {folder.children.map((child) => {
                  const href = `/documents/${folder.slug}/${child.slug}`;
                  const isSelected = pathname === href;
                  return (
                    <div key={child.id} className="group flex items-center">
                      <Link
                        href={href}
                        className={cn(
                          "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          isSelected
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Folder
                          className={cn(
                            "size-4 shrink-0",
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate">{child.name}</span>
                        {(child.document_count ?? 0) > 0 && (
                          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                            {child.document_count}
                          </span>
                        )}
                      </Link>
                      {canWrite && (
                        <FolderMenu
                          onRename={() =>
                            setDialog({
                              type: "rename",
                              folderId: child.id,
                              currentName: child.name,
                            })
                          }
                          onDelete={() =>
                            setDialog({
                              type: "delete",
                              folderId: child.id,
                              folderName: child.name,
                            })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rename dialog */}
      {dialog?.type === "rename" && (
        <FolderInputDialog
          title="Rename folder"
          label="Folder name"
          defaultValue={dialog.currentName}
          submitLabel="Save"
          pending={pending}
          onClose={() => setDialog(null)}
          onSubmit={(name) => {
            startTransition(async () => {
              await renameFolder(dialog.folderId, name);
              setDialog(null);
            });
          }}
        />
      )}

      {/* Add subfolder dialog */}
      {dialog?.type === "add-subfolder" && (
        <FolderInputDialog
          title="Add subfolder"
          label="Subfolder name"
          submitLabel="Create"
          pending={pending}
          onClose={() => setDialog(null)}
          onSubmit={(name) => {
            startTransition(async () => {
              await createFolder(name, dialog.parentId);
              setDialog(null);
            });
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {dialog?.type === "delete" && (
        <Dialog open onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete folder</DialogTitle>
              <DialogDescription>
                Permanently delete &ldquo;{dialog.folderName}&rdquo; and all
                documents inside it? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await deleteFolder(dialog.folderId);
                    setDialog(null);
                  });
                }}
              >
                {pending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// --- Sub-components ---

function FolderMenu({
  onRename,
  onAddSubfolder,
  onDelete,
  isTopLevel = false,
}: {
  onRename: () => void;
  onAddSubfolder?: () => void;
  onDelete: () => void;
  isTopLevel?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 opacity-0 transition-all group-hover:opacity-100">
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
        {isTopLevel && onAddSubfolder && (
          <DropdownMenuItem onClick={onAddSubfolder}>
            Add Subfolder
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FolderInputDialog({
  title,
  label,
  defaultValue = "",
  submitLabel,
  pending,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  defaultValue?: string;
  submitLabel: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onSubmit(value.trim());
          }}
        >
          <div className="space-y-1.5 py-2">
            <Label htmlFor="folder-input">{label}</Label>
            <Input
              id="folder-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !value.trim()}>
              {pending ? "..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
