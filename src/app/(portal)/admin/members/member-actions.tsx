"use client";

import { useState, useTransition } from "react";
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
import type { MemberRow, RoleOption } from "@/lib/members";
import { EditMemberDialog } from "./edit-member-dialog";
import {
  resendInvitation,
  revokeInvitation,
  deactivateMember,
  reactivateMember,
  deleteMember,
} from "./actions";

export function MemberActions({
  member,
  roles,
}: {
  member: MemberRow;
  roles: RoleOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function run(
    action: (id: string) => Promise<{ ok: boolean; error?: string }>,
  ) {
    startTransition(async () => {
      const result = await action(member.id);
      if (!result.ok && "error" in result) {
        // TODO: toast
        console.error(result.error);
      }
    });
  }

  const canResend =
    member.status === "Draft" ||
    member.status === "Invited" ||
    member.status === "Revoked";
  const canRevoke = member.status === "Invited";
  const canDeactivate = member.status === "Active";
  const canReactivate = member.status === "Inactive";
  const canDelete = member.status === "Inactive";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <span className="sr-only">Actions</span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="currentColor"
          >
            <circle cx="7.5" cy="2.5" r="1.5" />
            <circle cx="7.5" cy="7.5" r="1.5" />
            <circle cx="7.5" cy="12.5" r="1.5" />
          </svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          {canResend && (
            <DropdownMenuItem onClick={() => run(resendInvitation)}>
              {member.status === "Invited"
                ? "Resend invitation"
                : "Send invitation"}
            </DropdownMenuItem>
          )}
          {canRevoke && (
            <DropdownMenuItem onClick={() => run(revokeInvitation)}>
              Revoke invitation
            </DropdownMenuItem>
          )}
          {canReactivate && (
            <DropdownMenuItem onClick={() => run(reactivateMember)}>
              Reactivate
            </DropdownMenuItem>
          )}
          {canDeactivate && (canResend || canRevoke) && (
            <DropdownMenuSeparator />
          )}
          {canDeactivate && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => run(deactivateMember)}
            >
              Deactivate
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditMemberDialog
        member={member}
        roles={roles}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete member</DialogTitle>
            <DialogDescription>
              Permanently delete {member.first_name} {member.last_name} (
              {member.email})? This removes their profile and Clerk account.
              This cannot be undone.
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
                run(deleteMember);
                setConfirmDelete(false);
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
