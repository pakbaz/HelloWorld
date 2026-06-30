import { createContext, useContext } from 'react';
import type { IRepository as RepositoryContract } from '../repository/types';

export type IRepository = RepositoryContract;
export type { Prompt, PromptVersion, Tag, Variable } from '../repository/types';

export const RepositoryContext = createContext<IRepository | null>(null);

export function useRepository(): IRepository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error('useRepository must be used inside RepositoryContext.Provider');
  return repo;
}
