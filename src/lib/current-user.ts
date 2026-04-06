import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AppUser = {
  id: string;
  clerk_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string | null;
  active: boolean;
  accepted_at: string | null;
};

/**
 * Returns the current signed-in member's app_user row, or null if none.
 *
 * Self-healing: if the webhook missed linking the Clerk user to an app_user
 * (race condition, network blip, whatever), we fall back to an email lookup
 * and link it here. That way a member who signed up successfully can still
 * get into the portal even if the webhook dropped.
 *
 * Returns null if the authenticated Clerk user has no matching app_user row —
 * caller should treat that as "not a member" and redirect accordingly.
 *
 * Cached per-request so multiple server components can call it for free.
 */
export const getCurrentAppUser = cache(async (): Promise<AppUser | null> => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  // fast path: already linked
  const { data: byClerk } = await supabaseAdmin
    .from("app_user")
    .select(
      "id, clerk_id, email, first_name, last_name, role_id, active, accepted_at",
    )
    .eq("clerk_id", clerkUser.id)
    .maybeSingle();

  if (byClerk) {
    // sync Clerk-owned fields if they've changed
    const clerkFirst = clerkUser.firstName ?? byClerk.first_name;
    const clerkLast = clerkUser.lastName ?? byClerk.last_name;
    const clerkEmail = clerkUser.emailAddresses
      .find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress?.toLowerCase();
    const clerkAvatar = clerkUser.imageUrl ?? null;

    const needsSync =
      clerkFirst !== byClerk.first_name ||
      clerkLast !== byClerk.last_name ||
      (clerkEmail && clerkEmail !== byClerk.email) ||
      clerkAvatar !== (byClerk as Record<string, unknown>).avatar_url;

    if (needsSync) {
      await supabaseAdmin
        .from("app_user")
        .update({
          first_name: clerkFirst,
          last_name: clerkLast,
          ...(clerkEmail ? { email: clerkEmail } : {}),
          avatar_url: clerkAvatar,
        })
        .eq("id", byClerk.id);

      return {
        ...byClerk,
        first_name: clerkFirst,
        last_name: clerkLast,
        email: clerkEmail ?? byClerk.email,
      } as AppUser;
    }

    return byClerk as AppUser;
  }

  // fallback: look up by primary email and link
  const primaryEmailId = clerkUser.primaryEmailAddressId;
  const email = clerkUser.emailAddresses
    .find((e) => e.id === primaryEmailId)
    ?.emailAddress?.toLowerCase();

  if (!email) return null;

  const { data: byEmail } = await supabaseAdmin
    .from("app_user")
    .select(
      "id, clerk_id, email, first_name, last_name, role_id, active, accepted_at",
    )
    .ilike("email", email)
    .maybeSingle();

  if (!byEmail) return null;

  // Link it. If the update fails we still return the row — user gets in,
  // we just log and retry linking on the next request.
  const { error: linkErr } = await supabaseAdmin
    .from("app_user")
    .update({
      clerk_id: clerkUser.id,
      accepted_at: byEmail.accepted_at ?? new Date().toISOString(),
      avatar_url: clerkUser.imageUrl ?? null,
    })
    .eq("id", byEmail.id);

  if (linkErr) {
    console.error("self-heal link failed", linkErr);
  }

  return { ...byEmail, clerk_id: clerkUser.id } as AppUser;
});

/**
 * Returns the capability set for the current signed-in member.
 * Empty set if no user, no role, or role has no capabilities.
 *
 * Use Set.has() for checks in server actions:
 *   const caps = await getCurrentCapabilities()
 *   if (!caps.has('email.send')) throw new Error('forbidden')
 */
export const getCurrentCapabilities = cache(async (): Promise<Set<string>> => {
  const user = await getCurrentAppUser();
  if (!user?.role_id) return new Set();

  const { data, error } = await supabaseAdmin
    .from("role_capability")
    .select("capability")
    .eq("role_id", user.role_id);

  if (error) {
    console.error("capability lookup failed", error);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.capability));
});

/**
 * Throws if the current user doesn't have the given capability.
 * Use as a guard at the top of server actions.
 */
export async function requireCapability(capability: string): Promise<void> {
  const caps = await getCurrentCapabilities();
  if (!caps.has(capability)) {
    throw new Error(`Unauthorized: missing capability ${capability}`);
  }
}
