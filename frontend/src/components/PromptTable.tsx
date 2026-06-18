import type { Prompt } from '../db/RepositoryContext';

interface PromptTableProps {
  prompts: Prompt[];
  selectedId: number | null;
  onSelect: (p: Prompt) => void;
  onDelete: (id: number) => void;
}

export function PromptTable({ prompts, selectedId, onSelect, onDelete }: PromptTableProps) {
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
            className={`pt-row${p.id === selectedId ? ' pt-row--selected' : ''}`}
            onClick={() => onSelect(p)}
          >
            <td data-label="Title" className="pt-title-cell">{p.title}</td>
            <td data-label="Version">v{p.version}</td>
            <td data-label="Updated">{new Date(p.updated_at).toLocaleString()}</td>
            <td className="pt-actions-cell">
              <button
                className="pt-delete-btn"
                type="button"
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
