export type PlaceholderIssueType = 'malformed' | 'duplicate';

export interface PlaceholderIssue {
  type: PlaceholderIssueType;
  message: string;
  name?: string;
}

export interface PlaceholderAnalysis {
  placeholders: string[];
  issues: PlaceholderIssue[];
  hasMalformed: boolean;
  hasDuplicates: boolean;
}

const PLACEHOLDER_NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;

function normalizePlaceholderName(rawName: string): string | null {
  const trimmed = rawName.trim();
  return PLACEHOLDER_NAME_PATTERN.test(trimmed) ? trimmed : null;
}

export function formatPlaceholder(name: string): string {
  return `{{${name}}}`;
}

export function analyzePlaceholders(body: string): PlaceholderAnalysis {
  const placeholders: string[] = [];
  const issues: PlaceholderIssue[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  let searchIndex = 0;
  while (searchIndex < body.length) {
    const openIndex = body.indexOf('{{', searchIndex);
    if (openIndex === -1) {
      break;
    }

    const closeIndex = body.indexOf('}}', openIndex + 2);
    if (closeIndex === -1) {
      issues.push({
        type: 'malformed',
        message: `Unclosed placeholder starting near character ${openIndex + 1}.`,
      });
      break;
    }

    const rawName = body.slice(openIndex + 2, closeIndex);
    const normalizedName = normalizePlaceholderName(rawName);
    if (!normalizedName) {
      issues.push({
        type: 'malformed',
        message: `Invalid placeholder syntax ${formatPlaceholder(rawName)}.`,
      });
      searchIndex = closeIndex + 2;
      continue;
    }

    if (seen.has(normalizedName)) {
      duplicates.add(normalizedName);
    } else {
      seen.add(normalizedName);
      placeholders.push(normalizedName);
    }

    searchIndex = closeIndex + 2;
  }

  for (const duplicate of Array.from(duplicates).sort()) {
    issues.push({
      type: 'duplicate',
      message: `Duplicate placeholder ${formatPlaceholder(duplicate)} found.`,
      name: duplicate,
    });
  }

  return {
    placeholders,
    issues,
    hasMalformed: issues.some((issue) => issue.type === 'malformed'),
    hasDuplicates: issues.some((issue) => issue.type === 'duplicate'),
  };
}

export function renderBodyWithPlaceholders(body: string, values: Record<string, string>): string {
  return body.replace(/{{\s*([^{}]+?)\s*}}/g, (match, rawName: string) => {
    const normalizedName = normalizePlaceholderName(rawName);
    if (!normalizedName) {
      return match;
    }

    const value = values[normalizedName];
    return value !== undefined && value !== '' ? value : formatPlaceholder(normalizedName);
  });
}
