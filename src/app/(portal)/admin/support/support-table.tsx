"use client";

import { useState, useTransition, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  Eye,
  RotateCcw,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { SupportRequestRow } from "./page";
import { updateRequestStatus } from "./actions";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  bug: "Bug / Issue",
  feature: "Feature Request",
  question: "Question",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  bug: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  feature:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  question:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  other: "",
};

const statusConfig: Record<string, { label: string; badge: React.ReactNode }> =
  {
    new: {
      label: "New",
      badge: (
        <Badge
          variant="secondary"
          className="border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          New
        </Badge>
      ),
    },
    read: {
      label: "Read",
      badge: <Badge variant="outline">Read</Badge>,
    },
    complete: {
      label: "Complete",
      badge: (
        <Badge
          variant="secondary"
          className="border-green-200 bg-green-100 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
        >
          Complete
        </Badge>
      ),
    },
  };

// next status when cycling forward
function nextStatus(current: string): string {
  if (current === "new") return "read";
  if (current === "read") return "complete";
  return "new";
}

type SortKey = "status" | "category" | "date";
type SortDir = "asc" | "desc";

const statusOrder: Record<string, number> = { new: 0, read: 1, complete: 2 };

const allStatuses = ["new", "read", "complete"];
const allCategories = ["bug", "feature", "question", "other"];

export function SupportTable({ requests }: { requests: SupportRequestRow[] }) {
  const [selected, setSelected] = useState<SupportRequestRow | null>(null);
  const [pending, startTransition] = useTransition();

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
        cmp = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
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

  function handleSetStatus(req: SupportRequestRow, status: string) {
    startTransition(async () => {
      await updateRequestStatus({ id: req.id, status });
    });
  }

  function handleRowClick(req: SupportRequestRow) {
    setSelected(req);
    if (req.status === "new") {
      startTransition(async () => {
        await updateRequestStatus({ id: req.id, status: "read" });
      });
    }
  }

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
            {allStatuses.map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                {statusConfig[s]?.label ?? s}
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
            {allCategories.map((c) => (
              <FilterChip
                key={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              >
                {categoryLabels[c] ?? c}
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
                <TableHead className="w-12" />
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
                    onClick={() => handleRowClick(req)}
                  >
                    <TableCell>
                      {statusConfig[req.status]?.badge ?? (
                        <Badge variant="outline">{req.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={categoryColors[req.category] ?? ""}
                      >
                        {categoryLabels[req.category] ?? req.category}
                      </Badge>
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
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetStatus(req, nextStatus(req.status));
                        }}
                        disabled={pending}
                        className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                        title={`Mark as ${statusConfig[nextStatus(req.status)]?.label?.toLowerCase()}`}
                      >
                        {req.status === "complete" ? (
                          <RotateCcw className="size-4" />
                        ) : req.status === "read" ? (
                          <Check className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {statusConfig[selected.status]?.badge}
                  <Badge
                    variant="secondary"
                    className={categoryColors[selected.category] ?? ""}
                  >
                    {categoryLabels[selected.category] ?? selected.category}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(selected.created_at).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {selected.user && (
                  <div className="text-sm">
                    <span className="font-medium">
                      {selected.user.first_name} {selected.user.last_name}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {selected.user.email}
                    </span>
                  </div>
                )}

                <div className="border-border bg-muted/30 rounded-lg border p-3 text-sm whitespace-pre-wrap">
                  {selected.message}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {selected.status !== "complete" ? (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        handleSetStatus(selected, "complete");
                        setSelected(null);
                      }}
                    >
                      <Check data-icon="inline-start" className="size-4" />
                      Mark complete
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        handleSetStatus(selected, "new");
                        setSelected(null);
                      }}
                    >
                      <RotateCcw data-icon="inline-start" className="size-4" />
                      Reopen
                    </Button>
                  )}
                  {selected.user && (
                    <a
                      href={`mailto:${selected.user.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                      className="text-accent-600 hover:text-accent-800 text-sm underline underline-offset-2"
                    >
                      Reply via email
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
