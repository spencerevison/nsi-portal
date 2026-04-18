"use client";

import { useCallback, useState } from "react";
import imageCompression from "browser-image-compression";

import {
  COMPRESSION_MAX_DIMENSION,
  COMPRESSION_MAX_SIZE_MB,
  isHeicMime,
  isImageMime,
} from "@/lib/attachments";

// Compress an image file with NSI defaults. For HEIC/HEIF (iOS photos),
// convert to JPEG so downstream viewers (browsers, email clients) render.
// Non-image files pass through untouched.
export function useImageCompression() {
  const [compressing, setCompressing] = useState(0);

  const compress = useCallback(async (file: File): Promise<File> => {
    if (!isImageMime(file.type)) return file;

    setCompressing((n) => n + 1);
    try {
      const options = {
        maxSizeMB: COMPRESSION_MAX_SIZE_MB,
        maxWidthOrHeight: COMPRESSION_MAX_DIMENSION,
        useWebWorker: true,
        initialQuality: 0.82,
        // HEIC → JPEG transparently. Other formats stay as-is.
        fileType: isHeicMime(file.type) ? "image/jpeg" : undefined,
      };
      const out = await imageCompression(file, options);

      // browser-image-compression returns a Blob; normalize to File with
      // a sensible name so storage + display don't break when HEIC → JPEG
      const outName = isHeicMime(file.type)
        ? file.name.replace(/\.(heic|heif)$/i, ".jpg")
        : file.name;
      return new File([out], outName, {
        type: out.type,
        lastModified: Date.now(),
      });
    } finally {
      setCompressing((n) => n - 1);
    }
  }, []);

  return { compress, compressing: compressing > 0 };
}
