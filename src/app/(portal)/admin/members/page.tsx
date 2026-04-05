import { listMembers, listRoles, type MemberStatus } from "@/lib/members";
import { AddMemberForm } from "./add-member-form";

const statusClasses: Record<MemberStatus, string> = {
  Draft: "bg-neutral-100 text-neutral-700",
  Invited: "bg-amber-100 text-amber-800",
  Active: "bg-green-100 text-green-800",
  Revoked: "bg-red-100 text-red-700",
  Inactive: "bg-neutral-200 text-neutral-600",
};

export default async function MembersPage() {
  const [members, roles] = await Promise.all([listMembers(), listRoles()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        <span className="text-sm text-neutral-500">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </div>

      <AddMemberForm roles={roles} />

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Lot</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No members yet.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2">
                  {m.first_name} {m.last_name}
                </td>
                <td className="px-4 py-2 text-neutral-600">{m.email}</td>
                <td className="px-4 py-2 text-neutral-600">
                  {m.lot_number ?? "—"}
                </td>
                <td className="px-4 py-2 text-neutral-600">
                  {m.role_name ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[m.status]}`}
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TODO: bulk import, row actions */}
    </div>
  );
}
