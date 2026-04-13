"use client";

import { useState, useTransition } from "react";
import { inviteMember } from "./actions";
import type { RoleOption } from "@/lib/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  roles: RoleOption[];
  onClose: () => void;
};

export function AddMemberForm({ roles, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const defaultRole = roles.find((r) => r.is_default);
  const [roleId, setRoleId] = useState<string>(defaultRole?.id ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const result = await inviteMember({
        email: String(fd.get("email") ?? ""),
        first_name: String(fd.get("first_name") ?? ""),
        last_name: String(fd.get("last_name") ?? ""),
        lot_number: String(fd.get("lot_number") ?? ""),
        role_id: roleId,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setRoleId(defaultRole?.id ?? "");
      onClose();
    });
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" name="first_name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" name="last_name" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lot_number">Lot number</Label>
              <Input id="lot_number" name="lot_number" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role_id">Role</Label>
              <Select
                items={roles.map((r) => ({ value: r.id, label: r.name }))}
                value={roleId}
                onValueChange={(v) => setRoleId(v ?? "")}
              >
                <SelectTrigger id="role_id" className="w-full">
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

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={pending || !roleId}>
              {pending ? "Sending..." : "Send invitation"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                onClose();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
