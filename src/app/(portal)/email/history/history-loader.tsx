import { Paperclip } from "lucide-react";
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
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {log.subject}
                    {log.attachment_count > 0 && (
                      <span
                        className="text-muted-foreground inline-flex items-center gap-0.5 text-xs"
                        title={`${log.attachment_count} attachment${
                          log.attachment_count === 1 ? "" : "s"
                        }`}
                      >
                        <Paperclip className="size-3" />
                        {log.attachment_count}
                      </span>
                    )}
                  </span>
                </TableCell>
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
