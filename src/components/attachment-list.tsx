"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileType,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatBytes, isImageMime } from "@/lib/attachments";

export type AttachmentDisplay = {
  id: string;
  display_name: string;
  mime_type: string;
  file_size: number;
  width?: number | null;
  height?: number | null;
};

type Fetcher = (id: string) => Promise<string | null>;

type Props = {
  attachments: AttachmentDisplay[];
  onView: Fetcher; // signed URL for inline viewing (new tab)
  onDownload: Fetcher; // signed URL with forced-download disposition
  compact?: boolean; // comments render a tight filename-only list
};

export function AttachmentList({
  attachments,
  onView,
  onDownload,
  compact,
}: Props) {
  if (attachments.length === 0) return null;

  if (compact) {
    return (
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {attachments.map((a) => (
          <FileChip
            key={a.id}
            attachment={a}
            onView={onView}
            onDownload={onDownload}
          />
        ))}
      </ul>
    );
  }

  const images = attachments.filter((a) => isImageMime(a.mime_type));
  const files = attachments.filter((a) => !isImageMime(a.mime_type));

  return (
    <div className="mt-4 space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {images.map((a) => (
            <ImageTile key={a.id} attachment={a} onView={onView} />
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className="divide-border overflow-hidden rounded-md border">
          {files.map((a) => (
            <FileRow
              key={a.id}
              attachment={a}
              onView={onView}
              onDownload={onDownload}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ImageTile({
  attachment,
  onView,
}: {
  attachment: AttachmentDisplay;
  onView: Fetcher;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function open() {
    if (loading) return;
    setLoading(true);
    const href = url ?? (await onView(attachment.id));
    setLoading(false);
    if (!href) return;
    if (!url) setUrl(href);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={open}
      className="bg-muted/40 border-border hover:border-ring/30 relative aspect-square overflow-hidden rounded-md border transition-colors"
      title={attachment.display_name}
    >
      <InlineImage attachmentId={attachment.id} onView={onView} />
      {loading && (
        <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      )}
    </button>
  );
}

// Tiny sub-component: fetches its own signed URL once on mount so the
// thumbnail renders without embedding signed URLs in SSR output.
function InlineImage({
  attachmentId,
  onView,
}: {
  attachmentId: string;
  onView: Fetcher;
}) {
  // "" = resolved with no URL → show fallback. null = still loading.
  const [src, setSrc] = useState<string | null>(null);

  // onView is typically an inline arrow (`(id) => action(...)`) so its
  // identity changes every parent render. Keeping it in a ref (updated
  // via effect to keep the linter happy) keeps the fetch effect from
  // re-firing and cancelling in-flight fetches.
  const onViewRef = useRef(onView);
  useEffect(() => {
    onViewRef.current = onView;
  }, [onView]);

  useEffect(() => {
    let cancelled = false;
    void onViewRef.current(attachmentId).then((u) => {
      if (!cancelled) setSrc(u ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  if (src === null) {
    return <div className="bg-muted/50 h-full w-full animate-pulse" />;
  }
  if (src === "") {
    return (
      <div className="bg-muted/50 text-muted-foreground flex h-full w-full items-center justify-center text-[10px]">
        unavailable
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

function FileRow({
  attachment,
  onView,
  onDownload,
}: {
  attachment: AttachmentDisplay;
  onView: Fetcher;
  onDownload: Fetcher;
}) {
  const [pending, setPending] = useState<"view" | "download" | null>(null);

  async function handle(kind: "view" | "download") {
    if (pending) return;
    setPending(kind);
    const href = await (kind === "view" ? onView : onDownload)(attachment.id);
    setPending(null);
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2 text-sm">
      <FileIcon mime={attachment.mime_type} />
      <button
        type="button"
        onClick={() => handle("view")}
        className="min-w-0 flex-1 truncate text-left hover:underline"
        title={attachment.display_name}
      >
        {attachment.display_name}
      </button>
      <span className="text-muted-foreground shrink-0 text-xs">
        {formatBytes(attachment.file_size)}
      </span>
      <button
        type="button"
        onClick={() => handle("download")}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label={`Download ${attachment.display_name}`}
      >
        {pending === "download" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
      </button>
    </li>
  );
}

function FileChip({
  attachment,
  onView,
  onDownload,
}: {
  attachment: AttachmentDisplay;
  onView: Fetcher;
  onDownload: Fetcher;
}) {
  const [pending, setPending] = useState(false);

  async function open() {
    if (pending) return;
    setPending(true);
    const fn = isImageMime(attachment.mime_type) ? onView : onDownload;
    const href = await fn(attachment.id);
    setPending(false);
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <li>
      <button
        type="button"
        onClick={open}
        className="bg-muted/40 hover:bg-muted border-border flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
      >
        <FileIcon mime={attachment.mime_type} compact />
        <span className="max-w-[180px] truncate">
          {attachment.display_name}
        </span>
        {pending && <Loader2 className="size-3 animate-spin" />}
      </button>
    </li>
  );
}

function FileIcon({ mime, compact }: { mime: string; compact?: boolean }) {
  const cls = cn("text-muted-foreground", compact ? "size-3" : "size-4");
  if (isImageMime(mime)) return <FileType className={cls} />;
  if (mime === "application/pdf") return <FileText className={cls} />;
  if (mime.includes("sheet") || mime.includes("excel"))
    return <FileSpreadsheet className={cls} />;
  return <FileType className={cls} />;
}
