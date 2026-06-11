import { useState, useEffect, useCallback } from 'react';
import { getRepository } from './repository';
import type { IRepository, Prompt, Variable, Tag } from './repository';
import { PromptTable } from './components/PromptTable';
import { PromptEditor } from './components/PromptEditor';
import './App.css';

type View = 'list' | 'editor';

function App() {
  const [repo, setRepo] = useState<IRepository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<Prompt | null>(null);

  const refresh = useCallback(async (r: IRepository) => {
    const [ps, ts] = await Promise.all([r.getPrompts(), r.getTags()]);
    setPrompts(ps);
    setAllTags(ts);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const r = await getRepository();
        if (cancelled) return;
        await refresh(r);
        if (!cancelled) setRepo(r);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [refresh]);

  const handleNew = () => {
    setEditing(null);
    setView('editor');
  };

  const handleSelect = (p: Prompt) => {
    setEditing(p);
    setView('editor');
  };

  const handleCancel = () => {
    setEditing(null);
    setView('list');
  };

  const handleSave = async (prompt: Prompt, variables: Variable[], tagIds: number[]) => {
    if (!repo) return;
    const saved = await repo.savePrompt(prompt);
    await repo.saveVariables(saved.id!, variables);
    await repo.setPromptTags(saved.id!, tagIds);
    await refresh(repo);
    setEditing(null);
    setView('list');
  };

  const handleDelete = async (promptId: number) => {
    if (!repo) return;
    await repo.deletePrompt(promptId);
    await refresh(repo);
  };

  const handleNewTag = async (name: string): Promise<Tag> => {
    if (!repo) throw new Error('Repository not ready');
    const tag = await repo.saveTag({ name });
    await refresh(repo);
    return tag;
  };

  if (loading) {
    return (
      <div className="app-loading">
        <p>Initialising database…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Something went wrong</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>PromptForge</h1>
        <p className="app-subtitle">AI Prompt Sandbox &amp; Snippet Manager</p>
      </header>

      <main className="app-main">
        {view === 'list' ? (
          <PromptTable
            prompts={prompts}
            allTags={allTags}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onNew={handleNew}
          />
        ) : (
          <PromptEditor
            key={editing?.id ?? 'new'}
            prompt={editing}
            allTags={allTags}
            onSave={handleSave}
            onCancel={handleCancel}
            onNewTag={handleNewTag}
          />
        )}
      </main>
    </div>
  );
}

export default App;
