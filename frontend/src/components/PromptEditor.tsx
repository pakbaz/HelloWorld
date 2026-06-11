import React, { useState, useEffect, useCallback } from 'react';
import type { Prompt, Tag } from '../repository/types';
import {
  createPrompt,
  updatePrompt,
  listTags,
  createTag,
} from '../repository/pgliteRepo';
import TagSelector from './TagSelector';

interface PromptEditorProps {
  prompt?: Prompt | null;
  onSaved: (prompt: Prompt) => void;
  onCancel: () => void;
}

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

function highlightPlaceholders(body: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    parts.push(
      <mark key={m.index} className="placeholder-highlight">
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts;
}

export default function PromptEditor({ prompt, onSaved, onCancel }: PromptEditorProps) {
  const [title, setTitle] = useState(prompt?.title ?? '');
  const [body, setBody] = useState(prompt?.body ?? '');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    prompt?.tags?.map((t) => t.id) ?? [],
  );
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTags().then(setAllTags);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = prompt?.id
        ? await updatePrompt(prompt.id, title.trim(), body, selectedTagIds)
        : await createPrompt(title.trim(), body, selectedTagIds);
      onSaved(saved);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }, [title, body, selectedTagIds, prompt, onSaved]);

  const handleCreateTag = useCallback(async (name: string): Promise<Tag> => {
    const tag = await createTag(name);
    setAllTags((prev) => {
      if (prev.some((t) => t.id === tag.id)) return prev;
      return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name));
    });
    return tag;
  }, []);

  return (
    <div className="prompt-editor">
      <h2 className="prompt-editor__heading">
        {prompt ? `Edit Prompt (v${prompt.version})` : 'New Prompt'}
      </h2>

      {error && <p className="prompt-editor__error">{error}</p>}

      <label className="form-label">
        Title
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Prompt title…"
        />
      </label>

      <label className="form-label">
        Body{' '}
        <span className="form-hint">Use {'{{variable}}'} for placeholders</span>
        <div className="editor-wrap">
          <textarea
            className="form-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="Enter prompt body…"
            spellCheck={false}
          />
          {body && (
            <div className="editor-preview" aria-hidden>
              {highlightPlaceholders(body)}
            </div>
          )}
        </div>
      </label>

      <label className="form-label">
        Tags
        <TagSelector
          allTags={allTags}
          selectedIds={selectedTagIds}
          onChange={setSelectedTagIds}
          onCreateTag={handleCreateTag}
        />
      </label>

      <div className="prompt-editor__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : prompt ? 'Save Changes' : 'Create Prompt'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
