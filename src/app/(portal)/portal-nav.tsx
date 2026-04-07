"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/documents", label: "Documents" },
  { href: "/directory", label: "Directory" },
  { href: "/community", label: "Community" },
];

export function PortalNav({
  extraLinks,
}: {
  extraLinks?: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  const allLinks = [...links, ...(extraLinks ?? [])];

  return (
    <>
      {allLinks.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm transition-colors",
              active
                ? "font-medium text-accent-600"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
