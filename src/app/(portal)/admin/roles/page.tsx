import Link from "next/link";
import { listRolesWithCapabilities } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateRoleForm } from "./create-role-form";
import { RoleActions } from "./role-actions";

export default async function RolesPage() {
  const roles = await listRolesWithCapabilities();
  roles.sort((a, b) => {
    if (a.name === "Member") return -1;
    if (b.name === "Member") return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Roles</h1>
        <span className="text-muted-foreground text-sm">
          {roles.length} roles
        </span>
      </div>

      <CreateRoleForm />

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/roles/${r.id}`}
                      className="hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.is_default && (
                      <Badge variant="secondary" className="ml-2">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/roles/${r.id}`}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {r.capabilities.length} capabilities
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.member_count}
                  </TableCell>
                  <TableCell>
                    <RoleActions role={r} />
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
