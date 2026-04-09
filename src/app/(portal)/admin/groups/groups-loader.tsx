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
import { GroupTableRow } from "./group-table-row";

export async function GroupsLoader() {
  const groups = await listGroups();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Email Groups</h1>
        <span className="text-muted-foreground text-sm">
          {groups.length} email groups
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
                <TableHead className="hidden sm:table-cell">
                  Description
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No email groups yet.
                  </TableCell>
                </TableRow>
              )}
              {groups.map((g) => (
                <GroupTableRow key={g.id} group={g} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
