"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { MemberRow, RoleOption } from "@/lib/members";
import { memberStatusBadge } from "@/lib/member-status";
import { MemberActions } from "./member-actions";

type SortKey = "name" | "email" | "lot" | "role" | "status";
type SortDir = "asc" | "desc";

export function MembersTable({
  members,
  roles,
}: {
  members: MemberRow[];
  roles: RoleOption[];
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
      m.email.toLowerCase().includes(q) ||
      (m.lot_number?.includes(q) ?? false) ||
      (m.role_name?.toLowerCase().includes(q) ?? false)
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
      case "email":
        return dir * a.email.localeCompare(b.email);
      case "lot":
        return dir * (a.lot_number ?? "").localeCompare(b.lot_number ?? "");
      case "role":
        return dir * (a.role_name ?? "").localeCompare(b.role_name ?? "");
      case "status":
        return dir * a.status.localeCompare(b.status);
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
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-x-auto p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="name" {...sortProps}>
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="email"
                  className="hidden md:table-cell"
                  {...sortProps}
                >
                  Email
                </SortableTableHead>
                <SortableTableHead sortKey="lot" {...sortProps}>
                  Lot
                </SortableTableHead>
                <SortableTableHead
                  sortKey="role"
                  className="hidden md:table-cell"
                  {...sortProps}
                >
                  Role
                </SortableTableHead>
                <SortableTableHead sortKey="status" {...sortProps}>
                  Status
                </SortableTableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    {search
                      ? "No members match your search."
                      : "No members yet."}
                  </TableCell>
                </TableRow>
              )}
              {sorted.map((m) => {
                const s = memberStatusBadge[m.status];
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.first_name || m.last_name
                        ? `${m.first_name} ${m.last_name}`.trim()
                        : m.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {m.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.lot_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {m.role_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant} className={s.className}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <MemberActions member={m} roles={roles} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
