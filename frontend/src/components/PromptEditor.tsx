import { useEffect, useRef } from 'react';
import { formatPlaceholder, type PlaceholderAnalysis } from '../utils/placeholderParser';

interface PromptEditorProps {
  title: string;
  body: string;
  analysis: PlaceholderAnalysis;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
}

export function PromptEditor({
  title,
  body,
  analysis,
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

  const { placeholders, issues } = analysis;

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
        placeholder="Write your prompt here… use {{variable}} or {{customer-id}} for dynamic placeholders."
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        rows={8}
      />
      {placeholders.length > 0 && (
        <p className="pe-placeholder-hint">
          Detected placeholders:{' '}
          {placeholders.map((placeholder) => (
            <code key={placeholder}>{formatPlaceholder(placeholder)}</code>
          ))}
        </p>
      )}
      {issues.length > 0 && (
        <div className={`pe-validation ${analysis.hasMalformed ? 'pe-validation--error' : 'pe-validation--warn'}`}>
          <p className="pe-validation-title">
            {analysis.hasMalformed ? 'Fix placeholder issues before saving.' : 'Placeholder warnings'}
          </p>
          <ul className="pe-validation-list">
            {issues.map((issue, index) => (
              <li key={`${issue.type}-${issue.name ?? issue.message}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
