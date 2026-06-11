import { createContext, useContext } from 'react';

/**
 * Minimal typed interface for the repository used by React components.
 * The actual runtime implementations are the JS class instances from
 * src/repository/ (PGliteRepository or HttpRepository).
 */
export interface IRepository {
  getPrompts(): Promise<Prompt[]>;
  savePrompt(prompt: Partial<Prompt> & { title: string; body: string }): Promise<Prompt>;
  deletePrompt(promptId: number): Promise<void>;
  getTags(): Promise<Tag[]>;
  saveTag(tag: Partial<Tag> & { name: string }): Promise<Tag>;
  deleteTag(tagId: number): Promise<void>;
  setPromptTags(promptId: number, tagIds: number[]): Promise<void>;
  getVersions(promptId: number): Promise<PromptVersion[]>;
  restoreVersion(promptId: number, versionId: number): Promise<Prompt>;
}

export interface Prompt {
  id: number;
  title: string;
  body: string;
  version: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  version: number;
  title: string;
  body: string;
  saved_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

export const RepositoryContext = createContext<IRepository | null>(null);

export function useRepository(): IRepository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error('useRepository must be used inside RepositoryContext.Provider');
  return repo;
}
