"use client";

import { useState, useEffect, useTransition } from "react";
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
import {
  CustomFieldEditor,
  parseFieldValue,
  type FieldItem,
} from "@/components/custom-field-editor";
import type { MemberRow, RoleOption } from "@/lib/members";
import {
  updateMember,
  getAdminMemberCustomFields,
  adminUpdateCustomFieldValue,
} from "./actions";

type CfState = {
  field_id: string;
  field_name: string;
  value: string | null;
  visible: boolean;
  parsed: FieldItem[];
};

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

  // custom fields — loaded on open
  const [cfState, setCfState] = useState<CfState[]>([]);
  const [cfLoading, setCfLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCfLoading(true);
    getAdminMemberCustomFields(member.id).then((fields) => {
      setCfState(
        fields.map((cf) => ({
          ...cf,
          parsed: parseFieldValue(cf.value, cf.field_name),
        })),
      );
      setCfLoading(false);
    });
  }, [open, member.id]);

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

      // save custom fields
      for (const cf of cfState) {
        await adminUpdateCustomFieldValue({
          userId: member.id,
          fieldId: cf.field_id,
          value: JSON.stringify(cf.parsed),
          visible: cf.visible,
        });
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

          {/* Custom fields */}
          {cfLoading ? (
            <p className="text-muted-foreground text-xs">Loading fields...</p>
          ) : (
            cfState.length > 0 && (
              <div className="border-border space-y-3 border-t pt-3">
                <Label className="text-muted-foreground text-xs">
                  Directory Fields
                </Label>
                {cfState.map((cf, cfIdx) => (
                  <CustomFieldEditor
                    key={cf.field_id}
                    fieldName={cf.field_name}
                    items={cf.parsed}
                    visible={cf.visible}
                    onItemsChange={(items) => {
                      setCfState((prev) => {
                        const next = [...prev];
                        next[cfIdx] = { ...next[cfIdx], parsed: items };
                        return next;
                      });
                    }}
                    onVisibleChange={(v) => {
                      setCfState((prev) => {
                        const next = [...prev];
                        next[cfIdx] = { ...next[cfIdx], visible: v };
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            )
          )}

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
