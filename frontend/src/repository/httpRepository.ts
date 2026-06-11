import type { IRepository, Prompt, Variable, Tag } from './types';

export class HttpRepository implements IRepository {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getPrompts(): Promise<Prompt[]> {
    const res = await fetch(`${this.baseUrl}/prompts`);
    if (!res.ok) throw new Error(`Failed to fetch prompts: ${res.status}`);
    return res.json();
  }

  async savePrompt(prompt: Prompt): Promise<Prompt> {
    const url = prompt.id
      ? `${this.baseUrl}/prompts/${prompt.id}`
      : `${this.baseUrl}/prompts`;
    const method = prompt.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prompt),
    });
    if (!res.ok) throw new Error(`Failed to save prompt: ${res.status}`);
    return res.json();
  }

  async deletePrompt(promptId: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/prompts/${promptId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete prompt: ${res.status}`);
  }

  async getVariables(promptId: number): Promise<Variable[]> {
    const res = await fetch(`${this.baseUrl}/prompts/${promptId}/variables`);
    if (!res.ok) throw new Error(`Failed to fetch variables: ${res.status}`);
    return res.json();
  }

  async saveVariables(promptId: number, variables: Variable[]): Promise<Variable[]> {
    const res = await fetch(`${this.baseUrl}/prompts/${promptId}/variables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variables),
    });
    if (!res.ok) throw new Error(`Failed to save variables: ${res.status}`);
    return res.json();
  }

  async deleteVariable(variableId: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/variables/${variableId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete variable: ${res.status}`);
  }

  async getTags(): Promise<Tag[]> {
    const res = await fetch(`${this.baseUrl}/tags`);
    if (!res.ok) throw new Error(`Failed to fetch tags: ${res.status}`);
    return res.json();
  }

  async saveTag(tag: Tag): Promise<Tag> {
    const url = tag.id ? `${this.baseUrl}/tags/${tag.id}` : `${this.baseUrl}/tags`;
    const method = tag.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag),
    });
    if (!res.ok) throw new Error(`Failed to save tag: ${res.status}`);
    return res.json();
  }

  async deleteTag(tagId: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/tags/${tagId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete tag: ${res.status}`);
  }

  async setPromptTags(promptId: number, tagIds: number[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}/prompts/${promptId}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_ids: tagIds }),
    });
    if (!res.ok) throw new Error(`Failed to set prompt tags: ${res.status}`);
  }
}
