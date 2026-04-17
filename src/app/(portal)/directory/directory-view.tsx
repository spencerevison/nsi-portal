"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
import type { DirectoryMember, CustomField } from "@/lib/directory";
import { MemberAvatar } from "./member-avatar";

function formatFieldValue(value: string | null, fieldName: string): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return value;
    if (fieldName === "Children") {
      return parsed.map((c: { name: string }) => c.name).join(", ");
    }
    if (fieldName === "Dogs") {
      return parsed.map((d: { name: string }) => d.name).join(", ");
    }
    return parsed.join(", ");
  } catch {
    return value;
  }
}

type SortKey = "name" | "lot" | "phone" | "email";
type SortDir = "asc" | "desc";

export function DirectoryView({
  members,
  customFields,
}: {
  members: DirectoryMember[];
  customFields: CustomField[];
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      (m.lot_number?.includes(q) ?? false) ||
      m.email.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "name":
        return (
          dir *
          `${a.last_name} ${a.first_name}`.localeCompare(
            `${b.last_name} ${b.first_name}`,
          )
        );
      case "lot":
        return (
          dir *
          (a.lot_number ?? "").localeCompare(b.lot_number ?? "", undefined, {
            numeric: true,
          })
        );
      case "phone":
        return dir * (a.phone ?? "").localeCompare(b.phone ?? "");
      case "email":
        return dir * a.email.localeCompare(b.email);
      default:
        return 0;
    }
  });

  const sortProps = {
    currentSort: sortKey,
    direction: sortDir,
    onSort: toggleSort,
  };

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card className="p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="name" {...sortProps}>
                    Name
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="lot"
                    className="w-16"
                    {...sortProps}
                  >
                    Lot
                  </SortableTableHead>
                  <SortableTableHead sortKey="phone" {...sortProps}>
                    Phone
                  </SortableTableHead>
                  <SortableTableHead sortKey="email" {...sortProps}>
                    Email
                  </SortableTableHead>
                  {customFields.map((f) => (
                    <TableHead key={f.id}>{f.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4 + customFields.length}
                      className="text-muted-foreground py-8 text-center"
                    >
                      {search
                        ? "No members match your search."
                        : "No members in the directory yet."}
                    </TableCell>
                  </TableRow>
                )}
                {sorted.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MemberAvatar member={m} size="sm" />
                        {m.first_name} {m.last_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.lot_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {m.phone ? (
                        <a
                          href={`tel:${m.phone}`}
                          className="text-foreground/80 decoration-muted-foreground/30 hover:decoration-foreground/50 underline underline-offset-2"
                        >
                          {m.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <a
                        href={`mailto:${m.email}`}
                        className="text-foreground/80 decoration-muted-foreground/30 hover:decoration-foreground/50 underline underline-offset-2"
                      >
                        {m.email}
                      </a>
                    </TableCell>
                    {customFields.map((f) => (
                      <TableCell key={f.id} className="text-muted-foreground">
                        {formatFieldValue(
                          m.custom_fields[f.id]?.value ?? null,
                          f.name,
                        ) || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {sorted.map((m) => (
          <Card key={m.id}>
            <CardContent className="px-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemberAvatar member={m} size="sm" />
                  <span className="text-sm font-semibold">
                    {m.first_name} {m.last_name}
                  </span>
                </div>
                {m.lot_number && (
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                    Lot {m.lot_number}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground space-y-2 text-sm">
                {m.phone && (
                  <div>
                    <a
                      href={`tel:${m.phone}`}
                      className="text-foreground/80 decoration-muted-foreground/30 hover:decoration-foreground/50 underline underline-offset-2"
                    >
                      {m.phone}
                    </a>
                  </div>
                )}
                <div className="truncate">
                  <a
                    href={`mailto:${m.email}`}
                    className="text-foreground/80 decoration-muted-foreground/30 hover:decoration-foreground/50 underline underline-offset-2"
                  >
                    {m.email}
                  </a>
                </div>
                {customFields.map((f) => {
                  const val = formatFieldValue(
                    m.custom_fields[f.id]?.value ?? null,
                    f.name,
                  );
                  if (!val) return null;
                  return (
                    <div key={f.id} className="text-xs">
                      {f.name}: {val}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {sorted.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {search ? "No members match your search." : "No members yet."}
          </p>
        )}
      </div>
    </>
  );
}
