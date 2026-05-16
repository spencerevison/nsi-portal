"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Heading2,
  Unlink,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  // bump to force the editor to clear / reset to value
  resetSignal?: number;
  className?: string;
  ariaLabel?: string;
};

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something...",
  disabled = false,
  compact = false,
  resetSignal,
  className,
  ariaLabel,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // not exposing these in the toolbar — keep schema small
        codeBlock: false,
        horizontalRule: false,
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false, // avoids SSR hydration mismatch
    onUpdate({ editor }) {
      const html = editor.isEmpty ? "" : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "rich-text-content focus:outline-none px-3 py-2 text-sm",
          compact ? "min-h-[5rem]" : "min-h-[8rem]",
        ),
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
  });

  // Sync editable state when disabled changes mid-life
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // Reset to `value` when parent bumps resetSignal — used after submit to
  // clear the comment form. We don't track value otherwise because TipTap
  // owns its own document state.
  useEffect(() => {
    if (resetSignal === undefined || !editor) return;
    editor.commands.setContent(value || "");
  }, [resetSignal, editor, value]);

  if (!editor) {
    // SSR / first paint placeholder — keeps layout stable
    return (
      <div
        className={cn(
          "border-input bg-background rounded-lg border",
          className,
        )}
      >
        <div className="border-border h-9 border-b" />
        <div
          className={cn(
            "text-muted-foreground px-3 py-2 text-sm",
            compact ? "min-h-[5rem]" : "min-h-[8rem]",
          )}
        >
          {placeholder}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-input bg-background focus-within:border-ring focus-within:ring-ring/50 overflow-hidden rounded-lg border focus-within:ring-3",
        disabled && "opacity-60",
        className,
      )}
    >
      <Toolbar editor={editor} compact={compact} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  compact,
  disabled,
}: {
  editor: Editor;
  compact: boolean;
  disabled: boolean;
}) {
  return (
    <div
      className="border-border bg-muted/30 flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1"
      role="toolbar"
      aria-label="Formatting"
    >
      <ToolBtn
        label="Bold"
        active={editor.isActive("bold")}
        disabled={disabled || !editor.can().toggleBold()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </ToolBtn>
      <ToolBtn
        label="Italic"
        active={editor.isActive("italic")}
        disabled={disabled || !editor.can().toggleItalic()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </ToolBtn>

      {!compact && (
        <>
          <Divider />
          <ToolBtn
            label="Heading"
            active={editor.isActive("heading", { level: 2 })}
            disabled={disabled}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-3.5" />
          </ToolBtn>
        </>
      )}

      <Divider />
      <ToolBtn
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-3.5" />
      </ToolBtn>
      <ToolBtn
        label="Numbered list"
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-3.5" />
      </ToolBtn>

      <Divider />
      <ToolBtn
        label="Quote"
        active={editor.isActive("blockquote")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-3.5" />
      </ToolBtn>

      <Divider />
      {editor.isActive("link") ? (
        <ToolBtn
          label="Remove link"
          active
          disabled={disabled}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink className="size-3.5" />
        </ToolBtn>
      ) : (
        <ToolBtn
          label="Add link"
          disabled={disabled}
          onClick={() => promptForLink(editor)}
        >
          <LinkIcon className="size-3.5" />
        </ToolBtn>
      )}
    </div>
  );
}

function ToolBtn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={cn(
        "hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="bg-border mx-0.5 h-4 w-px" aria-hidden />;
}

function promptForLink(editor: Editor) {
  const prev = editor.getAttributes("link").href as string | undefined;
  // simple prompt for now — good enough for a low-volume community board.
  // A modal-based picker would be nicer but is overkill here.
  const url = window.prompt("Link URL", prev ?? "https://");
  if (url === null) return; // cancelled
  if (url === "") {
    editor.chain().focus().unsetLink().run();
    return;
  }
  const safe = normalizeUrl(url);
  if (!safe) return;
  editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
}

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // allow common safe schemes; default to https:// for bare domains
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed}`;
}
