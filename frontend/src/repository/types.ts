export interface Prompt {
  id: number;
  title: string;
  body: string;
  version: number;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface Variable {
  id: number;
  prompt_id: number;
  name: string;
  default_value: string;
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
