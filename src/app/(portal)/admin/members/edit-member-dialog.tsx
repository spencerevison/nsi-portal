"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemberRow, RoleOption } from "@/lib/members";
import { updateMember } from "./actions";

export function EditMemberDialog({
  member,
  roles,
  open,
  onOpenChange,
}: {
  member: MemberRow;
  roles: RoleOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [roleId, setRoleId] = useState(member.role_id ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateMember({
        id: member.id,
        first_name: String(fd.get("first_name") ?? ""),
        last_name: String(fd.get("last_name") ?? ""),
        lot_number: String(fd.get("lot_number") ?? ""),
        role_id: roleId,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="text-sm">{member.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_first_name">First name</Label>
              <Input
                id="edit_first_name"
                name="first_name"
                defaultValue={member.first_name}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_last_name">Last name</Label>
              <Input
                id="edit_last_name"
                name="last_name"
                defaultValue={member.last_name}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_lot_number">Lot number</Label>
              <Input
                id="edit_lot_number"
                name="lot_number"
                defaultValue={member.lot_number ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_role">Role</Label>
              <Select
                items={roles.map((r) => ({ value: r.id, label: r.name }))}
                value={roleId}
                onValueChange={(v) => setRoleId(v ?? "")}
              >
                <SelectTrigger id="edit_role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !roleId}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
