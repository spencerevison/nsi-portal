"use client";

import { X } from "lucide-react";
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
  visible,
  onItemsChange,
  onVisibleChange,
}: {
  fieldName: string;
  items: FieldItem[];
  visible: boolean;
  onItemsChange: (items: FieldItem[]) => void;
  onVisibleChange: (v: boolean) => void;
}) {
  const isChildren = fieldName === "Children";

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
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-muted-foreground text-xs">{fieldName}</Label>
        <button
          type="button"
          onClick={addItem}
          className="text-primary text-xs font-medium hover:underline"
        >
          + Add{" "}
          {fieldName === "Children"
            ? "child"
            : fieldName.toLowerCase().replace(/s$/, "")}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-muted-foreground text-xs italic">None added yet.</p>
      )}

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
              className="text-muted-foreground hover:text-foreground rounded p-1"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <label className="mt-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => onVisibleChange(e.target.checked)}
          className="border-input rounded"
        />
        <span className="text-muted-foreground text-xs">
          Show in member directory
        </span>
      </label>
    </div>
  );
}
