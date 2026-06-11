import { useEffect, useState } from 'react';
import type { Tag } from '../types';
import { getTags, upsertTag } from '../repository';

interface TagSelectorProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function TagSelector({ selectedIds, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    getTags().then(setTags);
  }, []);

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function handleCreate() {
    const name = newTag.trim();
    if (!name) return;
    const tag = await upsertTag(name);
    setTags((prev) => (prev.find((t) => t.id === tag.id) ? prev : [...prev, tag]));
    onChange([...selectedIds, tag.id]);
    setNewTag('');
  }

  return (
    <div className="tag-selector">
      <h4>Tags</h4>
      <div className="ts-tags">
        {tags.map((t) => (
          <button
            key={t.id}
            className={`ts-tag${selectedIds.includes(t.id) ? ' ts-tag--selected' : ''}`}
            onClick={() => toggle(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="ts-new">
        <input
          type="text"
          placeholder="New tag…"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button onClick={handleCreate}>Add</button>
      </div>
    </div>
  );
}
