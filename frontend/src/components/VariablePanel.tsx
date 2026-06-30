import { formatPlaceholder, type PlaceholderAnalysis } from '../utils/placeholderParser';

interface VariablePanelProps {
  body: string;
  analysis: PlaceholderAnalysis;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function VariablePanel({ analysis, values, onChange }: VariablePanelProps) {
  const { placeholders, issues } = analysis;

  function handleChange(name: string, value: string) {
    onChange({ ...values, [name]: value });
  }

  if (placeholders.length === 0) {
    return (
      <div className="variable-panel variable-panel--empty">
        <p>No <code>{'{{variable}}'}</code> placeholders detected.</p>
        {issues.length > 0 && (
          <div className={`vp-validation ${analysis.hasMalformed ? 'vp-validation--error' : 'vp-validation--warn'}`}>
            <ul className="vp-validation-list">
              {issues.map((issue, index) => (
                <li key={`${issue.type}-${issue.name ?? issue.message}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="variable-panel">
      <h4>Variables</h4>
      {issues.length > 0 && (
        <div className={`vp-validation ${analysis.hasMalformed ? 'vp-validation--error' : 'vp-validation--warn'}`}>
          <ul className="vp-validation-list">
            {issues.map((issue, index) => (
              <li key={`${issue.type}-${issue.name ?? issue.message}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      {placeholders.map((name) => (
        <label key={name} className="vp-field">
          <span className="vp-label">
            <code>{formatPlaceholder(name)}</code>
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
