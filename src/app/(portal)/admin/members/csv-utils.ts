import type { RoleOption } from "@/lib/members";

export type ParsedRow = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  lot_number: string;
  address: string;
  role: string;
  role_id: string;
  errors: string[];
};

// Tokenize CSV text into rows of cells, respecting RFC-4180-ish double-quoted
// fields. Quoted regions may contain commas and newlines; doubled quotes
// inside a quoted field collapse to one. A quote only opens a field if it's
// the first non-whitespace char of that field — stray quotes mid-cell are
// literal so things like `O"Brien` don't silently merge the rest of the row.
export function tokenizeCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  let leadingOnly = true; // true while we've only seen whitespace in the field

  const pushCell = () => {
    row.push(cur.trim());
    cur = "";
    leadingOnly = true;
  };
  const pushRow = () => {
    if (row.some((c) => c.length > 0)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"' && leadingOnly) {
      inQuotes = true;
      leadingOnly = false;
      cur = ""; // drop any leading whitespace before the opening quote
    } else if (ch === ",") {
      pushCell();
    } else if (ch === "\n") {
      pushCell();
      pushRow();
    } else if (ch === "\r") {
      // swallow — a following \n (CRLF) will close the row; lone \r is rare
    } else {
      if (ch !== " " && ch !== "\t") leadingOnly = false;
      cur += ch;
    }
  }
  // flush trailing cell / row (no trailing newline)
  pushCell();
  pushRow();
  return rows;
}

export function parseCSV(text: string, roles: RoleOption[]): ParsedRow[] {
  const allRows = tokenizeCsv(text);
  if (allRows.length < 2) return [];

  const header = allRows[0].map((h) => h.toLowerCase());

  const colIdx = {
    email: header.indexOf("email"),
    first_name: header.indexOf("first_name"),
    last_name: header.indexOf("last_name"),
    phone: header.indexOf("phone"),
    lot_number: header.indexOf("lot_number"),
    address: header.indexOf("address"),
    role: header.indexOf("role"),
  };

  if (colIdx.email === -1) {
    return [
      {
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        lot_number: "",
        address: "",
        role: "",
        role_id: "",
        errors: ['Missing required column: "email"'],
      },
    ];
  }

  const roleLookup = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));
  const defaultRole = roles.find((r) => r.is_default);

  return allRows.slice(1).map((cols) => {
    const errors: string[] = [];

    const email = cols[colIdx.email] ?? "";
    const first_name =
      colIdx.first_name >= 0 ? (cols[colIdx.first_name] ?? "") : "";
    const last_name =
      colIdx.last_name >= 0 ? (cols[colIdx.last_name] ?? "") : "";
    const phone = colIdx.phone >= 0 ? (cols[colIdx.phone] ?? "") : "";
    const lot_number =
      colIdx.lot_number >= 0 ? (cols[colIdx.lot_number] ?? "") : "";
    const address = colIdx.address >= 0 ? (cols[colIdx.address] ?? "") : "";
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
      phone,
      lot_number,
      address,
      role: roleName || defaultRole?.name || "",
      role_id,
      errors,
    };
  });
}
