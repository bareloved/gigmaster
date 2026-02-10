"use client";

import { forwardRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SetlistRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SetlistRichEditor = forwardRef<HTMLDivElement, SetlistRichEditorProps>(
  ({ content, onChange, placeholder = "Song 1\nSong 2\nSong 3", disabled }, ref) => {
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

    if (!editor) return null;

    const btnClass = (active: boolean) =>
      cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-neutral-200 text-neutral-900"
          : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
      );

    return (
      <div ref={ref}>
        {/* Toolbar */}
        <div className="setlist-toolbar">
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
          <div className="w-px h-4 bg-neutral-300 mx-1" />

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
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
      </div>
    );
  }
);

SetlistRichEditor.displayName = "SetlistRichEditor";

export default SetlistRichEditor;
