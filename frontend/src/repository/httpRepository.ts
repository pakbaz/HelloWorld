import type { IRepository, Prompt, Variable, Tag, PromptVersion, PromptDataset, PromptImportSummary } from './types';

export class HttpRepository implements IRepository {
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(baseUrlOrOptions: string | { baseUrl?: string; fetchImpl?: typeof fetch } = '/api') {
    const fetchContext = typeof window !== 'undefined' ? window : globalThis;
    const defaultFetch = fetchContext.fetch.bind(fetchContext);

    if (typeof baseUrlOrOptions === 'string') {
      this.baseUrl = baseUrlOrOptions.replace(/\/$/, '');
      this.fetchImpl = defaultFetch;
    } else {
      this.baseUrl = (baseUrlOrOptions.baseUrl ?? '/api').replace(/\/$/, '');
      this.fetchImpl = (baseUrlOrOptions.fetchImpl ?? defaultFetch);
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async getPrompts(): Promise<Prompt[]> {
    return this.request<Prompt[]>(`/prompts`);
  }

  async savePrompt(prompt: Partial<Prompt> & { title: string; body: string }): Promise<Prompt> {
    const url = prompt.id ? `/prompts/${prompt.id}` : '/prompts';
    const method = prompt.id ? 'PUT' : 'POST';
    return this.request<Prompt>(url, {
      method,
      body: JSON.stringify(prompt),
    });
  }

  async deletePrompt(promptId: number): Promise<void> {
    await this.request<void>(`/prompts/${promptId}`, { method: 'DELETE' });
  }

  async bulkDeletePrompts(promptIds: number[]): Promise<void> {
    await this.request<void>('/prompts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ prompt_ids: promptIds }),
    });
  }

  async exportPrompts(): Promise<PromptDataset> {
    return this.request<PromptDataset>('/prompts/export');
  }

  async importPrompts(dataset: PromptDataset): Promise<PromptImportSummary> {
    return this.request<PromptImportSummary>('/prompts/import', {
      method: 'POST',
      body: JSON.stringify(dataset),
    });
  }

  async getVariables(promptId: number): Promise<Variable[]> {
    return this.request<Variable[]>(`/prompts/${promptId}/variables`);
  }

  async saveVariables(promptId: number, variables: Variable[]): Promise<Variable[]> {
    return this.request<Variable[]>(`/prompts/${promptId}/variables`, {
      method: 'PUT',
      body: JSON.stringify(variables),
    });
  }

  async deleteVariable(variableId: number): Promise<void> {
    await this.request<void>(`/variables/${variableId}`, { method: 'DELETE' });
  }

  async getTags(): Promise<Tag[]> {
    return this.request<Tag[]>('/tags');
  }

  async saveTag(tag: Partial<Tag> & { name: string }): Promise<Tag> {
    const url = tag.id ? `/tags/${tag.id}` : '/tags';
    const method = tag.id ? 'PUT' : 'POST';
    return this.request<Tag>(url, {
      method,
      body: JSON.stringify(tag),
    });
  }

  async deleteTag(tagId: number): Promise<void> {
    await this.request<void>(`/tags/${tagId}`, { method: 'DELETE' });
  }

  async setPromptTags(promptId: number, tagIds: number[]): Promise<void> {
    await this.request<void>(`/prompts/${promptId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tag_ids: tagIds }),
    });
  }

  async getVersions(promptId: number): Promise<PromptVersion[]> {
    return this.request<PromptVersion[]>(`/prompts/${promptId}/versions`);
  }

  async restoreVersion(promptId: number, versionId: number): Promise<Prompt> {
    return this.request<Prompt>(`/prompts/${promptId}/versions/${versionId}/restore`, { method: 'POST' });
  }
}
