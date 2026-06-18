import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { PromptEditor } from './components/PromptEditor';
import { VariablePanel } from './components/VariablePanel';
import { PreviewPane } from './components/PreviewPane';
import { TagSelector } from './components/TagSelector';
import { PromptTable } from './components/PromptTable';
import { VersionHistory } from './components/VersionHistory';
import { getRepository } from './repository/index.ts';
import { RepositoryContext, useRepository, type IRepository, type Prompt } from './db/RepositoryContext';

type ActiveTab = 'editor' | 'history';

function AppContent() {
  const repository = useRepository();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');

  const loadPrompts = useCallback(async () => {
    const list = await repository.getPrompts();
    setPrompts(list);
  }, [repository]);

  useEffect(() => {
    repository.getPrompts().then(setPrompts);
  }, [repository]);

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
    const tags = p.tags ?? [];
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
      const saved = await repository.savePrompt({
        id: selected?.id,
        title: title.trim(),
        body,
      });
      await repository.setPromptTags(saved.id, selectedTagIds);
      setSelected(saved);
      await loadPrompts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await repository.deletePrompt(id);
    if (selected?.id === id) newPrompt();
    await loadPrompts();
  }

  async function handleRestored() {
    if (!selected) return;
    const refreshed = await repository.getPrompts();
    const updated = refreshed.find((p) => p.id === selected.id);
    if (updated) {
      setSelected(updated);
      setTitle(updated.title);
      setBody(updated.body);
    }
    setPrompts(refreshed);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__eyebrow">Prompt workspace</span>
          <h1>⚒ PromptForge</h1>
          <p>AI Prompt Sandbox &amp; Snippet Manager</p>
        </div>
        <div className="app-header__meta">
          <span className="app-pill">
            {prompts.length} prompt{prompts.length === 1 ? '' : 's'}
          </span>
          <span className="app-pill app-pill--accent">
            {selected ? `Editing v${selected.version}` : 'Draft mode'}
          </span>
        </div>
      </header>

      <main className="app-main">
        <aside className="app-sidebar">
          <div className="panel-heading">
            <div>
              <p className="panel-heading__eyebrow">Library</p>
              <h2>Saved prompts</h2>
            </div>
            <p className="panel-heading__meta">Browse, switch, or clean up prompts.</p>
          </div>
          <button className="btn-new" onClick={newPrompt} type="button">
            + New Prompt
          </button>
          <PromptTable
            prompts={prompts}
            selectedId={selected?.id ?? null}
            onSelect={selectPrompt}
            onDelete={handleDelete}
          />
        </aside>

        <section className="app-workspace">
          <div className="workspace-header">
            <div>
              <p className="panel-heading__eyebrow">
                {selected ? 'Selected prompt' : 'Start a new prompt'}
              </p>
              <h2>{title.trim() || (selected ? 'Untitled prompt' : 'New prompt')}</h2>
            </div>
            <p className="workspace-header__meta">
              {selected
                ? 'Update content, manage tags, and restore earlier snapshots when needed.'
                : 'Draft your prompt, add placeholders, and preview the final output live.'}
            </p>
          </div>
          <div className="workspace-tabs">
            <button
              className={`tab${activeTab === 'editor' ? ' tab--active' : ''}`}
              type="button"
              onClick={() => setActiveTab('editor')}
            >
              Editor
            </button>
            <button
              className={`tab${activeTab === 'history' ? ' tab--active' : ''}`}
              disabled={!selected}
              type="button"
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
                  type="button"
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

export default function App() {
  const [repository, setRepository] = useState<IRepository | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRepository().then(setRepository).catch((err) => {
      console.error('Failed to initialise database:', err);
      setError(err?.message ?? 'Unknown error');
    });
  }, []);

  if (error) {
    return (
      <div className="app-loading">
        <p>Failed to initialise database: {error}</p>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="app-loading">
        <p>Initialising database…</p>
      </div>
    );
  }

  return (
    <RepositoryContext.Provider value={repository}>
      <AppContent />
    </RepositoryContext.Provider>
  );
}
