import { supabaseAdmin } from "@/lib/supabase-admin";

export type RoleOption = { id: string; name: string };

export async function listRoles(): Promise<RoleOption[]> {
  const { data, error } = await supabaseAdmin
    .from("role")
    .select("id, name")
    .order("name");
  if (error) {
    console.error("listRoles failed", error);
    return [];
  }
  return data ?? [];
}

export type MemberStatus =
  | "Draft"
  | "Invited"
  | "Active"
  | "Revoked"
  | "Inactive";

export type MemberRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  lot_number: string | null;
  role_id: string | null;
  role_name: string | null;
  status: MemberStatus;
  invited_at: string | null;
  accepted_at: string | null;
  active: boolean;
};

export function deriveStatus(row: {
  active: boolean;
  invited_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
}): MemberStatus {
  if (!row.active) return "Inactive";
  if (row.revoked_at) return "Revoked";
  if (row.accepted_at) return "Active";
  if (row.invited_at) return "Invited";
  return "Draft";
}

export async function listMembers(): Promise<MemberRow[]> {
  const { data, error } = await supabaseAdmin
    .from("app_user")
    .select(
      `id, email, first_name, last_name, lot_number, role_id, active,
       invited_at, accepted_at, revoked_at,
       role:role_id ( name )`,
    )
    .order("last_name", { ascending: true });

  if (error) {
    console.error("listMembers failed", error);
    return [];
  }

  return (data ?? []).map((r) => {
    const role = r.role as unknown as { name: string } | null;
    return {
      id: r.id,
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      lot_number: r.lot_number,
      role_id: r.role_id,
      role_name: role?.name ?? null,
      status: deriveStatus({
        active: r.active,
        invited_at: r.invited_at,
        accepted_at: r.accepted_at,
        revoked_at: r.revoked_at,
      }),
      invited_at: r.invited_at,
      accepted_at: r.accepted_at,
      active: r.active,
    };
  });
}
