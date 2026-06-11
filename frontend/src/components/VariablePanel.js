import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildInitialValues,
  extractUniqueVariables,
  substituteVariables,
} from '../utils/variableSubstitution.js';

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
  const onValuesChangeRef = useRef(onValuesChange);
  const onRenderedPromptChangeRef = useRef(onRenderedPromptChange);

  useEffect(() => {
    onValuesChangeRef.current = onValuesChange;
  }, [onValuesChange]);

  useEffect(() => {
    onRenderedPromptChangeRef.current = onRenderedPromptChange;
  }, [onRenderedPromptChange]);

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
    if (onValuesChangeRef.current) {
      onValuesChangeRef.current(values);
    }
  }, [values]);

  useEffect(() => {
    if (onRenderedPromptChangeRef.current) {
      onRenderedPromptChangeRef.current(renderedPrompt);
    }
  }, [renderedPrompt]);

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
