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

export interface Variable {
  id: number;
  prompt_id: number;
  name: string;
  default_value: string | null;
}

export interface Tag {
  id: number;
  name: string;
}
