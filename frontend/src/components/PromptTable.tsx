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
    <>
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
              className={p.id === selectedId ? 'pt-row--selected' : ''}
              onClick={() => onSelect(p)}
              style={{ cursor: 'pointer' }}
            >
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

      <div className="prompt-list">
        {prompts.map((p) => (
          <div key={p.id} className={`prompt-list__item${p.id === selectedId ? ' prompt-list__item--selected' : ''}`}>
            <button type="button" className="prompt-list__select" onClick={() => onSelect(p)}>
              <div className="prompt-list__title-row">
                <span className="prompt-list__title">{p.title}</span>
                <span className="prompt-list__version">v{p.version}</span>
              </div>
              <div className="prompt-list__meta">
                <span>{new Date(p.updated_at).toLocaleString()}</span>
              </div>
            </button>
            <button
              type="button"
              className="pt-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${p.title}"?`)) onDelete(p.id);
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
