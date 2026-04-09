"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GroupRow } from "@/lib/groups";
import { sendGroupEmail } from "./actions";
import { cn } from "@/lib/utils";

export function ComposeForm({
  groups,
  totalMembers,
}: {
  groups: GroupRow[];
  totalMembers: number;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const allSelected = selectedSlugs.includes("all");
  const recipientCount = allSelected
    ? totalMembers
    : groups
        .filter((g) => selectedSlugs.includes(g.slug))
        .reduce((sum, g) => sum + g.member_count, 0);

  function toggleGroup(slug: string) {
    if (slug === "all") {
      setSelectedSlugs(allSelected ? [] : ["all"]);
      return;
    }
    setSelectedSlugs((prev) => {
      const without = prev.filter((s) => s !== "all" && s !== slug);
      return prev.includes(slug) ? without : [...without, slug];
    });
  }

  function handleSend() {
    setResult(null);
    startTransition(async () => {
      const res = await sendGroupEmail({
        groupSlugs: selectedSlugs,
        subject,
        body,
      });

      setConfirmOpen(false);

      if (res.ok) {
        setResult({
          ok: true,
          message: `Email sent to ${res.recipientCount} recipients.`,
        });
        setSelectedSlugs([]);
        setSubject("");
        setBody("");
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  const canSend =
    selectedSlugs.length > 0 &&
    recipientCount > 0 &&
    subject.trim() &&
    body.trim();

  return (
    <div className="space-y-4">
      {result && (
        <div
          className={cn(
            "flex items-start justify-between gap-2 rounded-lg border p-3 text-sm",
            result.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-destructive/20 bg-destructive/5 text-destructive",
          )}
        >
          <span>{result.message}</span>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="-mt-1 -mr-1 shrink-0 cursor-pointer p-1 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          {/* Group selector */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Recipients</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleGroup("all")}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  allSelected
                    ? "border-accent-200 bg-accent-50 text-accent-800 font-medium"
                    : "border-border hover:bg-muted",
                )}
              >
                All Members
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={allSelected}
                  onClick={() => toggleGroup(g.slug)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-default disabled:opacity-40",
                    selectedSlugs.includes(g.slug)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {g.name}
                  <span className="ml-1 text-xs opacity-70">
                    ({g.member_count})
                  </span>
                </button>
              ))}
            </div>
            {selectedSlugs.length > 0 && (
              <p
                className={`text-xs ${recipientCount === 0 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {recipientCount === 0
                  ? "No members in selected group(s). Add members to the group first."
                  : `${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email-subject"
              className="text-muted-foreground text-xs"
            >
              Subject
            </Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email-body"
              className="text-muted-foreground text-xs"
            >
              Message
            </Label>
            <textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write your message..."
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3"
            />
          </div>

          <p className="text-muted-foreground text-xs">
            {canSend
              ? "Emails are sent to all members in the selected group(s). Members cannot opt out of group emails."
              : "Select at least one group, add a subject, and write a message to send."}
          </p>

          <Button
            disabled={!canSend || pending}
            onClick={() => setConfirmOpen(true)}
          >
            {pending ? "Sending..." : "Send Email"}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send email</DialogTitle>
            <DialogDescription>
              Send &ldquo;{subject}&rdquo; to{" "}
              {allSelected ? "all members" : selectedSlugs.join(", ")} (
              {recipientCount} recipient{recipientCount !== 1 ? "s" : ""})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={handleSend}>
              {pending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
