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
} from "@/components/ui/table";
import type { DirectoryMember, CustomField } from "@/lib/directory";

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

export function DirectoryView({
  members,
  customFields,
}: {
  members: DirectoryMember[];
  customFields: CustomField[];
}) {
  const [search, setSearch] = useState("");

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

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, lot number, or email..."
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
                  <TableHead>Name</TableHead>
                  <TableHead className="w-16">Lot</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  {customFields.map((f) => (
                    <TableHead key={f.id}>{f.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4 + customFields.length}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {search
                        ? "No members match your search."
                        : "No members in the directory yet."}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {m.first_name} {m.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.lot_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {m.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.email}
                    </TableCell>
                    {customFields.map((f) => (
                      <TableCell
                        key={f.id}
                        className="text-muted-foreground"
                      >
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
        {filtered.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {m.first_name} {m.last_name}
                </span>
                {m.lot_number && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Lot {m.lot_number}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {m.phone && <div>{m.phone}</div>}
                <div className="truncate">{m.email}</div>
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
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {search ? "No members match your search." : "No members yet."}
          </p>
        )}
      </div>
    </>
  );
}
