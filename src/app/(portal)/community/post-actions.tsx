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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";
import { togglePin, deletePost, editPost } from "./actions";

type Props = {
  postId: string;
  title: string;
  body: string;
  pinned: boolean;
  isOwner: boolean;
  canModerate: boolean;
};

export function PostActions({
  postId,
  title,
  body,
  pinned,
  isOwner,
  canModerate,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  // Wrapper div stops clicks from bubbling up to the parent <Link> on
  // the message-board list (clicking the kebab/confirm-delete shouldn't
  // trigger navigation to the post detail page).
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (!isOwner && !canModerate) return null;

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
          {isOwner && (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setEditing(true);
              }}
            >
              Edit
            </DropdownMenuItem>
          )}
          {canModerate && (
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
          )}
          {canModerate && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.preventDefault();
                setConfirmDelete(true);
              }}
            >
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDialog
        open={editing}
        onOpenChange={setEditing}
        postId={postId}
        initialTitle={title}
        initialBody={body}
      />

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

function EditDialog({
  open,
  onOpenChange,
  postId,
  initialTitle,
  initialBody,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  initialTitle: string;
  initialBody: string;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          // re-seed both fields when dialog opens — keeps subsequent opens
          // in sync with the latest server state
          setTitle(initialTitle);
          setBody(initialBody);
          setResetSignal((n) => n + 1);
        } else {
          setError(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-post-title">Title</Label>
            <Input
              id="edit-post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Edit your post..."
              disabled={pending}
              resetSignal={resetSignal}
              ariaLabel="Edit post body"
            />
          </div>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !title.trim() || !body.trim()}
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const result = await editPost({ postId, title, body });
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
