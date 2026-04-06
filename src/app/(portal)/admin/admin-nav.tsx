"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/roles", label: "Roles" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border flex gap-1 border-b">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 pb-2 text-sm transition-colors",
              active
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
