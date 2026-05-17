"use client";

import * as React from "react";
import { useOptimistic, useTransition, useState } from "react";
import { SmilePlus } from "lucide-react";
import { EmojiPicker, type Emoji } from "frimousse";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MemberAvatar } from "../directory/member-avatar";
import { toggleReaction } from "./actions";
import type { ReactionGroup, Reactor } from "@/lib/community";

type Props = {
  target: "post" | "comment";
  targetId: string;
  postId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
  reactions: ReactionGroup[];
};

type OptimisticAction = { emoji: string };

function applyOptimistic(
  state: ReactionGroup[],
  action: OptimisticAction,
  me: Reactor,
): ReactionGroup[] {
  const idx = state.findIndex((g) => g.emoji === action.emoji);
  if (idx === -1) {
    return [...state, { emoji: action.emoji, reactors: [me] }];
  }

  const group = state[idx];
  const hasMe = group.reactors.some((r) => r.id === me.id);
  const nextReactors = hasMe
    ? group.reactors.filter((r) => r.id !== me.id)
    : [...group.reactors, me];

  if (nextReactors.length === 0) {
    return state.filter((_, i) => i !== idx);
  }

  const next = state.slice();
  next[idx] = { emoji: group.emoji, reactors: nextReactors };
  return next;
}

export function Reactions(props: Props) {
  const me: Reactor = {
    id: props.currentUserId,
    name: props.currentUserName,
    avatar_url: props.currentUserAvatar,
  };

  const [optimistic, addOptimistic] = useOptimistic(
    props.reactions,
    (state: ReactionGroup[], action: OptimisticAction) =>
      applyOptimistic(state, action, me),
  );
  const [, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  function dispatch(emoji: string) {
    startTransition(async () => {
      addOptimistic({ emoji });
      const res = await toggleReaction({
        target: props.target,
        targetId: props.targetId,
        postId: props.postId,
        emoji,
      });
      if (!res.ok) {
        // best-effort: surface the failure to the console; the next
        // server round-trip will reconcile UI anyway.
        console.error("toggleReaction failed", res.error);
      }
    });
  }

  function onPick(emoji: Emoji) {
    setPickerOpen(false);
    dispatch(emoji.emoji);
  }

  // Hide entirely when there's nothing here and current user can't react.
  // (currently the action's own capability check is the source of truth,
  // so we always show the + button — keep it simple.)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {optimistic.map((group) => (
        <ReactionChip
          key={group.emoji}
          group={group}
          currentUserId={props.currentUserId}
          onToggle={() => dispatch(group.emoji)}
        />
      ))}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          aria-label="Add reaction"
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 items-center gap-1 rounded-full border border-transparent px-2 text-xs transition-colors"
        >
          <SmilePlus className="size-3.5" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) p-0" align="start">
          <EmojiPicker.Root
            onEmojiSelect={onPick}
            className="bg-popover isolate flex h-[320px] w-[300px] flex-col"
          >
            <EmojiPicker.Search
              placeholder="Search…"
              className="border-border bg-background placeholder:text-muted-foreground focus:ring-ring/30 m-2 h-8 rounded-md border px-2 text-sm outline-none focus:ring-2"
            />
            <EmojiPicker.Viewport className="relative flex-1 overflow-hidden">
              <EmojiPicker.Loading className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs">
                Loading…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs">
                No emoji found.
              </EmojiPicker.Empty>
              <EmojiPicker.List
                className="pb-2 select-none"
                components={{
                  CategoryHeader: ({ category, ...rest }) => (
                    <div
                      {...rest}
                      className="text-muted-foreground bg-popover sticky top-0 px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
                    >
                      {category.label}
                    </div>
                  ),
                  Row: ({ children, ...rest }) => (
                    <div {...rest} className="scroll-my-1 px-1">
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...rest }) => (
                    <button
                      {...rest}
                      data-active={emoji.isActive ? "" : undefined}
                      className="data-[active]:bg-muted flex size-8 items-center justify-center rounded text-lg"
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </EmojiPicker.Viewport>
          </EmojiPicker.Root>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ReactionChip({
  group,
  currentUserId,
  onToggle,
}: {
  group: ReactionGroup;
  currentUserId: string;
  onToggle: () => void;
}) {
  const reactedByMe = group.reactors.some((r) => r.id === currentUserId);
  const count = group.reactors.length;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs leading-none transition-colors",
          reactedByMe
            ? "border-accent-600/40 bg-accent-50 text-accent-900 hover:bg-accent-100"
            : "border-border bg-muted/40 text-foreground hover:bg-muted",
        )}
        aria-label={`${count} reacted with ${group.emoji}`}
      >
        <span className="text-sm leading-none">{group.emoji}</span>
        <span className="tabular-nums">{count}</span>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="border-border mb-2 flex items-center gap-2 border-b pb-2">
          <span className="text-xl leading-none">{group.emoji}</span>
          <span className="text-muted-foreground text-xs">
            {count} {count === 1 ? "reaction" : "reactions"}
          </span>
        </div>
        <ul className="max-h-48 space-y-1.5 overflow-y-auto">
          {group.reactors.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-xs">
              <MemberAvatar
                member={{
                  first_name: r.name.split(" ")[0] ?? "",
                  last_name: r.name.split(" ").slice(1).join(" "),
                  avatar_url: r.avatar_url,
                }}
                size="sm"
              />
              <span className="truncate">
                {r.id === currentUserId ? `${r.name} (you)` : r.name}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onToggle}
          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground mt-2 flex w-full items-center justify-center rounded-md border px-2 py-1.5 text-xs"
        >
          {reactedByMe ? "Remove your reaction" : `React with ${group.emoji}`}
        </button>
      </PopoverContent>
    </Popover>
  );
}
