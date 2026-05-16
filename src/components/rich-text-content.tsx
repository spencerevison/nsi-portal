import { cn } from "@/lib/utils";
import { looksLikeHtml } from "@/lib/rich-text";

// Renders sanitized HTML for a post or comment. The HTML is expected to
// already be sanitized server-side via sanitizeRichText() before storage;
// this component is purely presentational.
//
// Legacy posts/comments saved before the rich-text rollout were plain text —
// detect that and fall back to whitespace-pre-wrap so line breaks survive.
export function RichTextContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html) return null;

  if (!looksLikeHtml(html)) {
    return (
      <div className={cn("text-sm whitespace-pre-wrap", className)}>{html}</div>
    );
  }

  return (
    <div
      className={cn("rich-text-content text-sm", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
