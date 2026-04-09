import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability } from "@/lib/current-user";
import { SupportDetailView } from "./detail-view";

export default async function SupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("support.manage");

  const { id } = await params;
  const num = parseInt(id, 10);
  if (isNaN(num)) notFound();

  const { data, error } = await supabaseAdmin
    .from("support_request")
    .select(
      `id, request_number, category, subject, message, status, created_at,
       user:user_id ( first_name, last_name, email )`,
    )
    .eq("request_number", num)
    .single();

  if (error || !data) notFound();

  // mark as read if new
  if (data.status === "new") {
    await supabaseAdmin
      .from("support_request")
      .update({ status: "read" })
      .eq("id", data.id);
    data.status = "read";
  }

  const request = data as unknown as import("../page").SupportRequestRow;
  return <SupportDetailView request={request} />;
}
