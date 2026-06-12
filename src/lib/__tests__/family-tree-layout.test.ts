import { describe, it, expect } from "vitest";
import {
  layoutFamily,
  CARD_W,
  ROW_H,
  type PlacedNode,
} from "@/lib/family-tree-layout";
import type { FamilyLink } from "@/lib/family";

let n = 0;
const link = (
  type: "parent" | "partner",
  fromNode: string,
  toNode: string,
): FamilyLink => ({ id: `l${n++}`, type, fromNode, toNode });

const at = (placed: PlacedNode[], id: string) => {
  const p = placed.find((x) => x.id === id);
  if (!p) throw new Error(`${id} not placed`);
  return p;
};

describe("layoutFamily", () => {
  it("puts generations on separate rows", () => {
    const { nodes } = layoutFamily(
      ["gp", "p", "k"],
      [link("parent", "gp", "p"), link("parent", "p", "k")],
    );
    expect(at(nodes, "gp").y).toBe(0);
    expect(at(nodes, "p").y).toBe(ROW_H);
    expect(at(nodes, "k").y).toBe(2 * ROW_H);
  });

  it("places partners side by side on the same row", () => {
    const { nodes } = layoutFamily(["a", "b"], [link("partner", "a", "b")]);
    const a = at(nodes, "a");
    const b = at(nodes, "b");
    expect(a.y).toBe(b.y);
    expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(CARD_W);
  });

  it("pulls a cross-generation partner down to the same row", () => {
    // c is child of a; c partners d, who has no parents — d must share c's row
    const { nodes } = layoutFamily(
      ["a", "c", "d"],
      [link("parent", "a", "c"), link("partner", "c", "d")],
    );
    expect(at(nodes, "d").y).toBe(at(nodes, "c").y);
  });

  it("never overlaps cards in a row", () => {
    const { nodes } = layoutFamily(
      ["p", "q", "k1", "k2", "k3"],
      [
        link("partner", "p", "q"),
        link("parent", "p", "k1"),
        link("parent", "q", "k1"),
        link("parent", "p", "k2"),
        link("parent", "q", "k2"),
        link("parent", "p", "k3"),
        link("parent", "q", "k3"),
      ],
    );
    const rows = new Map<number, number[]>();
    for (const pn of nodes) {
      rows.set(pn.y, [...(rows.get(pn.y) ?? []), pn.x]);
    }
    for (const xs of rows.values()) {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(CARD_W);
      }
    }
  });

  it("is deterministic", () => {
    const ids = ["p", "q", "k1", "k2"];
    const links = [
      link("partner", "p", "q"),
      link("parent", "p", "k1"),
      link("parent", "p", "k2"),
    ];
    expect(layoutFamily(ids, links)).toEqual(layoutFamily(ids, links));
  });
});
