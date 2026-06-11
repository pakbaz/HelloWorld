import type { Prompt, Tag } from '../repository/types';

interface PromptTableProps {
  prompts: Prompt[];
  allTags: Tag[];
  onSelect: (prompt: Prompt) => void;
  onDelete: (promptId: number) => void;
  onNew: () => void;
}

export function PromptTable({ prompts, allTags, onSelect, onDelete, onNew }: PromptTableProps) {
  return (
    <div className="prompt-table">
      <div className="prompt-table-header">
        <h2>Prompts</h2>
        <button className="btn-primary" onClick={onNew}>+ New Prompt</button>
      </div>
      {prompts.length === 0 ? (
        <p className="empty-state">No prompts yet. Create your first one!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Tags</th>
              <th>Version</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((p) => (
              <tr key={p.id} onClick={() => onSelect(p)} style={{ cursor: 'pointer' }}>
                <td>{p.title}</td>
                <td>
                  {(p.tags ?? []).map((t) => (
                    <span key={t.id} className="tag-badge">{t.name}</span>
                  ))}
                </td>
                <td>v{p.version}</td>
                <td>{p.updated_at ? new Date(p.updated_at).toLocaleString() : '—'}</td>
                <td>
                  <button
                    className="btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${p.title}"?`)) {
                        onDelete(p.id!);
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="prompt-table-footer">
        <span className="prompt-count">{prompts.length} prompt{prompts.length !== 1 ? 's' : ''}</span>
        {allTags.length > 0 && (
          <span className="tag-count"> · {allTags.length} tag{allTags.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}
