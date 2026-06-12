import { describe, it, expect } from "vitest";
import {
  buildGraph,
  parentsOf,
  childrenOf,
  partnersOf,
  siblingsOf,
  componentOf,
  familyName,
  wouldCreateCycle,
  validateYears,
  pathBetween,
  relationshipLabel,
  relationshipBetween,
  normalizeName,
  sameNamePlaceholdersIn,
  placeholderMatchesForMember,
  type FamilyNode,
  type FamilyLink,
} from "@/lib/family";

// helper — most node fields don't matter for graph logic
function node(
  id: string,
  name: string,
  opts: Partial<FamilyNode> = {},
): FamilyNode {
  return {
    id,
    appUserId: opts.appUserId ?? `user-${id}`,
    name,
    avatarUrl: null,
    lotNumber: null,
    birthYear: opts.birthYear ?? null,
    deathYear: opts.deathYear ?? null,
    gender: opts.gender ?? null,
    familyNameOverride: opts.familyNameOverride ?? null,
    dogs: [],
    ...opts,
  };
}

const ph = { appUserId: null }; // placeholder marker

// Gen 1: George (d. 1998) + Mary Whitfield (both placeholders)
// Gen 2: their kids Alice (m. Dan Henderson), Bob (m. Priya), Carol (m. Tom Lee)
//        Dan's mother Ruth Henderson (placeholder); Dan's brother Sam
// Gen 3: Alice+Dan: Emma, Finn (placeholder kid b. 2012)
//        Bob+Priya: Gita
//        Tom's kid from before: Uma (placeholder); Carol+Tom: Vic; Carol solo: Wes
export const NODES: FamilyNode[] = [
  node("george", "George Whitfield", { ...ph, gender: "m", deathYear: 1998 }),
  node("mary", "Mary Whitfield", { ...ph, gender: "f" }),
  node("alice", "Alice Henderson", { gender: "f" }),
  node("bob", "Bob Whitfield", { gender: "m" }),
  node("carol", "Carol Whitfield", { gender: "f" }),
  node("dan", "Dan Henderson", { gender: "m" }),
  node("priya", "Priya Whitfield", { gender: "f" }),
  node("tom", "Tom Lee", { gender: "m" }),
  node("ruth", "Ruth Henderson", { ...ph, gender: "f" }),
  node("sam", "Sam Henderson", { gender: "m" }),
  node("emma", "Emma Henderson", { gender: "f" }),
  node("finn", "Finn Henderson", { ...ph, gender: "m", birthYear: 2012 }),
  node("gita", "Gita Whitfield", { gender: "f" }),
  node("uma", "Uma Lee", { ...ph, gender: "f" }),
  node("vic", "Vic Lee", { gender: "m" }),
  node("wes", "Wes Whitfield", { gender: "m" }),
  node("zoe", "Zoe Quist", { gender: "f" }), // no links at all
];

let n = 0;
const link = (
  type: "parent" | "partner",
  fromNode: string,
  toNode: string,
): FamilyLink => ({ id: `l${n++}`, type, fromNode, toNode });

export const LINKS: FamilyLink[] = [
  link("partner", "george", "mary"),
  link("parent", "george", "alice"),
  link("parent", "mary", "alice"),
  link("parent", "george", "bob"),
  link("parent", "mary", "bob"),
  link("parent", "george", "carol"),
  link("parent", "mary", "carol"),
  link("partner", "alice", "dan"),
  link("partner", "bob", "priya"),
  link("partner", "carol", "tom"),
  link("parent", "ruth", "dan"),
  link("parent", "ruth", "sam"),
  link("parent", "alice", "emma"),
  link("parent", "dan", "emma"),
  link("parent", "alice", "finn"),
  link("parent", "dan", "finn"),
  link("parent", "bob", "gita"),
  link("parent", "priya", "gita"),
  link("parent", "tom", "uma"),
  link("parent", "carol", "vic"),
  link("parent", "tom", "vic"),
  link("parent", "carol", "wes"),
];

export const g = buildGraph(NODES, LINKS);

