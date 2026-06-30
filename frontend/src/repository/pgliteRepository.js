function normalizePromptIdentity(prompt) {
  return `${prompt.title.trim().toLowerCase()}::${prompt.body.trim().toLowerCase()}`.replace(/\s+/g, ' ');
}

class PGliteRepository {
  constructor({ db } = {}) {
    if (!db || typeof db.query !== 'function') {
      throw new Error('PGliteRepository requires a db client with a query(sql, params?) method.');
    }

    this.db = db;
  }

  async getPrompts() {
    const prompts = await this.#rows(
      `SELECT id, title, body, version, deleted, created_at, updated_at
       FROM prompts
       ORDER BY updated_at DESC, id DESC`
    );

    if (prompts.length === 0) {
      return [];
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
         RETURNING id, title, body, version, deleted, created_at, updated_at`,
        [prompt.title, prompt.body, prompt.id]
      );

      return this.#saveSnapshot(rows[0]);
    }

    const rows = await this.#rows(
      `INSERT INTO prompts (title, body, version)
       VALUES ($1, $2, 1)
       RETURNING id, title, body, version, deleted, created_at, updated_at`,
      [prompt.title, prompt.body]
    );

    return this.#saveSnapshot(rows[0]);
  }

  /** Write an immutable snapshot and return the saved prompt (FR-11). */
  async #saveSnapshot(saved) {
    await this.db.query(
      `INSERT INTO prompt_versions (prompt_id, version, title, body, saved_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [saved.id, saved.version, saved.title, saved.body]
    );
    return saved;
  }

  async deletePrompt(promptId) {
    await this.db.query('DELETE FROM prompts WHERE id = $1', [promptId]);
  }

  async bulkDeletePrompts(promptIds) {
    if (!promptIds.length) return;
    for (const promptId of promptIds) {
      await this.db.query('DELETE FROM prompts WHERE id = $1', [promptId]);
    }
  }

  async exportPrompts() {
    const prompts = await this.#rows(
      `SELECT id, title, body, version, deleted, created_at, updated_at
       FROM prompts
       ORDER BY id ASC`
    );

