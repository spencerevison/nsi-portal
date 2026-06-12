"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAppUser, getCurrentCapabilities } from "@/lib/current-user";
import { componentOf } from "@/lib/family";
import { loadFamilyGraph, setFamilyNameOverride } from "@/lib/family-data";
import type { ActionResult } from "@/lib/action-result";

const MAX_LEN = 60;

export async function setFamilyName(input: {
  nodeId: string;
  name: string;
}): Promise<ActionResult> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const g = await loadFamilyGraph();
  if (!g.nodes.has(input.nodeId)) {
    return { ok: false, error: "Family not found" };
  }

  const component = componentOf(g, input.nodeId);

  // admins can rename any family; everyone else only their own
  const caps = await getCurrentCapabilities();
  const inComponent = [...component].some(
    (id) => g.nodes.get(id)?.appUserId === user.id,
  );
  if (!caps.has("admin.access") && !inComponent) {
    return { ok: false, error: "You can only rename your own family" };
  }

  const trimmed = input.name.trim();
  if (trimmed.length > MAX_LEN) {
    return { ok: false, error: `Name must be ${MAX_LEN} characters or fewer` };
  }

  // empty/whitespace => reset to the derived name
  await setFamilyNameOverride(
    [...component],
    input.nodeId,
    trimmed ? trimmed : null,
  );

  revalidatePath(`/family/${input.nodeId}`);
  revalidatePath("/directory");
  return { ok: true };
}
