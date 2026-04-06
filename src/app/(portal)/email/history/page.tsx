import Link from "next/link";
import { listEmailLogs } from "@/lib/groups";
import { getCurrentCapabilities } from "@/lib/current-user";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDelivery(status: Record<string, number>, total: number): string {
  const parts: string[] = [];
  if (status.delivered) parts.push(`${status.delivered} delivered`);
  if (status.bounced) parts.push(`${status.bounced} bounced`);
  if (status.complained) parts.push(`${status.complained} complained`);
  if (parts.length === 0) return `${total} sent`;
  return parts.join(", ");
}

export default async function EmailHistoryPage() {
  const caps = await getCurrentCapabilities();
  if (!caps.has("email.send")) notFound();

  const logs = await listEmailLogs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Email History</h1>
        <Link href="/email/compose">
          <Button variant="outline">Compose</Button>
        </Link>
      </div>

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Sent by</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No emails sent yet.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.target_groups.join(", ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDelivery(log.delivery_status, log.recipient_count)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.sender_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.sent_at).toLocaleDateString()}
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
