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
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Write a comment..."
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Posting..." : "Reply"}
        </Button>
      </div>
    </form>
  );
}
