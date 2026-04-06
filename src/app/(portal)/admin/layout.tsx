import { notFound } from "next/navigation";
import { getCurrentCapabilities } from "@/lib/current-user";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caps = await getCurrentCapabilities();

  if (!caps.has("admin.access")) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminNav />
      {children}
    </div>
  );
}
