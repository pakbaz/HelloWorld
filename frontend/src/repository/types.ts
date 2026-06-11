export interface Variable {
  id?: number;
  prompt_id?: number;
  name: string;
  default_value?: string | null;
}

export interface Tag {
  id?: number;
  name: string;
}

export interface Prompt {
  id?: number;
  title: string;
  body: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
  variables?: Variable[];
  tags?: Tag[];
}

export interface IRepository {
  getPrompts(): Promise<Prompt[]>;
  savePrompt(prompt: Prompt): Promise<Prompt>;
  deletePrompt(promptId: number): Promise<void>;
  getVariables(promptId: number): Promise<Variable[]>;
  saveVariables(promptId: number, variables: Variable[]): Promise<Variable[]>;
  deleteVariable(variableId: number): Promise<void>;
  getTags(): Promise<Tag[]>;
  saveTag(tag: Tag): Promise<Tag>;
  deleteTag(tagId: number): Promise<void>;
  setPromptTags(promptId: number, tagIds: number[]): Promise<void>;
}
