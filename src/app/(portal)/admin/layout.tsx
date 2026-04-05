import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentCapabilities } from "@/lib/current-user";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caps = await getCurrentCapabilities();

  // not an admin? pretend the section doesn't exist
  if (!caps.has("admin.access")) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b border-neutral-200 pb-3 text-sm">
        <Link
          href="/admin/members"
          className="text-neutral-600 hover:text-neutral-900"
        >
          Members
        </Link>
        <Link
          href="/admin/groups"
          className="text-neutral-600 hover:text-neutral-900"
        >
          Groups
        </Link>
        <Link
          href="/admin/roles"
          className="text-neutral-600 hover:text-neutral-900"
        >
          Roles
        </Link>
      </nav>
      {children}
    </div>
  );
}
