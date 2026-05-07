import { useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Button } from "src/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImageIcon,
} from "lucide-react";
import { cn } from "src/lib/utils";

export const BLOG_INLINE_IMAGE_MAX_BYTES = 600 * 1024;

function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) return Promise.reject(new Error("too_large"));
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  onImageTooLarge?: () => void;
  /** When set, inserted images use this URL (e.g. staff upload) instead of base64 data URLs. */
  resolveUploadedImageSrc?: (file: File) => Promise<string>;
  /** Called when `resolveUploadedImageSrc` fails for a reason other than size. */
  onInsertImageError?: (err: unknown) => void;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  className,
  onImageTooLarge,
  resolveUploadedImageSrc,
  onInsertImageError,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2" },
      }),
      Image.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-2" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[220px] px-3 py-2",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const cur = editor.getHTML();
    if (value !== cur) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [value, editor]);

  const pickImage = async () => {
    const input = fileRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    try {
      const src = resolveUploadedImageSrc
        ? await resolveUploadedImageSrc(file)
        : await readFileAsDataUrl(file, BLOG_INLINE_IMAGE_MAX_BYTES);
      editor.chain().focus().setImage({ src }).run();
    } catch (err) {
      if ((err as Error).message === "too_large") onImageTooLarge?.();
      else onInsertImageError?.(err);
    }
  };

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  if (!editor) {
    return (
      <div className={cn("rounded-md border border-input bg-muted/20 min-h-[280px] animate-pulse", className)} />
    );
  }

  return (
    <div className={cn("tiptap-editor rounded-md border border-input bg-background overflow-hidden", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        onChange={onFile}
      />
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-border bg-muted/30">
        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("underline") ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={setLink} aria-label="Link">
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={pickImage}
          aria-label="Insert image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
