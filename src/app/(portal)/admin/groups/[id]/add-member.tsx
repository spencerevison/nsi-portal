"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMemberToGroup } from "../actions";

type AvailableMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export function AddGroupMember({
  groupId,
  availableMembers,
}: {
  groupId: string;
  availableMembers: AvailableMember[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState("");

  function handleAdd() {
    if (!selectedId) return;
    startTransition(async () => {
      await addMemberToGroup(groupId, selectedId);
      setSelectedId("");
    });
  }

  if (availableMembers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="w-full sm:w-64">
        <Select
          items={availableMembers.map((m) => ({
            value: m.id,
            label: `${m.first_name} ${m.last_name}`,
          }))}
          value={selectedId}
          onValueChange={(v) => setSelectedId(v ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a member to add..." />
          </SelectTrigger>
          <SelectContent>
            {availableMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleAdd} disabled={pending || !selectedId}>
        {pending ? "Adding..." : "Add to email group"}
      </Button>
    </div>
  );
}
