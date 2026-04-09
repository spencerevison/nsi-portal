"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { TableRow, TableCell } from "@/components/ui/table";
import type { GroupRow } from "@/lib/groups";
import { GroupActions } from "./group-actions";

export function GroupTableRow({ group }: { group: GroupRow }) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/admin/groups/${group.id}`)}
    >
      <TableCell className="font-medium">
        <Link
          href={`/admin/groups/${group.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {group.name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {group.member_count}
      </TableCell>
      <TableCell className="text-muted-foreground hidden sm:table-cell">
        {group.description ?? "\u2014"}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <GroupActions group={group} />
      </TableCell>
    </TableRow>
  );
}
