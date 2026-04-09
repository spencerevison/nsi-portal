import { describe, it, expect } from "vitest";
import { parseCSV } from "../csv-utils";
import type { RoleOption } from "@/lib/members";

const roles: RoleOption[] = [
  { id: "r1", name: "Member", is_default: true },
  { id: "r2", name: "Admin", is_default: false },
];

describe("parseCSV", () => {
  it("parses a valid CSV", () => {
    const csv =
      "email,first_name,last_name,lot_number,role\njane@test.com,Jane,Doe,5,Member\n";
    const rows = parseCSV(csv, roles);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("jane@test.com");
    expect(rows[0].first_name).toBe("Jane");
    expect(rows[0].last_name).toBe("Doe");
    expect(rows[0].lot_number).toBe("5");
    expect(rows[0].role_id).toBe("r1");
    expect(rows[0].errors).toHaveLength(0);
  });

  it("returns empty array for header-only CSV", () => {
    expect(parseCSV("email,first_name,last_name", roles)).toEqual([]);
  });

  it("returns error when email column is missing", () => {
    const csv = "name,phone\nJane,555\n";
    const rows = parseCSV(csv, roles);
    expect(rows).toHaveLength(1);
    expect(rows[0].errors).toContain('Missing required column: "email"');
  });

  it("flags invalid email", () => {
    const csv = "email,first_name,last_name\nnotanemail,Jane,Doe\n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].errors).toContain("Invalid email");
  });

  it("flags missing first name", () => {
    const csv = "email,first_name,last_name\njane@test.com,,Doe\n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].errors).toContain("First name required");
  });

  it("flags missing last name", () => {
    const csv = "email,first_name,last_name\njane@test.com,Jane,\n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].errors).toContain("Last name required");
  });

  it("flags unknown role", () => {
    const csv =
      "email,first_name,last_name,role\njane@test.com,Jane,Doe,Moderator\n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].errors).toContain('Unknown role: "Moderator"');
  });

  it("uses default role when role column is empty", () => {
    const csv = "email,first_name,last_name,role\njane@test.com,Jane,Doe,\n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].role_id).toBe("r1");
    expect(rows[0].role).toBe("Member");
    expect(rows[0].errors).toHaveLength(0);
  });

  it("uses default role when role column is absent", () => {
    const csv = "email,first_name,last_name\njane@test.com,Jane,Doe\n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].role_id).toBe("r1");
  });

  it("role matching is case insensitive", () => {
    const csv =
      "email,first_name,last_name,role\njane@test.com,Jane,Doe,admin\n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].role_id).toBe("r2");
    expect(rows[0].errors).toHaveLength(0);
  });

  it("handles multiple rows with mixed validity", () => {
    const csv = [
      "email,first_name,last_name",
      "good@test.com,Jane,Doe",
      "bad,Missing,Name",
    ].join("\n");
    const rows = parseCSV(csv, roles);
    expect(rows).toHaveLength(2);
    expect(rows[0].errors).toHaveLength(0);
    expect(rows[1].errors).toContain("Invalid email");
  });

  it("trims whitespace from values", () => {
    const csv = "email,first_name,last_name\n  jane@test.com , Jane , Doe \n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].email).toBe("jane@test.com");
    expect(rows[0].first_name).toBe("Jane");
    expect(rows[0].last_name).toBe("Doe");
  });
});
