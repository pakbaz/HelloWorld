import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { PromptEditor } from './components/PromptEditor';
import { VariablePanel } from './components/VariablePanel';
import { PreviewPane } from './components/PreviewPane';
import { TagSelector } from './components/TagSelector';
import { PromptTable } from './components/PromptTable';
import { VersionHistory } from './components/VersionHistory';
import { getRepository } from './repository/index.ts';
import { RepositoryContext, useRepository, type IRepository, type Prompt, type Tag } from './db/RepositoryContext';
import { clearDraftState, loadDraftState, saveDraftState, type EditorDraftSnapshot } from './utils/draftStorage';
import { analyzePlaceholders } from './utils/placeholderParser';

type ActiveTab = 'editor' | 'history';
type PromptSortField = 'title' | 'updated_at' | 'version';
type PromptSortDirection = 'asc' | 'desc';
type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem('promptforge-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function buildSnapshot(
  title: string,
  body: string,
  variables: Record<string, string>,
  selectedTagIds: number[]
): EditorDraftSnapshot {
  return { title, body, variables, selectedTagIds };
}

function snapshotsEqual(left: EditorDraftSnapshot, right: EditorDraftSnapshot): boolean {
  return (
    left.title === right.title &&
    left.body === right.body &&
    left.selectedTagIds.length === right.selectedTagIds.length &&
    left.selectedTagIds.every((value, index) => value === right.selectedTagIds[index]) &&
    Object.keys(left.variables).length === Object.keys(right.variables).length &&
    Object.entries(left.variables).every(([key, value]) => right.variables[key] === value)
  );
}

