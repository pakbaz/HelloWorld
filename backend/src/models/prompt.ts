export interface Prompt {
  id: number;
  title: string;
  body: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePromptDto {
  title: string;
  body?: string;
}

export interface UpdatePromptDto {
  title?: string;
  body?: string;
}
