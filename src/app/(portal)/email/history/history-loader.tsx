import { listEmailLogs } from "@/lib/groups";
import { Card, CardContent } from "@/components/ui/card";
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

export async function HistoryLoader() {
  const logs = await listEmailLogs();

  return (
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
  );
}
