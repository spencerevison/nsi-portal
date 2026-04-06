"use client";

import { useTransition } from "react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteComment } from "../actions";

export function CommentActions({
  commentId,
  postId,
}: {
  commentId: string;
  postId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-destructive"
          onClick={() =>
            startTransition(async () => { await deleteComment(commentId, postId); })
          }
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
