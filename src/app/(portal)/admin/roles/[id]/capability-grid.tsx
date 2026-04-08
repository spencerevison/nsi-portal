"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateCapabilities } from "../actions";

export function CapabilityGrid({
  roleId,
  currentCapabilities,
  allCapabilities,
}: {
  roleId: string;
  currentCapabilities: string[];
  allCapabilities: { key: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [caps, setCaps] = useState(new Set(currentCapabilities));
  const [saved, setSaved] = useState(false);

  const hasChanges =
    caps.size !== currentCapabilities.length ||
    [...caps].some((c) => !currentCapabilities.includes(c));

  function toggle(key: string) {
    setCaps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateCapabilities(roleId, [...caps]);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  // group capabilities by category (before the dot)
  const groups = new Map<string, { key: string; label: string }[]>();
  for (const cap of allCapabilities) {
    const category = cap.key.split(".")[0];
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(cap);
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold">Capabilities</h2>
          <p className="text-muted-foreground text-xs">
            Select what members with this role can do.
          </p>
        </div>

        {[...groups.entries()].map(([category, capList]) => (
          <div key={category}>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              {category}
            </h3>
            <div className="space-y-2">
              {capList.map((cap) => (
                <label
                  key={cap.key}
                  className="hover:bg-muted flex items-center gap-3 rounded-md px-2 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={caps.has(cap.key)}
                    onChange={() => toggle(cap.key)}
                    className="border-input size-4 rounded"
                  />
                  <div>
                    <span className="text-sm">{cap.key}</span>
                    <p className="text-muted-foreground text-xs">{cap.label}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={pending || !hasChanges}>
            {pending ? "Saving..." : "Save capabilities"}
          </Button>
          {saved && (
            <span className="text-muted-foreground text-sm">Saved</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