    const promptIds = prompts.map((prompt) => prompt.id);
    const [variableRows, tagRows, versionRows] = await Promise.all([
      this.#rows(
        `SELECT id, prompt_id, name, default_value
         FROM variables
         WHERE prompt_id = ANY($1)
         ORDER BY prompt_id ASC, name ASC`,
        [promptIds]
      ),
      this.#rows(
        `SELECT pt.prompt_id, t.id, t.name
         FROM prompt_tags pt
         JOIN tags t ON t.id = pt.tag_id
         WHERE pt.prompt_id = ANY($1)
         ORDER BY pt.prompt_id ASC, t.name ASC`,
        [promptIds]
      ),
      this.#rows(
        `SELECT id, prompt_id, version, title, body, saved_at
         FROM prompt_versions
         WHERE prompt_id = ANY($1)
         ORDER BY prompt_id ASC, version ASC`,
        [promptIds]
      ),
    ]);

    const variablesByPromptId = new Map();
    for (const variable of variableRows) {
      const variables = variablesByPromptId.get(variable.prompt_id) || [];
      variables.push(variable);
      variablesByPromptId.set(variable.prompt_id, variables);
    }

    const tagsByPromptId = new Map();
    for (const tag of tagRows) {
      const promptTags = tagsByPromptId.get(tag.prompt_id) || [];
      promptTags.push({ id: tag.id, name: tag.name });
      tagsByPromptId.set(tag.prompt_id, promptTags);
    }

    const versionsByPromptId = new Map();
    for (const version of versionRows) {
      const versions = versionsByPromptId.get(version.prompt_id) || [];
      versions.push(version);
      versionsByPromptId.set(version.prompt_id, versions);
    }

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      prompts: prompts.map((prompt) => ({
        id: prompt.id,
        title: prompt.title,
        body: prompt.body,
        version: prompt.version,
        deleted: prompt.deleted,
        created_at: prompt.created_at,
        updated_at: prompt.updated_at,
        tags: tagsByPromptId.get(prompt.id) || [],
        variables: variablesByPromptId.get(prompt.id) || [],
        versions: versionsByPromptId.get(prompt.id) || [],
      })),
    };
  }

  async importPrompts(dataset) {
    if (!dataset || !Array.isArray(dataset.prompts)) {
      throw new Error('Invalid prompt dataset.');
    }

    const summary = { total: dataset.prompts.length, created: 0, skipped: 0, errors: [] };
    const existingPrompts = await this.#rows(`SELECT id, title, body FROM prompts WHERE deleted = FALSE`);
    const seenIdentities = new Set(existingPrompts.map((prompt) => normalizePromptIdentity(prompt)));

    for (const record of dataset.prompts) {
      const identity = normalizePromptIdentity(record);
      if (seenIdentities.has(identity)) {
        summary.skipped += 1;
        continue;
      }

      try {
        await this.#createImportedPrompt(record);
        seenIdentities.add(identity);
        summary.created += 1;
      } catch (error) {
        summary.errors.push(`${record.title}: ${error instanceof Error ? error.message : 'Unknown import error'}`);
      }
    }

    return summary;
  }

  async #createImportedPrompt(record) {
    const insertResult = await this.#rows(
      `INSERT INTO prompts (title, body, version, deleted, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        record.title,
        record.body,
        record.version ?? 1,
        record.deleted ?? false,
        record.created_at ?? new Date().toISOString(),
        record.updated_at ?? new Date().toISOString(),
      ]
    );

    const promptId = insertResult[0]?.id;
    if (!promptId) {
      throw new Error('Prompt insert did not return an id.');
    }

    await this.db.query('DELETE FROM variables WHERE prompt_id = $1', [promptId]);
    for (const variable of record.variables ?? []) {
      await this.db.query(
        `INSERT INTO variables (prompt_id, name, default_value) VALUES ($1, $2, $3)`,
        [promptId, variable.name, variable.default_value ?? null]
      );
    }

    await this.db.query('DELETE FROM prompt_tags WHERE prompt_id = $1', [promptId]);
    for (const tag of record.tags ?? []) {
      const tagRows = await this.#rows('SELECT id, name FROM tags WHERE name = $1', [tag.name]);
      let tagId = tagRows[0]?.id;
      if (!tagId) {
        const insertedTags = await this.#rows(
          `INSERT INTO tags (name) VALUES ($1) RETURNING id, name`,
          [tag.name.trim()]
        );
        tagId = insertedTags[0]?.id;
      }
      if (tagId) {
        await this.db.query(
          `INSERT INTO prompt_tags (prompt_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [promptId, tagId]
        );
      }
    }

    await this.db.query('DELETE FROM prompt_versions WHERE prompt_id = $1', [promptId]);
    for (const version of record.versions ?? []) {
      await this.db.query(
        `INSERT INTO prompt_versions (prompt_id, version, title, body, saved_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [promptId, version.version, version.title, version.body, version.saved_at ?? new Date().toISOString()]
      );
    }
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

  async getVersions(promptId) {
    return this.#rows(
      `SELECT id, prompt_id, version, title, body, saved_at
       FROM prompt_versions
       WHERE prompt_id = $1
       ORDER BY version DESC`,
      [promptId]
    );
  }

  async restoreVersion(promptId, versionId) {
    const rows = await this.#rows(
      `SELECT title, body FROM prompt_versions WHERE id = $1 AND prompt_id = $2`,
      [versionId, promptId]
    );

    if (rows.length === 0) {
      throw new Error(`Version ${versionId} not found for prompt ${promptId}`);
    }

    return this.savePrompt({ id: promptId, title: rows[0].title, body: rows[0].body });
  }

  async #rows(sql, params) {
    const result = await this.db.query(sql, params);
    return result && Array.isArray(result.rows) ? result.rows : [];
  }
}

export { PGliteRepository };
