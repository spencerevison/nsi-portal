"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/documents", label: "Documents" },
  { href: "/directory", label: "Directory" },
  { href: "/community", label: "Message Board" },
];

export function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-full items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors",
        active
          ? "border-accent-600 text-accent-600 dark:border-cream-100 dark:text-cream-100"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
    </Link>
  );
}

export function PortalNav({
  extraLinks,
  showAdmin,
}: {
  extraLinks?: { href: string; label: string }[];
  showAdmin?: boolean;
}) {
  const pathname = usePathname();

  const allLinks = [...links, ...(extraLinks ?? [])];

  return (
    <ul className="contents">
      {allLinks.map((link) => (
        <li key={link.href} className="h-full">
          <NavLink href={link.href} label={link.label} pathname={pathname} />
        </li>
      ))}
      {showAdmin && (
        <>
          <li className="flex items-center px-1" aria-hidden>
            <span className="bg-border h-4 w-px" />
          </li>
          <li className="h-full">
            <Link
              href="/admin"
              className={cn(
                "inline-flex h-full items-center gap-1.5 border-b-2 px-1 pt-1 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "border-accent-600 text-accent-600 dark:border-cream-100 dark:text-cream-100"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              <Shield className="size-3.5" />
              Admin
            </Link>
          </li>
        </>
      )}
    </ul>
  );
}
