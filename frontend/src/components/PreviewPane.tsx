import React from 'react';

interface PreviewPaneProps {
  content: string;
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ content }) => {
  return (
    <div
      style={{
        border: '1px solid #ccc',
        padding: '16px',
        minHeight: '100px',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
      }}
    >
      {content || <em>Preview will appear here…</em>}
    </div>
  );
};

export default PreviewPane;
