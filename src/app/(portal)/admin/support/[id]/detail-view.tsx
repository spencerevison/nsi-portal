"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, RotateCcw, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import type { SupportRequestRow } from "../page";
import { updateRequestStatus, deleteSupportRequest } from "../actions";

const categoryLabels: Record<string, string> = {
  bug: "Bug / Issue",
  feature: "Feature Request",
  question: "Question",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  bug: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  feature:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  question:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  other: "",
};

const statusBadge: Record<string, React.ReactNode> = {
  new: (
    <Badge
      variant="secondary"
      className="border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
    >
      New
    </Badge>
  ),
  read: <Badge variant="outline">Read</Badge>,
  complete: (
    <Badge
      variant="secondary"
      className="border-green-200 bg-green-100 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
    >
      Complete
    </Badge>
  ),
};

export function SupportDetailView({
  request: req,
}: {
  request: SupportRequestRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSetStatus(status: string) {
    startTransition(async () => {
      await updateRequestStatus({ id: req.id, status });
    });
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/support"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-3.5" />
        All requests
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">
          <span className="text-muted-foreground font-normal">
            #{req.request_number}
          </span>{" "}
          {req.subject}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {statusBadge[req.status] ?? (
              <Badge variant="outline">{req.status}</Badge>
            )}
            <Badge
              variant="secondary"
              className={categoryColors[req.category] ?? ""}
            >
              {categoryLabels[req.category] ?? req.category}
            </Badge>
            <span className="text-muted-foreground">
              {new Date(req.created_at).toLocaleDateString("en-CA", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          {req.user && (
            <div className="text-sm">
              <span className="font-medium">
                {req.user.first_name} {req.user.last_name}
              </span>
              <span className="text-muted-foreground ml-2">
                {req.user.email}
              </span>
            </div>
          )}

          <div className="border-border bg-muted/30 rounded-lg border p-4 text-sm whitespace-pre-wrap">
            {req.message}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {req.status !== "complete" ? (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => handleSetStatus("complete")}
              >
                <Check data-icon="inline-start" className="size-4" />
                Mark complete
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleSetStatus("new")}
              >
                <RotateCcw data-icon="inline-start" className="size-4" />
                Reopen
              </Button>
            )}
            {req.user && (
              <a
                href={`mailto:${req.user.email}?subject=Re: ${encodeURIComponent(req.subject)}`}
                className="text-accent-600 hover:text-accent-800 text-sm underline underline-offset-2"
              >
                Reply via email
              </a>
            )}
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog
        open={deleteOpen}
        onOpenChange={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete request</DialogTitle>
            <DialogDescription>
              Delete #{req.request_number} &ldquo;{req.subject}&rdquo;? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-destructive text-sm">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setDeleteError(null);
                startTransition(async () => {
                  const res = await deleteSupportRequest(req.id);
                  if (!res.ok) {
                    setDeleteError(res.error);
                  } else {
                    router.push("/admin/support");
                  }
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
