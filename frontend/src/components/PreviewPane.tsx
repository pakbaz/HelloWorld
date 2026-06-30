import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { renderBodyWithPlaceholders } from '../utils/placeholderParser';

interface PreviewPaneProps {
  body: string;
  variables: Record<string, string>;
}

type FeedbackState = 'idle' | 'copied' | 'error';
type ExportFormat = 'text' | 'markdown';

export function PreviewPane({ body, variables }: PreviewPaneProps) {
  const rendered = useMemo(() => renderBodyWithPlaceholders(body, variables), [body, variables]);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('text');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (feedback === 'idle') return;

    const timer = window.setTimeout(() => setFeedback('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function handleCopy() {
    if (!rendered) {
      setFeedback('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(rendered);
      setFeedback('copied');
    } catch {
      setFeedback('error');
    }
  }

  function handleExport() {
    const extension = exportFormat === 'markdown' ? 'md' : 'txt';
    const mimeType = exportFormat === 'markdown' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([rendered], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `rendered-prompt.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const feedbackText = feedback === 'copied' ? 'Copied!' : feedback === 'error' ? 'Copy failed' : 'Ready';
  const previewMarkdown = rendered || '*Nothing to preview yet…*';

  function renderPreviewContent() {
    return (
      <div className="pp-markdown">
        <ReactMarkdown>{previewMarkdown}</ReactMarkdown>
      </div>
    );
  }

  return (
    <>
      <div className="preview-pane">
        <div className="pp-header">
          <h4>Preview</h4>
          <div className="pp-actions">
            <label className="pp-export">
              <span className="sr-only">Export format</span>
              <select
                className="pp-export-select"
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                aria-label="Export format"
              >
                <option value="text">Text</option>
                <option value="markdown">Markdown</option>
              </select>
            </label>
            <button className="pp-action-btn" onClick={handleExport} title="Export rendered prompt">
              Export
            </button>
            <button className="pp-action-btn" onClick={() => setIsFullscreen(true)} title="Open full-screen preview">
              Full screen
            </button>
            <button className="pp-action-btn pp-action-btn--primary" onClick={handleCopy} title="Copy rendered prompt">
              {feedback === 'copied' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="pp-status" aria-live="polite">
          {feedbackText}
        </div>
        <div className="pp-content">{renderPreviewContent()}</div>
      </div>

      {isFullscreen && (
        <div className="pp-overlay" role="dialog" aria-modal="true" aria-label="Rendered prompt preview">
          <div className="pp-overlay-card">
            <div className="pp-header">
              <h4>Preview</h4>
              <div className="pp-actions">
                <label className="pp-export">
                  <span className="sr-only">Export format</span>
                  <select
                    className="pp-export-select"
                    value={exportFormat}
                    onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                    aria-label="Export format"
                  >
                    <option value="text">Text</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </label>
                <button className="pp-action-btn" onClick={handleExport} title="Export rendered prompt">
                  Export
                </button>
                <button className="pp-action-btn" onClick={() => setIsFullscreen(false)} title="Close full-screen preview">
                  Close
                </button>
              </div>
            </div>
            <div className="pp-status" aria-live="polite">
              {feedbackText}
            </div>
            <div className="pp-content pp-content--overlay">{renderPreviewContent()}</div>
          </div>
        </div>
      )}
    </>
  );
}
