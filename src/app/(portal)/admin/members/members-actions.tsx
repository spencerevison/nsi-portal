"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { RoleOption } from "@/lib/members";
import { Button } from "@/components/ui/button";
import { AddMemberForm } from "./add-member-form";
import { CsvImportDialog } from "./csv-import-dialog";

export function MembersActions({ roles }: { roles: RoleOption[] }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return <AddMemberForm roles={roles} onClose={() => setOpen(false)} />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add member
      </Button>
      <CsvImportDialog roles={roles} />
    </div>
  );
}
