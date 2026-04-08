"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
        "inline-flex h-full items-center border-b-2 px-1 pt-1 text-sm transition-colors",
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
    <>
      {allLinks.map((link) => (
        <NavLink key={link.href} {...link} pathname={pathname} />
      ))}
      {showAdmin && (
        <div className="ml-auto">
          <NavLink href="/admin" label="Admin" pathname={pathname} />
        </div>
      )}
    </>
  );
}
