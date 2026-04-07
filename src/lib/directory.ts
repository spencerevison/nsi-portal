import { supabaseAdmin } from "@/lib/supabase-admin";

export type CustomField = {
  id: string;
  name: string;
  field_type: string;
  options: unknown;
  show_in_directory: boolean;
  sort_order: number;
};

export type DirectoryMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  lot_number: string | null;
  avatar_url: string | null;
  role_name: string | null;
  custom_fields: Record<string, { value: string | null; visible: boolean }>;
};

export type ProfileData = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  lot_number: string | null;
  notify_new_post: boolean;
  notify_replies: boolean;
  custom_fields: {
    field_id: string;
    field_name: string;
    value: string | null;
    visible: boolean;
  }[];
};

export async function listCustomFields(): Promise<CustomField[]> {
  const { data, error } = await supabaseAdmin
    .from("custom_field")
    .select("id, name, field_type, options, show_in_directory, sort_order")
    .order("sort_order");

  if (error) {
    console.error("listCustomFields failed", error);
    return [];
  }
  return data ?? [];
}

export async function listDirectoryMembers(): Promise<DirectoryMember[]> {
  // get active members
  const { data: members, error: membersErr } = await supabaseAdmin
    .from("app_user")
    .select(
      `id, first_name, last_name, email, phone, lot_number, avatar_url,
       role:role_id ( name )`,
    )
    .eq("active", true)
    .not("accepted_at", "is", null)
    .not("email", "ilike", "%+clerk_test%")
    .order("last_name");

  if (membersErr) {
    console.error("listDirectoryMembers failed", membersErr);
    return [];
  }

  if (!members || members.length === 0) return [];

  // get visible custom field values for these members
  const memberIds = members.map((m) => m.id);
  const { data: cfValues } = await supabaseAdmin
    .from("custom_field_value")
    .select("user_id, field_id, value, visible")
    .in("user_id", memberIds);

  // build lookup: userId → fieldId → {value, visible}
  const cfMap = new Map<
    string,
    Map<string, { value: string | null; visible: boolean }>
  >();
  for (const v of cfValues ?? []) {
    if (!cfMap.has(v.user_id)) cfMap.set(v.user_id, new Map());
    cfMap.get(v.user_id)!.set(v.field_id, {
      value: v.value,
      visible: v.visible,
    });
  }

  return members.map((m) => {
    const role = m.role as unknown as { name: string } | null;
    const userCf: Record<string, { value: string | null; visible: boolean }> =
      {};
    const userMap = cfMap.get(m.id);
    if (userMap) {
      for (const [fieldId, val] of userMap) {
        // only include if user opted to show it
        if (val.visible) {
          userCf[fieldId] = val;
        }
      }
    }
    return {
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
      phone: m.phone,
      lot_number: m.lot_number,
      avatar_url: m.avatar_url,
      role_name: role?.name ?? null,
      custom_fields: userCf,
    };
  });
}

export async function getProfileData(
  userId: string,
): Promise<ProfileData | null> {
  const { data: user, error } = await supabaseAdmin
    .from("app_user")
    .select(
      "id, email, first_name, last_name, phone, lot_number, notify_new_post, notify_replies",
    )
    .eq("id", userId)
    .single();

  if (error || !user) return null;

  // get all custom fields and user's values
  const fields = await listCustomFields();

  const { data: values } = await supabaseAdmin
    .from("custom_field_value")
    .select("field_id, value, visible")
    .eq("user_id", userId);

  const valueMap = new Map(
    (values ?? []).map((v) => [
      v.field_id,
      { value: v.value, visible: v.visible },
    ]),
  );

  return {
    ...user,
    custom_fields: fields.map((f) => ({
      field_id: f.id,
      field_name: f.name,
      value: valueMap.get(f.id)?.value ?? null,
      visible: valueMap.get(f.id)?.visible ?? true,
    })),
  };
}
