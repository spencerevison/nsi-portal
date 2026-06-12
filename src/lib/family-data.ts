import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildGraph,
  childrenOf,
  componentOf,
  familyName,
  parentsOf,
  partnersOf,
  siblingsOf,
  relationshipBetween,
  normalizeName,
  placeholderMatchesForMember,
  sameNamePlaceholdersIn,
  slotPlaceholderIds,
  wouldCreateCycle,
  type FamilyGraph,
  type FamilyLink,
  type FamilyNode,
} from "@/lib/family";

type NodeRow = {
  id: string;
  app_user_id: string | null;
  display_name: string | null;
  birth_year: number | null;
  death_year: number | null;
  gender: "m" | "f" | null;
  family_name_override: string | null;
};

export async function loadFamilyGraph(): Promise<FamilyGraph> {
  const [{ data: nodeRows }, { data: linkRows }] = await Promise.all([
    supabaseAdmin
      .from("family_node")
      .select(
        "id, app_user_id, display_name, birth_year, death_year, gender, family_name_override",
      ),
    supabaseAdmin.from("family_link").select("id, type, from_node, to_node"),
  ]);

  const rows = (nodeRows ?? []) as NodeRow[];
  const userIds = rows.map((r) => r.app_user_id).filter(Boolean) as string[];

  // member display data + their dogs (for tree cards)
  let users: Array<{
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    lot_number: string | null;
  }> = [];
  const dogsByUser = new Map<string, string[]>();

  if (userIds.length) {
    const { data } = await supabaseAdmin
      .from("app_user")
      .select("id, first_name, last_name, avatar_url, lot_number")
      .in("id", userIds);
    users = data ?? [];

    const { data: dogField } = await supabaseAdmin
      .from("custom_field")
      .select("id")
      .eq("name", "Dogs")
      .maybeSingle();
    if (dogField) {
      const { data: dogValues } = await supabaseAdmin
        .from("custom_field_value")
        .select("user_id, value, visible")
        .eq("field_id", dogField.id)
        .in("user_id", userIds);
      for (const v of dogValues ?? []) {
        if (!v.visible || !v.value) continue;
        try {
          const parsed = JSON.parse(v.value);
          if (Array.isArray(parsed)) {
            dogsByUser.set(
              v.user_id,
              parsed
                .map((d: { name?: string }) => d.name ?? "")
                .filter(Boolean),
            );
          }
        } catch {
          dogsByUser.set(v.user_id, [v.value]);
        }
      }
    }
  }
  const userMap = new Map(users.map((u) => [u.id, u]));

  const nodes: FamilyNode[] = rows.map((r) => {
    const u = r.app_user_id ? userMap.get(r.app_user_id) : undefined;
    return {
      id: r.id,
      appUserId: r.app_user_id,
      name: u
        ? `${u.first_name} ${u.last_name}`.trim()
        : (r.display_name ?? "Unknown"),
      avatarUrl: u?.avatar_url ?? null,
      lotNumber: u?.lot_number ?? null,
      birthYear: r.birth_year,
      deathYear: r.death_year,
      gender: r.gender,
      familyNameOverride: r.family_name_override,
      dogs: r.app_user_id ? (dogsByUser.get(r.app_user_id) ?? []) : [],
    };
  });

  const links: FamilyLink[] = (linkRows ?? []).map((l) => ({
    id: l.id,
    type: l.type as "parent" | "partner",
    fromNode: l.from_node,
    toNode: l.to_node,
  }));

  return buildGraph(nodes, links);
}

export async function getNodeIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("family_node")
    .select("id")
    .eq("app_user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getOrCreateNodeForUser(userId: string): Promise<string> {
  const existing = await getNodeIdForUser(userId);
  if (existing) return existing;
  const { data, error } = await supabaseAdmin
    .from("family_node")
    .insert({ app_user_id: userId })
    .select("id")
    .single();
  if (error) {
    // unique race — someone else created it between our select and insert
    const retry = await getNodeIdForUser(userId);
    if (retry) return retry;
    throw error;
  }
  return data.id;
}

