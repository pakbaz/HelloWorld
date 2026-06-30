import ReactMarkdown from 'react-markdown';
import { renderBodyWithPlaceholders } from '../utils/placeholderParser';

interface PreviewPaneProps {
  body: string;
  variables: Record<string, string>;
}

export function PreviewPane({ body, variables }: PreviewPaneProps) {
  const rendered = renderBodyWithPlaceholders(body, variables);

  async function handleCopy() {
    await navigator.clipboard.writeText(rendered);
  }

  return (
    <div className="preview-pane">
      <div className="pp-header">
        <h4>Preview</h4>
        <button className="pp-copy-btn" onClick={handleCopy} title="Copy rendered prompt">
          📋 Copy
        </button>
      </div>
      <div className="pp-content">
        <ReactMarkdown>{rendered || '*Nothing to preview yet…*'}</ReactMarkdown>
      </div>
    </div>
  );
}
