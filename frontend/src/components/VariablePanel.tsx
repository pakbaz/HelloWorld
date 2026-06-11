interface VariablePanelProps {
  body: string;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

function extractPlaceholders(body: string): string[] {
  return [...new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

export function VariablePanel({ body, values, onChange }: VariablePanelProps) {
  const placeholders = extractPlaceholders(body);

  if (placeholders.length === 0) {
    return (
      <div className="variable-panel variable-panel--empty">
        <p>No <code>{'{{variable}}'}</code> placeholders detected.</p>
      </div>
    );
  }

  function handleChange(name: string, value: string) {
    onChange({ ...values, [name]: value });
  }

  return (
    <div className="variable-panel">
      <h4>Variables</h4>
      {placeholders.map((name) => (
        <label key={name} className="vp-field">
          <span className="vp-label">
            <code>{`{{${name}}}`}</code>
          </span>
          <input
            type="text"
            className="vp-input"
            value={values[name] ?? ''}
            placeholder={`Value for ${name}`}
            onChange={(e) => handleChange(name, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
