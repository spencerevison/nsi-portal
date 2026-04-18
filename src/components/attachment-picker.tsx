"use client";

import { useId, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ATTACHMENT_MIME_WHITELIST,
  MAX_AGGREGATE_BYTES,
  MAX_ATTACHMENTS_PER_OWNER,
  formatBytes,
  isImageMime,
  validateAttachment,
} from "@/lib/attachments";

const AGGREGATE_MB = MAX_AGGREGATE_BYTES / 1024 / 1024;
import { useImageCompression } from "@/lib/use-image-compression";
import { AttachmentThumbnail } from "@/components/attachment-thumbnail";

export type PendingAttachment = {
  id: string;
  file: File;
  status: "compressing" | "ready" | "error";
  errorMessage?: string;
};

type Props = {
  value: PendingAttachment[];
  onChange: (next: PendingAttachment[]) => void;
  onError?: (msg: string) => void;
  compact?: boolean;
  disabled?: boolean;
};

export function AttachmentPicker({
  value,
  onChange,
  onError,
  compact,
  disabled,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { compress } = useImageCompression();

  const total = value.reduce((acc, a) => acc + a.file.size, 0);
  const over = total > MAX_AGGREGATE_BYTES;
  const anyCompressing = value.some((a) => a.status === "compressing");

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    if (incoming.length === 0) return;

    const slotsLeft = MAX_ATTACHMENTS_PER_OWNER - value.length;
    if (slotsLeft <= 0) {
      onError?.(`Max ${MAX_ATTACHMENTS_PER_OWNER} attachments`);
      return;
    }
    const accepted = incoming.slice(0, slotsLeft);
    if (accepted.length < incoming.length) {
      onError?.(`Max ${MAX_ATTACHMENTS_PER_OWNER} attachments`);
    }

    // Add placeholders first so the user sees something immediately while
    // compression runs. We reconcile by id as each finishes.
    const placeholders: PendingAttachment[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: isImageMime(f.type) ? "compressing" : "ready",
    }));
    let next = [...value, ...placeholders];
    onChange(next);

    for (const p of placeholders) {
      try {
        const processed = isImageMime(p.file.type)
          ? await compress(p.file)
          : p.file;
        const v = validateAttachment({
          size: processed.size,
          type: processed.type,
          name: processed.name,
        });
        next = next.map((a) =>
          a.id === p.id
            ? {
                ...a,
                file: processed,
                status: v.ok ? "ready" : "error",
                errorMessage: v.ok ? undefined : v.error,
              }
            : a,
        );
        onChange(next);
        if (!v.ok) onError?.(v.error);
      } catch (err) {
        console.error("compression failed", err);
        next = next.map((a) =>
          a.id === p.id
            ? { ...a, status: "error", errorMessage: "Couldn't process file" }
            : a,
        );
        onChange(next);
        onError?.("Couldn't process file");
      }
    }
  }

  function remove(id: string) {
    onChange(value.filter((a) => a.id !== id));
  }

  const accept = ATTACHMENT_MIME_WHITELIST.join(",");

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-lg border-2 border-dashed text-center transition-colors",
          compact ? "px-3 py-2" : "px-4 py-4",
          dragOver
            ? "border-primary/40 bg-primary/5"
            : "border-border hover:border-border/70",
          disabled && "pointer-events-none opacity-50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
          <Paperclip className="size-3.5" />
          {compact ? (
            <span>Attach files</span>
          ) : (
            <span>Drop files here or click to attach</span>
          )}
        </div>
        {!compact && (
          <p className="text-muted-foreground/70 mt-1 text-[11px]">
            Images, PDF, Word, Excel · up to {AGGREGATE_MB} MB total
          </p>
        )}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files ?? []);
            // reset so choosing the same file twice re-fires
            e.target.value = "";
          }}
        />
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a) => (
            <div
              key={a.id}
              className={cn(
                "group relative",
                a.status === "error" && "opacity-60",
              )}
              title={a.errorMessage ?? a.file.name}
            >
              <AttachmentThumbnail
                file={a.file}
                size={compact ? "sm" : "md"}
                loading={a.status === "compressing"}
              />
              <button
                type="button"
                aria-label={`Remove ${a.file.name}`}
                onClick={() => remove(a.id)}
                className="bg-background text-foreground border-border hover:bg-muted absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border shadow-sm"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(value.length > 0 || anyCompressing) && (
        <p
          className={cn(
            "text-xs",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {formatBytes(total)} of {AGGREGATE_MB} MB
          {anyCompressing && " · compressing…"}
        </p>
      )}
    </div>
  );
}

export function hasBlockingAttachmentIssues(
  value: PendingAttachment[],
): boolean {
  if (value.some((a) => a.status !== "ready")) return true;
  const total = value.reduce((acc, a) => acc + a.file.size, 0);
  return total > MAX_AGGREGATE_BYTES;
}
