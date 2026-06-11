import { useState, useCallback } from 'react';
import PromptTable from './components/PromptTable';
import PromptEditor from './components/PromptEditor';
import type { Prompt } from './repository/types';
import './App.css';

type View = 'list' | 'editor';

function App() {
  const [view, setView] = useState<View>('list');
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNew = useCallback(() => {
    setEditingPrompt(null);
    setView('editor');
  }, []);

  const handleEdit = useCallback((prompt: Prompt) => {
    setEditingPrompt(prompt);
    setView('editor');
  }, []);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setView('list');
  }, []);

  const handleCancel = useCallback(() => {
    setView('list');
  }, []);

  return (
    <main className="app-shell">
      {view === 'list' ? (
        <PromptTable onEdit={handleEdit} onNew={handleNew} refreshKey={refreshKey} />
      ) : (
        <PromptEditor
          prompt={editingPrompt}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
    </main>
  );
}

export default App;
