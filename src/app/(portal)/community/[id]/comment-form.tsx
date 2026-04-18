"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AttachmentPicker,
  hasBlockingAttachmentIssues,
  type PendingAttachment,
} from "@/components/attachment-picker";
import { createComment } from "../actions";

export function CommentForm({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (hasBlockingAttachmentIssues(attachments)) {
      setError("Fix the attachment issues before posting");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData();
    fd.set("postId", postId);
    fd.set("body", String(new FormData(form).get("body") ?? ""));
    for (const a of attachments) fd.append("attachments", a.file, a.file.name);

    startTransition(async () => {
      const result = await createComment(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setAttachments([]);
    });
  }

  const blocked = hasBlockingAttachmentIssues(attachments);

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        name="body"
        rows={3}
        placeholder="Write a comment..."
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3"
      />
      <AttachmentPicker
        value={attachments}
        onChange={setAttachments}
        onError={setError}
        compact
        disabled={pending}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || blocked}>
          {pending ? "Posting..." : "Reply"}
        </Button>
      </div>
    </form>
  );
}
