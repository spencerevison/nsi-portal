"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/email/compose", label: "Compose" },
  { href: "/email/history", label: "History" },
];

export function EmailNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border flex gap-4 border-b">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
              active
                ? "border-accent-600 text-accent-600 dark:border-cream-100 dark:text-cream-100"
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
