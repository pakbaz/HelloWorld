import { useEffect, useRef } from 'react';

interface PromptEditorProps {
  title: string;
  body: string;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
}

export function PromptEditor({
  title,
  body,
  onTitleChange,
  onBodyChange,
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [body]);

  // Highlight {{placeholders}} in the textarea overlay is complex;
  // we keep it simple: just show a character count and placeholder count.
  const placeholders = [...new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];

  return (
    <div className="prompt-editor">
      <input
        className="pe-title"
        type="text"
        placeholder="Prompt title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <textarea
        ref={textareaRef}
        className="pe-body"
        placeholder="Write your prompt here… use {{variable}} for dynamic placeholders."
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        rows={8}
      />
      {placeholders.length > 0 && (
        <p className="pe-placeholder-hint">
          Detected placeholders:{' '}
          {placeholders.map((p) => (
            <code key={p}>{`{{${p}}}`}</code>
          ))}
        </p>
      )}
    </div>
  );
}
