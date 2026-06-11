import React, { useState } from 'react';

interface TagSelectorProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags,
  selectedTags,
  onChange,
}) => {
  const [newTag, setNewTag] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !availableTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
      setNewTag('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {availableTags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            style={{
              background: selectedTags.includes(tag) ? '#0070f3' : '#eee',
              color: selectedTags.includes(tag) ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            {tag}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '8px' }}>
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="New tag…"
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
        />
        <button onClick={addTag} style={{ marginLeft: '4px' }}>
          Add
        </button>
      </div>
    </div>
  );
};

export default TagSelector;
