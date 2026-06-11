import { getDb } from '../db/pglite';
import type { Prompt, PromptVersion, Tag } from '../types';

/** Return all prompts ordered by updated_at desc */
export async function getPrompts(): Promise<Prompt[]> {
  const db = await getDb();
  const result = await db.query<Prompt>(
    `SELECT id, title, body, version,
            created_at::text AS created_at,
            updated_at::text AS updated_at
     FROM prompts
     ORDER BY updated_at DESC`
  );
  return result.rows;
}

/** Return a single prompt by id */
export async function getPrompt(id: number): Promise<Prompt | null> {
  const db = await getDb();
  const result = await db.query<Prompt>(
    `SELECT id, title, body, version,
            created_at::text AS created_at,
            updated_at::text AS updated_at
     FROM prompts WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/**
 * Create or update a prompt.
 * On each save:
 *  - An immutable snapshot is written to prompt_versions (FR-11).
 *  - The prompts row is updated (version incremented).
 * Returns the updated Prompt.
 */
export async function savePrompt(
  prompt: Partial<Prompt> & { title: string; body: string }
): Promise<Prompt> {
  const db = await getDb();

  if (prompt.id == null) {
    // INSERT new prompt
    const insertResult = await db.query<Prompt>(
      `INSERT INTO prompts (title, body, version, created_at, updated_at)
       VALUES ($1, $2, 1, NOW(), NOW())
       RETURNING id, title, body, version,
                 created_at::text AS created_at,
                 updated_at::text AS updated_at`,
      [prompt.title, prompt.body]
    );
    const newPrompt = insertResult.rows[0];

    // Snapshot version 1
    await db.query(
      `INSERT INTO prompt_versions (prompt_id, version, title, body, saved_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [newPrompt.id, newPrompt.version, newPrompt.title, newPrompt.body]
    );

    return newPrompt;
  } else {
    // UPDATE existing prompt — increment version
    const updateResult = await db.query<Prompt>(
      `UPDATE prompts
       SET title = $1, body = $2, version = version + 1, updated_at = NOW()
       WHERE id = $3
       RETURNING id, title, body, version,
                 created_at::text AS created_at,
                 updated_at::text AS updated_at`,
      [prompt.title, prompt.body, prompt.id]
    );
    const updated = updateResult.rows[0];

    // Immutable snapshot (FR-11)
    await db.query(
      `INSERT INTO prompt_versions (prompt_id, version, title, body, saved_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [updated.id, updated.version, updated.title, updated.body]
    );

    return updated;
  }
}

/** Hard-delete a prompt (cascades to versions, variables, prompt_tags) */
export async function deletePrompt(id: number): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM prompts WHERE id = $1`, [id]);
}

/** Return all immutable snapshots for a given prompt, newest first */
export async function getVersions(promptId: number): Promise<PromptVersion[]> {
  const db = await getDb();
  const result = await db.query<PromptVersion>(
    `SELECT id, prompt_id, version, title, body,
            saved_at::text AS saved_at
     FROM prompt_versions
     WHERE prompt_id = $1
     ORDER BY version DESC`,
    [promptId]
  );
  return result.rows;
}

/**
 * Restore a prompt to a previous version snapshot.
 * This creates a NEW snapshot on top of the history (non-destructive).
 */
export async function restoreVersion(
  promptId: number,
  versionId: number
): Promise<Prompt> {
  const db = await getDb();

  // Fetch the snapshot to restore
  const snapResult = await db.query<PromptVersion>(
    `SELECT title, body FROM prompt_versions WHERE id = $1 AND prompt_id = $2`,
    [versionId, promptId]
  );
  const snap = snapResult.rows[0];
  if (!snap) throw new Error(`Version ${versionId} not found for prompt ${promptId}`);

  // Apply restore as a new save (increments version and adds snapshot)
  return savePrompt({ id: promptId, title: snap.title, body: snap.body });
}

/** Return all tags */
export async function getTags(): Promise<Tag[]> {
  const db = await getDb();
  const result = await db.query<Tag>(`SELECT id, name FROM tags ORDER BY name`);
  return result.rows;
}

/** Upsert a tag by name, return id */
export async function upsertTag(name: string): Promise<Tag> {
  const db = await getDb();
  const result = await db.query<Tag>(
    `INSERT INTO tags (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [name]
  );
  return result.rows[0];
}

/** Set the tags for a prompt (replaces all existing associations) */
export async function setPromptTags(
  promptId: number,
  tagIds: number[]
): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM prompt_tags WHERE prompt_id = $1`, [promptId]);
  for (const tagId of tagIds) {
    await db.query(
      `INSERT INTO prompt_tags (prompt_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [promptId, tagId]
    );
  }
}

/** Return tags for a prompt */
export async function getPromptTags(promptId: number): Promise<Tag[]> {
  const db = await getDb();
  const result = await db.query<Tag>(
    `SELECT t.id, t.name
     FROM tags t
     JOIN prompt_tags pt ON pt.tag_id = t.id
     WHERE pt.prompt_id = $1
     ORDER BY t.name`,
    [promptId]
  );
  return result.rows;
}
