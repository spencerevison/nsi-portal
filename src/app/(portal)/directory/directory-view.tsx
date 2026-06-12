"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Network, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { DirectoryFamilySummary, FamilyListItem } from "@/lib/family-data";
import { MemberAvatar } from "./member-avatar";
import { MemberSheet } from "./member-sheet";

type SortKey = "name" | "lot" | "phone" | "email";
type SortDir = "asc" | "desc";

export function DirectoryView({
  members,
  customFields,
  families,
  familyList,
  viewerId,
}: {
  members: DirectoryMember[];
  customFields: CustomField[];
  families: Record<string, DirectoryFamilySummary>;
  familyList: FamilyListItem[];
  viewerId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // /directory?member=<id> opens the sheet (used by tree card clicks)
  useEffect(() => {
    const id = searchParams.get("member");
    // syncing from the URL, so the setState-in-effect rule doesn't really apply
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id && members.some((m) => m.id === id)) setSelectedId(id);
  }, [searchParams, members]);

  const selected = members.find((m) => m.id === selectedId) ?? null;

  // family entries can point at users hidden from the directory (drafts etc.)
  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  function rowClick(e: React.MouseEvent, m: DirectoryMember) {
    if ((e.target as HTMLElement).closest("a,button")) return;
    setSelectedId(m.id);
  }

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
      m.email.toLowerCase().includes(q) ||
      (m.address?.toLowerCase().includes(q) ?? false)
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
      {/* Search + family jump */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {familyList.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({ variant: "outline" })}
            >
              <Network className="size-4" />
              Families
              <ChevronDown className="text-muted-foreground size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {familyList.map((f) => (
                <DropdownMenuItem
                  key={f.nodeId}
                  onClick={() => router.push(`/family/${f.nodeId}`)}
                >
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {f.count} {f.count === 1 ? "person" : "people"}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
                  <TableHead>Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      {search
                        ? "No members match your search."
                        : "No members in the directory yet."}
                    </TableCell>
                  </TableRow>
                )}
                {sorted.map((m) => (
                  <TableRow
                    key={m.id}
                    onClick={(e) => rowClick(e, m)}
                    className="hover:bg-muted/50 cursor-pointer"
                  >
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
                    <TableCell className="text-muted-foreground">
                      <span
                        className="block max-w-[22rem] truncate"
                        title={m.address ?? undefined}
                      >
                        {m.address ?? "—"}
                      </span>
                    </TableCell>
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
          <Card key={m.id} onClick={(e) => rowClick(e, m)}>
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
                {m.address && (
                  <div className="text-xs whitespace-pre-line">{m.address}</div>
                )}
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

      <MemberSheet
        member={selected}
        family={selected ? families[selected.id] : undefined}
        customFields={customFields}
        memberIds={memberIds}
        viewerId={viewerId}
        onJump={(userId) => setSelectedId(userId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </>
  );
}
