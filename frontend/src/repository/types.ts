export interface Prompt {
  id: number;
  title: string;
  body: string;
  version: number;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  variables?: Variable[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface Variable {
  id: number;
  prompt_id: number;
  name: string;
  default_value: string | null;
}

export type SortField = 'title' | 'created_at' | 'updated_at';
export type SortDir = 'asc' | 'desc';

export interface ListOptions {
  search?: string;
  tagId?: number;
  sortField?: SortField;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  version: number;
  title: string;
  body: string;
  saved_at: string;
}

export interface PromptExportRecord extends Omit<Prompt, 'id' | 'deleted' | 'created_at' | 'updated_at' | 'tags' | 'variables'> {
  id?: number;
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  tags: Tag[];
  variables: Variable[];
  versions: PromptVersion[];
}

export interface PromptDataset {
  schemaVersion: 1;
  exportedAt: string;
  prompts: PromptExportRecord[];
}

export interface PromptImportSummary {
  total: number;
  created: number;
  skipped: number;
  errors: string[];
}

export interface IRepository {
  getPrompts(): Promise<Prompt[]>;
  savePrompt(prompt: Partial<Prompt> & { title: string; body: string }): Promise<Prompt>;
  deletePrompt(promptId: number): Promise<void>;
  bulkDeletePrompts(promptIds: number[]): Promise<void>;
  exportPrompts(): Promise<PromptDataset>;
  importPrompts(dataset: PromptDataset): Promise<PromptImportSummary>;
  getVariables(promptId: number): Promise<Variable[]>;
  saveVariables(promptId: number, variables: Variable[]): Promise<Variable[]>;
  deleteVariable(variableId: number): Promise<void>;
  getTags(): Promise<Tag[]>;
  saveTag(tag: Partial<Tag> & { name: string }): Promise<Tag>;
  deleteTag(tagId: number): Promise<void>;
  setPromptTags(promptId: number, tagIds: number[]): Promise<void>;
  getVersions(promptId: number): Promise<PromptVersion[]>;
  restoreVersion(promptId: number, versionId: number): Promise<Prompt>;
}
