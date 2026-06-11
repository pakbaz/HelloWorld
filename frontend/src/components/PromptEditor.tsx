import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import type { Prompt, Variable, Tag } from '../repository/types';
import { VariablePanel } from './VariablePanel';
import { PreviewPane } from './PreviewPane';
import { TagSelector } from './TagSelector';

interface PromptEditorProps {
  prompt: Prompt | null;
  allTags: Tag[];
  onSave: (prompt: Prompt, variables: Variable[], tagIds: number[]) => Promise<void>;
  onCancel: () => void;
  onNewTag: (name: string) => Promise<Tag>;
}

function parsePlaceholders(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
  const unique = [...new Set(matches.map((m) => m.slice(2, -2)))];
  return unique;
}

export function PromptEditor({ prompt, allTags, onSave, onCancel, onNewTag }: PromptEditorProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setBody(prompt.body);
      setVariables(prompt.variables ?? []);
      setSelectedTagIds((prompt.tags ?? []).map((t) => t.id!));
      const defaults: Record<string, string> = {};
      for (const v of prompt.variables ?? []) {
        defaults[v.name] = v.default_value ?? '';
      }
      setVarValues(defaults);
    } else {
      setTitle('');
      setBody('');
      setVariables([]);
      setVarValues({});
      setSelectedTagIds([]);
    }
  }, [prompt]);

  // Sync variables list when body placeholders change
  useEffect(() => {
    const names = parsePlaceholders(body);
    setVariables((prev) => {
      const byName = new Map(prev.map((v) => [v.name, v]));
      return names.map((name) => byName.get(name) ?? { name, default_value: '' });
    });
  }, [body]);

  const handleBodyChange = (e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const enrichedVars = variables.map((v) => ({
        ...v,
        default_value: varValues[v.name] ?? v.default_value ?? '',
      }));
      await onSave(
        { ...prompt, title: title.trim(), body },
        enrichedVars,
        selectedTagIds
      );
    } finally {
      setSaving(false);
    }
  };

  const renderedBody = body.replace(/\{\{(\w+)\}\}/g, (_, name) => varValues[name] ?? `{{${name}}}`);

  return (
    <div className="prompt-editor">
      <div className="editor-header">
        <input
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Prompt title…"
        />
        <div className="editor-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : prompt?.id ? 'Save' : 'Create'}
          </button>
        </div>
      </div>

      <TagSelector
        allTags={allTags}
        selectedIds={selectedTagIds}
        onChange={setSelectedTagIds}
        onNewTag={onNewTag}
      />

      <div className="editor-body">
        <div className="editor-left">
          <label className="field-label">Prompt Body</label>
          <textarea
            className="body-textarea"
            value={body}
            onChange={handleBodyChange}
            placeholder="Write your prompt here… use {{variable}} placeholders."
            rows={12}
          />
          {variables.length > 0 && (
            <VariablePanel
              variables={variables}
              values={varValues}
              onChange={(name, val) => setVarValues((prev) => ({ ...prev, [name]: val }))}
            />
          )}
        </div>
        <div className="editor-right">
          <PreviewPane markdown={renderedBody} />
        </div>
      </div>

      {prompt?.id && (
        <div className="version-info">Version {prompt.version}</div>
      )}
    </div>
  );
}
