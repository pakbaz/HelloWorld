import React from 'react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Write your prompt here... Use {{variable}} for placeholders."
      rows={10}
      style={{ width: '100%', fontFamily: 'monospace' }}
    />
  );
};

export default PromptEditor;
