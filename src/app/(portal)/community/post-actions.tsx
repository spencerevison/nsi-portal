"use client";

import { useTransition } from "react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { togglePin, deletePost } from "./actions";

export function PostActions({
  postId,
  pinned,
}: {
  postId: string;
  pinned: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded-md p-1"
        onClick={(e) => e.preventDefault()}
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
            startTransition(async () => {
              await deletePost(postId);
            });
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
