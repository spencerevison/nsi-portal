"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SupportRequestRow } from "./page";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_SORT_ORDER,
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  type SupportStatus,
} from "./_config";
import { CategoryBadge, StatusBadge } from "./_badges";

type SortKey = "status" | "category" | "date";
type SortDir = "asc" | "desc";

export function SupportTable({ requests }: { requests: SupportRequestRow[] }) {
  const router = useRouter();

  // filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // sorting
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    let result = requests;
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((r) => r.category === categoryFilter);
    }

    // sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "status") {
        cmp =
          (STATUS_SORT_ORDER[a.status as SupportStatus] ?? 0) -
          (STATUS_SORT_ORDER[b.status as SupportStatus] ?? 0);
      } else if (sortKey === "category") {
        cmp = a.category.localeCompare(b.category);
      } else {
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [requests, statusFilter, categoryFilter, sortKey, sortDir]);

  function sortIcon(col: SortKey) {
    if (sortKey !== col)
      return <ArrowUpDown className="ml-1 inline size-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline size-3" />
    ) : (
      <ChevronDown className="ml-1 inline size-3" />
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Status:</span>
          <div className="flex gap-1">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              All
            </FilterChip>
            {SUPPORT_STATUSES.map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABELS[s]}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Category:</span>
          <div className="flex gap-1">
            <FilterChip
              active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
            >
              All
            </FilterChip>
            {SUPPORT_CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              >
                {CATEGORY_LABELS[c]}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead
                  className="w-20 cursor-pointer select-none"
                  onClick={() => toggleSort("status")}
                >
                  Status
                  {sortIcon("status")}
                </TableHead>
                <TableHead
                  className="w-28 cursor-pointer select-none"
                  onClick={() => toggleSort("category")}
                >
                  Category
                  {sortIcon("category")}
                </TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">From</TableHead>
                <TableHead
                  className="w-24 cursor-pointer select-none"
                  onClick={() => toggleSort("date")}
                >
                  Date
                  {sortIcon("date")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No requests match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((req) => (
                  <TableRow
                    key={req.id}
                    className={cn(
                      "cursor-pointer",
                      req.status === "complete" && "opacity-60",
                    )}
                    onClick={() =>
                      router.push(`/admin/support/${req.request_number}`)
                    }
                  >
                    <TableCell className="text-muted-foreground text-xs">
                      #{req.request_number}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={req.category} />
                    </TableCell>
                    <TableCell
                      className={req.status === "new" ? "font-medium" : ""}
                    >
                      {req.subject}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {req.user
                        ? `${req.user.first_name} ${req.user.last_name}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {timeAgo(req.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-md border px-2 py-0.5 text-xs transition-colors",
        active
          ? "border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-800 dark:bg-accent-950/40 dark:text-accent-300 font-medium"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
