"use client";

import { useState, useRef, useTransition } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocument } from "../actions";

export function UploadZone({
  folderId,
  compact = false,
}: {
  folderId: string;
  compact?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    startTransition(async () => {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", folderId);

        const result = await uploadDocument(formData);
        if (!result.ok) {
          console.error(
            "Upload failed:",
            "error" in result ? result.error : "",
          );
        }
      }
    });
  }

  if (compact) {
    return (
      <div
        className={cn(
          "mx-4 my-3 rounded-lg border-2 border-dashed p-3 text-center transition-colors",
          dragOver ? "border-primary/40 bg-primary/5" : "border-border/50",
          pending && "opacity-50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-muted-foreground text-xs">
          {pending ? "Uploading..." : "Drop files here to upload"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-4 my-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        dragOver ? "border-primary/40 bg-primary/5" : "border-border",
        pending && "opacity-50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <Upload className="text-muted-foreground mx-auto mb-2 size-5" />
      <p className="text-muted-foreground text-sm">
        {pending ? "Uploading..." : "Drag files here or click Upload"}
      </p>
      <p className="text-muted-foreground/70 mt-1 text-xs">
        PDF, DOC, images up to 25 MB
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// standalone upload button for the header area
export function UploadButton({ folderId }: { folderId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folderId", folderId);
        await uploadDocument(fd);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="border-border text-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
      >
        <Upload className="size-4" />
        {pending ? "Uploading..." : "Upload"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </>
  );
}
