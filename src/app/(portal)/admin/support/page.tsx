import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability } from "@/lib/current-user";
import { SupportTable } from "./support-table";

export type SupportRequestRow = {
  id: string;
  request_number: number;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

export default async function AdminSupportPage() {
  await requireCapability("support.manage");

  const { data, error } = await supabaseAdmin
    .from("support_request")
    .select(
      `id, request_number, category, subject, message, status, created_at,
       user:user_id ( first_name, last_name, email )`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("failed to load support requests", error);
  }

  const requests = (data ?? []) as unknown as SupportRequestRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Support Requests</h1>
        <span className="text-muted-foreground text-sm">
          {requests.length} {requests.length === 1 ? "request" : "requests"}
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No support requests yet.
        </p>
      ) : (
        <SupportTable requests={requests} />
      )}
    </div>
  );
}
