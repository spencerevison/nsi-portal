"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createComment } from "../actions";

export function CommentForm({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const result = await createComment({
        postId,
        body: String(fd.get("body") ?? ""),
      });
      if (result.ok) form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <textarea
        name="body"
        required
        rows={2}
        placeholder="Write a comment..."
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3"
      />
      <Button type="submit" disabled={pending} className="self-end">
        {pending ? "..." : "Reply"}
      </Button>
    </form>
  );
}
