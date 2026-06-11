import { useState, useEffect, useCallback } from 'react';
import type { Prompt, Tag, SortField, SortDir } from '../repository/types';
import { listPrompts, listTags, deletePrompt } from '../repository/pgliteRepo';

interface PromptTableProps {
  onEdit: (prompt: Prompt) => void;
  onNew: () => void;
  refreshKey?: number;
}

const PAGE_SIZE = 10;

export default function PromptTable({ onEdit, onNew, refreshKey }: PromptTableProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [filterTagId, setFilterTagId] = useState<number | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  // incremented by handleDelete to trigger a re-fetch without needing refs
  const [deleteTrigger, setDeleteTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const [result, tags] = await Promise.all([
          listPrompts({ search, tagId: filterTagId, sortField, sortDir, page, pageSize: PAGE_SIZE }),
          listTags(),
        ]);
        if (!cancelled) {
          setPrompts(result.items);
          setTotal(result.total);
          setAllTags(tags);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [search, filterTagId, sortField, sortDir, page, refreshKey, deleteTrigger]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
      setPage(1);
    },
    [sortField],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Delete this prompt?')) return;
      setDeleting(id);
      try {
        await deletePrompt(id);
        setDeleteTrigger((n) => n + 1);
      } finally {
        setDeleting(null);
      }
    },
    [],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sortIcon = (field: SortField) => {
    if (field !== sortField) return <span className="sort-icon sort-icon--none">⇅</span>;
    return (
      <span className="sort-icon sort-icon--active">
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="prompt-table-wrap">
      {/* Toolbar */}
      <div className="prompt-table__toolbar">
        <h1 className="app-title">PromptForge</h1>
        <button type="button" className="btn btn--primary" onClick={onNew}>
          + New Prompt
        </button>
      </div>

      {/* Filters */}
      <div className="prompt-table__filters">
        <input
          type="search"
          className="form-input"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="form-select"
          value={filterTagId ?? ''}
          onChange={(e) => {
            setFilterTagId(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <table className="prompt-table">
        <thead>
          <tr>
            <th>
              <button type="button" className="sort-btn" onClick={() => handleSort('title')}>
                Title {sortIcon('title')}
              </button>
            </th>
            <th>Tags</th>
            <th>Ver.</th>
            <th>
              <button type="button" className="sort-btn" onClick={() => handleSort('created_at')}>
                Created {sortIcon('created_at')}
              </button>
            </th>
            <th>
              <button type="button" className="sort-btn" onClick={() => handleSort('updated_at')}>
                Updated {sortIcon('updated_at')}
              </button>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="table-loading">
                Loading…
              </td>
            </tr>
          ) : prompts.length === 0 ? (
            <tr>
              <td colSpan={6} className="table-empty">
                No prompts found.
              </td>
            </tr>
          ) : (
            prompts.map((p) => (
              <tr key={p.id}>
                <td className="prompt-title-cell">{p.title}</td>
                <td>
                  <div className="tag-list">
                    {(p.tags ?? []).map((t) => (
                      <span key={t.id} className="tag-chip tag-chip--sm">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="version-cell">v{p.version}</td>
                <td className="date-cell">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="date-cell">{new Date(p.updated_at).toLocaleDateString()}</td>
                <td className="actions-cell">
                  <button
                    type="button"
                    className="btn btn--sm btn--secondary"
                    onClick={() => onEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                  >
                    {deleting === p.id ? '…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="prompt-table__pagination">
        <span className="pagination-info">
          {total} prompt{total !== 1 ? 's' : ''}
        </span>
        <div className="pagination-controls">
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="pagination-page">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
