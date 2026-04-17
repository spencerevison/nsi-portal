"use client";

import { useEffect, useId, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderPlus,
  GripVertical,
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
import {
  createFolder,
  renameFolder,
  deleteFolder,
  reorderFolders,
} from "./actions";

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

  walk(tree, "/documents");

  return expanded;
}

// Find a folder's sibling array in the tree
function findSiblings(tree: FolderRow[], folderId: string): FolderRow[] | null {
  for (const node of tree) {
    if (node.id === folderId) return tree;
    if (node.children) {
      const found = findSiblings(node.children, folderId);
      if (found) return found;
    }
  }
  return null;
}

// Deep-clone tree with a sibling group reordered
function reorderInTree(
  tree: FolderRow[],
  folderId: string,
  oldIdx: number,
  newIdx: number,
): FolderRow[] {
  if (tree.some((f) => f.id === folderId)) {
    return arrayMove(tree, oldIdx, newIdx);
  }

  return tree.map((node) => {
    if (node.children?.some((c) => c.id === folderId)) {
      return {
        ...node,
        children: arrayMove(node.children, oldIdx, newIdx),
      };
    }
    if (node.children) {
      return {
        ...node,
        children: reorderInTree(node.children, folderId, oldIdx, newIdx),
      };
    }
    return node;
  });
}

// Find a folder by ID anywhere in the tree
function findFolder(tree: FolderRow[], id: string): FolderRow | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFolder(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function FolderTree({
  tree,
  canWrite,
}: {
  tree: FolderRow[];
  canWrite: boolean;
}) {
  const pathname = usePathname();
  const dndId = useId();
  const [localTree, setLocalTree] = useState(tree);
  // sync local state when server re-renders with fresh data
  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    initExpanded(tree, pathname),
  );
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<FolderDialog>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const siblings = findSiblings(localTree, active.id as string);
      if (!siblings) return;

      const oldIdx = siblings.findIndex((f) => f.id === active.id);
      const newIdx = siblings.findIndex((f) => f.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      // optimistic reorder
      const newTree = reorderInTree(
        localTree,
        active.id as string,
        oldIdx,
        newIdx,
      );
      setLocalTree(newTree);

      // persist: send the new sibling order to the server
      const newSiblings = findSiblings(newTree, active.id as string);
      if (newSiblings) {
        const orderedIds = newSiblings.map((f) => f.id);
        startTransition(() => {
          reorderFolders(orderedIds);
        });
      }
    },
    [localTree, startTransition],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeFolder = activeId ? findFolder(localTree, activeId) : null;

  const treeContent = (
    <SortableContext
      items={localTree.map((f) => f.id)}
      strategy={verticalListSortingStrategy}
    >
      {localTree.map((folder) => (
        <SortableFolderNode
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
    </SortableContext>
  );

  return (
    <>
      <div
        className={cn(
          "border-border bg-card overflow-x-auto rounded-lg border p-2",
          pending && "opacity-60",
        )}
      >
        {canWrite ? (
          <DndContext
            id={dndId}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {treeContent}
            <DragOverlay>
              {activeFolder ? (
                <div className="bg-card border-border flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm font-medium shadow-md">
                  <Folder className="text-accent-600 dark:text-cream-300 size-4" />
                  {activeFolder.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          localTree.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              depth={0}
              pathPrefix="/documents"
              pathname={pathname}
              expanded={expanded}
              canWrite={false}
              onToggle={toggle}
              onAction={setDialog}
            />
          ))
        )}

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
          submitLabel={pending ? "Saving..." : "Save"}
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
          submitLabel={pending ? "Creating..." : "Create"}
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
          submitLabel={pending ? "Creating..." : "Create"}
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

// --- Sortable folder node (with drag handle) ---

function SortableFolderNode(props: {
  folder: FolderRow;
  depth: number;
  pathPrefix: string;
  pathname: string;
  expanded: Record<string, boolean>;
  canWrite: boolean;
  onToggle: (id: string) => void;
  onAction: (dialog: FolderDialog) => void;
}) {
  const { folder } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isExpanded = props.expanded[folder.id];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        props.depth > 0 ? "pl-4" : "mb-0.5",
        isDragging && "opacity-40",
      )}
    >
      <div className="group flex items-center">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab rounded-md p-0.5 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVertical className="size-3.5" />
        </button>

        <FolderNodeContent {...props} />
      </div>

      {isExpanded && folder.children && folder.children.length > 0 && (
        <SortableContext
          items={folder.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {folder.children.map((child) => (
            <SortableFolderNode
              key={child.id}
              folder={child}
              depth={props.depth + 1}
              pathPrefix={`${props.pathPrefix}/${folder.slug}`}
              pathname={props.pathname}
              expanded={props.expanded}
              canWrite={props.canWrite}
              onToggle={props.onToggle}
              onAction={props.onAction}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

// --- Static folder node (read-only, no DnD) ---

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
  const isExpanded = expanded[folder.id];

  return (
    <div className={depth > 0 ? "pl-4" : "mb-0.5"}>
      <div className="group flex items-center">
        <FolderNodeContent
          folder={folder}
          depth={depth}
          pathPrefix={pathPrefix}
          pathname={pathname}
          expanded={expanded}
          canWrite={canWrite}
          onToggle={onToggle}
          onAction={onAction}
        />
      </div>

      {isExpanded &&
        folder.children?.map((child) => (
          <FolderNode
            key={child.id}
            folder={child}
            depth={depth + 1}
            pathPrefix={`${pathPrefix}/${folder.slug}`}
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

// --- Shared folder row content (chevron + link + menu) ---

function FolderNodeContent({
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

  return (
    <>
      {hasChildren ? (
        <button
          onClick={() => onToggle(folder.id)}
          className="text-muted-foreground hover:bg-muted shrink-0 rounded-md p-1"
        >
          {expanded[folder.id] ? (
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
              ? "text-accent-600 dark:text-cream-300"
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
    </>
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
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
