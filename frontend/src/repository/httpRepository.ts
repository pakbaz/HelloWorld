import type { IRepository, Prompt } from './index';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export class HttpRepository implements IRepository {
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  getPrompts(): Promise<Prompt[]> {
    return this.request<Prompt[]>('/prompts');
  }

  getPrompt(id: number): Promise<Prompt | null> {
    return this.request<Prompt | null>(`/prompts/${id}`);
  }

  savePrompt(data: Omit<Prompt, 'id' | 'version' | 'created_at' | 'updated_at'>): Promise<Prompt> {
    return this.request<Prompt>('/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePrompt(
    id: number,
    data: Partial<Pick<Prompt, 'title' | 'body'>>,
  ): Promise<Prompt> {
    return this.request<Prompt>(`/prompts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePrompt(id: number): Promise<void> {
    return this.request<void>(`/prompts/${id}`, { method: 'DELETE' });
  }
}
