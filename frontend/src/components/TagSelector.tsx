import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { Tag } from '../repository/types';

interface TagSelectorProps {
  allTags: Tag[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  onNewTag: (name: string) => Promise<Tag>;
}

export function TagSelector({ allTags, selectedIds, onChange, onNewTag }: TagSelectorProps) {
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };

  const submitInput = async (name: string) => {
    if (!name) return;
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedIds.includes(existing.id!)) {
        onChange([...selectedIds, existing.id!]);
      }
    } else {
      setCreating(true);
      try {
        const created = await onNewTag(name);
        onChange([...selectedIds, created.id!]);
      } finally {
        setCreating(false);
      }
    }
    setInput('');
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    await submitInput(input.trim());
  };

  const filtered = input.trim()
    ? allTags.filter((t) => t.name.toLowerCase().includes(input.toLowerCase()))
    : allTags;

  return (
    <div className="tag-selector">
      <div className="tag-chips">
        {allTags
          .filter((t) => selectedIds.includes(t.id!))
          .map((t) => (
            <span key={t.id} className="tag-chip selected" onClick={() => toggle(t.id!)}>
              {t.name} ✕
            </span>
          ))}
        <input
          ref={inputRef}
          className="tag-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={creating ? 'Creating…' : 'Add tag…'}
          disabled={creating}
        />
      </div>
      {input.trim() && (
        <div className="tag-dropdown">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`tag-option ${selectedIds.includes(t.id!) ? 'selected' : ''}`}
              onClick={() => { toggle(t.id!); setInput(''); inputRef.current?.focus(); }}
            >
              {t.name}
            </div>
          ))}
          {!filtered.find((t) => t.name.toLowerCase() === input.trim().toLowerCase()) && (
            <div
              className="tag-option create-new"
              onClick={() => { void submitInput(input.trim()); }}
            >
              Create &ldquo;{input.trim()}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
