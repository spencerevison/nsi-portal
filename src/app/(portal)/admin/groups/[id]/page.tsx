import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getGroup, listGroupMembers, listNonGroupMembers } from "@/lib/groups";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddGroupMember } from "./add-member";
import { RemoveMemberButton } from "./remove-member";

type Params = Promise<{ id: string }>;

export default async function GroupDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) notFound();

  const [members, available] = await Promise.all([
    listGroupMembers(id),
    listNonGroupMembers(id),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/groups"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Groups
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{group.name}</h1>
        {group.description && (
          <p className="text-sm text-muted-foreground">{group.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "member" : "members"}
        </p>
      </div>

      <AddGroupMember groupId={id} availableMembers={available} />

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No members in this group yet.
                  </TableCell>
                </TableRow>
              )}
              {members.map((m) => (
                <TableRow key={m.user_id}>
                  <TableCell className="font-medium">
                    {m.first_name} {m.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.email}
                  </TableCell>
                  <TableCell>
                    <RemoveMemberButton
                      groupId={id}
                      userId={m.user_id}
                      memberName={`${m.first_name} ${m.last_name}`}
                    />
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
