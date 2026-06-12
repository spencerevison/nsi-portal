"use client";

import { useState, useTransition } from "react";
import { Plus, Send } from "lucide-react";
import type { RoleOption } from "@/lib/members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddMemberForm } from "./add-member-form";
import { CsvImportDialog } from "./csv-import-dialog";
import { inviteAllDrafts } from "./actions";

export function MembersActions({
  roles,
  draftCount,
}: {
  roles: RoleOption[];
  draftCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (open) {
    return <AddMemberForm roles={roles} onClose={() => setOpen(false)} />;
  }

  function sendAll() {
    startTransition(async () => {
      const res = await inviteAllDrafts();
      if (!res.ok) {
        setSummary(res.error);
      } else if (res.failed.length === 0) {
        setSummary(`Sent ${res.sent} invitation${res.sent === 1 ? "" : "s"}.`);
      } else {
        setSummary(
          `Sent ${res.sent}, failed ${res.failed.length}: ${res.failed
            .map((f) => f.email)
            .join(", ")}`,
        );
      }
      setConfirmOpen(false);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add member
        </Button>
        <CsvImportDialog roles={roles} />
        {draftCount > 0 && (
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            <Send className="size-4" />
            Send {draftCount} draft invitation{draftCount === 1 ? "" : "s"}
          </Button>
        )}
      </div>
      {summary && <p className="text-muted-foreground text-sm">{summary}</p>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send all draft invitations</DialogTitle>
            <DialogDescription>
              This emails an invitation to all {draftCount} draft member
              {draftCount === 1 ? "" : "s"}. They&apos;ll be able to set a
              password and sign in. Send now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={sendAll}>
              {pending ? "Sending..." : `Send ${draftCount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
