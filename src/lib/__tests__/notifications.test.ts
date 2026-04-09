import { describe, it, expect } from "vitest";
import { isDeliverable, BLOCKED_DOMAINS } from "@/lib/notifications";

describe("isDeliverable", () => {
  it("blocks example.com", () => {
    expect(isDeliverable("test@example.com")).toBe(false);
  });

  it("blocks example.org", () => {
    expect(isDeliverable("test@example.org")).toBe(false);
  });

  it("blocks example.net", () => {
    expect(isDeliverable("test@example.net")).toBe(false);
  });

  it("allows normal domains", () => {
    expect(isDeliverable("user@gmail.com")).toBe(true);
  });

  it("allows custom domains", () => {
    expect(isDeliverable("admin@nsiportal.ca")).toBe(true);
  });

  it("returns false for missing domain", () => {
    expect(isDeliverable("nodomain")).toBe(false);
  });

  it("is case insensitive on domain", () => {
    expect(isDeliverable("test@EXAMPLE.COM")).toBe(false);
  });

  it("has the expected blocked domains", () => {
    expect(BLOCKED_DOMAINS).toEqual([
      "example.com",
      "example.org",
      "example.net",
    ]);
  });
});