// Set (or clear) the custom title for a family component. We always wipe the
// override off every node in the component first, then stamp it on the anchor
// if a name is given — that way a component can never end up with two.
export async function setFamilyNameOverride(
  componentNodeIds: string[],
  anchorNodeId: string,
  name: string | null,
): Promise<void> {
  if (componentNodeIds.length) {
    await supabaseAdmin
      .from("family_node")
      .update({ family_name_override: null })
      .in("id", componentNodeIds);
  }

  const trimmed = name?.trim();
  if (trimmed) {
    await supabaseAdmin
      .from("family_node")
      .update({ family_name_override: trimmed })
      .eq("id", anchorNodeId);
  }
}

// --- directory payloads ---

export type FamilyEntry = {
  nodeId: string;
  userId: string | null;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  gender: "m" | "f" | null;
};

export type DirectoryFamilySummary = {
  nodeId: string;
  relationToViewer: string | null;
  parents: FamilyEntry[];
  partners: FamilyEntry[];
  children: FamilyEntry[];
  siblings: FamilyEntry[];
};

function entry(g: FamilyGraph, id: string): FamilyEntry {
  const n = g.nodes.get(id)!;
  return {
    nodeId: id,
    userId: n.appUserId,
    name: n.name,
    birthYear: n.birthYear,
    deathYear: n.deathYear,
    gender: n.gender,
  };
}

export async function getDirectoryFamilySummaries(
  viewerUserId: string,
  graph?: FamilyGraph,
): Promise<Record<string, DirectoryFamilySummary>> {
  const g = graph ?? (await loadFamilyGraph());
  const userToNode = new Map<string, string>();
  for (const n of g.nodes.values()) {
    if (n.appUserId) userToNode.set(n.appUserId, n.id);
  }
  const viewerNode = userToNode.get(viewerUserId) ?? null;

  const out: Record<string, DirectoryFamilySummary> = {};
  for (const [userId, nodeId] of userToNode) {
    out[userId] = {
      nodeId,
      relationToViewer:
        viewerNode && viewerNode !== nodeId
          ? relationshipBetween(g, viewerNode, nodeId)
          : null,
      parents: parentsOf(g, nodeId).map((id) => entry(g, id)),
      partners: partnersOf(g, nodeId).map((id) => entry(g, id)),
      children: childrenOf(g, nodeId).map((id) => entry(g, id)),
      siblings: siblingsOf(g, nodeId).map((id) => entry(g, id)),
    };
  }
  return out;
}

export type FamilyListItem = {
  nodeId: string; // stable representative: lowest node id in the component
  name: string;
  count: number;
};

