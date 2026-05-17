import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { escapeHtml, timeAgo, slugify, safeRedirectPath } from "@/lib/utils";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert('xss')&lt;/script&gt;",
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Today for same day", () => {
    expect(timeAgo("2026-04-08T10:00:00Z")).toBe("Today");
  });

  it("returns Yesterday for 1 day ago", () => {
    expect(timeAgo("2026-04-07T10:00:00Z")).toBe("Yesterday");
  });

  it("returns N days ago for 2-6 days", () => {
    expect(timeAgo("2026-04-05T10:00:00Z")).toBe("3 days ago");
  });

  it("returns N weeks ago for 7-29 days", () => {
    expect(timeAgo("2026-03-25T10:00:00Z")).toBe("2 weeks ago");
  });

  it("returns formatted date for 30+ days", () => {
    const result = timeAgo("2026-01-15T10:00:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Strata Documents")).toBe("strata-documents");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! World?")).toBe("hello-world");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--test--")).toBe("test");
  });
});

describe("safeRedirectPath", () => {
  it("allows relative paths", () => {
    expect(safeRedirectPath("/documents")).toBe("/documents");
    expect(safeRedirectPath("/")).toBe("/");
  });

  it("rejects absolute URLs", () => {
    expect(safeRedirectPath("https://evil.example/foo")).toBe("/");
    expect(safeRedirectPath("http://evil.example")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirectPath("//evil.example/foo")).toBe("/");
  });

  it("rejects backslash variants", () => {
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
  });

  it("returns fallback for null/empty", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  it("rejects javascript: scheme", () => {
    // doesn't start with "/" so caught by the path check
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  });

  it("honors custom fallback", () => {
    expect(safeRedirectPath(null, "/home")).toBe("/home");
  });
});
