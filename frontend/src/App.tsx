import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { PromptEditor } from './components/PromptEditor';
import { VariablePanel } from './components/VariablePanel';
import { PreviewPane } from './components/PreviewPane';
import { TagSelector } from './components/TagSelector';
import { PromptTable } from './components/PromptTable';
import { VersionHistory } from './components/VersionHistory';
import { getRepository } from './repository/index.ts';
import { RepositoryContext, useRepository, type IRepository, type Prompt } from './db/RepositoryContext';
import { analyzePlaceholders } from './utils/placeholderParser';

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
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [promptListError, setPromptListError] = useState<string | null>(null);
  const placeholderAnalysis = useMemo(() => analyzePlaceholders(body), [body]);

  const loadPrompts = useCallback(async () => repository.getPrompts(), [repository]);

  const refreshPrompts = useCallback(async () => {
    setLoadingPrompts(true);
    setPromptListError(null);
    try {
      const list = await loadPrompts();
      setPrompts(list);
      return list;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load prompts.';
      setPromptListError(message);
      throw error;
    } finally {
      setLoadingPrompts(false);
    }
  }, [loadPrompts]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const list = await loadPrompts();
        if (!cancelled) {
          setPrompts(list);
          setPromptListError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Failed to load prompts.';
          setPromptListError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingPrompts(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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
    const tags = p.tags ?? [];
    setSelectedTagIds(tags.map((t) => t.id));
    setActiveTab('editor');
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }
    if (placeholderAnalysis.hasMalformed) {
      alert('Fix malformed placeholders before saving.');
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
      await refreshPrompts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await repository.deletePrompt(id);
    if (selected?.id === id) newPrompt();
    await refreshPrompts();
  }

  async function handleRestored() {
    if (!selected) return;
    const refreshed = await refreshPrompts();
    const updated = refreshed.find((p) => p.id === selected.id);
    if (updated) {
      setSelected(updated);
      setTitle(updated.title);
      setBody(updated.body);
    }
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
          {loadingPrompts ? (
            <p>Loading prompts…</p>
          ) : promptListError ? (
            <p>{promptListError}</p>
          ) : (
            <PromptTable
              prompts={prompts}
              selectedId={selected?.id ?? null}
              onSelect={selectPrompt}
              onDelete={handleDelete}
            />
          )}
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
                  analysis={placeholderAnalysis}
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
                  disabled={saving || placeholderAnalysis.hasMalformed}
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
                  analysis={placeholderAnalysis}
                  values={variables}
                  onChange={setVariables}
                />
                <PreviewPane body={body} variables={variables} />
              </div>
            </div>
          )}

          {activeTab === 'history' && selected && (
           <VersionHistory
             key={`${selected.id}:${selected.version}`}
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
