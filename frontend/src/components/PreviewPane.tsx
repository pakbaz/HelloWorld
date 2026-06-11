import ReactMarkdown from 'react-markdown';

interface PreviewPaneProps {
  body: string;
  variables: Record<string, string>;
}

function renderBody(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    variables[name] !== undefined && variables[name] !== '' ? variables[name] : `{{${name}}}`
  );
}

export function PreviewPane({ body, variables }: PreviewPaneProps) {
  const rendered = renderBody(body, variables);

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
