"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ProfileData } from "@/lib/directory";
import {
  updateProfile,
  updateCustomFieldValue,
  updateNotifications,
} from "./actions";

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // profile fields (name + email are managed by Clerk, read-only here)
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [lotNumber, setLotNumber] = useState(profile.lot_number ?? "");

  // notification prefs
  const [notifyNewPost, setNotifyNewPost] = useState(profile.notify_new_post);
  const [notifyReplies, setNotifyReplies] = useState(profile.notify_replies);

  // custom fields — track values + visibility locally
  const [cfState, setCfState] = useState(
    profile.custom_fields.map((cf) => ({
      field_id: cf.field_id,
      field_name: cf.field_name,
      value: cf.value,
      visible: cf.visible,
      parsed: parseFieldValue(cf.value, cf.field_name),
    })),
  );

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateProfile({ phone, lotNumber });

      for (const cf of cfState) {
        await updateCustomFieldValue({
          fieldId: cf.field_id,
          value: JSON.stringify(cf.parsed),
          visible: cf.visible,
        });
      }

      await updateNotifications({
        notifyNewPost,
        notifyReplies,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile info */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold">Profile Information</h2>
          <p className="text-xs text-muted-foreground">
            Name and email are managed in your{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => {
                // trigger Clerk's manage account modal via the UserButton
                const btn = document.querySelector<HTMLButtonElement>(
                  '[data-clerk-user-button-trigger]'
                );
                btn?.click();
              }}
            >
              Account Settings
            </button>
            .
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <p className="text-sm">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm">{profile.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs text-muted-foreground">
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lot_number" className="text-xs text-muted-foreground">
                Lot Number
              </Label>
              <Input
                id="lot_number"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory info (custom fields) */}
      <Card>
        <CardContent className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold">Directory Information</h2>
            <p className="text-xs text-muted-foreground">
              These fields are optional and visible in the member directory only
              if you choose to share them.
            </p>
          </div>

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
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Notification Preferences</h2>
            <p className="text-xs text-muted-foreground">
              Control which community board activity triggers an email. Group
              emails from admin/council are always delivered.
            </p>
          </div>
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">New posts</span>
              <p className="text-xs text-muted-foreground">
                Get notified when someone creates a new post
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifyNewPost}
              onChange={(e) => setNotifyNewPost(e.target.checked)}
              className="size-5 rounded border-input"
            />
          </label>
          <div className="border-t border-border" />
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Replies</span>
              <p className="text-xs text-muted-foreground">
                Get notified when someone comments on your post
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifyReplies}
              onChange={(e) => setNotifyReplies(e.target.checked)}
              className="size-5 rounded border-input"
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-muted-foreground">Changes saved</span>
        )}
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// --- Custom field editor ---

type FieldItem = Record<string, string>;

function parseFieldValue(
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

function CustomFieldEditor({
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
    onItemsChange([...items, isChildren ? { name: "", birthYear: "" } : { name: "" }]);
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
        <Label className="text-xs text-muted-foreground">{fieldName}</Label>
        <button
          type="button"
          onClick={addItem}
          className="text-xs font-medium text-primary hover:underline"
        >
          + Add {fieldName === "Children" ? "child" : fieldName.toLowerCase().replace(/s$/, "")}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs italic text-muted-foreground">
          None added yet.
        </p>
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
              className="rounded p-1 text-muted-foreground hover:text-foreground"
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
          className="rounded border-input"
        />
        <span className="text-xs text-muted-foreground">
          Show in member directory
        </span>
      </label>
    </div>
  );
}
