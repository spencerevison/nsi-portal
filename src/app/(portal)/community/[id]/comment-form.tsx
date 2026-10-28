"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  AttachmentPicker,
  hasBlockingAttachmentIssues,
  type PendingAttachment,
} from "@/components/attachment-picker";
import { createComment } from "../actions";

export function CommentForm({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  // focus the editor when we land on (or click through to) #reply
  useEffect(() => {
    function focusIfReply() {
      if (window.location.hash !== "#reply") return;
      // editor mounts after hydration, give it a tick
      setTimeout(() => {
        document
          .querySelector<HTMLElement>("#reply .ProseMirror")
          ?.focus({ preventScroll: true });
      }, 150);
    }
    focusIfReply();
    window.addEventListener("hashchange", focusIfReply);
    return () => window.removeEventListener("hashchange", focusIfReply);
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const hasBody = body.trim().length > 0;
    if (!hasBody && attachments.length === 0) {
      setError("Comment can't be empty");
      return;
    }
    if (hasBlockingAttachmentIssues(attachments)) {
      setError("Fix the attachment issues before posting");
      return;
    }

    const fd = new FormData();
    fd.set("postId", postId);
    fd.set("body", body);
    for (const a of attachments) fd.append("attachments", a.file, a.file.name);

    startTransition(async () => {
      const result = await createComment(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setAttachments([]);
      setResetSignal((n) => n + 1);
    });
  }

  const blocked = hasBlockingAttachmentIssues(attachments);

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <RichTextEditor
        value={body}
        onChange={setBody}
        placeholder="Write a comment..."
        compact
        disabled={pending}
        resetSignal={resetSignal}
        ariaLabel="Comment"
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