// Families for the directory dropdown — connected components with at least
// 2 people and at least one actual member.
export async function listFamilies(
  graph?: FamilyGraph,
): Promise<FamilyListItem[]> {
  const g = graph ?? (await loadFamilyGraph());
  const seen = new Set<string>();
  const out: FamilyListItem[] = [];

  for (const id of g.nodes.keys()) {
    if (seen.has(id)) continue;
    const comp = componentOf(g, id);
    for (const n of comp) seen.add(n);
    if (comp.size < 2) continue;
    if (![...comp].some((n) => g.nodes.get(n)?.appUserId)) continue;
    const rep = [...comp].sort()[0];
    out.push({ nodeId: rep, name: familyName(g, comp), count: comp.size });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// --- profile/admin editor payloads ---

export type FamilyEditorEntry = FamilyEntry & {
  linkId: string;
  relationship: "parent" | "partner" | "child";
  // for placeholders: other members (not the anchor user) with a direct link
  // to this person — removing my link won't remove them from the tree
  otherMemberNames: string[];
};

export type FamilyEditorData = {
  nodeId: string | null;
  parents: FamilyEditorEntry[];
  partners: FamilyEditorEntry[];
  children: FamilyEditorEntry[];
};

export async function getFamilyEditorData(
  userId: string,
): Promise<FamilyEditorData> {
  const g = await loadFamilyGraph();
  let nodeId: string | null = null;
  for (const n of g.nodes.values()) {
    if (n.appUserId === userId) {
      nodeId = n.id;
      break;
    }
  }
  const empty: FamilyEditorData = {
    nodeId,
    parents: [],
    partners: [],
    children: [],
  };
  if (!nodeId) return empty;

  // names of other member-linked nodes directly linked to a placeholder
  const otherMemberNames = (phId: string): string[] => {
    const names = new Set<string>();
    for (const l of g.links) {
      const other =
        l.fromNode === phId ? l.toNode : l.toNode === phId ? l.fromNode : null;
      if (!other) continue;
      const n = g.nodes.get(other);
      if (n?.appUserId && n.appUserId !== userId) names.add(n.name);
    }
    return [...names].sort();
  };

  const editorEntry = (
    id: string,
    linkId: string,
    relationship: "parent" | "partner" | "child",
  ): FamilyEditorEntry => {
    const e = entry(g, id);
    return {
      ...e,
      linkId,
      relationship,
      otherMemberNames: e.userId ? [] : otherMemberNames(id),
    };
  };

  for (const l of g.links) {
    if (l.type === "parent" && l.toNode === nodeId) {
      empty.parents.push(editorEntry(l.fromNode, l.id, "parent"));
    } else if (l.type === "parent" && l.fromNode === nodeId) {
      empty.children.push(editorEntry(l.toNode, l.id, "child"));
    } else if (
      l.type === "partner" &&
      (l.fromNode === nodeId || l.toNode === nodeId)
    ) {
      const other = l.fromNode === nodeId ? l.toNode : l.fromNode;
      empty.partners.push(editorEntry(other, l.id, "partner"));
    }
  }
  return empty;
}

// Same-named placeholders already in this user's family — shown as "use
// existing person?" candidates before creating a duplicate.
export async function findPlaceholderCandidates(
  anchorUserId: string,
  name: string,
): Promise<FamilyEntry[]> {
  const g = await loadFamilyGraph();
  let anchorNodeId: string | null = null;
  for (const n of g.nodes.values()) {
    if (n.appUserId === anchorUserId) {
      anchorNodeId = n.id;
      break;
    }
  }
  if (!anchorNodeId) return [];
  return sameNamePlaceholdersIn(g, anchorNodeId, name).map((id) =>
    entry(g, id),
  );
}

// Members a user can link to (active, excludes clerk test users and self).
// Deliberately includes drafts/invited — the launch runbook links profiles
// before invitations are accepted.
export type LinkableMember = { id: string; name: string; lot: string | null };

export async function listLinkableMembers(
  excludeUserId?: string,
): Promise<LinkableMember[]> {
  const { data } = await supabaseAdmin
    .from("app_user")
    .select("id, first_name, last_name, lot_number")
    .eq("active", true)
    .not("email", "ilike", "%+clerk_test%")
    .order("last_name");
  return (data ?? [])
    .filter((u) => u.id !== excludeUserId)
    .map((u) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`.trim(),
      lot: u.lot_number,
    }));
}

// Move every link from dropId onto keepId (dedupe + re-canonicalize partner
// ordering), then delete dropId. Used by admin merge and convert-to-member.
export async function mergeNodeLinks(
  keepId: string,
  dropId: string,
): Promise<void> {
  // carry over facts the keep node doesn't have yet — a placeholder often
  // knows the birth year before the real account does
  const { data: pair } = await supabaseAdmin
    .from("family_node")
    .select("id, birth_year, death_year, gender")
    .in("id", [keepId, dropId]);
  const keep = pair?.find((n) => n.id === keepId);
  const drop = pair?.find((n) => n.id === dropId);
  if (keep && drop) {
    const patch: Record<string, unknown> = {};
    for (const f of ["birth_year", "death_year", "gender"] as const) {
      if (keep[f] == null && drop[f] != null) patch[f] = drop[f];
    }
    if (Object.keys(patch).length) {
      await supabaseAdmin.from("family_node").update(patch).eq("id", keepId);
    }
  }

  const { data: links } = await supabaseAdmin
    .from("family_link")
    .select("id, type, from_node, to_node")
    .or(`from_node.eq.${dropId},to_node.eq.${dropId}`);

  // Re-home each of dropId's links onto keepId. Insert the rewritten edge
  // FIRST, then delete the old row — so a failed insert never leaves the
  // relationship with no row at all. If any link can't be moved, keep the
  // placeholder (and its un-migrated links) instead of deleting it, so nothing
  // is lost; a retry re-processes only what's left.
  let allMoved = true;
  for (const l of links ?? []) {
    let from = l.from_node === dropId ? keepId : l.from_node;
    let to = l.to_node === dropId ? keepId : l.to_node;
    if (from === to) {
      // collapses to a self-link (was the dropId↔keepId edge) — just remove it
      await supabaseAdmin.from("family_link").delete().eq("id", l.id);
      continue;
    }
    if (l.type === "partner" && from > to) [from, to] = [to, from];
    const { error } = await supabaseAdmin
      .from("family_link")
      .insert({ type: l.type, from_node: from, to_node: to });
    // 23505 = the edge already exists, so the relationship is represented and
    // the old row is safe to drop. Any other error: keep the old row.
    if (error && error.code !== "23505") {
      console.error(
        "mergeNodeLinks insert failed, keeping original link",
        error,
      );
      allMoved = false;
      continue;
    }
    await supabaseAdmin.from("family_link").delete().eq("id", l.id);
  }
  if (allMoved) {
    await supabaseAdmin.from("family_node").delete().eq("id", dropId);
  }
}

// P2 reconciliation: a member is being linked into a slot that's already
// held by a same-named placeholder (e.g. dad was added by name, then joined
// for real). Fold the placeholder(s) into the member node before the new
// edge goes in. Exact normalized-name matches only. Returns true if any
// merge ran — callers then treat a 23505 on the follow-up insert as success,
// since the desired edge may have moved over during the merge.
export async function reconcileSameNamePlaceholders(
  g: FamilyGraph,
  relationship: "parent" | "partner" | "child",
  baseNodeId: string,
  targetNodeId: string,
): Promise<boolean> {
  let merged = false;
  const nameOf = (id: string) => normalizeName(g.nodes.get(id)?.name ?? "");

  const mergeMatches = async (keepId: string, candidateIds: string[]) => {
    const want = nameOf(keepId);
    if (!want) return;
    for (const id of candidateIds) {
      const n = g.nodes.get(id);
      if (!n || n.appUserId) continue; // placeholders only
      if (nameOf(id) !== want) continue;
      // best-effort dedupe — skip (don't fail) if the merge would fold
      // someone into their own ancestor line
      if (wouldCreateCycle(g, keepId, id) || wouldCreateCycle(g, id, keepId)) {
        console.warn("reconcile skipped: merge would create cycle", keepId, id);
        continue;
      }
      await mergeNodeLinks(keepId, id);
      merged = true;
    }
  };

  if (relationship === "parent") {
    // target becomes base's parent — check base's existing placeholder parents
    await mergeMatches(targetNodeId, g.parents.get(baseNodeId) ?? []);
    // ...and base may be standing in as a placeholder among target's children
    await mergeMatches(baseNodeId, g.children.get(targetNodeId) ?? []);
  } else if (relationship === "child") {
    // base becomes target's parent
    await mergeMatches(baseNodeId, g.parents.get(targetNodeId) ?? []);
    // ...and target fills a child slot that may be held by a placeholder
    // (kid added by name first, then got a real account)
    await mergeMatches(targetNodeId, g.children.get(baseNodeId) ?? []);
  } else {
    await mergeMatches(targetNodeId, g.partners.get(baseNodeId) ?? []);
    await mergeMatches(baseNodeId, g.partners.get(targetNodeId) ?? []);
  }
  return merged;
}

// Partial-name candidates for the "is this the same person?" prompt when
// linking a member. These are the placeholders in the slot the target member
// is entering — i.e. the ones reconcileSameNamePlaceholders would fold in if
// the names matched exactly — whose name is just the member's first name.
export async function memberLinkCandidates(
  anchorUserId: string,
  relationship: "parent" | "partner" | "child",
  targetUserId: string,
): Promise<FamilyEntry[]> {
  const g = await loadFamilyGraph();
  let anchorNodeId: string | null = null;
  for (const n of g.nodes.values()) {
    if (n.appUserId === anchorUserId) {
      anchorNodeId = n.id;
      break;
    }
  }
  if (!anchorNodeId) return [];

  // the target may not have a family node yet — name comes from app_user
  const { data: target } = await supabaseAdmin
    .from("app_user")
    .select("first_name, last_name")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!target) return [];
  const targetName = `${target.first_name} ${target.last_name}`.trim();

  const slot = slotPlaceholderIds(g, relationship, anchorNodeId);

  const { partial } = placeholderMatchesForMember(g, anchorNodeId, targetName);
  return partial.filter((id) => slot.includes(id)).map((id) => entry(g, id));
}
