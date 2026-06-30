export interface EditorDraftSnapshot {
  title: string;
  body: string;
  variables: Record<string, string>;
  selectedTagIds: number[];
}

const STORAGE_KEY_PREFIX = 'promptforge:draft';

function getDraftStorageKey(promptId: number | null): string {
  return `${STORAGE_KEY_PREFIX}:${promptId ?? 'new'}`;
}

export function loadDraftState(promptId: number | null): EditorDraftSnapshot | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  const raw = window.localStorage.getItem(getDraftStorageKey(promptId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as EditorDraftSnapshot;
    return {
      title: parsed.title ?? '',
      body: parsed.body ?? '',
      variables: parsed.variables ?? {},
      selectedTagIds: Array.isArray(parsed.selectedTagIds) ? parsed.selectedTagIds : [],
    };
  } catch {
    return null;
  }
}

export function saveDraftState(promptId: number | null, draft: EditorDraftSnapshot): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  window.localStorage.setItem(getDraftStorageKey(promptId), JSON.stringify(draft));
}

export function clearDraftState(promptId: number | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  window.localStorage.removeItem(getDraftStorageKey(promptId));
}
