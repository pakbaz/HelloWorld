import type { Prompt, Tag } from '../db/RepositoryContext';

type PromptSortField = 'title' | 'updated_at' | 'version';
type PromptSortDirection = 'asc' | 'desc';

interface PromptTableProps {
  prompts: Prompt[];
  totalPrompts: number;
  selectedId: number | null;
  selectedIds: number[];
  tags: Tag[];
  searchValue: string;
  selectedTagId: number | null;
  sortField: PromptSortField;
  sortDirection: PromptSortDirection;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onTagChange: (id: number | null) => void;
  onSortFieldChange: (field: PromptSortField) => void;
  onSortDirectionChange: (direction: PromptSortDirection) => void;
  onResetFilters: () => void;
  onSelect: (p: Prompt) => void;
  onDelete: (id: number) => void;
  onToggleSelect: (id: number) => void;
}

export function PromptTable({
  prompts,
  totalPrompts,
  selectedId,
  selectedIds,
  tags,
  searchValue,
  selectedTagId,
  sortField,
  sortDirection,
  hasActiveFilters,
  onSearchChange,
  onTagChange,
  onSortFieldChange,
  onSortDirectionChange,
  onResetFilters,
  onSelect,
  onDelete,
  onToggleSelect,
}: PromptTableProps) {
  const hasPromptContent = prompts.length > 0;
  const hasNoPrompts = totalPrompts === 0;
  const hasNoMatches = !hasPromptContent && !hasNoPrompts;

  return (
    <div className="prompt-table-shell">
      <div className="prompt-list-controls">
        <div className="prompt-list-controls-row">
          <label className="prompt-list-control">
            <span>Search</span>
            <input
              type="search"
              value={searchValue}
              placeholder="Search title or body"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
          <label className="prompt-list-control">
            <span>Tag</span>
            <select
              value={selectedTagId ?? ''}
              onChange={(event) => onTagChange(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="prompt-list-controls-row prompt-list-controls-row--secondary">
          <label className="prompt-list-control">
            <span>Sort by</span>
            <select value={sortField} onChange={(event) => onSortFieldChange(event.target.value as PromptSortField)}>
              <option value="updated_at">Updated</option>
              <option value="title">Title</option>
              <option value="version">Version</option>
            </select>
          </label>
          <label className="prompt-list-control">
            <span>Direction</span>
            <select
              value={sortDirection}
              onChange={(event) => onSortDirectionChange(event.target.value as PromptSortDirection)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
          <button type="button" className="prompt-list-reset-btn" onClick={onResetFilters} disabled={!hasActiveFilters}>
            Reset
          </button>
        </div>
      </div>

      <div className="prompt-list-summary" aria-live="polite">
        <span>
          {hasNoPrompts
            ? 'No prompts yet'
            : hasNoMatches
              ? 'No prompts matched your filters'
              : `Showing ${prompts.length} of ${totalPrompts} prompts`}
        </span>
        {hasActiveFilters && !hasNoPrompts && <span className="prompt-list-summary__hint">Filters active</span>}
      </div>

      {hasNoPrompts ? (
        <div className="prompt-table prompt-table--empty">
          <p>No prompts yet — create your first one!</p>
        </div>
      ) : hasNoMatches ? (
        <div className="prompt-table prompt-table--empty">
          <p>No prompts matched your current filters.</p>
          <button type="button" className="prompt-list-reset-btn" onClick={onResetFilters}>
            Reset filters
          </button>
        </div>
      ) : (
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
            {prompts.map((prompt) => (
              <tr
                key={prompt.id}
                className={prompt.id === selectedId ? 'pt-row--selected' : ''}
                onClick={() => onSelect(prompt)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(prompt);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-selected={prompt.id === selectedId}
              >
                <td className="pt-checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(prompt.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => onToggleSelect(prompt.id)}
                  />
                </td>
                <td>{prompt.title}</td>
                <td>v{prompt.version}</td>
                <td>{new Date(prompt.updated_at).toLocaleString()}</td>
                <td>
                  <button
                    type="button"
                    className="pt-delete-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (confirm(`Delete "${prompt.title}"?`)) onDelete(prompt.id);
                    }}
                    aria-label={`Delete ${prompt.title}`}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
