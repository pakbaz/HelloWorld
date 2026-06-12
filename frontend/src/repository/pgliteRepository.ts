import type { PGlite } from '@electric-sql/pglite';
import type { IRepository, Prompt, Variable, Tag, PromptVersion } from './types';

export class PGliteRepository implements IRepository {
  private db: PGlite;

  constructor(db: PGlite) {
    this.db = db;
  }

  private async rows<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = params
      ? await this.db.query<T>(sql, params)
      : await this.db.query<T>(sql);
    return result.rows ?? [];
  }

  async getPrompts(): Promise<Prompt[]> {
    const prompts = await this.rows<Prompt>(
      `SELECT id, title, body, version, created_at, updated_at
       FROM prompts
       ORDER BY updated_at DESC, id DESC`
    );

    if (prompts.length === 0) return prompts;

    const promptIds = prompts.map((p) => p.id);

    const variables = await this.rows<Variable>(
      `SELECT id, prompt_id, name, default_value
       FROM variables
       WHERE prompt_id = ANY($1)
       ORDER BY prompt_id ASC, name ASC`,
      [promptIds]
    );

    const tags = await this.rows<{ prompt_id: number } & Tag>(
      `SELECT pt.prompt_id, t.id, t.name
       FROM prompt_tags pt
       JOIN tags t ON t.id = pt.tag_id
       WHERE pt.prompt_id = ANY($1)
       ORDER BY pt.prompt_id ASC, t.name ASC`,
      [promptIds]
    );

    const varsByPromptId = new Map<number, Variable[]>();
    for (const v of variables) {
      const arr = varsByPromptId.get(v.prompt_id!) ?? [];
      arr.push(v);
      varsByPromptId.set(v.prompt_id!, arr);
    }

    const tagsByPromptId = new Map<number, Tag[]>();
    for (const t of tags) {
      const arr = tagsByPromptId.get(t.prompt_id) ?? [];
      arr.push({ id: t.id, name: t.name });
      tagsByPromptId.set(t.prompt_id, arr);
    }

    return prompts.map((p) => ({
      ...p,
      variables: varsByPromptId.get(p.id!) ?? [],
      tags: tagsByPromptId.get(p.id!) ?? [],
    }));
  }

  async savePrompt(prompt: Partial<Prompt> & { title: string; body: string }): Promise<Prompt> {
    let saved: Prompt;

    if (prompt.id) {
      const rows = await this.rows<Prompt>(
        `UPDATE prompts
         SET title = $1, body = $2, version = version + 1, updated_at = now()
         WHERE id = $3
         RETURNING id, title, body, version, created_at, updated_at`,
        [prompt.title, prompt.body, prompt.id]
      );
      saved = rows[0];
    } else {
      const rows = await this.rows<Prompt>(
        `INSERT INTO prompts (title, body, version, created_at, updated_at)
         VALUES ($1, $2, 1, now(), now())
         RETURNING id, title, body, version, created_at, updated_at`,
        [prompt.title, prompt.body]
      );
      saved = rows[0];
    }

    await this.saveSnapshot(saved);
    return saved;
  }

  private async saveSnapshot(saved: Prompt): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO prompt_versions (prompt_id, version, title, body, saved_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [saved.id, saved.version, saved.title, saved.body]
      );
    } catch (err) {
      console.error('Failed to save prompt version snapshot:', err);
    }
  }

  async deletePrompt(promptId: number): Promise<void> {
    await this.db.query('DELETE FROM prompts WHERE id = $1', [promptId]);
  }

  async getVariables(promptId: number): Promise<Variable[]> {
    return this.rows<Variable>(
      `SELECT id, prompt_id, name, default_value
       FROM variables
       WHERE prompt_id = $1
       ORDER BY name ASC`,
      [promptId]
    );
  }

  async saveVariables(promptId: number, variables: Variable[]): Promise<Variable[]> {
    await this.db.query('DELETE FROM variables WHERE prompt_id = $1', [promptId]);

    if (variables.length > 0) {
      const values: unknown[] = [];
      const placeholders: string[] = [];
      for (const v of variables) {
        const i = values.length + 1;
        placeholders.push(`($${i}, $${i + 1}, $${i + 2})`);
        values.push(promptId, v.name, v.default_value ?? null);
      }
      await this.db.query(
        `INSERT INTO variables (prompt_id, name, default_value) VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    return this.getVariables(promptId);
  }

  async deleteVariable(variableId: number): Promise<void> {
    await this.db.query('DELETE FROM variables WHERE id = $1', [variableId]);
  }

  async getTags(): Promise<Tag[]> {
    return this.rows<Tag>('SELECT id, name FROM tags ORDER BY name ASC');
  }

  async saveTag(tag: Partial<Tag> & { name: string }): Promise<Tag> {
    if (tag.id) {
      const rows = await this.rows<Tag>(
        'UPDATE tags SET name = $1 WHERE id = $2 RETURNING id, name',
        [tag.name, tag.id]
      );
      return rows[0];
    }
    const rows = await this.rows<Tag>(
      'INSERT INTO tags (name) VALUES ($1) RETURNING id, name',
      [tag.name]
    );
    return rows[0];
  }

  async deleteTag(tagId: number): Promise<void> {
    await this.db.query('DELETE FROM tags WHERE id = $1', [tagId]);
  }

  async setPromptTags(promptId: number, tagIds: number[]): Promise<void> {
    await this.db.query('DELETE FROM prompt_tags WHERE prompt_id = $1', [promptId]);
    if (tagIds.length > 0) {
      const values: unknown[] = [];
      const placeholders: string[] = [];
      for (const tagId of tagIds) {
        const i = values.length + 1;
        placeholders.push(`($${i}, $${i + 1})`);
        values.push(promptId, tagId);
      }
      await this.db.query(
        `INSERT INTO prompt_tags (prompt_id, tag_id) VALUES ${placeholders.join(', ')}`,
        values
      );
    }
  }

  async getVersions(promptId: number): Promise<PromptVersion[]> {
    return this.rows<PromptVersion>(
      `SELECT id, prompt_id, version, title, body, saved_at
       FROM prompt_versions
       WHERE prompt_id = $1
       ORDER BY version DESC`,
      [promptId]
    );
  }

  async restoreVersion(promptId: number, versionId: number): Promise<Prompt> {
    const rows = await this.rows<{ title: string; body: string }>(
      `SELECT title, body FROM prompt_versions WHERE id = $1 AND prompt_id = $2`,
      [versionId, promptId]
    );
    if (rows.length === 0) {
      throw new Error(`Version ${versionId} not found for prompt ${promptId}`);
    }
    return this.savePrompt({ id: promptId, title: rows[0].title, body: rows[0].body });
  }
}
