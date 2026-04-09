import type { RoleOption } from "@/lib/members";

export type ParsedRow = {
  email: string;
  first_name: string;
  last_name: string;
  lot_number: string;
  role: string;
  role_id: string;
  errors: string[];
};

export function parseCSV(text: string, roles: RoleOption[]): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim());

  const colIdx = {
    email: header.indexOf("email"),
    first_name: header.indexOf("first_name"),
    last_name: header.indexOf("last_name"),
    lot_number: header.indexOf("lot_number"),
    role: header.indexOf("role"),
  };

  if (colIdx.email === -1) {
    return [
      {
        email: "",
        first_name: "",
        last_name: "",
        lot_number: "",
        role: "",
        role_id: "",
        errors: ['Missing required column: "email"'],
      },
    ];
  }

  const roleLookup = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));
  const defaultRole = roles.find((r) => r.is_default);

  return lines.slice(1).map((line) => {
    // Simple CSV split - handles basic cases. Doesn't handle quoted commas
    // but that's fine for names/emails.
    const cols = line.split(",").map((c) => c.trim());
    const errors: string[] = [];

    const email = cols[colIdx.email] ?? "";
    const first_name =
      colIdx.first_name >= 0 ? (cols[colIdx.first_name] ?? "") : "";
    const last_name =
      colIdx.last_name >= 0 ? (cols[colIdx.last_name] ?? "") : "";
    const lot_number =
      colIdx.lot_number >= 0 ? (cols[colIdx.lot_number] ?? "") : "";
    const roleName = colIdx.role >= 0 ? (cols[colIdx.role] ?? "") : "";

    if (!email || !email.includes("@")) errors.push("Invalid email");
    if (!first_name) errors.push("First name required");
    if (!last_name) errors.push("Last name required");

    let role_id = defaultRole?.id ?? "";
    if (roleName) {
      const found = roleLookup.get(roleName.toLowerCase());
      if (found) {
        role_id = found;
      } else {
        errors.push(`Unknown role: "${roleName}"`);
      }
    }

    return {
      email,
      first_name,
      last_name,
      lot_number,
      role: roleName || defaultRole?.name || "",
      role_id,
      errors,
    };
  });
}
