"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { MemberRow } from "@/lib/members";
import type { FamilyEntry, LinkableMember } from "@/lib/family-data";
import type { AdminFamilyData } from "./family-actions";
import {
  adminAddRelative,
  adminConvertPlaceholder,
  adminDeletePlaceholder,
  adminMemberLinkCandidates,
  adminMergeNodes,
  adminPlaceholderCandidates,
  adminRemoveLink,
  adminUpdatePlaceholder,
  getAdminFamilyData,
} from "./family-actions";

const REL_OPTIONS = [
  { value: "parent", label: "Parent" },
  { value: "partner", label: "Partner" },
  { value: "child", label: "Child" },
] as const;
type Rel = (typeof REL_OPTIONS)[number]["value"];

export function FamilyDialog({
  member,
  open,
  onOpenChange,
}: {
  member: MemberRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<AdminFamilyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // add-link state
  const [rel, setRel] = useState<Rel>("child");
  const [query, setQuery] = useState("");
  const [phName, setPhName] = useState("");
  const [phYear, setPhYear] = useState("");
  // same-named placeholders found when adding a non-member
  const [candidates, setCandidates] = useState<FamilyEntry[] | null>(null);
  // first-name placeholder(s) in the slot a member is about to fill —
  // admin decides merge vs keep separate
  const [memberMerge, setMemberMerge] = useState<{
    member: LinkableMember;
    candidates: FamilyEntry[];
  } | null>(null);

  // placeholder being edited (convert / rename)
  const [editNode, setEditNode] = useState<{
    nodeId: string;
    name: string;
    birthYear: string;
    deathYear: string;
    gender: string;
    convertTo: string;
    mergeInto: string;
  } | null>(null);

  async function fetchData() {
    setData(await getAdminFamilyData(member.id));
  }

  function reload() {
    startTransition(fetchData);
  }

  useEffect(() => {
    if (open) {
      // clear leftovers from the last session and refetch
      setError(null);
      setEditNode(null);
      setQuery("");
      setPhName("");
      setPhYear("");
      setCandidates(null);
      setMemberMerge(null);
      setData(null);
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member.id]);

  const matches = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.members.slice(0, 6);
    return data.members
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [data, query]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok && res.error) {
        setError(res.error);
        return;
      }
      setQuery("");
      setPhName("");
      setPhYear("");
      setCandidates(null);
      setMemberMerge(null);
      setEditNode(null);
      await fetchData();
    });
  }

  // member add: a first-name-only placeholder may already stand in for this
  // person — ask before linking
  function submitMember(m: LinkableMember) {
    setError(null);
    startTransition(async () => {
      const found = await adminMemberLinkCandidates({
        userId: member.id,
        relationship: rel,
        targetUserId: m.id,
      });
      if (found.length > 0) {
        setMemberMerge({ member: m, candidates: found });
        return;
      }
      await linkMember(m.id);
    });
  }

  async function linkMember(targetUserId: string, mergeNodeId?: string) {
    const res = await adminAddRelative({
      userId: member.id,
      relationship: rel,
      targetUserId,
      mergePlaceholderNodeId: mergeNodeId,
    });
    if (!res.ok && res.error) {
      setError(res.error);
      return;
    }
    setQuery("");
    setMemberMerge(null);
    await fetchData();
  }

  // non-member add: look for same-named placeholders first, then create
  function submitNonMember() {
    setError(null);
    startTransition(async () => {
      const found = await adminPlaceholderCandidates({
        userId: member.id,
        name: phName,
      });
      if (found.length > 0) {
        setCandidates(found);
        return;
      }
      await createNonMember();
    });
  }

  async function createNonMember() {
    const res = await adminAddRelative({
      userId: member.id,
      relationship: rel,
      placeholder: {
        name: phName,
        birthYear: phYear ? Number(phYear) : null,
      },
    });
    if (!res.ok && res.error) {
      setError(res.error);
      return;
    }
    setPhName("");
    setPhYear("");
    setCandidates(null);
    await fetchData();
  }

  const groups = data
    ? ([
        ["Parents", data.family.parents],
        ["Partner", data.family.partners],
        ["Children", data.family.children],
      ] as const)
    : [];

  // other placeholders in the family — candidates for a dedupe merge
  const mergeTargets =
    data && editNode
      ? data.placeholdersInFamily.filter((p) => p.nodeId !== editNode.nodeId)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Family — {member.first_name} {member.last_name}
          </DialogTitle>
          <DialogDescription>
            Add parent/partner/child links. Other relationships are derived.
            Non-member people can be edited, converted to a member, or deleted
            here.
          </DialogDescription>
        </DialogHeader>

        {!data ? (
          <p className="text-muted-foreground py-4 text-sm">Loading...</p>
        ) : (
          <div className="space-y-4">
            {groups.map(([title, entries]) => (
              <div key={title} className="space-y-1">
                <Label className="text-muted-foreground text-xs">{title}</Label>
                {entries.length === 0 && (
                  <p className="text-muted-foreground text-sm">—</p>
                )}
                {entries.map((e) => (
                  <div
                    key={e.linkId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {e.name}
                      {e.userId === null && (
                        <button
                          type="button"
                          className="text-primary ml-2 text-xs underline underline-offset-2"
                          onClick={() =>
                            setEditNode({
                              nodeId: e.nodeId,
                              name: e.name,
                              birthYear: e.birthYear?.toString() ?? "",
                              deathYear: e.deathYear?.toString() ?? "",
                              gender: e.gender ?? "",
                              convertTo: "",
                              mergeInto: "",
                            })
                          }
                        >
                          non-member: edit
                        </button>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Remove link to ${e.name}`}
                      onClick={() => run(() => adminRemoveLink(e.linkId))}
                      className="text-muted-foreground hover:text-foreground rounded p-1"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))}

            {/* placeholder editor */}
            {editNode && (
              <div className="space-y-2 rounded border p-3">
                <Label className="text-xs font-semibold">Edit non-member</Label>
                <div className="flex gap-2">
                  <Input
                    value={editNode.name}
                    onChange={(e) =>
                      setEditNode({ ...editNode, name: e.target.value })
                    }
                    placeholder="Name"
                    className="flex-1"
                  />
                  <Input
                    value={editNode.birthYear}
                    onChange={(e) =>
                      setEditNode({ ...editNode, birthYear: e.target.value })
                    }
                    placeholder="Born"
                    inputMode="numeric"
                    className="w-20"
                  />
                  <Input
                    value={editNode.deathYear}
                    onChange={(e) =>
                      setEditNode({ ...editNode, deathYear: e.target.value })
                    }
                    placeholder="Died"
                    inputMode="numeric"
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    items={[
                      { value: "f", label: "Female" },
                      { value: "m", label: "Male" },
                    ]}
                    value={editNode.gender}
                    onValueChange={(v) =>
                      setEditNode({ ...editNode, gender: v ?? "" })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="f">Female</SelectItem>
                      <SelectItem value="m">Male</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        adminUpdatePlaceholder({
                          nodeId: editNode.nodeId,
                          name: editNode.name,
                          birthYear: editNode.birthYear
                            ? Number(editNode.birthYear)
                            : null,
                          deathYear: editNode.deathYear
                            ? Number(editNode.deathYear)
                            : null,
                          gender:
                            editNode.gender === "m" || editNode.gender === "f"
                              ? editNode.gender
                              : null,
                        }),
                      )
                    }
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      run(() => adminDeletePlaceholder(editNode.nodeId))
                    }
                  >
                    Delete person
                  </Button>
                </div>
                <div className="space-y-1.5 border-t pt-2">
                  <Label className="text-muted-foreground text-xs">
                    Convert to member account
                  </Label>
                  <Select
                    items={data.members.map((m) => ({
                      value: m.id,
                      label: m.name,
                    }))}
                    value={editNode.convertTo}
                    onValueChange={(v) =>
                      setEditNode({ ...editNode, convertTo: v ?? "" })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pick the matching member" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || !editNode.convertTo}
                    onClick={() =>
                      run(() =>
                        adminConvertPlaceholder({
                          nodeId: editNode.nodeId,
                          userId: editNode.convertTo,
                        }),
                      )
                    }
                  >
                    Convert
                  </Button>
                </div>
                {mergeTargets.length > 0 && (
                  <div className="space-y-1.5 border-t pt-2">
                    <Label className="text-muted-foreground text-xs">
                      Duplicate? Merge into another person
                    </Label>
                    <Select
                      items={mergeTargets.map((p) => ({
                        value: p.nodeId,
                        label: p.name,
                      }))}
                      value={editNode.mergeInto}
                      onValueChange={(v) =>
                        setEditNode({ ...editNode, mergeInto: v ?? "" })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Keep this person instead" />
                      </SelectTrigger>
                      <SelectContent>
                        {mergeTargets.map((p) => (
                          <SelectItem key={p.nodeId} value={p.nodeId}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || !editNode.mergeInto}
                      onClick={() =>
                        run(() =>
                          adminMergeNodes({
                            keepId: editNode.mergeInto,
                            dropId: editNode.nodeId,
                          }),
                        )
                      }
                    >
                      Merge
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* add link */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <Plus className="size-3.5" />
                <Label className="text-xs font-semibold">Add link</Label>
                <Select
                  items={REL_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  value={rel}
                  onValueChange={(v) => {
                    setRel((v as Rel) ?? "child");
                    setMemberMerge(null);
                  }}
                >
                  <SelectTrigger className="w-28">
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
              <Input
                placeholder="Search members..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setMemberMerge(null); // picking someone else, drop the prompt
                }}
              />
              <div className="max-h-36 space-y-1 overflow-auto">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={pending}
                    onClick={() => submitMember(m)}
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
              </div>
              {memberMerge && (
                <div className="space-y-1.5 rounded border p-2">
                  <p className="text-sm">
                    {memberMerge.candidates.length === 1 ? (
                      <>
                        Is {memberMerge.candidates[0].name}
                        {memberMerge.candidates[0].birthYear
                          ? ` (b. ${memberMerge.candidates[0].birthYear})`
                          : ""}{" "}
                        in this family the same person as{" "}
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
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      disabled={pending}
                      onClick={() =>
                        startTransition(() =>
                          linkMember(memberMerge.member.id, c.nodeId),
                        )
                      }
                    >
                      {memberMerge.candidates.length === 1
                        ? "Yes - merge them"
                        : `Yes - merge ${c.name}${c.birthYear ? ` (b. ${c.birthYear})` : ""}`}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => linkMember(memberMerge.member.id))
                    }
                  >
                    No - keep separate
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Or add non-member by name"
                  value={phName}
                  onChange={(e) => {
                    setPhName(e.target.value);
                    setCandidates(null); // name changed, stale matches
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="Born"
                  inputMode="numeric"
                  value={phYear}
                  onChange={(e) => setPhYear(e.target.value)}
                  className="w-20"
                />
                <Button
                  size="sm"
                  disabled={pending || !phName.trim() || candidates !== null}
                  onClick={submitNonMember}
                >
                  Add
                </Button>
              </div>
              {candidates && (
                <div className="space-y-1.5 rounded border p-2">
                  <p className="text-sm">
                    A non-member with this name is already in this family:
                  </p>
                  {candidates.map((c) => (
                    <Button
                      key={c.nodeId}
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          adminAddRelative({
                            userId: member.id,
                            relationship: rel,
                            existingNodeId: c.nodeId,
                          }),
                        )
                      }
                    >
                      Use existing - {c.name}
                      {c.birthYear ? ` (b. ${c.birthYear})` : ""}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={pending}
                    onClick={() => startTransition(createNonMember)}
                  >
                    Create new person
                  </Button>
                </div>
              )}
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
