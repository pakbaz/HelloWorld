import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { PromptEditor } from './components/PromptEditor';
import { VariablePanel } from './components/VariablePanel';
import { PreviewPane } from './components/PreviewPane';
import { TagSelector } from './components/TagSelector';
import { PromptTable } from './components/PromptTable';
import { VersionHistory } from './components/VersionHistory';
import {
  deletePrompt,
  getPrompt,
  getPrompts,
  getPromptTags,
  savePrompt,
  setPromptTags,
} from './repository';
import type { Prompt } from './types';

type ActiveTab = 'editor' | 'history';

function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');

  const loadPrompts = useCallback(async () => {
    const list = await getPrompts();
    setPrompts(list);
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  function newPrompt() {
    setSelected(null);
    setTitle('');
    setBody('');
    setVariables({});
    setSelectedTagIds([]);
    setActiveTab('editor');
  }

  async function selectPrompt(p: Prompt) {
    setSelected(p);
    setTitle(p.title);
    setBody(p.body);
    setVariables({});
    const tags = await getPromptTags(p.id);
    setSelectedTagIds(tags.map((t) => t.id));
    setActiveTab('editor');
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }
    setSaving(true);
    try {
      const saved = await savePrompt({
        id: selected?.id,
        title: title.trim(),
        body,
      });
      await setPromptTags(saved.id, selectedTagIds);
      setSelected(saved);
      await loadPrompts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await deletePrompt(id);
    if (selected?.id === id) newPrompt();
    await loadPrompts();
  }

  async function handleRestored() {
    if (!selected) return;
    const refreshed = await getPrompt(selected.id);
    if (refreshed) {
      setSelected(refreshed);
      setTitle(refreshed.title);
      setBody(refreshed.body);
    }
    await loadPrompts();
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚒ PromptForge</h1>
        <p>AI Prompt Sandbox &amp; Snippet Manager</p>
      </header>

      <main className="app-main">
        {/* Left panel: prompt list */}
        <aside className="app-sidebar">
          <button className="btn-new" onClick={newPrompt}>
            + New Prompt
          </button>
          <PromptTable
            prompts={prompts}
            selectedId={selected?.id ?? null}
            onSelect={selectPrompt}
            onDelete={handleDelete}
          />
        </aside>

        {/* Right panel: editor + history */}
        <section className="app-workspace">
          <div className="workspace-tabs">
            <button
              className={`tab${activeTab === 'editor' ? ' tab--active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              Editor
            </button>
            <button
              className={`tab${activeTab === 'history' ? ' tab--active' : ''}`}
              disabled={!selected}
              onClick={() => setActiveTab('history')}
            >
              Version History
              {selected && <span className="tab-badge">v{selected.version}</span>}
            </button>
          </div>

          {activeTab === 'editor' && (
            <div className="editor-layout">
              <div className="editor-col">
                <PromptEditor
                  title={title}
                  body={body}
                  onTitleChange={setTitle}
                  onBodyChange={setBody}
                />
                <TagSelector
                  selectedIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : selected ? 'Save & Snapshot' : 'Create Prompt'}
                </button>
                {selected && (
                  <p className="current-version-hint">
                    Current: <strong>v{selected.version}</strong>
                  </p>
                )}
              </div>
              <div className="preview-col">
                <VariablePanel
                  body={body}
                  values={variables}
                  onChange={setVariables}
                />
                <PreviewPane body={body} variables={variables} />
              </div>
            </div>
          )}

          {activeTab === 'history' && selected && (
            <VersionHistory
              promptId={selected.id}
              currentVersion={selected.version}
              onRestored={handleRestored}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
