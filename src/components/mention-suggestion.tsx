"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { ReactRenderer } from "@tiptap/react";
import type { MentionNodeAttrs } from "@tiptap/extension-mention";
import type {
  SuggestionOptions,
  SuggestionProps,
  SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import { cn } from "@/lib/utils";
import { listMentionable } from "@/app/(portal)/community/actions";

type Item = { id: string; label: string };

type ListHandle = { onKeyDown: (p: SuggestionKeyDownProps) => boolean };

const MentionList = forwardRef<
  ListHandle,
  SuggestionProps<Item, MentionNodeAttrs>
>(function MentionList({ items, command }, ref) {
  const [sel, setSel] = useState(0);
  const [seen, setSeen] = useState(items);

  // new results = start from the top again
  if (seen !== items) {
    setSeen(items);
    setSel(0);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        setSel((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSel((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        command(items[sel]);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="bg-popover text-popover-foreground ring-foreground/10 w-56 overflow-hidden rounded-lg p-1 text-sm shadow-md ring-1">
      {items.length === 0 ? (
        <div className="text-muted-foreground px-2 py-1.5 text-xs">
          No members found
        </div>
      ) : (
        items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            // keep editor focus so the suggestion doesn't close
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(item)}
            className={cn(
              "flex w-full items-center rounded-md px-2 py-1.5 text-left",
              i === sel && "bg-muted",
            )}
          >
            <span className="truncate">{item.label}</span>
          </button>
        ))
      )}
    </div>
  );
});

// one fetch per page load — ~100 members, fine to filter client-side
let membersCache: ReturnType<typeof listMentionable> | null = null;

export const mentionSuggestion: Omit<
  SuggestionOptions<Item, MentionNodeAttrs>,
  "editor"
> = {
  items: async ({ query }) => {
    membersCache ??= listMentionable()
      .then((list) => {
        // empty = probably a failed/denied fetch, don't pin it
        if (list.length === 0) membersCache = null;
        return list;
      })
      .catch(() => {
        membersCache = null;
        return [];
      });
    const q = query.toLowerCase();
    return (await membersCache)
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((m) => ({ id: m.id, label: m.name }));
  },

  render: () => {
    // undefined until onStart runs: items resolve async, so a key press
    // (Enter/Escape) can land before the popup exists
    let renderer:
      | ReactRenderer<ListHandle, SuggestionProps<Item, MentionNodeAttrs>>
      | undefined;

    function place(props: SuggestionProps<Item, MentionNodeAttrs>) {
      const rect = props.clientRect?.();
      if (!rect) return;
      if (!renderer) return;
      const el = renderer.element as HTMLElement;
      el.style.position = "fixed";
      el.style.zIndex = "60";
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.bottom + 4}px`;
    }

    return {
      onStart(props) {
        renderer = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });
        document.body.appendChild(renderer.element);
        place(props);
      },
      onUpdate(props) {
        renderer?.updateProps(props);
        place(props);
      },
      onKeyDown(props) {
        if (!renderer) return false;
        if (props.event.key === "Escape") {
          renderer.destroy();
          renderer.element.remove();
          renderer = undefined;
          // base-ui dialogs close on document keydown w/o checking
          // defaultPrevented, so stop it here or the edit modal dies too
          props.event.stopPropagation();
          return true;
        }
        return renderer.ref?.onKeyDown(props) ?? false;
      },
      onExit() {
        renderer?.destroy();
        renderer?.element.remove();
        renderer = undefined;
      },
    };
  },
};
