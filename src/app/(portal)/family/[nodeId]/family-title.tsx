"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setFamilyName } from "./actions";

export function FamilyTitle({
  nodeId,
  name,
  isOverride,
  canEdit,
}: {
  nodeId: string;
  name: string;
  isOverride: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setValue(name);
    setError(null);
    setEditing(true);
  }

  // name can be the derived title or an override; submit("") resets to derived
  function submit(next: string) {
    setError(null);
    startTransition(async () => {
      const res = await setFamilyName({ nodeId, name: next });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{name}</h1>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Rename family"
            onClick={open}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 max-w-xs text-base"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(value);
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button size="sm" disabled={pending} onClick={() => submit(value)}>
          {pending ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
        {isOverride && (
          <button
            type="button"
            disabled={pending}
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 disabled:opacity-50"
            onClick={() => submit("")}
          >
            Reset to default
          </button>
        )}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
