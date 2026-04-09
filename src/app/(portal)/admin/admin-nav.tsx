"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tabs = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/groups", label: "Email Groups" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/support", label: "Support" },
];

const selectItems = tabs.map((t) => ({ value: t.href, label: t.label }));

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const current =
    tabs.find((t) => pathname.startsWith(t.href))?.href ?? tabs[0].href;

  return (
    <>
      {/* Mobile: select dropdown */}
      <div className="sm:hidden">
        <Select
          items={selectItems}
          value={current}
          onValueChange={(v) => {
            if (v) router.push(v);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {selectItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: tab bar */}
      <nav className="border-border hidden gap-1 border-b sm:flex">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "-mb-px border-b-2 px-3 pb-2 text-sm font-medium transition-colors",
                active
                  ? "border-accent-600 text-accent-600 dark:text-cream-100 dark:border-cream-100"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
