import React from 'react';

export interface Prompt {
  id: number | string;
  title: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PromptTableProps {
  prompts: Prompt[];
  onSelect: (id: number | string) => void;
  onDelete: (id: number | string) => void;
}

const PromptTable: React.FC<PromptTableProps> = ({ prompts, onSelect, onDelete }) => {
  if (prompts.length === 0) {
    return <p>No prompts saved yet.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>
            Title
          </th>
          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>
            Version
          </th>
          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>
            Updated
          </th>
          <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }} />
        </tr>
      </thead>
      <tbody>
        {prompts.map((prompt) => (
          <tr key={prompt.id}>
            <td style={{ padding: '8px' }}>
              <button
                onClick={() => onSelect(prompt.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0070f3' }}
              >
                {prompt.title}
              </button>
            </td>
            <td style={{ padding: '8px' }}>{prompt.version}</td>
            <td style={{ padding: '8px' }}>{new Date(prompt.updated_at).toLocaleString()}</td>
            <td style={{ padding: '8px' }}>
              <button onClick={() => onDelete(prompt.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PromptTable;
