class PGliteRepository {
  constructor({ db } = {}) {
    if (!db || typeof db.query !== 'function') {
      throw new Error('PGliteRepository requires a db client with a query(sql, params?) method.');
    }

    this.db = db;
  }

  async getPrompts() {
    const prompts = await this.#rows(
      `SELECT id, title, body, version, created_at, updated_at
       FROM prompts
       ORDER BY updated_at DESC, id DESC`
    );

    for (const prompt of prompts) {
      prompt.variables = await this.getVariables(prompt.id);
      prompt.tags = await this.#rows(
        `SELECT t.id, t.name
         FROM tags t
         JOIN prompt_tags pt ON pt.tag_id = t.id
         WHERE pt.prompt_id = $1
         ORDER BY t.name ASC`,
        [prompt.id]
      );
    }

    return prompts;
  }

  async savePrompt(prompt) {
    if (prompt && prompt.id) {
      const rows = await this.#rows(
        `UPDATE prompts
         SET title = $1,
             body = $2,
             version = version + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, title, body, version, created_at, updated_at`,
        [prompt.title, prompt.body, prompt.id]
      );

      return rows[0];
    }

    const rows = await this.#rows(
      `INSERT INTO prompts (title, body, version)
       VALUES ($1, $2, 1)
       RETURNING id, title, body, version, created_at, updated_at`,
      [prompt.title, prompt.body]
    );

    return rows[0];
  }

  async deletePrompt(promptId) {
    await this.db.query('DELETE FROM prompts WHERE id = $1', [promptId]);
  }

  async getVariables(promptId) {
    return this.#rows(
      `SELECT id, prompt_id, name, default_value
       FROM variables
       WHERE prompt_id = $1
       ORDER BY name ASC`,
      [promptId]
    );
  }

  async saveVariables(promptId, variables) {
    await this.db.query('DELETE FROM variables WHERE prompt_id = $1', [promptId]);

    for (const variable of variables) {
      await this.db.query(
        `INSERT INTO variables (prompt_id, name, default_value)
         VALUES ($1, $2, $3)`,
        [promptId, variable.name, variable.default_value ?? null]
      );
    }

    return this.getVariables(promptId);
  }

  async deleteVariable(variableId) {
    await this.db.query('DELETE FROM variables WHERE id = $1', [variableId]);
  }

  async getTags() {
    return this.#rows('SELECT id, name FROM tags ORDER BY name ASC');
  }

  async saveTag(tag) {
    if (tag && tag.id) {
      const rows = await this.#rows(
        'UPDATE tags SET name = $1 WHERE id = $2 RETURNING id, name',
        [tag.name, tag.id]
      );
      return rows[0];
    }

    const rows = await this.#rows(
      'INSERT INTO tags (name) VALUES ($1) RETURNING id, name',
      [tag.name]
    );
    return rows[0];
  }

  async deleteTag(tagId) {
    await this.db.query('DELETE FROM tags WHERE id = $1', [tagId]);
  }

  async setPromptTags(promptId, tagIds) {
    await this.db.query('DELETE FROM prompt_tags WHERE prompt_id = $1', [promptId]);

    for (const tagId of tagIds) {
      await this.db.query(
        'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES ($1, $2)',
        [promptId, tagId]
      );
    }
  }

  async #rows(sql, params) {
    const result = await this.db.query(sql, params);
    return result && Array.isArray(result.rows) ? result.rows : [];
  }
}

module.exports = { PGliteRepository };
