import { describe, it, expect } from "vitest";
import { deriveStatus } from "@/lib/members";

describe("deriveStatus", () => {
  const base = {
    active: true,
    invited_at: null,
    accepted_at: null,
    revoked_at: null,
  };

  it("returns Draft when nothing has happened", () => {
    expect(deriveStatus(base)).toBe("Draft");
  });

  it("returns Invited when invited_at is set", () => {
    expect(deriveStatus({ ...base, invited_at: "2026-01-01" })).toBe("Invited");
  });

  it("returns Active when accepted_at is set", () => {
    expect(
      deriveStatus({
        ...base,
        invited_at: "2026-01-01",
        accepted_at: "2026-01-02",
      }),
    ).toBe("Active");
  });

  it("returns Revoked when revoked_at is set", () => {
    expect(
      deriveStatus({
        ...base,
        invited_at: "2026-01-01",
        revoked_at: "2026-01-03",
      }),
    ).toBe("Revoked");
  });

  it("returns Inactive when active is false", () => {
    expect(
      deriveStatus({ ...base, active: false, accepted_at: "2026-01-02" }),
    ).toBe("Inactive");
  });

  it("Revoked takes priority over Active", () => {
    expect(
      deriveStatus({
        ...base,
        accepted_at: "2026-01-02",
        revoked_at: "2026-01-03",
      }),
    ).toBe("Revoked");
  });
});
