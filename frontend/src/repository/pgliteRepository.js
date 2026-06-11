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

    if (prompts.length === 0) {
      return prompts;
    }

    const promptIds = prompts.map((prompt) => prompt.id);
    const variablesByPromptId = new Map();
    const tagsByPromptId = new Map();

    const variableRows = await this.#rows(
      `SELECT id, prompt_id, name, default_value
       FROM variables
       WHERE prompt_id = ANY($1)
       ORDER BY prompt_id ASC, name ASC`,
      [promptIds]
    );

    for (const variable of variableRows) {
      const variables = variablesByPromptId.get(variable.prompt_id) || [];
      variables.push(variable);
      variablesByPromptId.set(variable.prompt_id, variables);
    }

    const tagRows = await this.#rows(
      `SELECT pt.prompt_id, t.id, t.name
       FROM prompt_tags pt
       JOIN tags t ON t.id = pt.tag_id
       WHERE pt.prompt_id = ANY($1)
       ORDER BY pt.prompt_id ASC, t.name ASC`,
      [promptIds]
    );

    for (const tag of tagRows) {
      const promptTags = tagsByPromptId.get(tag.prompt_id) || [];
      promptTags.push({ id: tag.id, name: tag.name });
      tagsByPromptId.set(tag.prompt_id, promptTags);
    }

    for (const prompt of prompts) {
      prompt.variables = variablesByPromptId.get(prompt.id) || [];
      prompt.tags = tagsByPromptId.get(prompt.id) || [];
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

    if (variables.length > 0) {
      const values = [];
      const placeholders = [];

      for (const variable of variables) {
        const parameterIndex = values.length + 1;
        placeholders.push(
          `($${parameterIndex}, $${parameterIndex + 1}, $${parameterIndex + 2})`
        );
        values.push(promptId, variable.name, variable.default_value ?? null);
      }

      await this.db.query(
        `INSERT INTO variables (prompt_id, name, default_value)
         VALUES ${placeholders.join(', ')}`,
        values
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

    if (tagIds.length > 0) {
      const values = [];
      const placeholders = [];

      for (const tagId of tagIds) {
        const parameterIndex = values.length + 1;
        placeholders.push(`($${parameterIndex}, $${parameterIndex + 1})`);
        values.push(promptId, tagId);
      }

      await this.db.query(
        `INSERT INTO prompt_tags (prompt_id, tag_id)
         VALUES ${placeholders.join(', ')}`,
        values
      );
    }
  }

  async #rows(sql, params) {
    const result = await this.db.query(sql, params);
    return result && Array.isArray(result.rows) ? result.rows : [];
  }
}

module.exports = { PGliteRepository };
