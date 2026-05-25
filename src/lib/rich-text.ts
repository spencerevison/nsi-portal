import sanitizeHtml from "sanitize-html";

// allowed tags + attrs for the message board WYSIWYG. Keeps the surface
// small — we only want bold/italic, lists, links, headings, blockquote.
// Anything else gets stripped server-side before insert.
const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "blockquote",
    "code",
    "pre",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // Force safe link attributes — sanitize-html will add these if missing.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    }),
  },
  // strip leading/trailing whitespace inside block tags
  textFilter: (text) => text,
};

export function sanitizeRichText(input: string): string {
  if (!input) return "";
  return sanitizeHtml(input, SANITIZE_OPTS).trim();
}

// minimal entity decoder — sanitize-html re-encodes & < > " ' in its text
// output, so previews ended up showing "AGM &amp;" literally. Covers the
// named entities we care about plus numeric refs.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, ref: string) => {
    if (ref[0] === "#") {
      const code =
        ref[1] === "x" || ref[1] === "X"
          ? parseInt(ref.slice(2), 16)
          : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[ref.toLowerCase()] ?? m;
  });
}

// strip tags for plaintext fallbacks: list previews, length checks,
// notification email subjects, etc.
export function stripHtml(input: string): string {
  if (!input) return "";
  const stripped = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    // collapse block breaks into single space so previews don't smash
    // paragraphs together
    textFilter: (text) => text,
  });
  return decodeEntities(stripped).replace(/\s+/g, " ").trim();
}

// Old posts (pre-rich-text) were stored as raw text — no markup at all.
// Detect that so the renderer can fall back to whitespace-pre-wrap.
export function looksLikeHtml(input: string): boolean {
  return /<[a-z][\s\S]*>/i.test(input);
}

// effectively-empty content from the editor — TipTap emits "<p></p>" for
// a blank doc which would otherwise pass non-empty checks.
export function isEmptyRichText(input: string): boolean {
  return stripHtml(input).length === 0;
}
