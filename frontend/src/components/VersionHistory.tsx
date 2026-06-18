import { useEffect, useState } from 'react';
import type { PromptVersion } from '../db/RepositoryContext';
import { useRepository } from '../db/RepositoryContext';

interface VersionHistoryProps {
  promptId: number;
  currentVersion: number;
  onRestored: () => void;
}

export function VersionHistory({
  promptId,
  currentVersion,
  onRestored,
}: VersionHistoryProps) {
  const repository = useRepository();
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loadedVersionsForPromptId, setLoadedVersionsForPromptId] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    repository
      .getVersions(promptId)
      .then((nextVersions) => {
        setVersions(nextVersions);
        setLoadedVersionsForPromptId(promptId);
      })
      .catch((err) => {
        console.error('Failed to load version history:', err);
        setVersions([]);
        setLoadedVersionsForPromptId(promptId);
      });
  }, [repository, promptId, currentVersion]);

  async function handleRestore(v: PromptVersion) {
    if (v.version === currentVersion) return;
    if (!confirm(`Restore version ${v.version}? This will create a new snapshot on top of history.`)) return;
    setRestoring(v.id);
    try {
      await repository.restoreVersion(promptId, v.id);
      onRestored();
    } finally {
      setRestoring(null);
    }
  }

  if (loadedVersionsForPromptId !== promptId) return <p className="vh-loading">Loading history…</p>;
  if (versions.length === 0) return <p className="vh-empty">No versions saved yet.</p>;

  return (
    <div className="version-history">
      <h3 className="vh-title">Version History</h3>
      <ol className="vh-timeline">
        {versions.map((v) => {
          const isCurrent = v.version === currentVersion;
          return (
            <li key={v.id} className={`vh-item${isCurrent ? ' vh-item--current' : ''}`}>
              <span className="vh-badge">v{v.version}</span>
              <span className="vh-meta">
                <strong>{v.title}</strong>
                <time dateTime={v.saved_at}>
                  {new Date(v.saved_at).toLocaleString()}
                </time>
              </span>
              <span className="vh-preview">{v.body.slice(0, 80)}{v.body.length > 80 ? '…' : ''}</span>
              {isCurrent ? (
                <span className="vh-current-label">Current</span>
              ) : (
                <button
                  className="vh-restore-btn"
                  disabled={restoring === v.id}
                  onClick={() => handleRestore(v)}
                >
                  {restoring === v.id ? 'Restoring…' : 'Restore'}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