describe("graph queries", () => {
  it("finds parents", () => {
    expect(parentsOf(g, "emma").sort()).toEqual(["alice", "dan"]);
    expect(parentsOf(g, "george")).toEqual([]);
  });

  it("finds children sorted by birth year then name", () => {
    expect(childrenOf(g, "alice")).toEqual(["finn", "emma"]); // finn b.2012, emma null-year sorts after
  });

  it("finds partners", () => {
    expect(partnersOf(g, "mary")).toEqual(["george"]);
    expect(partnersOf(g, "zoe")).toEqual([]);
  });

  it("derives siblings from shared parents, excluding self", () => {
    expect(siblingsOf(g, "alice").sort()).toEqual(["bob", "carol"]);
    // half-siblings count: uma and vic share tom
    expect(siblingsOf(g, "uma")).toEqual(["vic"]);
    // wes shares carol with vic only
    expect(siblingsOf(g, "wes")).toEqual(["vic"]);
  });
});

describe("components and naming", () => {
  it("everyone but zoe is one component", () => {
    const comp = componentOf(g, "emma");
    expect(comp.size).toBe(16);
    expect(comp.has("zoe")).toBe(false);
  });

  it("zoe is her own component", () => {
    expect(componentOf(g, "zoe")).toEqual(new Set(["zoe"]));
  });

  it("names the family from the two most common member surnames", () => {
    // members only: Whitfield x6 (bob, carol, priya, gita, wes + alice? no — alice is Henderson)
    // Whitfield: bob, carol, priya, gita, wes = 5; Henderson: alice, dan, sam, emma = 4
    expect(familyName(g, componentOf(g, "emma"))).toBe(
      "Whitfield / Henderson family",
    );
  });

  it("uses a node's family_name_override verbatim (no ' family' suffix)", () => {
    const g2 = buildGraph(
      NODES.map((node) =>
        node.id === "bob"
          ? { ...node, familyNameOverride: "The Whitfield Clan" }
          : node,
      ),
      LINKS,
    );
    expect(familyName(g2, componentOf(g2, "emma"))).toBe("The Whitfield Clan");
  });

  it("ignores empty-string overrides and falls back to derivation", () => {
    const g2 = buildGraph(
      NODES.map((node) =>
        node.id === "bob" ? { ...node, familyNameOverride: "   " } : node,
      ),
      LINKS,
    );
    expect(familyName(g2, componentOf(g2, "emma"))).toBe(
      "Whitfield / Henderson family",
    );
  });

  it("picks the lowest node id when two nodes carry an override", () => {
    // alice < bob alphabetically, so alice's override wins
    const g2 = buildGraph(
      NODES.map((node) => {
        if (node.id === "bob") return { ...node, familyNameOverride: "Bobs" };
        if (node.id === "alice")
          return { ...node, familyNameOverride: "Alices" };
        return node;
      }),
      LINKS,
    );
    expect(familyName(g2, componentOf(g2, "emma"))).toBe("Alices");
  });
});

describe("wouldCreateCycle", () => {
  it("rejects making someone their own ancestor", () => {
    // emma as parent of george: george is emma's ancestor
    expect(wouldCreateCycle(g, "emma", "george")).toBe(true);
  });

  it("rejects self-parenting", () => {
    expect(wouldCreateCycle(g, "emma", "emma")).toBe(true);
  });

  it("allows normal links", () => {
    expect(wouldCreateCycle(g, "george", "uma")).toBe(false);
    expect(wouldCreateCycle(g, "zoe", "emma")).toBe(false);
  });
});

describe("validateYears", () => {
  it("accepts sane values", () => {
    expect(validateYears(1950, 2020)).toBeNull();
    expect(validateYears(null, null)).toBeNull();
    expect(validateYears(2012, null)).toBeNull();
  });
  it("rejects death before birth", () => {
    expect(validateYears(1990, 1980)).toMatch(/death/i);
  });
  it("rejects implausible years", () => {
    expect(validateYears(1700, null)).toMatch(/year/i);
    expect(validateYears(null, 2300)).toMatch(/year/i);
  });
  it("rejects NaN from unparseable input", () => {
    expect(validateYears(Number.NaN, null)).toMatch(/year/i);
    expect(validateYears(null, Number.NaN)).toMatch(/year/i);
  });
});

