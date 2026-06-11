import { useState, useMemo, useCallback } from 'react';
import type { Tag } from '../repository/types';

interface TagSelectorProps {
  allTags: Tag[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  onCreateTag: (name: string) => Promise<Tag>;
}

export default function TagSelector({ allTags, selectedIds, onChange, onCreateTag }: TagSelectorProps) {
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedTags = useMemo(
    () => allTags.filter((t) => selectedIds.includes(t.id)),
    [allTags, selectedIds],
  );

  const unselectedTags = useMemo(
    () => allTags.filter((t) => !selectedIds.includes(t.id)),
    [allTags, selectedIds],
  );

  const filtered = useMemo(
    () =>
      input.trim()
        ? unselectedTags.filter((t) => t.name.toLowerCase().includes(input.toLowerCase()))
        : unselectedTags,
    [unselectedTags, input],
  );

  const handleSelect = useCallback(
    (id: number) => {
      onChange([...selectedIds, id]);
      setInput('');
    },
    [selectedIds, onChange],
  );

  const handleRemove = useCallback(
    (id: number) => {
      onChange(selectedIds.filter((sid) => sid !== id));
    },
    [selectedIds, onChange],
  );

  const handleCreate = useCallback(async () => {
    const name = input.trim();
    if (!name) return;
    setCreating(true);
    try {
      const tag = await onCreateTag(name);
      onChange([...selectedIds, tag.id]);
      setInput('');
    } finally {
      setCreating(false);
    }
  }, [input, selectedIds, onChange, onCreateTag]);

  const exactMatch = allTags.some((t) => t.name.toLowerCase() === input.trim().toLowerCase());
  const showCreate = input.trim() && !exactMatch;

  return (
    <div className="tag-selector">
      {/* Selected tags */}
      <div className="tag-selector__selected">
        {selectedTags.map((tag) => (
          <span key={tag.id} className="tag-chip">
            {tag.name}
            <button
              type="button"
              className="tag-chip__remove"
              onClick={() => handleRemove(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Input + dropdown */}
      <div className="tag-selector__input-wrap">
        <input
          type="text"
          className="tag-selector__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add tag…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered.length > 0 && !showCreate) handleSelect(filtered[0].id);
              else if (showCreate) handleCreate();
            }
          }}
        />
        {(filtered.length > 0 || showCreate) && (
          <ul className="tag-selector__dropdown">
            {filtered.map((tag) => (
              <li key={tag.id}>
                <button type="button" onClick={() => handleSelect(tag.id)}>
                  {tag.name}
                </button>
              </li>
            ))}
            {showCreate && (
              <li>
                <button
                  type="button"
                  className="tag-selector__create-btn"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? 'Creating…' : `Create "${input.trim()}"`}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
