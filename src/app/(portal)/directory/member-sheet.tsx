"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import type { DirectoryMember, CustomField } from "@/lib/directory";
import type { DirectoryFamilySummary, FamilyEntry } from "@/lib/family-data";
import { MemberAvatar } from "./member-avatar";

function EntryLine({
  entry,
  memberIds,
  onJump,
}: {
  entry: FamilyEntry;
  memberIds: Set<string>;
  onJump: (userId: string) => void;
}) {
  const year =
    entry.deathYear != null
      ? ` (d. ${entry.deathYear})`
      : entry.birthYear != null
        ? ` (b. ${entry.birthYear})`
        : "";
  // only jumpable if the member is actually visible in the directory
  // (drafts / pending invites are filtered out of the list)
  if (entry.userId && memberIds.has(entry.userId)) {
    return (
      <button
        type="button"
        onClick={() => onJump(entry.userId!)}
        className="text-foreground/90 decoration-muted-foreground/30 hover:decoration-foreground/60 block text-left text-sm underline underline-offset-2"
      >
        {entry.name}
      </button>
    );
  }
  return (
    <p className="text-muted-foreground text-sm">
      {entry.name}
      {year}
    </p>
  );
}

export function MemberSheet({
  member,
  family,
  customFields,
  memberIds,
  viewerId,
  onJump,
  onOpenChange,
}: {
  member: DirectoryMember | null;
  family: DirectoryFamilySummary | undefined;
  customFields: CustomField[];
  memberIds: Set<string>;
  viewerId: string | null;
  onJump: (userId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const groups = family
    ? ([
        ["Parents", family.parents],
        ["Partner", family.partners],
        ["Children", family.children],
        ["Siblings", family.siblings],
      ] as const)
    : [];
  const hasFamily = groups.some(([, entries]) => entries.length > 0);

  return (
    <Sheet open={member !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {member && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <MemberAvatar member={member} size="lg" />
                <div>
                  <SheetTitle>
                    {member.first_name} {member.last_name}
                  </SheetTitle>
                  {member.lot_number && (
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                      Lot {member.lot_number}
                    </span>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-6">
              {viewerId !== null && member.id === viewerId && (
                <Link
                  href="/profile"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Update profile
                </Link>
              )}

              {family?.relationToViewer && (
                <p className="text-muted-foreground text-sm">
                  Related to you: your {family.relationToViewer}
                </p>
              )}

              {/* contact */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Contact</Label>
                {member.phone && (
                  <p className="text-sm">
                    <a
                      href={`tel:${member.phone}`}
                      className="decoration-muted-foreground/30 underline underline-offset-2"
                    >
                      {member.phone}
                    </a>
                  </p>
                )}
                <p className="text-sm">
                  <a
                    href={`mailto:${member.email}`}
                    className="decoration-muted-foreground/30 underline underline-offset-2"
                  >
                    {member.email}
                  </a>
                </p>
                {member.address && (
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {member.address}
                  </p>
                )}
              </div>

              {/* remaining custom fields (Dogs etc.) */}
              {customFields.map((f) => {
                const raw = member.custom_fields[f.id]?.value;
                if (!raw) return null;
                let display = raw;
                try {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed)) {
                    display = parsed
                      .map((x: { name?: string }) => x.name ?? "")
                      .filter(Boolean)
                      .join(", ");
                  }
                } catch {
                  // plain text value, use as-is
                }
                if (!display) return null;
                return (
                  <div key={f.id} className="space-y-1">
                    <Label className="text-muted-foreground text-xs">
                      {f.name}
                    </Label>
                    <p className="text-sm">{display}</p>
                  </div>
                );
              })}

              {/* family */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-muted-foreground text-xs">Family</Label>
                {!hasFamily && (
                  <p className="text-muted-foreground text-sm">
                    No family links yet.
                  </p>
                )}
                {groups.map(
                  ([title, entries]) =>
                    entries.length > 0 && (
                      <div key={title} className="space-y-1">
                        <p className="text-xs font-medium">{title}</p>
                        {entries.map((e) => (
                          <EntryLine
                            key={e.nodeId}
                            entry={e}
                            memberIds={memberIds}
                            onJump={onJump}
                          />
                        ))}
                      </div>
                    ),
                )}
                {family && hasFamily && (
                  // Button has no asChild here, so style the link directly
                  <Link
                    href={`/family/${family.nodeId}`}
                    className={buttonVariants({
                      variant: "default",
                      className: "w-full",
                    })}
                  >
                    View family tree
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
