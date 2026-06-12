"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAppUser } from "@/lib/current-user";
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
  getOrCreateNodeForUser,
  loadFamilyGraph,
  memberLinkCandidates,
  mergeNodeLinks,
  reconcileSameNamePlaceholders,
  type FamilyEntry,
} from "@/lib/family-data";

const FAMILY_PATHS = ["/directory", "/profile"] as const;
function revalidateFamily() {
  for (const p of FAMILY_PATHS) revalidatePath(p);
}

export type AddRelativeInput = {
  relationship: "parent" | "partner" | "child";
  // exactly one of these:
  targetUserId?: string;
  // link to a placeholder already in my family instead of creating a dupe
  existingNodeId?: string;
  placeholder?: { name: string; birthYear?: number | null };
  // with targetUserId: fold this placeholder into the member's node first
  // (user confirmed "yes, same person" on a partial name match)
  mergePlaceholderNodeId?: string;
};

// Same-named non-members already in my family — the dialog offers these
// before creating a new placeholder.
export async function placeholderCandidates(
  name: string,
): Promise<FamilyEntry[]> {
  const user = await getCurrentAppUser();
  if (!user) return [];
  return findPlaceholderCandidates(user.id, name);
}

// Placeholders that might be the member about to be linked (first-name-only
// matches in the slot they'd fill) — the dialog asks "same person?" first.
export async function memberLinkPlaceholderCandidates(input: {
  relationship: "parent" | "partner" | "child";
  targetUserId: string;
}): Promise<FamilyEntry[]> {
  const user = await getCurrentAppUser();
  if (!user) return [];
  return memberLinkCandidates(user.id, input.relationship, input.targetUserId);
}

// Insert a parent/partner link between two nodes, with cycle + dup handling.
// parent relationship semantics: relationship is what the TARGET is to ME.
async function insertLink(
  relationship: "parent" | "partner" | "child",
  myNodeId: string,
  targetNodeId: string,
  opts: { graph?: FamilyGraph; dupIsOk?: boolean } = {},
): Promise<ActionResult> {
  if (myNodeId === targetNodeId) {
    return { ok: false, error: "You can't link someone to themselves" };
  }

  let type: "parent" | "partner";
  let from: string;
  let to: string;
  if (relationship === "partner") {
    type = "partner";
    [from, to] =
      myNodeId < targetNodeId
        ? [myNodeId, targetNodeId]
        : [targetNodeId, myNodeId];
  } else {
    type = "parent";
    // "parent" => target is my parent; "child" => target is my child
    [from, to] =
      relationship === "parent"
        ? [targetNodeId, myNodeId]
        : [myNodeId, targetNodeId];
  }

  if (type === "parent") {
    const g = opts.graph ?? (await loadFamilyGraph());
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
      // after a placeholder merge the edge may already be there — that's fine
      if (opts.dupIsOk) return { ok: true };
      return { ok: false, error: "Already linked" };
    }
    console.error("insertLink failed", error);
    return { ok: false, error: "Failed to add family link" };
  }
  return { ok: true };
}

export async function addRelative(
  input: AddRelativeInput,
): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const myNodeId = await getOrCreateNodeForUser(user.id);

  let targetNodeId: string;
  let graph: FamilyGraph | undefined;
  let mergedDup = false;
  if (input.targetUserId) {
    if (input.targetUserId === user.id) {
      return { ok: false, error: "You can't link yourself to yourself" };
    }
    const { data: target } = await supabaseAdmin
      .from("app_user")
      .select("id, active")
      .eq("id", input.targetUserId)
      .maybeSingle();
    if (!target || !target.active) {
      return { ok: false, error: "Member not found" };
    }
    targetNodeId = await getOrCreateNodeForUser(target.id);
    graph = await loadFamilyGraph();

    // user confirmed a "same person?" prompt — fold that placeholder into
    // the member's node before linking
    if (input.mergePlaceholderNodeId) {
      const { data: ph } = await supabaseAdmin
        .from("family_node")
        .select("id, app_user_id")
        .eq("id", input.mergePlaceholderNodeId)
        .maybeSingle();
      if (!ph || ph.app_user_id) {
        return { ok: false, error: "Person not found" };
      }
      // defense in depth: must be a name match in my own component
      const targetName = graph.nodes.get(targetNodeId)?.name ?? "";
      const m = placeholderMatchesForMember(graph, myNodeId, targetName);
      if (![...m.exact, ...m.partial].includes(ph.id)) {
        return { ok: false, error: "Person not found" };
      }
      // ...and actually sitting in the slot being filled — same derivation
      // memberLinkCandidates uses, so a forged request can't merge a
      // placeholder from a different relationship slot
      const slot = slotPlaceholderIds(graph, input.relationship, myNodeId);
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
      // the merge moved edges — refresh so reconcile's cycle guard is current
      graph = await loadFamilyGraph();
    }

    // a placeholder may already be standing in for this member (added by
    // name before they joined) — fold it into their real node
    mergedDup =
      (await reconcileSameNamePlaceholders(
        graph,
        input.relationship,
        myNodeId,
        targetNodeId,
      )) || mergedDup;
  } else if (input.existingNodeId) {
    const { data: node } = await supabaseAdmin
      .from("family_node")
      .select("id, app_user_id")
      .eq("id", input.existingNodeId)
      .maybeSingle();
    if (!node || node.app_user_id) {
      return { ok: false, error: "Person not found" };
    }
    // only placeholders already in MY family component can be linked here —
    // the dialog never offers anything else, but enforce it server-side.
    // Same error as above so foreign node ids aren't probeable.
    graph = await loadFamilyGraph();
    if (!componentOf(graph, myNodeId).has(node.id)) {
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
      console.error("placeholder insert failed", error);
      return { ok: false, error: "Failed to add person" };
    }
    targetNodeId = data.id;
  } else {
    return { ok: false, error: "Pick a member or enter a name" };
  }

  const res = await insertLink(input.relationship, myNodeId, targetNodeId, {
    // if a merge happened, the snapshot is stale — let insertLink reload so the
    // cycle check sees the post-merge graph
    graph: mergedDup ? undefined : graph,
    dupIsOk: mergedDup,
  });
  if (res.ok || mergedDup) revalidateFamily();
  return res;
}

