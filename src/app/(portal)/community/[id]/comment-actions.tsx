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
import { Textarea } from "@/components/ui/textarea";
import { deleteComment, editComment } from "../actions";

export function CommentActions({
  commentId,
  postId,
  body: initialBody,
  isOwner,
}: {
  commentId: string;
  postId: string;
  body: string;
  isOwner: boolean;
  canModerate?: boolean; // passed but used for gating at the parent level
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1"
        >
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOwner && (
            <DropdownMenuItem onClick={() => setEditing(true)}>
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDialog
        open={editing}
        onOpenChange={setEditing}
        commentId={commentId}
        postId={postId}
        initialBody={initialBody}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment</DialogTitle>
            <DialogDescription>
              Delete this comment? This cannot be undone.
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
                  await deleteComment(commentId, postId);
                  setConfirmDelete(false);
                });
              }}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditDialog({
  open,
  onOpenChange,
  commentId,
  postId,
  initialBody,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentId: string;
  postId: string;
  initialBody: string;
}) {
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setBody(initialBody);
        else setError(null);
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit comment</DialogTitle>
        </DialogHeader>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Edit your comment..."
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !body.trim()}
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const result = await editComment({
                  commentId,
                  postId,
                  body,
                });
                if (result.ok) {
                  onOpenChange(false);
                } else {
                  setError(result.error);
                }
              });
            }}
          >
            {pending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
