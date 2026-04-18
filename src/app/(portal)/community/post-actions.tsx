"use client";

import { useState, useTransition } from "react";
import { MoreVertical } from "lucide-react";
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
import { togglePin, deletePost } from "./actions";

export function PostActions({
  postId,
  pinned,
}: {
  postId: string;
  pinned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Wrapper div stops clicks from bubbling up to the parent <Link> on
  // the message-board list (clicking the kebab/confirm-delete shouldn't
  // trigger navigation to the post detail page).
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div onClick={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded-md p-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await togglePin(postId);
              });
            }}
          >
            {pinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => {
              e.preventDefault();
              setConfirmDelete(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post</DialogTitle>
            <DialogDescription>
              Delete this post and all its comments? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  // redirect() handles navigation on success; only failure
                  // returns here
                  await deletePost(postId);
                });
              }}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
