import React from 'react';

interface Variable {
  name: string;
  value: string;
  defaultValue?: string;
}

interface VariablePanelProps {
  variables: Variable[];
  onChange: (name: string, value: string) => void;
}

const VariablePanel: React.FC<VariablePanelProps> = ({ variables, onChange }) => {
  if (variables.length === 0) {
    return <p>No variables detected in the prompt.</p>;
  }

  return (
    <div>
      {variables.map((variable) => (
        <div key={variable.name} style={{ marginBottom: '8px' }}>
          <label htmlFor={`var-${variable.name}`}>{variable.name}</label>
          <input
            id={`var-${variable.name}`}
            type="text"
            value={variable.value}
            placeholder={variable.defaultValue ?? ''}
            onChange={(e) => onChange(variable.name, e.target.value)}
            style={{ marginLeft: '8px' }}
          />
        </div>
      ))}
    </div>
  );
};

export default VariablePanel;
