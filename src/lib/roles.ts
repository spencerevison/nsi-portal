import { supabaseAdmin } from "@/lib/supabase-admin";

// all capabilities in the system
export const ALL_CAPABILITIES = [
  { key: "documents.read", label: "Browse and download documents" },
  {
    key: "documents.write",
    label: "Upload, rename, delete documents and folders",
  },
  { key: "directory.read", label: "View member directory" },
  { key: "email.send", label: "Compose and send group emails" },
  { key: "community.read", label: "View message board" },
  { key: "community.write", label: "Create posts and comments" },
  { key: "community.moderate", label: "Pin/unpin, delete others' posts" },
  { key: "admin.access", label: "Access the admin section" },
  {
    key: "groups.manage",
    label: "Create/edit/delete groups, manage membership",
  },
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

export async function listRolesWithCapabilities(): Promise<
  RoleWithCapabilities[]
> {
  const { data: roles, error } = await supabaseAdmin
    .from("role")
    .select("id, name, description, is_default")
    .order("name");

  if (error) {
    console.error("listRolesWithCapabilities failed", error);
    return [];
  }

  // get capabilities + member counts (excluding test users)
  const [{ data: caps }, { data: memberCounts }] = await Promise.all([
    supabaseAdmin.from("role_capability").select("role_id, capability"),
    supabaseAdmin
      .from("app_user")
      .select("role_id")
      .not("email", "ilike", "%+clerk_test%"),
  ]);

  const capMap = new Map<string, string[]>();
  for (const c of caps ?? []) {
    if (!capMap.has(c.role_id)) capMap.set(c.role_id, []);
    capMap.get(c.role_id)!.push(c.capability);
  }

  // tally members per role
  const countMap = new Map<string, number>();
  for (const m of memberCounts ?? []) {
    if (m.role_id) countMap.set(m.role_id, (countMap.get(m.role_id) ?? 0) + 1);
  }

  return (roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    is_default: r.is_default,
    capabilities: capMap.get(r.id) ?? [],
    member_count: countMap.get(r.id) ?? 0,
  }));
}

export async function getRoleWithCapabilities(
  roleId: string,
): Promise<RoleWithCapabilities | null> {
  const { data: role, error } = await supabaseAdmin
    .from("role")
    .select("id, name, description, is_default")
    .eq("id", roleId)
    .maybeSingle();

  if (error || !role) return null;

  const [{ data: caps }, { data: members }] = await Promise.all([
    supabaseAdmin
      .from("role_capability")
      .select("capability")
      .eq("role_id", roleId),
    supabaseAdmin
      .from("app_user")
      .select("id")
      .eq("role_id", roleId)
      .not("email", "ilike", "%+clerk_test%"),
  ]);

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_default: role.is_default,
    capabilities: (caps ?? []).map((c) => c.capability),
    member_count: members?.length ?? 0,
  };
}
