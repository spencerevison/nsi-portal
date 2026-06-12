"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCapability } from "@/lib/current-user";
import type { ActionResult } from "@/lib/action-result";
import {
  componentOf,
  placeholderMatchesForMember,
  slotPlaceholderIds,
  validateYears,
  wouldCreateCycle,
  type FamilyGraph,
} from "@/lib/family";
import {
  findPlaceholderCandidates,
  getFamilyEditorData,
  getNodeIdForUser,
  getOrCreateNodeForUser,
  listLinkableMembers,
  loadFamilyGraph,
  memberLinkCandidates,
  mergeNodeLinks,
  reconcileSameNamePlaceholders,
  type FamilyEditorData,
  type FamilyEntry,
  type LinkableMember,
} from "@/lib/family-data";

function revalidateFamily() {
  revalidatePath("/directory");
  revalidatePath("/profile");
  revalidatePath("/admin/members");
}

export type AdminFamilyData = {
  family: FamilyEditorData;
  members: LinkableMember[];
  // other non-member people in the same family — merge targets for dupes
  placeholdersInFamily: { nodeId: string; name: string }[];
};

// data fetcher for the dialog (same pattern as getAdminMemberCustomFields)
export async function getAdminFamilyData(
  userId: string,
): Promise<AdminFamilyData> {
  await requireCapability("admin.access");
  const [family, members, g] = await Promise.all([
    getFamilyEditorData(userId),
    listLinkableMembers(userId),
    loadFamilyGraph(),
  ]);
  let placeholdersInFamily: { nodeId: string; name: string }[] = [];
  if (family.nodeId) {
    const comp = componentOf(g, family.nodeId);
    placeholdersInFamily = [...comp]
      .map((id) => g.nodes.get(id)!)
      .filter((n) => !n.appUserId)
      .map((n) => ({ nodeId: n.id, name: n.name }));
  }
  return { family, members, placeholdersInFamily };
}

// dedupe prompt data for the dialog's non-member path
export async function adminPlaceholderCandidates(input: {
  userId: string;
  name: string;
}): Promise<FamilyEntry[]> {
  await requireCapability("admin.access");
  return findPlaceholderCandidates(input.userId, input.name);
}

// "same person?" prompt data when linking a member — placeholders whose name
// is just the target member's first name, in the slot being filled
export async function adminMemberLinkCandidates(input: {
  userId: string;
  relationship: "parent" | "partner" | "child";
  targetUserId: string;
}): Promise<FamilyEntry[]> {
  await requireCapability("admin.access");
  return memberLinkCandidates(
    input.userId,
    input.relationship,
    input.targetUserId,
  );
}

