"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FolderRow } from "@/lib/documents";
import { createFolder, renameFolder, deleteFolder } from "./actions";

export function FolderTree({
  tree,
  canWrite,
}: {
  tree: FolderRow[];
  canWrite: boolean;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // auto-expand the folder that matches current URL
    const init: Record<string, boolean> = {};
    for (const folder of tree) {
      const match =
        pathname.startsWith(`/documents/${folder.slug}`) ||
        folder.children?.some((c) =>
          pathname.includes(`/documents/${folder.slug}/${c.slug}`),
        );
      if (match) init[folder.id] = true;
    }
    // default: expand first folder if nothing matched
    if (Object.keys(init).length === 0 && tree.length > 0) {
      init[tree[0].id] = true;
    }
    return init;
  });
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function runAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
    });
  }

  function handleRename(folderId: string, currentName: string) {
    const newName = prompt("Rename folder:", currentName);
    if (newName && newName !== currentName) {
      runAction(() => renameFolder(folderId, newName));
    }
  }

  function handleAddSubfolder(parentId: string) {
    const name = prompt("New subfolder name:");
    if (name) {
      runAction(() => createFolder(name, parentId));
    }
  }

  function handleDelete(folderId: string, folderName: string) {
    if (confirm(`Delete "${folderName}" and all its documents?`)) {
      runAction(() => deleteFolder(folderId));
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-2",
        pending && "opacity-60",
      )}
    >
      {tree.map((folder) => (
        <div key={folder.id} className="mb-0.5">
          {/* Top-level folder */}
          <div className="group flex items-center">
            <button
              onClick={() => toggle(folder.id)}
              className="flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <span className="text-muted-foreground">
                {expanded[folder.id] ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </span>
              <Folder className="size-4 text-primary" />
              {folder.name}
            </button>
            {canWrite && (
              <FolderMenu
                onRename={() => handleRename(folder.id, folder.name)}
                onAddSubfolder={() => handleAddSubfolder(folder.id)}
                onDelete={() => handleDelete(folder.id, folder.name)}
                isTopLevel
              />
            )}
          </div>

          {/* Subfolders */}
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
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Folder
                        className={cn(
                          "size-4 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="truncate">{child.name}</span>
                      {(child.document_count ?? 0) > 0 && (
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {child.document_count}
                        </span>
                      )}
                    </Link>
                    {canWrite && (
                      <FolderMenu
                        onRename={() => handleRename(child.id, child.name)}
                        onDelete={() => handleDelete(child.id, child.name)}
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
  );
}

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
      <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100">
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
