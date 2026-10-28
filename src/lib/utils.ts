import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Returns the given URL if it's a same-origin relative path, otherwise the
 * fallback. Prevents `?redirect_url=https://evil.example` open-redirect via
 * the sign-in flow.
 */
export function safeRedirectPath(
  url: string | null | undefined,
  fallback = "/",
): string {
  if (!url) return fallback;
  // browsers strip tab/CR/LF inside URLs, so "/\t/evil.example" would turn
  // into "//evil.example" at navigation time
  let path = url.replace(/[\t\r\n]/g, "");
  // Clerk's auth.protect() sends an absolute redirect_url for our own host
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (path.startsWith(origin + "/")) path = path.slice(origin.length);
  }
  // must start with "/" but not "//" (protocol-relative) or "/\" (backslash trick)
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