export async function removeRelative(linkId: string): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: link } = await supabaseAdmin
    .from("family_link")
    .select("id, from_node, to_node")
    .eq("id", linkId)
    .maybeSingle();
  if (!link) return { ok: false, error: "Link not found" };

  const { data: myNode } = await supabaseAdmin
    .from("family_node")
    .select("id")
    .eq("app_user_id", user.id)
    .maybeSingle();
  if (!myNode || (link.from_node !== myNode.id && link.to_node !== myNode.id)) {
    return { ok: false, error: "You can only remove your own family links" };
  }

  const { error } = await supabaseAdmin
    .from("family_link")
    .delete()
    .eq("id", linkId);
  if (error) {
    console.error("removeRelative failed", error);
    return { ok: false, error: "Failed to remove link" };
  }

  // clean up placeholders left with no links at all
  for (const nodeId of [link.from_node, link.to_node]) {
    const { data: node } = await supabaseAdmin
      .from("family_node")
      .select("id, app_user_id")
      .eq("id", nodeId)
      .maybeSingle();
    if (!node || node.app_user_id) continue;
    const { count } = await supabaseAdmin
      .from("family_link")
      .select("id", { count: "exact", head: true })
      .or(`from_node.eq.${nodeId},to_node.eq.${nodeId}`);
    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("family_node").delete().eq("id", nodeId);
    }
  }

  revalidateFamily();
  return { ok: true };
}

// Delete a placeholder outright — used when it's also linked to other members
// and just removing my own link would leave it dangling in the tree.
export async function removePlaceholderCompletely(
  nodeId: string,
): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: node } = await supabaseAdmin
    .from("family_node")
    .select("id, app_user_id")
    .eq("id", nodeId)
    .maybeSingle();
  if (!node) return { ok: false, error: "Person not found" };
  if (node.app_user_id) {
    return { ok: false, error: "Members can only be unlinked, not removed" };
  }

  // same permission gate as updatePlaceholder: must share a direct link
  const { data: myNode } = await supabaseAdmin
    .from("family_node")
    .select("id")
    .eq("app_user_id", user.id)
    .maybeSingle();
  if (!myNode) return { ok: false, error: "Not linked to this person" };
  const { count } = await supabaseAdmin
    .from("family_link")
    .select("id", { count: "exact", head: true })
    .or(
      `and(from_node.eq.${nodeId},to_node.eq.${myNode.id}),and(from_node.eq.${myNode.id},to_node.eq.${nodeId})`,
    );
  if ((count ?? 0) === 0) {
    return { ok: false, error: "Not linked to this person" };
  }

  // links cascade with the node row
  const { error } = await supabaseAdmin
    .from("family_node")
    .delete()
    .eq("id", nodeId);
  if (error) {
    console.error("removePlaceholderCompletely failed", error);
    return { ok: false, error: "Failed to remove" };
  }
  revalidateFamily();
  return { ok: true };
}

export async function updatePlaceholder(input: {
  nodeId: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
}): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

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
  if (node.app_user_id) {
    return { ok: false, error: "Members manage their own name in settings" };
  }

  // must share a link with me
  const { data: myNode } = await supabaseAdmin
    .from("family_node")
    .select("id")
    .eq("app_user_id", user.id)
    .maybeSingle();
  if (!myNode) return { ok: false, error: "Not linked to this person" };
  const { count } = await supabaseAdmin
    .from("family_link")
    .select("id", { count: "exact", head: true })
    .or(
      `and(from_node.eq.${input.nodeId},to_node.eq.${myNode.id}),and(from_node.eq.${myNode.id},to_node.eq.${input.nodeId})`,
    );
  if ((count ?? 0) === 0) {
    return { ok: false, error: "Not linked to this person" };
  }

  const { error } = await supabaseAdmin
    .from("family_node")
    .update({
      display_name: name,
      birth_year: input.birthYear,
      death_year: input.deathYear,
    })
    .eq("id", input.nodeId);
  if (error) {
    console.error("updatePlaceholder failed", error);
    return { ok: false, error: "Failed to update" };
  }
  revalidateFamily();
  return { ok: true };
}
