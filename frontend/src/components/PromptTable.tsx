import type { Prompt } from '../db/RepositoryContext';

interface PromptTableProps {
  prompts: Prompt[];
  selectedId: number | null;
  selectedIds: number[];
  onSelect: (p: Prompt) => void;
  onDelete: (id: number) => void;
  onToggleSelect: (id: number) => void;
}

export function PromptTable({ prompts, selectedId, selectedIds, onSelect, onDelete, onToggleSelect }: PromptTableProps) {
  if (prompts.length === 0) {
    return (
      <div className="prompt-table prompt-table--empty">
        <p>No prompts yet — create your first one!</p>
      </div>
    );
  }

  return (
    <table className="prompt-table">
      <thead>
        <tr>
          <th className="pt-checkbox-cell"></th>
          <th>Title</th>
          <th>Version</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {prompts.map((p) => (
          <tr
            key={p.id}
            className={p.id === selectedId ? 'pt-row--selected' : ''}
            onClick={() => onSelect(p)}
            style={{ cursor: 'pointer' }}
          >
            <td className="pt-checkbox-cell">
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelect(p.id)}
              />
            </td>
            <td>{p.title}</td>
            <td>v{p.version}</td>
            <td>{new Date(p.updated_at).toLocaleString()}</td>
            <td>
              <button
                className="pt-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${p.title}"?`)) onDelete(p.id);
                }}
              >
                🗑
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
