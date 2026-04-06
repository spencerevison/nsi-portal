import { listEmailLogs } from "@/lib/groups";
import { getCurrentCapabilities } from "@/lib/current-user";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function EmailHistoryPage() {
  const caps = await getCurrentCapabilities();
  if (!caps.has("email.send")) notFound();

  const logs = await listEmailLogs();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Email History</h1>

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Sent by</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
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
                  <TableCell className="text-muted-foreground">
                    {log.recipient_count}
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
