"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeMemberFromGroup } from "../actions";

export function RemoveMemberButton({
  groupId,
  userId,
  memberName,
}: {
  groupId: string;
  userId: string;
  memberName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await removeMemberFromGroup(groupId, userId);
        });
      }}
      className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 disabled:opacity-50"
      title={`Remove ${memberName}`}
    >
      <X className="size-4" />
    </button>
  );
}