export async function adminAddRelative(input: {
  userId: string; // the member being edited
  relationship: "parent" | "partner" | "child";
  targetUserId?: string;
  existingNodeId?: string; // reuse a placeholder instead of creating a dupe
  placeholder?: { name: string; birthYear?: number | null };
  // with targetUserId: confirmed-same-person placeholder to fold in first
  mergePlaceholderNodeId?: string;
}): Promise<ActionResult> {
  await requireCapability("admin.access");

  const baseNodeId = await getOrCreateNodeForUser(input.userId);

  let targetNodeId: string;
  let graph: FamilyGraph | undefined;
  let mergedDup = false;
  if (input.targetUserId) {
    if (input.targetUserId === input.userId) {
      return { ok: false, error: "Can't link someone to themselves" };
    }
    const { data: target } = await supabaseAdmin
      .from("app_user")
      .select("id")
      .eq("id", input.targetUserId)
      .maybeSingle();
    if (!target) return { ok: false, error: "Member not found" };
    targetNodeId = await getOrCreateNodeForUser(input.targetUserId);
    graph = await loadFamilyGraph();

    // admin confirmed a "same person?" prompt for a partial name match
    if (input.mergePlaceholderNodeId) {
      const { data: ph } = await supabaseAdmin
        .from("family_node")
        .select("id, app_user_id")
        .eq("id", input.mergePlaceholderNodeId)
        .maybeSingle();
      if (!ph || ph.app_user_id) {
        return { ok: false, error: "Person not found" };
      }
      // name must match (exact or first-name) — anchored on the placeholder
      // itself so the scan works even when the base node is brand new
      const targetName = graph.nodes.get(targetNodeId)?.name ?? "";
      const m = placeholderMatchesForMember(graph, ph.id, targetName);
      if (![...m.exact, ...m.partial].includes(ph.id)) {
        return { ok: false, error: "Person not found" };
      }
      // ...and it must sit in the slot being filled — same derivation
      // adminMemberLinkCandidates uses, so a forged request can't merge a
      // placeholder from a different relationship slot
      const slot = slotPlaceholderIds(graph, input.relationship, baseNodeId);
      if (!slot.includes(ph.id)) {
        return { ok: false, error: "Person not found" };
      }
      // merging moves the placeholder's parent edges onto the member —
      // same bidirectional ancestor guard as adminMergeNodes
      if (
        wouldCreateCycle(graph, targetNodeId, ph.id) ||
        wouldCreateCycle(graph, ph.id, targetNodeId)
      ) {
        return {
          ok: false,
          error: "Can't merge a person with their own ancestor or descendant",
        };
      }
      await mergeNodeLinks(targetNodeId, ph.id);
      mergedDup = true;
    }

    // member may be filling a slot held by a same-named placeholder
    mergedDup =
      (await reconcileSameNamePlaceholders(
        graph,
        input.relationship,
        baseNodeId,
        targetNodeId,
      )) || mergedDup;
  } else if (input.existingNodeId) {
    // no component scoping here (unlike member addRelative) — admins may
    // legitimately link placeholders across families
    const { data: node } = await supabaseAdmin
      .from("family_node")
      .select("id, app_user_id")
      .eq("id", input.existingNodeId)
      .maybeSingle();
    if (!node || node.app_user_id) {
      return { ok: false, error: "Person not found" };
    }
    targetNodeId = node.id;
  } else if (input.placeholder) {
    const name = input.placeholder.name.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (name.length > 80) return { ok: false, error: "Name is too long" };
    const birthYear = input.placeholder.birthYear ?? null;
    const yearErr = validateYears(birthYear, null);
    if (yearErr) return { ok: false, error: yearErr };
    const { data, error } = await supabaseAdmin
      .from("family_node")
      .insert({ display_name: name, birth_year: birthYear })
      .select("id")
      .single();
    if (error || !data) {
      console.error("admin placeholder insert failed", error);
      return { ok: false, error: "Failed to add person" };
    }
    targetNodeId = data.id;
  } else {
    return { ok: false, error: "Pick a member or enter a name" };
  }

  let type: "parent" | "partner";
  let from: string;
  let to: string;
  if (input.relationship === "partner") {
    type = "partner";
    [from, to] =
      baseNodeId < targetNodeId
        ? [baseNodeId, targetNodeId]
        : [targetNodeId, baseNodeId];
  } else {
    type = "parent";
    [from, to] =
      input.relationship === "parent"
        ? [targetNodeId, baseNodeId]
        : [baseNodeId, targetNodeId];
  }

  if (type === "parent") {
    const g = graph ?? (await loadFamilyGraph());
    if (wouldCreateCycle(g, from, to)) {
      return {
        ok: false,
        error: "That link would make someone their own ancestor",
      };
    }
  }

  const { error } = await supabaseAdmin
    .from("family_link")
    .insert({ type, from_node: from, to_node: to });
  if (error) {
    if (error.code === "23505") {
      // edge already moved over during the placeholder merge — success
      if (mergedDup) {
        revalidateFamily();
        return { ok: true };
      }
      return { ok: false, error: "Already linked" };
    }
    console.error("adminAddRelative failed", error);
    return { ok: false, error: "Failed to add link" };
  }
  revalidateFamily();
  return { ok: true };
}

export async function adminRemoveLink(linkId: string): Promise<ActionResult> {
  await requireCapability("admin.access");
  const { error } = await supabaseAdmin
    .from("family_link")
    .delete()
    .eq("id", linkId);
  if (error) {
    console.error("adminRemoveLink failed", error);
    return { ok: false, error: "Failed to remove link" };
  }
  revalidateFamily();
  return { ok: true };
}

export async function adminUpdatePlaceholder(input: {
  nodeId: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  gender: "m" | "f" | null;
}): Promise<ActionResult> {
  await requireCapability("admin.access");

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  const yearErr = validateYears(input.birthYear, input.deathYear);
  if (yearErr) return { ok: false, error: yearErr };

  const { data: node } = await supabaseAdmin
    .from("family_node")
    .select("id, app_user_id")
    .eq("id", input.nodeId)
    .maybeSingle();
  if (!node) return { ok: false, error: "Person not found" };

  // gender is editable for any node; name/years only for placeholders
  const patch: Record<string, unknown> = { gender: input.gender };
  if (!node.app_user_id) {
    patch.display_name = name;
    patch.birth_year = input.birthYear;
    patch.death_year = input.deathYear;
  }

  const { error } = await supabaseAdmin
    .from("family_node")
    .update(patch)
    .eq("id", input.nodeId);
  if (error) {
    console.error("adminUpdatePlaceholder failed", error);
    return { ok: false, error: "Failed to update" };
  }
  revalidateFamily();
  return { ok: true };
}

