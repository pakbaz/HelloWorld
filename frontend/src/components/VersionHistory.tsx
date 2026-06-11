import React from 'react';

export interface VersionSnapshot {
  version: number;
  body: string;
  saved_at: string;
}

interface VersionHistoryProps {
  snapshots: VersionSnapshot[];
  onRestore: (snapshot: VersionSnapshot) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ snapshots, onRestore }) => {
  if (snapshots.length === 0) {
    return <p>No version history available.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {snapshots.map((snapshot) => (
        <li
          key={snapshot.version}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
        >
          <span>v{snapshot.version}</span>
          <span style={{ color: '#888', fontSize: '0.85em' }}>
            {new Date(snapshot.saved_at).toLocaleString()}
          </span>
          <button onClick={() => onRestore(snapshot)}>Restore</button>
        </li>
      ))}
    </ul>
  );
};

export default VersionHistory;
