import { supabaseAdmin } from "@/lib/supabase-admin";

export type GroupRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  member_count: number;
};

export type EmailLogRow = {
  id: string;
  subject: string;
  body: string;
  sent_by: string | null;
  sender_name: string;
  target_groups: string[];
  recipient_count: number;
  sent_at: string;
};

export async function listGroups(): Promise<GroupRow[]> {
  const { data, error } = await supabaseAdmin
    .from("group_")
    .select("id, name, slug, description, user_group(count)")
    .order("name");

  if (error) {
    console.error("listGroups failed", error);
    return [];
  }

  return (data ?? []).map((g) => {
    const countArr = g.user_group as unknown as { count: number }[];
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      member_count: countArr?.[0]?.count ?? 0,
    };
  });
}

export async function listGroupMembers(
  groupId: string,
): Promise<{ user_id: string; email: string; first_name: string; last_name: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("user_group")
    .select("user_id, app_user:user_id ( email, first_name, last_name )")
    .eq("group_id", groupId);

  if (error) {
    console.error("listGroupMembers failed", error);
    return [];
  }

  return (data ?? []).map((ug) => {
    const user = ug.app_user as unknown as {
      email: string;
      first_name: string;
      last_name: string;
    };
    return {
      user_id: ug.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    };
  });
}

export async function resolveRecipients(
  groupSlugs: string[],
): Promise<{ email: string; name: string }[]> {
  // "all" means all active members
  if (groupSlugs.includes("all")) {
    const { data } = await supabaseAdmin
      .from("app_user")
      .select("email, first_name, last_name")
      .eq("active", true)
      .not("accepted_at", "is", null);

    return (data ?? []).map((u) => ({
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
    }));
  }

  // resolve group IDs from slugs
  const { data: groups } = await supabaseAdmin
    .from("group_")
    .select("id")
    .in("slug", groupSlugs);

  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);
  const { data: memberships } = await supabaseAdmin
    .from("user_group")
    .select("app_user:user_id ( email, first_name, last_name )")
    .in("group_id", groupIds);

  // deduplicate by email
  const seen = new Set<string>();
  const recipients: { email: string; name: string }[] = [];
  for (const m of memberships ?? []) {
    const user = m.app_user as unknown as {
      email: string;
      first_name: string;
      last_name: string;
    };
    if (!seen.has(user.email)) {
      seen.add(user.email);
      recipients.push({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
      });
    }
  }
  return recipients;
}

export async function listEmailLogs(): Promise<EmailLogRow[]> {
  const { data, error } = await supabaseAdmin
    .from("email_log")
    .select(
      `id, subject, body, sent_by, target_groups, recipient_count, sent_at,
       sender:sent_by ( first_name, last_name )`,
    )
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("listEmailLogs failed", error);
    return [];
  }

  return (data ?? []).map((e) => {
    const sender = e.sender as unknown as {
      first_name: string;
      last_name: string;
    } | null;
    return {
      id: e.id,
      subject: e.subject,
      body: e.body,
      sent_by: e.sent_by,
      sender_name: sender
        ? `${sender.first_name} ${sender.last_name}`
        : "Unknown",
      target_groups: e.target_groups,
      recipient_count: e.recipient_count,
      sent_at: e.sent_at,
    };
  });
}
