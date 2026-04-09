"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderPlus,
  MoreVertical,
} from "lucide-react";
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
  | { type: "add-root" }
  | { type: "delete"; folderId: string; folderName: string }
  | null;

// Figure out which folders to expand based on the current URL
function initExpanded(
  tree: FolderRow[],
  pathname: string,
): Record<string, boolean> {
  const expanded: Record<string, boolean> = {};

  function walk(nodes: FolderRow[], prefix: string): boolean {
    let anyMatch = false;
    for (const node of nodes) {
      const href = `${prefix}/${node.slug}`;
      const childMatch = node.children?.length
        ? walk(node.children, href)
        : false;
      if (pathname.startsWith(href) || childMatch) {
        expanded[node.id] = true;
        anyMatch = true;
      }
    }
    return anyMatch;
  }

  const matched = walk(tree, "/documents");

  // default: expand first top-level folder if nothing matched
  if (!matched && tree.length > 0) {
    expanded[tree[0].id] = true;
  }

  return expanded;
}

export function FolderTree({
  tree,
  canWrite,
}: {
  tree: FolderRow[];
  canWrite: boolean;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    initExpanded(tree, pathname),
  );
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<FolderDialog>(null);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <>
      <div
        className={cn(
          "border-border bg-card overflow-x-auto rounded-lg border p-2",
          pending && "opacity-60",
        )}
      >
        {tree.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            depth={0}
            pathPrefix="/documents"
            pathname={pathname}
            expanded={expanded}
            canWrite={canWrite}
            onToggle={toggle}
            onAction={setDialog}
          />
        ))}

        {canWrite && (
          <button
            onClick={() => setDialog({ type: "add-root" })}
            className="text-muted-foreground hover:bg-muted hover:text-foreground mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
          >
            <FolderPlus className="size-4" />
            Add folder
          </button>
        )}
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

      {/* Add root folder dialog */}
      {dialog?.type === "add-root" && (
        <FolderInputDialog
          title="Add folder"
          label="Folder name"
          submitLabel="Create"
          pending={pending}
          onClose={() => setDialog(null)}
          onSubmit={(name) => {
            startTransition(async () => {
              await createFolder(name, null);
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

// --- Recursive folder node ---

function FolderNode({
  folder,
  depth,
  pathPrefix,
  pathname,
  expanded,
  canWrite,
  onToggle,
  onAction,
}: {
  folder: FolderRow;
  depth: number;
  pathPrefix: string;
  pathname: string;
  expanded: Record<string, boolean>;
  canWrite: boolean;
  onToggle: (id: string) => void;
  onAction: (dialog: FolderDialog) => void;
}) {
  const href = `${pathPrefix}/${folder.slug}`;
  const isSelected = pathname === href;
  const hasChildren = (folder.children?.length ?? 0) > 0;
  const isExpanded = expanded[folder.id];

  return (
    <div className={depth > 0 ? "pl-4" : "mb-0.5"}>
      <div className="group flex items-center">
        {hasChildren ? (
          <button
            onClick={() => onToggle(folder.id)}
            className="text-muted-foreground hover:bg-muted shrink-0 rounded-md p-1"
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        <Link
          href={href}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-sm transition-colors",
            depth === 0 ? "py-2 font-medium" : "py-1.5",
            isSelected
              ? "bg-muted text-foreground font-medium"
              : depth === 0
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Folder
            className={cn(
              "size-4 shrink-0",
              isSelected || depth === 0
                ? "text-primary"
                : "text-muted-foreground",
            )}
          />
          <span className="truncate">{folder.name}</span>
          {(folder.document_count ?? 0) > 0 && (
            <span className="text-muted-foreground ml-auto shrink-0 text-xs">
              {folder.document_count}
            </span>
          )}
        </Link>

        {canWrite && (
          <FolderMenu
            onRename={() =>
              onAction({
                type: "rename",
                folderId: folder.id,
                currentName: folder.name,
              })
            }
            onAddSubfolder={() =>
              onAction({ type: "add-subfolder", parentId: folder.id })
            }
            onDelete={() =>
              onAction({
                type: "delete",
                folderId: folder.id,
                folderName: folder.name,
              })
            }
          />
        )}
      </div>

      {isExpanded &&
        folder.children?.map((child) => (
          <FolderNode
            key={child.id}
            folder={child}
            depth={depth + 1}
            pathPrefix={href}
            pathname={pathname}
            expanded={expanded}
            canWrite={canWrite}
            onToggle={onToggle}
            onAction={onAction}
          />
        ))}
    </div>
  );
}

// --- Sub-components ---

function FolderMenu({
  onRename,
  onAddSubfolder,
  onDelete,
}: {
  onRename: () => void;
  onAddSubfolder: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 opacity-0 transition-all group-hover:opacity-100">
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onClick={onAddSubfolder}>
          Add Subfolder
        </DropdownMenuItem>
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
