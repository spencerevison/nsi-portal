"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  AttachmentPicker,
  hasBlockingAttachmentIssues,
  type PendingAttachment,
} from "@/components/attachment-picker";
import { createPost } from "./actions";

export function NewPostForm() {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setBody("");
    setAttachments([]);
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("Message can't be empty");
      return;
    }
    if (hasBlockingAttachmentIssues(attachments)) {
      setError("Fix the attachment issues before posting");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData();
    fd.set("title", String(new FormData(form).get("title") ?? ""));
    fd.set("body", body);
    for (const a of attachments) fd.append("attachments", a.file, a.file.name);

    startTransition(async () => {
      // Success path redirects server-side; only errors land here.
      const result = await createPost(fd);
      if (!result.ok) setError(result.error);
    });
  }

  const header = (
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-xl font-semibold">Message Board</h1>
        <p className="text-muted-foreground text-sm">
          Announcements and discussions
        </p>
      </div>
      {!open && (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          New Post
        </Button>
      )}
    </div>
  );

  if (!open) return header;

  const blocked = hasBlockingAttachmentIssues(attachments);

  return (
    <>
      {header}
      <Card className="w-full">
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                name="title"
                required
                placeholder="What's on your mind?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Share something with the group..."
                disabled={pending}
                ariaLabel="Message body"
              />
            </div>

            <AttachmentPicker
              value={attachments}
              onChange={setAttachments}
              onError={setError}
              disabled={pending}
            />

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending || blocked}>
                {pending ? "Posting..." : "Post"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