describe("pathBetween", () => {
  it("finds direct moves", () => {
    expect(pathBetween(g, "emma", "alice")).toBe("P");
    expect(pathBetween(g, "alice", "emma")).toBe("C");
    expect(pathBetween(g, "george", "mary")).toBe("S");
  });
  it("prefers blood over partner hops at equal length", () => {
    // emma -> ruth is PP (via dan), not some partner detour
    expect(pathBetween(g, "emma", "ruth")).toBe("PP");
  });
  it("returns null when unrelated", () => {
    expect(pathBetween(g, "zoe", "emma")).toBeNull();
  });
});

describe("relationshipBetween (label of B relative to A)", () => {
  const rel = (a: string, b: string) => relationshipBetween(g, a, b);

  it("direct family", () => {
    expect(rel("emma", "alice")).toBe("mother");
    expect(rel("emma", "dan")).toBe("father");
    expect(rel("alice", "emma")).toBe("daughter");
    expect(rel("mary", "george")).toBe("partner");
  });

  it("grandparents with gendered labels", () => {
    expect(rel("emma", "george")).toBe("grandfather");
    expect(rel("emma", "mary")).toBe("grandmother");
    expect(rel("george", "gita")).toBe("granddaughter");
  });

  it("siblings, including half-siblings, are just siblings", () => {
    expect(rel("finn", "emma")).toBe("sister");
    expect(rel("uma", "vic")).toBe("brother"); // half-siblings via tom
  });

  it("aunt/uncle and niece/nephew", () => {
    expect(rel("emma", "bob")).toBe("uncle");
    expect(rel("gita", "alice")).toBe("aunt");
    expect(rel("bob", "emma")).toBe("niece");
  });

  it("cousins", () => {
    expect(rel("emma", "gita")).toBe("cousin");
  });

  it("in-laws via one partner hop", () => {
    expect(rel("alice", "ruth")).toBe("mother-in-law"); // SP
    expect(rel("ruth", "alice")).toBe("daughter-in-law"); // CS
    expect(rel("alice", "sam")).toBe("brother-in-law"); // SPC
    expect(rel("sam", "alice")).toBe("sister-in-law"); // PCS
  });

  it("step relations", () => {
    expect(rel("carol", "uma")).toBe("stepdaughter"); // SC
    expect(rel("uma", "carol")).toBe("stepmother"); // PS
    expect(rel("wes", "uma")).toBe("stepsister"); // PSC
    expect(rel("uma", "wes")).toBe("stepbrother");
  });

  it("falls back to relative for non-canonical paths", () => {
    expect(rel("george", "ruth")).toBe("relative"); // CSP — partner hop mid-path
  });

  it("returns null for unrelated or same node", () => {
    expect(rel("zoe", "emma")).toBeNull();
    expect(rel("emma", "emma")).toBeNull();
  });
});

describe("normalizeName", () => {
  it("trims, lowercases and collapses inner whitespace", () => {
    expect(normalizeName("  Mary   Whitfield ")).toBe("mary whitfield");
    expect(normalizeName("FINN\tHenderson")).toBe("finn henderson");
    expect(normalizeName("ruth")).toBe("ruth");
    expect(normalizeName("   ")).toBe("");
  });
});

describe("sameNamePlaceholdersIn", () => {
  it("matches placeholders regardless of casing and spacing", () => {
    expect(sameNamePlaceholdersIn(g, "emma", "finn  HENDERSON")).toEqual([
      "finn",
    ]);
    expect(sameNamePlaceholdersIn(g, "emma", " Ruth Henderson ")).toEqual([
      "ruth",
    ]);
  });

  it("never returns member nodes", () => {
    // alice is a real member with that exact name
    expect(sameNamePlaceholdersIn(g, "emma", "Alice Henderson")).toEqual([]);
  });

  it("only looks inside the anchor's connected component", () => {
    // second component: zoe + a placeholder that shadows finn's name
    const g2 = buildGraph(
      [...NODES, node("finn2", "Finn Henderson", { ...ph })],
      [...LINKS, link("parent", "zoe", "finn2")],
    );
    expect(sameNamePlaceholdersIn(g2, "zoe", "Finn Henderson")).toEqual([
      "finn2",
    ]);
    expect(sameNamePlaceholdersIn(g2, "emma", "Finn Henderson")).toEqual([
      "finn",
    ]);
  });

  it("returns [] when the anchor isn't in the graph", () => {
    expect(sameNamePlaceholdersIn(g, "nobody", "Finn Henderson")).toEqual([]);
  });

  it("returns [] when nothing matches", () => {
    expect(sameNamePlaceholdersIn(g, "emma", "Totally Unknown")).toEqual([]);
  });
});

