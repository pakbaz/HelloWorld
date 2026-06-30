class HttpRepository {
  constructor({ baseUrl = 'http://localhost:8000', fetchImpl = fetch } = {}) {
    if (!fetchImpl) {
      throw new Error('HttpRepository requires a fetch implementation.');
    }

    const fetchContext = typeof window !== 'undefined' ? window : globalThis;
    const defaultFetch = fetchContext.fetch.bind(fetchContext);
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl === fetch ? defaultFetch : fetchImpl;
  }

  async getPrompts() {
    return this.#request('/prompts');
  }

  async savePrompt(prompt) {
    const isUpdate = Boolean(prompt && prompt.id);
    return this.#request(isUpdate ? `/prompts/${prompt.id}` : '/prompts', {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(prompt),
    });
  }

  async deletePrompt(promptId) {
    await this.#request(`/prompts/${promptId}`, { method: 'DELETE' });
  }

  async bulkDeletePrompts(promptIds) {
    await this.#request('/prompts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ prompt_ids: promptIds }),
    });
  }

  async exportPrompts() {
    return this.#request('/prompts/export');
  }

  async importPrompts(dataset) {
    return this.#request('/prompts/import', {
      method: 'POST',
      body: JSON.stringify(dataset),
    });
  }

  async getVariables(promptId) {
    return this.#request(`/prompts/${promptId}/variables`);
  }

  async saveVariables(promptId, variables) {
    return this.#request(`/prompts/${promptId}/variables`, {
      method: 'PUT',
      body: JSON.stringify({ variables }),
    });
  }

  async deleteVariable(variableId) {
    await this.#request(`/variables/${variableId}`, { method: 'DELETE' });
  }

  async getTags() {
    return this.#request('/tags');
  }

  async saveTag(tag) {
    const isUpdate = Boolean(tag && tag.id);
    return this.#request(isUpdate ? `/tags/${tag.id}` : '/tags', {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(tag),
    });
  }

  async deleteTag(tagId) {
    await this.#request(`/tags/${tagId}`, { method: 'DELETE' });
  }

  async setPromptTags(promptId, tagIds) {
    await this.#request(`/prompts/${promptId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tagIds }),
    });
  }

  async getVersions(promptId) {
    return this.#request(`/prompts/${promptId}/versions`);
  }

  async restoreVersion(promptId, versionId) {
    return this.#request(`/prompts/${promptId}/versions/${versionId}/restore`, {
      method: 'POST',
    });
  }

  async #request(path, options = {}) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }

    if (response.status === 204) {
      return undefined;
    }

    return response.json();
  }
}

export { HttpRepository };
