import { listMembers, listRoles, type MemberStatus } from "@/lib/members";
import { AddMemberForm } from "./add-member-form";
import { MemberActions } from "./member-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusVariant: Record<
  MemberStatus,
  { variant: "secondary" | "outline" | "destructive"; className?: string }
> = {
  Draft: { variant: "outline" },
  Invited: {
    variant: "secondary",
    className: "bg-amber-100 text-amber-900 border-amber-200",
  },
  Active: {
    variant: "secondary",
    className: "bg-green-100 text-green-900 border-green-200",
  },
  Revoked: { variant: "destructive" },
  Inactive: { variant: "secondary" },
};

export default async function MembersPage() {
  const [members, roles] = await Promise.all([listMembers(), listRoles()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        <span className="text-muted-foreground text-sm">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </div>

      <AddMemberForm roles={roles} />

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No members yet.
                  </TableCell>
                </TableRow>
              )}
              {members.map((m) => {
                const s = statusVariant[m.status];
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.first_name} {m.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.lot_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
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

      {/* TODO: bulk import, row actions */}
    </div>
  );
}
