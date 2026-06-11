import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface PreviewPaneProps {
  markdown: string;
}

export function PreviewPane({ markdown }: PreviewPaneProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="preview-pane">
      <div className="preview-header">
        <span className="field-label">Preview</span>
        <button className="btn-copy" onClick={handleCopy} title="Copy rendered prompt">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="preview-content">
        {markdown ? (
          <ReactMarkdown>{markdown}</ReactMarkdown>
        ) : (
          <p className="empty-state">Preview will appear here as you type…</p>
        )}
      </div>
    </div>
  );
}
