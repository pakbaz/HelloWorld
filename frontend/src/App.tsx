import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { PromptEditor } from './components/PromptEditor';
import { VariablePanel } from './components/VariablePanel';
import { PreviewPane } from './components/PreviewPane';
import { TagSelector } from './components/TagSelector';
import { PromptTable } from './components/PromptTable';
import { VersionHistory } from './components/VersionHistory';
import { getRepository } from './repository/index.ts';
import { RepositoryContext, useRepository, type IRepository, type Prompt, type Tag } from './db/RepositoryContext';

type ActiveTab = 'editor' | 'history';
type PromptSortField = 'title' | 'updated_at' | 'version';
type PromptSortDirection = 'asc' | 'desc';

function AppContent() {
  const repository = useRepository();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<PromptSortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<PromptSortDirection>('desc');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');

  const loadPrompts = useCallback(async () => {
    const list = await repository.getPrompts();
    setPrompts(list);
  }, [repository]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const list = await repository.getPrompts();
      if (!cancelled) {
        setPrompts(list);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    let cancelled = false;

    const loadTags = async () => {
      try {
        const nextTags = await repository.getTags();
        if (!cancelled) {
          setTags(nextTags);
        }
      } catch {
        if (!cancelled) {
          setTags([]);
        }
      }
    };

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [repository]);

  const visiblePrompts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = prompts.filter((prompt) => {
      const matchesSearch =
        !normalizedQuery ||
        prompt.title.toLowerCase().includes(normalizedQuery) ||
        prompt.body.toLowerCase().includes(normalizedQuery);
      const matchesTag =
        selectedTagId === null || (prompt.tags ?? []).some((tag) => tag.id === selectedTagId);
      return matchesSearch && matchesTag;
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    filtered.sort((left, right) => {
      if (sortField === 'version') {
        return (left.version - right.version) * direction;
      }

      if (sortField === 'title') {
        return left.title.localeCompare(right.title) * direction;
      }

      const leftUpdated = new Date(left.updated_at).getTime();
      const rightUpdated = new Date(right.updated_at).getTime();
      return (leftUpdated - rightUpdated) * direction;
    });

    return filtered;
  }, [prompts, searchQuery, selectedTagId, sortField, sortDirection]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedTagId !== null || sortField !== 'updated_at' || sortDirection !== 'desc';

  function resetFilters() {
    setSearchQuery('');
    setSelectedTagId(null);
    setSortField('updated_at');
    setSortDirection('desc');
  }

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
            prompts={visiblePrompts}
            totalPrompts={prompts.length}
            selectedId={selected?.id ?? null}
            tags={tags}
            searchValue={searchQuery}
            selectedTagId={selectedTagId}
            sortField={sortField}
            sortDirection={sortDirection}
            hasActiveFilters={hasActiveFilters}
            onSearchChange={setSearchQuery}
            onTagChange={setSelectedTagId}
            onSortFieldChange={setSortField}
            onSortDirectionChange={setSortDirection}
            onResetFilters={resetFilters}
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
