"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send } from "lucide-react";
import { submitSupportRequest } from "./actions";
import { cn } from "@/lib/utils";

const categories = [
  { value: "bug", label: "Bug / Issue" },
  { value: "feature", label: "Feature Request" },
  { value: "question", label: "General Question" },
  { value: "other", label: "Other" },
];

export function SupportForm() {
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const canSubmit = category && subject.trim() && message.trim();

  function handleSubmit() {
    setResult(null);
    startTransition(async () => {
      const res = await submitSupportRequest({ category, subject, message });

      if (res.ok) {
        setResult({
          ok: true,
          message:
            "Your request has been submitted. An administrator will follow up.",
        });
        setCategory("");
        setSubject("");
        setMessage("");
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {result && (
        <div
          className={cn(
            "flex items-start justify-between gap-2 rounded-lg border p-3 text-sm",
            result.ok
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
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
          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Category</Label>
            <Select
              items={categories}
              value={category}
              onValueChange={(v) => setCategory(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="What's this about?" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label
              htmlFor="support-subject"
              className="text-muted-foreground text-xs"
            >
              Subject
            </Label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description..."
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label
              htmlFor="support-message"
              className="text-muted-foreground text-xs"
            >
              Message
            </Label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Describe your issue or request in detail..."
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3"
            />
          </div>

          <Button
            disabled={!canSubmit || pending}
            onClick={handleSubmit}
          >
            <Send data-icon="inline-start" className="size-4" />
            {pending ? "Submitting..." : "Submit Request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
