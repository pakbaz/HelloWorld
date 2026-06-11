import type { Variable } from '../repository/types';

interface VariablePanelProps {
  variables: Variable[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

export function VariablePanel({ variables, values, onChange }: VariablePanelProps) {
  if (variables.length === 0) return null;

  return (
    <div className="variable-panel">
      <h4 className="field-label">Variables</h4>
      <div className="variable-grid">
        {variables.map((v) => (
          <div key={v.name} className="variable-row">
            <label className="variable-name">
              <code>{`{{${v.name}}}`}</code>
            </label>
            <input
              className="variable-input"
              value={values[v.name] ?? ''}
              onChange={(e) => onChange(v.name, e.target.value)}
              placeholder={v.default_value ?? `Enter ${v.name}…`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
