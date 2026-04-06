import Link from "next/link";
import { listGroups } from "@/lib/groups";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateGroupForm } from "./create-group-form";
import { GroupActions } from "./group-actions";

export default async function GroupsPage() {
  const groups = await listGroups();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Groups</h1>
        <span className="text-sm text-muted-foreground">
          {groups.length} groups
        </span>
      </div>

      <CreateGroupForm />

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No groups yet.
                  </TableCell>
                </TableRow>
              )}
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/groups/${g.id}`}
                      className="hover:underline"
                    >
                      {g.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {g.member_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {g.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <GroupActions group={g} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