describe("placeholderMatchesForMember", () => {
  // the Nadia scenario: placeholder "Nadia" (first name only) vs member
  // "Nadia Whitfield" — should surface as a partial match
  const gNadia = buildGraph(
    [...NODES, node("nadia", "Nadia", { ...ph, birthYear: 2020 })],
    [...LINKS, link("parent", "alice", "nadia")],
  );

  it("finds exact normalized-name matches", () => {
    expect(placeholderMatchesForMember(g, "emma", "finn  HENDERSON")).toEqual({
      exact: ["finn"],
      partial: [],
    });
  });

  it("finds first-name-only partial matches", () => {
    expect(
      placeholderMatchesForMember(gNadia, "emma", "Nadia Whitfield"),
    ).toEqual({ exact: [], partial: ["nadia"] });
  });

  it("excludes exact matches from the partial list", () => {
    const g2 = buildGraph(
      [
        ...NODES,
        node("nadia", "Nadia", ph),
        node("nadiaf", "Nadia Whitfield", ph),
      ],
      [
        ...LINKS,
        link("parent", "alice", "nadia"),
        link("parent", "alice", "nadiaf"),
      ],
    );
    expect(placeholderMatchesForMember(g2, "emma", "Nadia Whitfield")).toEqual({
      exact: ["nadiaf"],
      partial: ["nadia"],
    });
  });

  it("does not partial-match an abbreviated multi-word placeholder", () => {
    // "Nadia C." is neither the full name nor just the first name
    const g2 = buildGraph(
      [...NODES, node("nadiac", "Nadia C.", ph)],
      [...LINKS, link("parent", "alice", "nadiac")],
    );
    expect(placeholderMatchesForMember(g2, "emma", "Nadia Whitfield")).toEqual({
      exact: [],
      partial: [],
    });
  });

  it("does not match a last-name-only placeholder", () => {
    const g2 = buildGraph(
      [...NODES, node("camp", "Whitfield", ph)],
      [...LINKS, link("parent", "alice", "camp")],
    );
    expect(placeholderMatchesForMember(g2, "emma", "Nadia Whitfield")).toEqual({
      exact: [],
      partial: [],
    });
  });

  it("returns nothing when neither full name nor first name matches", () => {
    expect(placeholderMatchesForMember(g, "emma", "Totally Unknown")).toEqual({
      exact: [],
      partial: [],
    });
  });

  it("only looks inside the anchor's component", () => {
    // nadia hangs off alice's component — invisible from zoe's
    expect(
      placeholderMatchesForMember(gNadia, "zoe", "Nadia Whitfield"),
    ).toEqual({
      exact: [],
      partial: [],
    });
  });

  it("never matches member nodes", () => {
    // alice is a real member with this exact name
    expect(placeholderMatchesForMember(g, "emma", "Alice Henderson")).toEqual({
      exact: [],
      partial: [],
    });
  });

  it("returns nothing for blank names", () => {
    expect(placeholderMatchesForMember(g, "emma", "   ")).toEqual({
      exact: [],
      partial: [],
    });
  });
});

describe("relationshipLabel neutral fallbacks", () => {
  it("uses neutral words when gender is unknown", () => {
    expect(relationshipLabel("P", null)).toBe("parent");
    expect(relationshipLabel("PP", null)).toBe("grandparent");
    expect(relationshipLabel("PPP", null)).toBe("great-grandparent");
    expect(relationshipLabel("PPC", null)).toBe("aunt/uncle");
    expect(relationshipLabel("PCC", null)).toBe("niece/nephew");
    expect(relationshipLabel("PSC", null)).toBe("step-sibling");
    expect(relationshipLabel("SP", null)).toBe("parent-in-law");
  });
  it("collapses deep cousins", () => {
    expect(relationshipLabel("PPPCCC", null)).toBe("second cousin");
    expect(relationshipLabel("PPPPCCCC", null)).toBe("cousin");
    expect(relationshipLabel("PPCC", null)).toBe("cousin");
  });
});
