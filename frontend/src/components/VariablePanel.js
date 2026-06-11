import { useEffect, useMemo, useState } from 'react';
import {
  buildInitialValues,
  extractUniqueVariables,
  substituteVariables,
} from '../utils/variableSubstitution';

export function VariablePanel({
  promptBody = '',
  defaultVariables = {},
  onValuesChange,
  onRenderedPromptChange,
}) {
  const variableNames = useMemo(
    () => extractUniqueVariables(promptBody),
    [promptBody],
  );

  const [values, setValues] = useState(() =>
    buildInitialValues(promptBody, defaultVariables),
  );

  useEffect(() => {
    const nextDefaults = buildInitialValues(promptBody, defaultVariables);

    setValues((previousValues) => {
      const nextValues = {};

      for (const name of variableNames) {
        if (Object.prototype.hasOwnProperty.call(previousValues, name)) {
          nextValues[name] = previousValues[name];
        } else {
          nextValues[name] = nextDefaults[name] ?? '';
        }
      }

      return nextValues;
    });
  }, [promptBody, defaultVariables, variableNames]);

  const renderedPrompt = useMemo(
    () => substituteVariables(promptBody, values),
    [promptBody, values],
  );

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(values);
    }
  }, [onValuesChange, values]);

  useEffect(() => {
    if (onRenderedPromptChange) {
      onRenderedPromptChange(renderedPrompt);
    }
  }, [onRenderedPromptChange, renderedPrompt]);

  const handleChange = (name) => (event) => {
    const { value } = event.target;
    setValues((previousValues) => ({
      ...previousValues,
      [name]: value,
    }));
  };

  return (
    <section aria-label="Variable Panel">
      {variableNames.map((name) => (
        <label key={name}>
          {name}
          <input
            aria-label={name}
            name={name}
            type="text"
            value={values[name] ?? ''}
            onChange={handleChange(name)}
          />
        </label>
      ))}
    </section>
  );
}

export default VariablePanel;