function AppContent() {
  const repository = useRepository();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedPromptIds, setSelectedPromptIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<PromptSortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<PromptSortDirection>('desc');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [promptListError, setPromptListError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [baselineSnapshot, setBaselineSnapshot] = useState<EditorDraftSnapshot>(
    buildSnapshot('', '', {}, [])
  );
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'cleared'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSnapshot = buildSnapshot(title, body, variables, selectedTagIds);
  const isDirty = !snapshotsEqual(currentSnapshot, baselineSnapshot);
  const draftPromptId = selected?.id ?? null;
  const placeholderAnalysis = useMemo(() => analyzePlaceholders(body), [body]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('promptforge-theme', theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
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
    })();

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
      const matchesTag = selectedTagId === null || (prompt.tags ?? []).some((tag) => tag.id === selectedTagId);
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

  useEffect(() => {
    const draft = loadDraftState(null);
    if (draft) {
      applyEditorState(null, draft, buildSnapshot('', '', {}, []));
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (snapshotsEqual(currentSnapshot, baselineSnapshot)) {
        clearDraftState(draftPromptId);
        setDraftStatus('cleared');
        return;
      }

      saveDraftState(draftPromptId, currentSnapshot);
      setDraftStatus('saved');
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [baselineSnapshot, body, currentSnapshot, draftPromptId, title, variables, selectedTagIds]);

  function resetEditorState() {
    setSelected(null);
    setTitle('');
    setBody('');
    setVariables({});
    setSelectedTagIds([]);
    setSelectedPromptIds([]);
    setBaselineSnapshot(buildSnapshot('', '', {}, []));
    setDraftStatus('idle');
    setActiveTab('editor');
  }

  function applyEditorState(
    prompt: Prompt | null,
    editorSnapshot: EditorDraftSnapshot,
    baseline: EditorDraftSnapshot
  ) {
    setSelected(prompt);
    setTitle(editorSnapshot.title);
    setBody(editorSnapshot.body);
    setVariables(editorSnapshot.variables);
    setSelectedTagIds(editorSnapshot.selectedTagIds);
    setBaselineSnapshot(baseline);
    setActiveTab('editor');
  }

  function confirmDiscard(message = 'You have unsaved changes. Discard them and continue?') {
    if (!isDirty) return true;
    return window.confirm(message);
  }

  function newPrompt() {
    if (!confirmDiscard()) return;
    setSelectedPromptIds([]);
    setStatusMessage(null);
    const draft = loadDraftState(null);
    applyEditorState(null, draft ?? buildSnapshot('', '', {}, []), buildSnapshot('', '', {}, []));
  }

  async function selectPrompt(p: Prompt) {
    if (!confirmDiscard()) return;

    const tags = p.tags ?? [];
    const savedSnapshot = buildSnapshot(p.title, p.body, {}, tags.map((tag) => tag.id));
    const draft = loadDraftState(p.id) ?? savedSnapshot;
    applyEditorState(p, draft, savedSnapshot);
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
      const nextBaseline = buildSnapshot(title.trim(), body, variables, selectedTagIds);
      setSelected(saved);
      setTitle(nextBaseline.title);
      setBody(nextBaseline.body);
      setVariables(nextBaseline.variables);
      setSelectedTagIds(nextBaseline.selectedTagIds);
      setBaselineSnapshot(nextBaseline);
      clearDraftState(saved.id);
      setDraftStatus('cleared');
      setStatusMessage(selected ? 'Prompt updated.' : 'Prompt created.');
      await refreshPrompts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them and delete this prompt?')) {
      return;
    }

    await repository.deletePrompt(id);
    clearDraftState(id);
    setSelectedPromptIds((prev) => prev.filter((promptId) => promptId !== id));
    if (selected?.id === id) {
      resetEditorState();
    }
    setStatusMessage('Prompt deleted.');
    await refreshPrompts();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const dataset = await repository.exportPrompts();
      const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `promptforge-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Prompt dataset exported.');
    } catch (error) {
      setStatusMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('The selected file is not valid JSON.');
      }

      const summary = await repository.importPrompts(data as Parameters<IRepository['importPrompts']>[0]);
      await refreshPrompts();
      const detail = [`created ${summary.created}`, `skipped ${summary.skipped}`];
      if (summary.errors.length) {
        detail.push(`errors ${summary.errors.length}`);
      }
      setStatusMessage(`Import complete (${detail.join(', ')}).`);
    } catch (error) {
      setStatusMessage(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  }

  async function handleBulkDelete() {
    if (!selectedPromptIds.length) return;
    const count = selectedPromptIds.length;
    if (!window.confirm(`Delete ${count} selected prompt${count > 1 ? 's' : ''}?`)) return;

    setBulkDeleting(true);
    try {
      await repository.bulkDeletePrompts(selectedPromptIds);
      setSelectedPromptIds([]);
      if (selected && selectedPromptIds.includes(selected.id)) {
        resetEditorState();
      }
      await refreshPrompts();
      setStatusMessage(`Deleted ${count} prompt${count > 1 ? 's' : ''}.`);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleRestored() {
    if (!selected) return;
    const refreshed = await refreshPrompts();
    const updated = refreshed.find((prompt) => prompt.id === selected.id);
    if (updated) {
      const tags = updated.tags ?? [];
      const nextBaseline = buildSnapshot(updated.title, updated.body, {}, tags.map((tag) => tag.id));
      setSelected(updated);
      setTitle(updated.title);
      setBody(updated.body);
      setVariables({});
      setSelectedTagIds(tags.map((tag) => tag.id));
      setBaselineSnapshot(nextBaseline);
      clearDraftState(updated.id);
      setDraftStatus('cleared');
    }
  }

  function togglePromptSelection(promptId: number) {
    setSelectedPromptIds((prev) =>
      prev.includes(promptId) ? prev.filter((id) => id !== promptId) : [...prev, promptId],
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__content">
          <div>
            <h1>⚒ PromptForge</h1>
            <p>AI Prompt Sandbox &amp; Snippet Manager</p>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? '☀ Light mode' : '🌙 Dark mode'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="app-sidebar">
          <div className="sidebar-actions">
            <button className="btn-new" onClick={newPrompt}>
              + New Prompt
            </button>
            <div className="sidebar-actions-row">
              <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting…' : 'Export'}
              </button>
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="application/json"
              onChange={handleImport}
            />
            {selectedPromptIds.length > 0 && (
              <button className="btn-danger" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedPromptIds.length})`}
              </button>
            )}
          </div>
          {statusMessage && (
            <p className="app-status" role="status">
              {statusMessage}
            </p>
          )}
          {loadingPrompts ? (
            <p>Loading prompts…</p>
          ) : promptListError ? (
            <p>{promptListError}</p>
          ) : (
            <PromptTable
              prompts={visiblePrompts}
              totalPrompts={prompts.length}
              selectedId={selected?.id ?? null}
              selectedIds={selectedPromptIds}
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
              onToggleSelect={togglePromptSelection}
            />
          )}
        </aside>

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
                <div className="editor-actions">
                  <button
                    className="btn-save"
                    onClick={handleSave}
                    disabled={saving || placeholderAnalysis.hasMalformed}
                  >
                    {saving ? 'Saving…' : selected ? 'Save & Snapshot' : 'Create Prompt'}
                  </button>
                  <p className={`editor-status${isDirty ? ' editor-status--dirty' : ''}`}>
                    {isDirty ? 'Unsaved changes' : draftStatus === 'saved' ? 'Draft saved' : 'No unsaved changes'}
                  </p>
                </div>
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
