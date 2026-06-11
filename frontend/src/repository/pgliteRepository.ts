import { getDb } from '../db';
import type { IRepository, Prompt } from './index';

type DbInstance = { query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }> };

export class PGliteRepository implements IRepository {
  private async db(): Promise<DbInstance> {
    return getDb() as Promise<DbInstance>;
  }

  async getPrompts(): Promise<Prompt[]> {
    const db = await this.db();
    const result = await db.query<Prompt>('SELECT * FROM prompts ORDER BY updated_at DESC');
    return result.rows;
  }

  async getPrompt(id: number): Promise<Prompt | null> {
    const db = await this.db();
    const result = await db.query<Prompt>('SELECT * FROM prompts WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async savePrompt(
    data: Omit<Prompt, 'id' | 'version' | 'created_at' | 'updated_at'>,
  ): Promise<Prompt> {
    const db = await this.db();
    const result = await db.query<Prompt>(
      `INSERT INTO prompts (title, body) VALUES ($1, $2) RETURNING *`,
      [data.title, data.body],
    );
    return result.rows[0];
  }

  async updatePrompt(
    id: number,
    data: Partial<Pick<Prompt, 'title' | 'body'>>,
  ): Promise<Prompt> {
    const db = await this.db();
    const result = await db.query<Prompt>(
      `UPDATE prompts
          SET title      = COALESCE($2, title),
              body       = COALESCE($3, body),
              version    = version + 1,
              updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [id, data.title ?? null, data.body ?? null],
    );
    return result.rows[0];
  }

  async deletePrompt(id: number): Promise<void> {
    const db = await this.db();
    await db.query('DELETE FROM prompts WHERE id = $1', [id]);
  }
}
