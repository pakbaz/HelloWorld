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
import { clearDraftState, loadDraftState, saveDraftState, type EditorDraftSnapshot } from './utils/draftStorage';

type ActiveTab = 'editor' | 'history';

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
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
  const [baselineSnapshot, setBaselineSnapshot] = useState<EditorDraftSnapshot>(
    buildSnapshot('', '', {}, [])
  );
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'cleared'>('idle');

  const currentSnapshot = buildSnapshot(title, body, variables, selectedTagIds);
  const isDirty = !snapshotsEqual(currentSnapshot, baselineSnapshot);
  const draftPromptId = selected?.id ?? null;

  const loadPrompts = useCallback(async () => {
    const list = await repository.getPrompts();
    setPrompts(list);
  }, [repository]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPrompts();
    }, 0);

    return () => window.clearTimeout(timeout);
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
    setBaselineSnapshot(buildSnapshot('', '', {}, []));
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
      clearDraftState(draftPromptId);
      setDraftStatus('cleared');
      await loadPrompts();
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
    if (selected?.id === id) {
      resetEditorState();
    }
    await loadPrompts();
  }

  async function handleRestored() {
    if (!selected) return;
    const refreshed = await repository.getPrompts();
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
                <div className="editor-actions">
                  <button
                    className="btn-save"
                    onClick={handleSave}
                    disabled={saving}
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
