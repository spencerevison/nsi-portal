"use client";

import { useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  CustomFieldEditor,
  parseFieldValue,
} from "@/components/custom-field-editor";
import type { ProfileData } from "@/lib/directory";
import {
  updateProfile,
  updateCustomFieldValue,
  updateNotifications,
} from "./actions";

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const { openUserProfile } = useClerk();
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
    <div className="space-y-6">
      {/* Profile info */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold">Profile Information</h2>
          <p className="text-muted-foreground text-xs">
            Name and email are managed in your{" "}
            <button
              type="button"
              className="text-accent-600 hover:text-accent-800 underline underline-offset-2"
              onClick={() => openUserProfile()}
            >
              Account Settings
            </button>
            .
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Name</Label>
              <p className="text-sm">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="text-sm">{profile.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-muted-foreground text-xs">
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
              <Label
                htmlFor="lot_number"
                className="text-muted-foreground text-xs"
              >
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
            <p className="text-muted-foreground text-xs">
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
            <p className="text-muted-foreground text-xs">
              Control which message board activity triggers an email. Group
              emails from admin/council are always delivered.
            </p>
          </div>
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">New posts</span>
              <p className="text-muted-foreground text-xs">
                Get notified when someone creates a new post
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifyNewPost}
              onChange={(e) => setNotifyNewPost(e.target.checked)}
              className="border-input size-5 rounded"
            />
          </label>
          <div className="border-border border-t" />
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Replies</span>
              <p className="text-muted-foreground text-xs">
                Get notified when someone comments on your post
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifyReplies}
              onChange={(e) => setNotifyReplies(e.target.checked)}
              className="border-input size-5 rounded"
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-muted-foreground text-sm">Changes saved</span>
        )}
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
