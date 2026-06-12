"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FamilyEditorData,
  FamilyEditorEntry,
  FamilyEntry,
  LinkableMember,
} from "@/lib/family-data";
import {
  addRelative,
  memberLinkPlaceholderCandidates,
  placeholderCandidates,
  removePlaceholderCompletely,
  removeRelative,
  type AddRelativeInput,
} from "./family-actions";

const REL_OPTIONS = [
  { value: "parent", label: "Parent" },
  { value: "partner", label: "Partner" },
  { value: "child", label: "Child" },
] as const;

type Rel = (typeof REL_OPTIONS)[number]["value"];

function joinNames(names: string[]): string {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function EntryRow({
  entry,
  onRemove,
  pending,
}: {
  entry: FamilyEditorEntry;
  onRemove: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>
        {entry.name}
        {entry.userId === null && (
          <span className="text-muted-foreground text-xs">
            {" "}
            {entry.birthYear ? `(b. ${entry.birthYear})` : "(non-member)"}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        aria-label={`Remove ${entry.name}`}
        className="text-muted-foreground hover:text-foreground rounded p-1"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function FamilyEditor({
  family,
  members,
}: {
  family: FamilyEditorData;
  members: LinkableMember[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<FamilyEditorEntry | null>(
    null,
  );

  // add dialog state
  const [rel, setRel] = useState<Rel>("child");
  const [query, setQuery] = useState("");
  const [nonMember, setNonMember] = useState(false);
  const [phName, setPhName] = useState("");
  const [phYear, setPhYear] = useState("");
  // same-named placeholders found at submit time — user picks reuse vs create
  const [candidates, setCandidates] = useState<FamilyEntry[] | null>(null);
  // member being linked when a first-name placeholder sits in the same slot —
  // user decides merge vs keep separate
  const [memberMerge, setMemberMerge] = useState<{
    member: LinkableMember;
    candidates: FamilyEntry[];
  } | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [members, query]);

  function resetAdd() {
    setRel("child");
    setQuery("");
    setNonMember(false);
    setPhName("");
    setPhYear("");
    setCandidates(null);
    setMemberMerge(null);
    setError(null);
  }

  async function submitAdd(input: AddRelativeInput) {
    const res = await addRelative(input);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAddOpen(false);
    resetAdd();
  }

  function runAdd(input: AddRelativeInput, checkDupes = false) {
    setError(null);
    startTransition(async () => {
      if (checkDupes) {
        const found = await placeholderCandidates(phName);
        if (found.length > 0) {
          setCandidates(found);
          return;
        }
      }
      await submitAdd(input);
    });
  }

  // member path: a first-name-only placeholder may already be standing in
  // for this person — ask before linking instead of duplicating them
  function pickMember(m: LinkableMember) {
    setError(null);
    startTransition(async () => {
      const found = await memberLinkPlaceholderCandidates({
        relationship: rel,
        targetUserId: m.id,
      });
      if (found.length > 0) {
        setMemberMerge({ member: m, candidates: found });
        return;
      }
      await submitAdd({ relationship: rel, targetUserId: m.id });
    });
  }

  const phInput = (): AddRelativeInput => ({
    relationship: rel,
    placeholder: { name: phName, birthYear: phYear ? Number(phYear) : null },
  });

  function remove(entry: FamilyEditorEntry) {
    startTransition(async () => {
      const res = await removeRelative(entry.linkId);
      if (!res.ok) setError(res.error);
      setConfirmRemove(null);
    });
  }

  // delete the placeholder node itself (it's linked to other members too)
  function removeEntirely(entry: FamilyEditorEntry) {
    startTransition(async () => {
      const res = await removePlaceholderCompletely(entry.nodeId);
      if (!res.ok) setError(res.error);
      setConfirmRemove(null);
    });
  }

  const groups: Array<{ title: string; entries: FamilyEditorEntry[] }> = [
    { title: "Parents", entries: family.parents },
    { title: "Partner", entries: family.partners },
    { title: "Children", entries: family.children },
  ];
  const hasAny = groups.some((s) => s.entries.length > 0);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Family</h2>
          <p className="text-muted-foreground text-xs">
            Link your parents, partner, and children. Siblings, grandparents,
            and cousins are figured out automatically when you share a parent —
            add the parent (a non-member entry is fine).
          </p>
        </div>

        {hasAny && (
          <div className="space-y-3">
            {groups.map(
              (sec) =>
                sec.entries.length > 0 && (
                  <div key={sec.title} className="space-y-1">
                    <Label className="text-muted-foreground text-xs">
                      {sec.title}
                    </Label>
                    {sec.entries.map((e) => (
                      <EntryRow
                        key={e.linkId}
                        entry={e}
                        pending={pending}
                        onRemove={() => setConfirmRemove(e)}
                      />
                    ))}
                  </div>
                ),
            )}
          </div>
        )}

        {error && !addOpen && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
        >
          <Plus className="size-3.5" />
          Add family member
        </button>

        {/* add dialog */}
        <Dialog
          open={addOpen}
          onOpenChange={(v) => {
            setAddOpen(v);
            if (!v) resetAdd();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add family member</DialogTitle>
              <DialogDescription>
                Pick how they&apos;re related to you, then find them in the
                member list — or add them by name if they don&apos;t have an
                account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Relationship to you</Label>
                <Select
                  items={REL_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  value={rel}
                  onValueChange={(v) => {
                    setRel((v as Rel) ?? "child");
                    setMemberMerge(null); // candidates are slot-specific
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!nonMember && memberMerge ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    {memberMerge.candidates.length === 1 ? (
                      <>
                        Is {memberMerge.candidates[0].name}
                        {memberMerge.candidates[0].birthYear
                          ? ` (b. ${memberMerge.candidates[0].birthYear})`
                          : ""}{" "}
                        in your family the same person as{" "}
                        {memberMerge.member.name}?
                      </>
                    ) : (
                      <>
                        Are any of these the same person as{" "}
                        {memberMerge.member.name}?
                      </>
                    )}
                  </p>
                  {memberMerge.candidates.map((c) => (
                    <Button
                      key={c.nodeId}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      disabled={pending}
                      onClick={() =>
                        runAdd({
                          relationship: rel,
                          targetUserId: memberMerge.member.id,
                          mergePlaceholderNodeId: c.nodeId,
                        })
                      }
                    >
                      {memberMerge.candidates.length === 1
                        ? "Yes - merge them"
                        : `Yes - merge ${c.name}${c.birthYear ? ` (b. ${c.birthYear})` : ""}`}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={pending}
                    onClick={() =>
                      runAdd({
                        relationship: rel,
                        targetUserId: memberMerge.member.id,
                      })
                    }
                  >
                    No - keep separate
                  </Button>
                </div>
              ) : !nonMember ? (
                <div className="space-y-2">
                  <Label htmlFor="member-search">Member</Label>
                  <Input
                    id="member-search"
                    placeholder="Search members..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="max-h-48 space-y-1 overflow-auto">
                    {matches.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={pending}
                        onClick={() => pickMember(m)}
                        className="hover:bg-muted flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm"
                      >
                        <span>{m.name}</span>
                        {m.lot && (
                          <span className="text-muted-foreground text-xs">
                            Lot {m.lot}
                          </span>
                        )}
                      </button>
                    ))}
                    {matches.length === 0 && (
                      <p className="text-muted-foreground px-2 py-1.5 text-sm">
                        No members match.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNonMember(true)}
                    className="text-primary text-xs underline underline-offset-2"
                  >
                    Not a member? Add them by name
                  </button>
                </div>
              ) : candidates ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    A non-member with this name is already in this family:
                  </p>
                  {candidates.map((c) => (
                    <Button
                      key={c.nodeId}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      disabled={pending}
                      onClick={() =>
                        runAdd({ relationship: rel, existingNodeId: c.nodeId })
                      }
                    >
                      Use existing - {c.name}
                      {c.birthYear ? ` (b. ${c.birthYear})` : ""}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={pending}
                    onClick={() => runAdd(phInput())}
                  >
                    Create new person
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="ph-name">Name</Label>
                      <Input
                        id="ph-name"
                        value={phName}
                        onChange={(e) => setPhName(e.target.value)}
                      />
                    </div>
                    <div className="w-28 space-y-1.5">
                      <Label htmlFor="ph-year">Birth year</Label>
                      <Input
                        id="ph-year"
                        inputMode="numeric"
                        value={phYear}
                        onChange={(e) => setPhYear(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNonMember(false)}
                    className="text-primary text-xs underline underline-offset-2"
                  >
                    Back to member search
                  </button>
                </div>
              )}

              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              {nonMember && !candidates && (
                <Button
                  disabled={pending || !phName.trim()}
                  onClick={() => runAdd(phInput(), true)}
                >
                  {pending ? "Adding..." : "Add"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* remove confirm */}
        <Dialog
          open={confirmRemove !== null}
          onOpenChange={(v) => !v && setConfirmRemove(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove family link</DialogTitle>
              <DialogDescription>
                {confirmRemove && confirmRemove.otherMemberNames.length > 0 ? (
                  <>
                    {confirmRemove.name} is also linked to{" "}
                    {joinNames(confirmRemove.otherMemberNames)}. Removing your
                    link keeps them in the family tree.
                  </>
                ) : (
                  // template literal so the space after the name can't be
                  // eaten by the SWC jsx-whitespace quirk
                  <>
                    {`Remove ${confirmRemove?.name ?? ""} from your family links?`}{" "}
                    This only removes the connection — it doesn&apos;t affect
                    their account.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRemove(null)}>
                Cancel
              </Button>
              {confirmRemove && confirmRemove.otherMemberNames.length > 0 ? (
                <>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => remove(confirmRemove)}
                  >
                    Remove my link
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={() => removeEntirely(confirmRemove)}
                  >
                    Remove from family entirely
                  </Button>
                </>
              ) : (
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => confirmRemove && remove(confirmRemove)}
                >
                  {pending ? "Removing..." : "Remove"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
