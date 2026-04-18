"use client";

import { useEffect, useMemo } from "react";
import { FileText, FileSpreadsheet, FileType, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatBytes, isImageMime } from "@/lib/attachments";

type Props = {
  file: File;
  size?: "sm" | "md";
  loading?: boolean;
};

// Picker-side thumb (uses object URL from a File in memory).
export function AttachmentThumbnail({ file, size = "md", loading }: Props) {
  const dim = size === "sm" ? "h-16 w-16" : "h-24 w-24";
  const url = useMemo(
    () => (isImageMime(file.type) ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  return (
    <div
      className={cn(
        "bg-muted/50 border-border relative overflow-hidden rounded-md border",
        dim,
      )}
    >
      {isImageMime(file.type) && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <NonImageIcon mime={file.type} />
      )}
      {loading && (
        <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      )}
      {!loading && !isImageMime(file.type) && (
        <div className="absolute right-0 bottom-0 left-0 bg-black/40 px-1 py-0.5 text-center text-[10px] text-white">
          {formatBytes(file.size)}
        </div>
      )}
    </div>
  );
}

function NonImageIcon({ mime }: { mime: string }) {
  const Icon =
    mime === "application/pdf"
      ? FileText
      : mime.includes("sheet") || mime.includes("excel")
        ? FileSpreadsheet
        : FileType;
  return (
    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
      <Icon className="size-7" />
    </div>
  );
}
