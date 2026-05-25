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

  it("preserves commas inside quoted address cells", () => {
    const csv =
      'email,first_name,last_name,address\njane@test.com,Jane,Doe,"123 Main St, Vancouver, BC V6B 1A1"\n';
    const rows = parseCSV(csv, roles);
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe("123 Main St, Vancouver, BC V6B 1A1");
    expect(rows[0].errors).toHaveLength(0);
  });

  it("preserves embedded newlines inside quoted address cells", () => {
    // Excel-style: an address cell with internal line breaks is quoted with
    // a literal \n inside. The parser must NOT treat that as a row boundary.
    const csv =
      'email,first_name,last_name,address\njane@test.com,Jane,Doe,"123 Main St\n5th Floor\nVancouver"\n';
    const rows = parseCSV(csv, roles);
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe("123 Main St\n5th Floor\nVancouver");
    expect(rows[0].errors).toHaveLength(0);
  });

  it("collapses doubled quotes inside a quoted field", () => {
    const csv =
      'email,first_name,last_name,address\njane@test.com,Jane,Doe,"She said ""hi"" here"\n';
    const rows = parseCSV(csv, roles);
    expect(rows[0].address).toBe('She said "hi" here');
  });

  it("treats a stray mid-field quote as a literal character", () => {
    // Pre-fix this would flip into quoted state and silently swallow the
    // comma + role into a single cell.
    const csv =
      "email,first_name,last_name,address,role\njane@test.com,Jane,O'Doe,Van\"couver,Member\n";
    const rows = parseCSV(csv, roles);
    expect(rows[0].address).toBe('Van"couver');
    expect(rows[0].role).toBe("Member");
    expect(rows[0].errors).toHaveLength(0);
  });

  it("handles CRLF line endings", () => {
    const csv =
      "email,first_name,last_name\r\njane@test.com,Jane,Doe\r\njohn@test.com,John,Roe\r\n";
    const rows = parseCSV(csv, roles);
    expect(rows).toHaveLength(2);
    expect(rows[0].email).toBe("jane@test.com");
    expect(rows[1].email).toBe("john@test.com");
  });

  it("round-trips the dialog's TEMPLATE_CSV", () => {
    // Mirrors csv-import-dialog.tsx — keep these in sync.
    const TEMPLATE_CSV =
      'email,first_name,last_name,lot_number,address,role\njane@example.com,Jane,Doe,42,"123 Main St, Vancouver, BC V6B 1A1",Member\n';
    const rows = parseCSV(TEMPLATE_CSV, roles);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "jane@example.com",
      first_name: "Jane",
      last_name: "Doe",
      lot_number: "42",
      address: "123 Main St, Vancouver, BC V6B 1A1",
      role: "Member",
      errors: [],
    });
  });
});
