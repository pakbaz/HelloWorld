import ReactMarkdown from 'react-markdown';
import { renderBodyWithPlaceholders } from '../utils/placeholderParser';

interface PreviewPaneProps {
  body: string;
  variables: Record<string, string>;
}

export function PreviewPane({ body, variables }: PreviewPaneProps) {
  const rendered = renderBodyWithPlaceholders(body, variables);
  const isEmpty = !body.trim();

  async function handleCopy() {
    await navigator.clipboard.writeText(rendered);
  }

  return (
    <div className={`preview-pane${isEmpty ? ' preview-pane--empty' : ''}`}>
      <div className="pp-header">
        <h4>Preview</h4>
        <button className="pp-copy-btn" onClick={handleCopy} title="Copy rendered prompt">
          📋 Copy
        </button>
      </div>
      <div className="pp-content">
        {isEmpty ? (
          <div className="empty-state">
            <p>Start typing a prompt to see the rendered preview here.</p>
          </div>
        ) : (
          <ReactMarkdown>{rendered}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
