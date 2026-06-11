function getPlaceholderRegex() {
  return /{{\s*([^{}]+?)\s*}}/g;
}

export function extractUniqueVariables(promptBody = '') {
  const uniqueNames = [];
  const seen = new Set();

  for (const match of promptBody.matchAll(getPlaceholderRegex())) {
    const rawName = match[1];
    const name = rawName ? rawName.trim() : '';

    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    uniqueNames.push(name);
  }

  return uniqueNames;
}

function toDefaultMap(variableDefaults = {}) {
  if (Array.isArray(variableDefaults)) {
    return variableDefaults.reduce((acc, variable) => {
      if (!variable || typeof variable.name !== 'string') {
        return acc;
      }

      acc[variable.name] = variable.default_value ?? '';
      return acc;
    }, {});
  }

  return variableDefaults || {};
}

export function buildInitialValues(promptBody = '', variableDefaults = {}) {
  const defaults = toDefaultMap(variableDefaults);

  return extractUniqueVariables(promptBody).reduce((acc, name) => {
    acc[name] = defaults[name] ?? '';
    return acc;
  }, {});
}

export function substituteVariables(promptBody = '', values = {}) {
  return promptBody.replace(getPlaceholderRegex(), (_, rawName) => {
    const name = rawName ? rawName.trim() : '';

    if (!name) {
      return '';
    }

    return values[name] ?? '';
  });
}
