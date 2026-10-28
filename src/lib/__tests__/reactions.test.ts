import { describe, it, expect } from "vitest";
import { groupReactions } from "@/lib/community";
import { applyOptimistic } from "@/app/(portal)/community/reactions";

const me = { id: "me", name: "Me", avatar_url: null };
const bob = { id: "bob", name: "Bob", avatar_url: null };

const row = (emoji: string, user_id: string) => ({
  emoji,
  user_id,
  user: { first_name: user_id, last_name: "X", avatar_url: null },
});

describe("groupReactions", () => {
  it("groups the same emoji from different people into one chip", () => {
    const g = groupReactions([row("👍", "a"), row("❤️", "a"), row("👍", "b")]);
    expect(g.map((x) => x.emoji)).toEqual(["👍", "❤️"]);
    expect(g[0].reactors.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("applyOptimistic", () => {
  it("joins an existing group", () => {
    const out = applyOptimistic(
      [{ emoji: "👍", reactors: [bob] }],
      { emoji: "👍" },
      me,
    );
    expect(out).toHaveLength(1);
    expect(out[0].reactors.map((r) => r.id)).toEqual(["bob", "me"]);
  });

  it("keeps my other reactions when adding a new emoji", () => {
    const out = applyOptimistic(
      [{ emoji: "👍", reactors: [me] }],
      { emoji: "❤️" },
      me,
    );
    expect(out.map((g) => g.emoji)).toEqual(["👍", "❤️"]);
  });

  it("removes only that emoji, dropping the group if I was the last", () => {
    const state = [
      { emoji: "👍", reactors: [me] },
      { emoji: "❤️", reactors: [me, bob] },
    ];
    expect(
      applyOptimistic(state, { emoji: "👍" }, me).map((g) => g.emoji),
    ).toEqual(["❤️"]);
    const out = applyOptimistic(state, { emoji: "❤️" }, me);
    expect(
      out.find((g) => g.emoji === "❤️")?.reactors.map((r) => r.id),
    ).toEqual(["bob"]);
  });
});