export async function adminDeletePlaceholder(
  nodeId: string,
): Promise<ActionResult> {
  await requireCapability("admin.access");
  const { data: node } = await supabaseAdmin
    .from("family_node")
    .select("id, app_user_id")
    .eq("id", nodeId)
    .maybeSingle();
  if (!node) return { ok: false, error: "Person not found" };
  if (node.app_user_id) {
    return { ok: false, error: "Can't delete a member's node" };
  }
  const { error } = await supabaseAdmin
    .from("family_node")
    .delete()
    .eq("id", nodeId);
  if (error) {
    console.error("adminDeletePlaceholder failed", error);
    return { ok: false, error: "Failed to delete" };
  }
  revalidateFamily();
  return { ok: true };
}

// Attach a placeholder to a real account. If the account already has a node,
// the placeholder's links move onto it instead (merge).
export async function adminConvertPlaceholder(input: {
  nodeId: string;
  userId: string;
}): Promise<ActionResult> {
  await requireCapability("admin.access");

  const { data: node } = await supabaseAdmin
    .from("family_node")
    .select("id, app_user_id")
    .eq("id", input.nodeId)
    .maybeSingle();
  if (!node) return { ok: false, error: "Person not found" };
  if (node.app_user_id) {
    return { ok: false, error: "Already linked to a member" };
  }

  const { data: target } = await supabaseAdmin
    .from("app_user")
    .select("id")
    .eq("id", input.userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Member not found" };

  const existingNode = await getNodeIdForUser(input.userId);
  if (existingNode) {
    // wouldCreateCycle walks the parent chain, so checking both directions
    // rejects the merge when either node is the other's ancestor
    const g = await loadFamilyGraph();
    if (
      wouldCreateCycle(g, existingNode, input.nodeId) ||
      wouldCreateCycle(g, input.nodeId, existingNode)
    ) {
      return {
        ok: false,
        error: "Can't merge a person with their own ancestor or descendant",
      };
    }
    await mergeNodeLinks(existingNode, input.nodeId);
  } else {
    const { error } = await supabaseAdmin
      .from("family_node")
      .update({ app_user_id: input.userId, display_name: null })
      .eq("id", input.nodeId);
    if (error) {
      console.error("adminConvertPlaceholder failed", error);
      return { ok: false, error: "Failed to convert" };
    }
  }
  revalidateFamily();
  return { ok: true };
}

// Dedupe two records of the same person (e.g. both spouses' migrated
// "Grandpa Joe"). Drop node must be a placeholder; its links move to keep.
export async function adminMergeNodes(input: {
  keepId: string;
  dropId: string;
}): Promise<ActionResult> {
  await requireCapability("admin.access");
  if (input.keepId === input.dropId) {
    return { ok: false, error: "Pick two different people" };
  }
  const { data: drop } = await supabaseAdmin
    .from("family_node")
    .select("id, app_user_id")
    .eq("id", input.dropId)
    .maybeSingle();
  if (!drop) return { ok: false, error: "Person not found" };
  if (drop.app_user_id) {
    return { ok: false, error: "Can't merge away a member's node" };
  }
  const { data: keep } = await supabaseAdmin
    .from("family_node")
    .select("id")
    .eq("id", input.keepId)
    .maybeSingle();
  if (!keep) return { ok: false, error: "Merge target not found" };

  // same ancestor guard as adminConvertPlaceholder — wouldCreateCycle is an
  // ancestor walk, so this rejects merging a node into its own ancestor line
  const g = await loadFamilyGraph();
  if (
    wouldCreateCycle(g, input.keepId, input.dropId) ||
    wouldCreateCycle(g, input.dropId, input.keepId)
  ) {
    return {
      ok: false,
      error: "Can't merge a person with their own ancestor or descendant",
    };
  }

  await mergeNodeLinks(input.keepId, input.dropId);
  revalidateFamily();
  return { ok: true };
}
