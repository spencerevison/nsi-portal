"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FieldItem = Record<string, string>;

export function parseFieldValue(
  value: string | null,
  fieldName: string,
): FieldItem[] {
  if (!value) return [];
  try {
    const arr = JSON.parse(value);
    return Array.isArray(arr) ? arr : [];
  } catch {
    // legacy plain-text value
    if (fieldName === "Children") return [{ name: value }];
    if (fieldName === "Dogs") return [{ name: value }];
    return [];
  }
}

export function CustomFieldEditor({
  fieldName,
  items,
  onItemsChange,
}: {
  fieldName: string;
  items: FieldItem[];
  onItemsChange: (items: FieldItem[]) => void;
}) {
  const isChildren = fieldName === "Children";
  const singular =
    fieldName === "Children"
      ? "child"
      : fieldName.toLowerCase().replace(/s$/, "");

  function addItem() {
    onItemsChange([
      ...items,
      isChildren ? { name: "", birthYear: "" } : { name: "" },
    ]);
  }

  function removeItem(idx: number) {
    onItemsChange(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, key: string, val: string) {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    onItemsChange(next);
  }

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs">{fieldName}</Label>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Name"
                value={item.name ?? ""}
                onChange={(e) => updateItem(i, "name", e.target.value)}
                className="flex-1"
              />
              {isChildren && (
                <Input
                  placeholder="Birth year"
                  value={item.birthYear ?? ""}
                  onChange={(e) => updateItem(i, "birthYear", e.target.value)}
                  className="w-28"
                />
              )}
              <button
                type="button"
                onClick={() => removeItem(i)}
                aria-label={`Remove ${singular}`}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addItem}
        className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
      >
        <Plus className="size-3.5" />
        Add {singular}
      </button>
    </div>
  );
}
