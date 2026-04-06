import { supabaseAdmin } from "@/lib/supabase-admin";

// all capabilities in the system
export const ALL_CAPABILITIES = [
  { key: "documents.read", label: "Browse and download documents" },
  { key: "documents.write", label: "Upload, rename, delete documents and folders" },
  { key: "directory.read", label: "View member directory" },
  { key: "directory.manage", label: "Edit other members' profiles" },
  { key: "email.send", label: "Compose and send group emails" },
  { key: "community.read", label: "View community board" },
  { key: "community.write", label: "Create posts and comments" },
  { key: "community.moderate", label: "Pin/unpin, delete others' posts" },
  { key: "admin.access", label: "Access the admin section" },
  { key: "groups.manage", label: "Create/edit/delete groups, manage membership" },
  { key: "roles.manage", label: "Create/edit roles, assign capabilities" },
] as const;

export type RoleWithCapabilities = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  capabilities: string[];
  member_count: number;
};

export async function listRolesWithCapabilities(): Promise<RoleWithCapabilities[]> {
  const { data: roles, error } = await supabaseAdmin
    .from("role")
    .select("id, name, description, is_default, app_user(count)")
    .order("name");

  if (error) {
    console.error("listRolesWithCapabilities failed", error);
    return [];
  }

  // get all capabilities
  const { data: caps } = await supabaseAdmin
    .from("role_capability")
    .select("role_id, capability");

  const capMap = new Map<string, string[]>();
  for (const c of caps ?? []) {
    if (!capMap.has(c.role_id)) capMap.set(c.role_id, []);
    capMap.get(c.role_id)!.push(c.capability);
  }

  return (roles ?? []).map((r) => {
    const countArr = r.app_user as unknown as { count: number }[];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      is_default: r.is_default,
      capabilities: capMap.get(r.id) ?? [],
      member_count: countArr?.[0]?.count ?? 0,
    };
  });
}

export async function getRoleWithCapabilities(
  roleId: string,
): Promise<RoleWithCapabilities | null> {
  const { data: role, error } = await supabaseAdmin
    .from("role")
    .select("id, name, description, is_default, app_user(count)")
    .eq("id", roleId)
    .maybeSingle();

  if (error || !role) return null;

  const { data: caps } = await supabaseAdmin
    .from("role_capability")
    .select("capability")
    .eq("role_id", roleId);

  const countArr = role.app_user as unknown as { count: number }[];
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_default: role.is_default,
    capabilities: (caps ?? []).map((c) => c.capability),
    member_count: countArr?.[0]?.count ?? 0,
  };
}
