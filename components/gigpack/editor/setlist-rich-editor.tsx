"use client";

import { forwardRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AArrowUp,
  AArrowDown,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Preset sizes — value applied as CSS inline style
// 12 steps from 0.65rem to 2rem, ~0.12rem increments
const FONT_SIZES = [
  "0.65rem", "0.75rem", "0.85rem", "0.95rem", "1.05rem", "1.15rem",
  "1.25rem", "1.4rem", "1.55rem", "1.7rem", "1.85rem", "2rem",
] as const;
const DEFAULT_SIZE_INDEX = 5; // 1.15rem — matches the editor's base

interface SetlistRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  numbered?: boolean;
  onNumberedChange?: (numbered: boolean) => void;
}

const SetlistRichEditor = forwardRef<HTMLDivElement, SetlistRichEditorProps>(
  ({ content, onChange, placeholder = "Song 1\nSong 2\nSong 3", disabled, numbered, onNumberedChange }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          blockquote: false,
          codeBlock: false,
          code: false,
          horizontalRule: false,
        }),
        TextStyle,
        FontSize,
        Underline,
        TextAlign.configure({
          types: ["paragraph"],
          alignments: ["left", "center", "right"],
        }),
        Placeholder.configure({
          placeholder,
        }),
      ],
      content,
      editable: !disabled,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
    });

    const toggle = useCallback(
      (command: () => boolean | void) => {
        if (!editor) return;
        command();
        editor.chain().focus().run();
      },
      [editor]
    );

    // Get current font size index from editor state
    const getCurrentSizeIndex = useCallback(() => {
      if (!editor) return DEFAULT_SIZE_INDEX;
      const attrs = editor.getAttributes("textStyle");
      const current = attrs.fontSize as string | undefined;
      if (!current) return DEFAULT_SIZE_INDEX;
      const idx = FONT_SIZES.indexOf(current as typeof FONT_SIZES[number]);
      return idx >= 0 ? idx : DEFAULT_SIZE_INDEX;
    }, [editor]);

    const stepSize = useCallback(
      (direction: 1 | -1) => {
        if (!editor) return;
        const currentIdx = getCurrentSizeIndex();
        const nextIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, currentIdx + direction));
        const size = FONT_SIZES[nextIdx];
        // If it's the default size, unset to keep HTML clean
        if (nextIdx === DEFAULT_SIZE_INDEX) {
          editor.chain().focus().unsetFontSize().run();
        } else {
          editor.chain().focus().setFontSize(size).run();
        }
      },
      [editor, getCurrentSizeIndex]
    );

    if (!editor) return null;

    const btnClass = (active: boolean) =>
      cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-neutral-200 text-neutral-900"
          : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
      );

    const currentIdx = getCurrentSizeIndex();

    return (
      <div ref={ref} className={cn("setlist-editor-row", numbered && "setlist-numbered")}>
        {/* Vertical toolbar — left side */}
        <div className="setlist-toolbar">
          {/* Font size */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => stepSize(1)}
            disabled={currentIdx >= FONT_SIZES.length - 1}
            className={cn(
              "p-1.5 rounded transition-colors",
              currentIdx >= FONT_SIZES.length - 1
                ? "text-neutral-300 cursor-not-allowed"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
            )}
            title="Increase font size"
          >
            <AArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => stepSize(-1)}
            disabled={currentIdx <= 0}
            className={cn(
              "p-1.5 rounded transition-colors",
              currentIdx <= 0
                ? "text-neutral-300 cursor-not-allowed"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
            )}
            title="Decrease font size"
          >
            <AArrowDown className="h-3.5 w-3.5" />
          </button>

          {/* Separator */}
          <div className="h-px w-4 bg-neutral-300 my-1" />

          {/* Formatting */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggle(() => editor.chain().toggleBold().run())}
            className={btnClass(editor.isActive("bold"))}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggle(() => editor.chain().toggleItalic().run())}
            className={btnClass(editor.isActive("italic"))}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggle(() => editor.chain().toggleUnderline().run())}
            className={btnClass(editor.isActive("underline"))}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>

          {/* Separator */}
          <div className="h-px w-4 bg-neutral-300 my-1" />

          {/* Alignment */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              toggle(() => editor.chain().setTextAlign("left").run())
            }
            className={btnClass(editor.isActive({ textAlign: "left" }))}
            title="Align left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              toggle(() => editor.chain().setTextAlign("center").run())
            }
            className={btnClass(editor.isActive({ textAlign: "center" }))}
            title="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              toggle(() => editor.chain().setTextAlign("right").run())
            }
            className={btnClass(editor.isActive({ textAlign: "right" }))}
            title="Align right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          {/* Separator */}
          <div className="h-px w-4 bg-neutral-300 my-1" />

          {/* Numbering toggle */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onNumberedChange?.(!numbered)}
            className={btnClass(!!numbered)}
            title="Toggle numbering"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} className="flex-1 min-w-0" />
      </div>
    );
  }
);

SetlistRichEditor.displayName = "SetlistRichEditor";

export default SetlistRichEditor;
