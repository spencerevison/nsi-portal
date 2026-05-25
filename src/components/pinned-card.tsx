import Link from "next/link";
import { Pin, ArrowRight } from "lucide-react";
import { MemberAvatar } from "@/app/(portal)/directory/member-avatar";
import { RichTextContent } from "@/components/rich-text-content";
import { stripHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type PinnedCardProps = {
  variant: "listing" | "preview";
  eyebrow?: string;
  title: string;
  body: string;
  author: { name: string; avatarUrl: string | null };
  postedAt: string;
  replyCount: number;
  href: string;
  actions?: React.ReactNode;
  // Rendered below the meta row on the "listing" variant (e.g. reactions).
  // Sits outside any Link so internal click targets don't navigate.
  footer?: React.ReactNode;
};

// Pull the first paragraph out of a sanitized-HTML body so the preview
// variant can render a clean quote. Falls back to a plain-text excerpt
// for legacy posts that were stored as raw text.
function firstParagraph(body: string): string {
  const match = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (match) {
    const txt = stripHtml(match[1]);
    if (txt) return txt;
  }
  const plain = stripHtml(body);
  return plain.length > 280 ? plain.slice(0, 280).trimEnd() + "…" : plain;
}

function postedShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.split(" ");
  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" "),
  };
}

export function PinnedCard({
  variant,
  eyebrow = "Pinned",
  title,
  body,
  author,
  postedAt,
  replyCount,
  href,
  actions,
  footer,
}: PinnedCardProps) {
  const isListing = variant === "listing";

  // Cream-paper gradient + dot texture — spec values from the handoff.
  const paperBg =
    "radial-gradient(rgba(150, 130, 100, 0.15) 1px, transparent 1px), linear-gradient(180deg, var(--color-cream-100) 0%, var(--color-cream-200) 100%)";

  const authorMember = {
    ...splitName(author.name),
    avatar_url: author.avatarUrl,
  };

  return (
    <article
      className={cn(
        "relative isolate rounded-xl px-6 pt-5.5 pr-6 shadow-(--paper-shadow) transition-shadow duration-200 hover:shadow-(--paper-shadow-hover)",
        isListing ? "pb-5 pl-7" : "pb-4.5",
      )}
      style={{
        background: paperBg,
        backgroundSize: "18px 18px, auto",
      }}
    >
      {/* Paper fiber overlay — very subtle horizontal weave */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "repeating-linear-gradient(92deg, transparent 0, transparent 40px, rgba(150, 130, 90, 0.02) 40px, rgba(150, 130, 90, 0.02) 41px)",
        }}
      />

      {/* Pin icon — top-right, rotated like it was actually tacked */}
      <span
        aria-hidden="true"
        className="absolute top-3.5 right-4.5 z-10 flex h-5.5 w-5.5 items-center justify-center text-amber-500"
        style={{
          transform: "rotate(28deg)",
          filter: "drop-shadow(0 2px 3px rgba(60, 40, 20, 0.22))",
        }}
      >
        <Pin className="size-4.5" fill="currentColor" strokeWidth={0.5} />
      </span>

      {/* Moderator actions slot — sits to the left of the pin, outside the Link */}
      {actions && <div className="absolute top-2 right-12 z-20">{actions}</div>}

      {isListing ? (
        // listing: no card-wide Link — the rich-text body can contain its own
        // <a> tags, and anchor-in-anchor is invalid HTML (hydration breaks).
        // Wrap only the title in the Link.
        <div className="relative">
          <div className="mb-2.5 font-mono text-[11px] font-medium tracking-[0.12em] text-amber-500 uppercase">
            {eyebrow}
          </div>

          <h3
            className="text-accent-900 mb-1.5 text-lg font-semibold"
            style={{ letterSpacing: "-0.005em" }}
          >
            <Link
              href={href}
              className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              {title}
            </Link>
          </h3>

          <div className="text-[14px] leading-[1.55] text-[oklch(0.25_0_0)]">
            <RichTextContent html={body} />
          </div>

          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs">
            <MemberAvatar member={authorMember} size="sm" />
            <span>{author.name}</span>
            <span
              aria-hidden="true"
              className="h-0.75 w-0.75 rounded-full bg-[oklch(0.7_0_0)]"
            />
            <span>Posted {postedShort(postedAt)}</span>
            <span
              aria-hidden="true"
              className="h-0.75 w-0.75 rounded-full bg-[oklch(0.7_0_0)]"
            />
            <span>
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
          </div>

          {footer && <div className="relative mt-3">{footer}</div>}
        </div>
      ) : (
        // preview: blockquote excerpt has no nested anchors, so wrap the whole card.
        <Link
          href={href}
          className="relative block rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <div className="mb-2.5 font-mono text-[11px] font-medium tracking-[0.12em] text-amber-500 uppercase">
            {eyebrow}
          </div>

          <h3
            className="text-accent-900 mb-2.5 text-lg font-semibold"
            style={{ letterSpacing: "-0.005em" }}
          >
            {title}
          </h3>

          <blockquote className="m-0 border-0 p-0 text-[14.5px] leading-[1.55] text-[oklch(0.28_0_0)]">
            {firstParagraph(body)}...
          </blockquote>

          <div
            className="mt-3.5 flex flex-wrap items-center gap-2.5 pt-3 text-[12.5px] text-[oklch(0.4_0_0)]"
            style={{ borderTop: "1px solid rgba(120, 100, 70, 0.15)" }}
          >
            <MemberAvatar member={authorMember} size="sm" />
            <span className="text-accent-800 font-medium">{author.name}</span>
            <span
              aria-hidden="true"
              className="h-0.75 w-0.75 rounded-full bg-[oklch(0.6_0_0)]"
            />
            <span>{postedShort(postedAt)}</span>
            <span
              aria-hidden="true"
              className="h-0.75 w-0.75 rounded-full bg-[oklch(0.6_0_0)]"
            />
            <span>
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
            <span className="text-accent-600 ml-auto inline-flex items-center gap-1 text-xs font-medium">
              Read on message board
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </span>
          </div>
        </Link>
      )}
    </article>
  );
}
