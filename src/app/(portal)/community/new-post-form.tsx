"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createPost } from "./actions";

export function NewPostForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await createPost({
        title: String(fd.get("title") ?? ""),
        body: String(fd.get("body") ?? ""),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset();
      setOpen(false);
      if (result.postId) {
        router.push(`/community/${result.postId}`);
      }
    });
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          New Post
        </Button>
      </div>
    );
  }

  return (
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
            <Label htmlFor="post-body">Message</Label>
            <textarea
              id="post-body"
              name="body"
              required
              rows={4}
              placeholder="Share something with the community..."
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Posting..." : "Post"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
