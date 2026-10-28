import { describe, it, expect } from "vitest";
import { extractMentionIds, sanitizeRichText } from "@/lib/rich-text";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const span = (id: string) =>
  `<span data-type="mention" data-id="${id}" data-label="Jane">@Jane</span>`;

describe("mentions", () => {
  it("survives sanitizing and extracts unique ids", () => {
    const html = sanitizeRichText(
      `<p>hi ${span(A)} and ${span(B)} ${span(A)}</p>`,
    );
    expect(extractMentionIds(html).sort()).toEqual([A, B]);
  });

  it("ignores plain spans and strips event attrs", () => {
    const html = sanitizeRichText(
      `<span data-id="x" onclick="evil()">hi</span>`,
    );
    expect(extractMentionIds(html)).toEqual([]);
    expect(html).not.toContain("onclick");
  });

  it("drops non-uuid ids so one junk value can't break the lookup", () => {
    const html = sanitizeRichText(`${span("not-a-uuid")} ${span(A)}`);
    expect(extractMentionIds(html)).toEqual([A]);
  });

  it("handles data-id before data-type", () => {
    const html = sanitizeRichText(
      `<span data-id="${A}" data-type="mention">@x</span>`,
    );
    expect(extractMentionIds(html)).toEqual([A]);
  });
});
