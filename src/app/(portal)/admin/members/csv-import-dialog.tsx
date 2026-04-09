"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, CheckCircle2, XCircle, Download } from "lucide-react";
import { bulkInviteMembers } from "./actions";
import type { RoleOption } from "@/lib/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ParsedRow = {
  email: string;
  first_name: string;
  last_name: string;
  lot_number: string;
  role: string;
  role_id: string;
  errors: string[];
};

type ImportResult = {
  email: string;
  ok: boolean;
  error?: string;
};

type Step = "upload" | "preview" | "importing" | "results";

// CSV template content
const TEMPLATE_CSV =
  "email,first_name,last_name,lot_number,role\njane@example.com,Jane,Doe,A-1,Member\n";

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "member-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string, roles: RoleOption[]): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());

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

  const roleLookup = new Map(
    roles.map((r) => [r.name.toLowerCase(), r.id]),
  );
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

export function CsvImportDialog({ roles }: { roles: RoleOption[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setRows([]);
    setResults([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text, roles);
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function handleImport() {
    setStep("importing");
    startTransition(async () => {
      const res = await bulkInviteMembers(
        validRows.map((r) => ({
          email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          lot_number: r.lot_number || undefined,
          role_id: r.role_id,
        })),
      );
      setResults(
        res.results.map((r) => ({
          email: r.email,
          ok: r.ok,
          error: r.ok ? undefined : r.error,
        })),
      );
      setStep("results");
    });
  }

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Import CSV
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Members from CSV</DialogTitle>
        </DialogHeader>

        {/* Upload step */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Upload a CSV file with columns:{" "}
              <code className="bg-muted rounded px-1 text-xs">
                email, first_name, last_name, lot_number, role
              </code>
            </p>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="text-sm file:mr-3 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="size-3.5" />
              Download template
            </Button>
          </div>
        )}

        {/* Preview step */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-900"
              >
                {validRows.length} valid
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive">{invalidRows.length} errors</Badge>
              )}
            </div>

            <div className="max-h-72 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={
                        row.errors.length > 0 ? "bg-red-50/50" : undefined
                      }
                    >
                      <TableCell className="text-sm">{row.email}</TableCell>
                      <TableCell className="text-sm">
                        {row.first_name} {row.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.lot_number || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.role || "—"}
                      </TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <span className="text-xs text-red-600">
                            {row.errors.join("; ")}
                          </span>
                        ) : (
                          <span className="text-xs text-green-700">Ready</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0}
              >
                Import {validRows.length} member
                {validRows.length !== 1 ? "s" : ""}
              </Button>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Importing step */}
        {step === "importing" && (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Importing {validRows.length} members... This may take a moment.
          </div>
        )}

        {/* Results step */}
        {step === "results" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {successCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-900"
                >
                  {successCount} imported
                </Badge>
              )}
              {failCount > 0 && (
                <Badge variant="destructive">{failCount} failed</Badge>
              )}
            </div>

            <div className="max-h-72 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell>
                        {r.ok ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-700">
                            <CheckCircle2 aria-hidden="true" className="size-3.5" />
                            Invited
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-red-600">
                            <XCircle aria-hidden="true" className="size-3.5" />
                            {r.error}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={() => { reset(); setOpen(false); }}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
