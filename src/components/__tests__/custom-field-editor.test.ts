import { describe, it, expect } from "vitest";
import { parseFieldValue } from "@/components/custom-field-editor";

describe("parseFieldValue", () => {
  it("returns empty array for null", () => {
    expect(parseFieldValue(null, "Children")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseFieldValue("", "Dogs")).toEqual([]);
  });

  it("parses valid JSON array", () => {
    const json = JSON.stringify([{ name: "Rex" }, { name: "Buddy" }]);
    expect(parseFieldValue(json, "Dogs")).toEqual([
      { name: "Rex" },
      { name: "Buddy" },
    ]);
  });

  it("handles legacy plain text for Children", () => {
    expect(parseFieldValue("Alice", "Children")).toEqual([{ name: "Alice" }]);
  });

  it("handles legacy plain text for Dogs", () => {
    expect(parseFieldValue("Rex", "Dogs")).toEqual([{ name: "Rex" }]);
  });

  it("falls back to legacy format for invalid JSON on known fields", () => {
    // Children/Dogs fields fall back to wrapping invalid JSON as a name
    expect(parseFieldValue("{broken", "Children")).toEqual([
      { name: "{broken" },
    ]);
  });

  it("returns empty array for invalid JSON on unknown fields", () => {
    expect(parseFieldValue("{broken", "Other")).toEqual([]);
  });

  it("returns empty array for JSON non-array", () => {
    expect(parseFieldValue('{"name":"test"}', "Dogs")).toEqual([]);
  });

  it("returns empty array for unknown legacy field", () => {
    expect(parseFieldValue("some text", "Unknown")).toEqual([]);
  });
});
