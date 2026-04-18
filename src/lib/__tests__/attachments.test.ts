import { describe, it, expect } from "vitest";

import {
  MAX_AGGREGATE_BYTES,
  MAX_ATTACHMENTS_PER_OWNER,
  MAX_DOC_BYTES,
  MAX_IMAGE_BYTES,
  buildStoragePath,
  isAllowedMime,
  isHeicMime,
  isImageMime,
  safeFilename,
  validateAttachment,
  validateAttachmentSet,
} from "@/lib/attachments";

describe("isImageMime", () => {
  it("accepts image/* types", () => {
    expect(isImageMime("image/jpeg")).toBe(true);
    expect(isImageMime("image/png")).toBe(true);
    expect(isImageMime("image/heic")).toBe(true);
  });
  it("rejects non-image types", () => {
    expect(isImageMime("application/pdf")).toBe(false);
    expect(isImageMime("text/plain")).toBe(false);
  });
});

describe("isHeicMime", () => {
  it("catches both heic and heif", () => {
    expect(isHeicMime("image/heic")).toBe(true);
    expect(isHeicMime("image/heif")).toBe(true);
    expect(isHeicMime("image/jpeg")).toBe(false);
  });
});

describe("isAllowedMime", () => {
  it("accepts whitelisted types", () => {
    expect(isAllowedMime("application/pdf")).toBe(true);
    expect(isAllowedMime("image/webp")).toBe(true);
  });
  it("rejects everything else", () => {
    expect(isAllowedMime("video/mp4")).toBe(false);
    expect(isAllowedMime("application/zip")).toBe(false);
    expect(isAllowedMime("application/x-msdownload")).toBe(false);
    expect(isAllowedMime("")).toBe(false);
  });
});

describe("validateAttachment", () => {
  it("rejects disallowed mime", () => {
    const r = validateAttachment({
      size: 1024,
      type: "video/mp4",
      name: "clip.mp4",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("not allowed");
  });

  it("rejects oversized images", () => {
    const r = validateAttachment({
      size: MAX_IMAGE_BYTES + 1,
      type: "image/jpeg",
      name: "big.jpg",
    });
    expect(r.ok).toBe(false);
  });

  it("accepts images right at the cap", () => {
    const r = validateAttachment({
      size: MAX_IMAGE_BYTES,
      type: "image/jpeg",
      name: "ok.jpg",
    });
    expect(r.ok).toBe(true);
  });

  it("applies the larger doc cap to PDFs", () => {
    const r = validateAttachment({
      size: MAX_IMAGE_BYTES + 100, // over image cap, under doc cap
      type: "application/pdf",
      name: "big.pdf",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects docs over the doc cap", () => {
    const r = validateAttachment({
      size: MAX_DOC_BYTES + 1,
      type: "application/pdf",
      name: "too-big.pdf",
    });
    expect(r.ok).toBe(false);
  });
});

describe("validateAttachmentSet", () => {
  it("rejects too many files", () => {
    const files = Array.from({ length: MAX_ATTACHMENTS_PER_OWNER + 1 }, () => ({
      size: 100,
      type: "image/jpeg",
      name: "tiny.jpg",
    }));
    const r = validateAttachmentSet(files);
    expect(r.ok).toBe(false);
  });

  it("rejects aggregate overflow", () => {
    // use PDFs (doc cap > aggregate / 2) so the per-file check doesn't trip first
    const r = validateAttachmentSet([
      {
        size: MAX_AGGREGATE_BYTES / 2 + 100,
        type: "application/pdf",
        name: "a.pdf",
      },
      {
        size: MAX_AGGREGATE_BYTES / 2 + 100,
        type: "application/pdf",
        name: "b.pdf",
      },
    ]);
    expect(r.ok).toBe(false);
  });

  it("accepts a normal batch", () => {
    const r = validateAttachmentSet([
      { size: 500_000, type: "image/jpeg", name: "a.jpg" },
      { size: 1_500_000, type: "application/pdf", name: "b.pdf" },
    ]);
    expect(r.ok).toBe(true);
  });

  it("accepts an empty list", () => {
    expect(validateAttachmentSet([]).ok).toBe(true);
  });
});

describe("safeFilename", () => {
  it("strips path separators", () => {
    expect(safeFilename("../../evil.jpg")).toBe("evil.jpg");
    expect(safeFilename("folder/sub\\file.pdf")).toBe("file.pdf");
  });

  it("preserves extensions", () => {
    expect(safeFilename("report.pdf")).toBe("report.pdf");
  });

  it("replaces disallowed chars with underscores", () => {
    expect(safeFilename("my file (v2).jpg")).toBe("my_file__v2_.jpg");
  });

  it("falls back when result is empty", () => {
    expect(safeFilename("!!!")).toBe("___");
    expect(safeFilename("")).toBe("file");
  });

  it("caps length", () => {
    const long = "a".repeat(300) + ".jpg";
    const out = safeFilename(long);
    expect(out.length).toBeLessThanOrEqual(120);
  });
});

describe("buildStoragePath", () => {
  it("uses the right prefix per kind", () => {
    expect(buildStoragePath("post", "owner1", "hi.jpg")).toMatch(
      /^posts\/owner1\/[0-9a-f-]+\/hi\.jpg$/,
    );
    expect(buildStoragePath("comment", "owner2", "hi.pdf")).toMatch(
      /^comments\/owner2\/[0-9a-f-]+\/hi\.pdf$/,
    );
    expect(buildStoragePath("email", "owner3", "hi.png")).toMatch(
      /^emails\/owner3\/[0-9a-f-]+\/hi\.png$/,
    );
  });

  it("sanitizes filenames", () => {
    const p = buildStoragePath("post", "o", "../../etc/passwd");
    expect(p).not.toContain("..");
    expect(p).toMatch(/\/passwd$/);
  });
});
