import { getDb } from '../db/pglite';
import type { Prompt, Tag, Variable, ListOptions, PagedResult } from './types';

// ── helpers ──────────────────────────────────────────────────────────────────

function extractVariables(body: string): string[] {
  const re = /\{\{(\w+)\}\}/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) found.add(m[1]);
  return [...found];
}

// ── Prompts ───────────────────────────────────────────────────────────────────

export async function listPrompts(opts: ListOptions = {}): Promise<PagedResult<Prompt>> {
  const db = await getDb();
  const {
    search = '',
    tagId,
    sortField = 'updated_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 20,
  } = opts;

  const conditions: string[] = ['p.deleted = FALSE'];
  const params: unknown[] = [];
  let i = 1;

  if (search) {
    conditions.push(`p.title ILIKE $${i++}`);
    params.push(`%${search}%`);
  }

  if (tagId !== undefined) {
    conditions.push(`EXISTS (
      SELECT 1 FROM prompt_tags pt WHERE pt.prompt_id = p.id AND pt.tag_id = $${i++}
    )`);
    params.push(tagId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedFields: Record<string, string> = {
    title: 'p.title',
    created_at: 'p.created_at',
    updated_at: 'p.updated_at',
  };
  const orderCol = allowedFields[sortField] ?? 'p.updated_at';
  const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM prompts p ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const offset = (page - 1) * pageSize;
  const limitParam = i;
  const offsetParam = i + 1;
  const rows = await db.query<Omit<Prompt, 'tags'>>(
    `SELECT p.id, p.title, p.body, p.version, p.deleted, p.created_at, p.updated_at
     FROM prompts p
     ${where}
     ORDER BY ${orderCol} ${orderDir}
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...params, pageSize, offset],
  );

  const items: Prompt[] = await Promise.all(
    rows.rows.map(async (row) => ({
      ...row,
      tags: await getPromptTags(row.id),
    })),
  );

  return { items, total, page, pageSize };
}

export async function getPrompt(id: number): Promise<Prompt | null> {
  const db = await getDb();
  const result = await db.query<Omit<Prompt, 'tags'>>(
    `SELECT id, title, body, version, deleted, created_at, updated_at
     FROM prompts WHERE id = $1`,
    [id],
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return { ...row, tags: await getPromptTags(id) };
}

export async function createPrompt(
  title: string,
  body: string,
  tagIds: number[] = [],
): Promise<Prompt> {
  const db = await getDb();
  const result = await db.query<{ id: number }>(
    `INSERT INTO prompts (title, body, version) VALUES ($1, $2, 1) RETURNING id`,
    [title, body],
  );
  const id = result.rows[0].id;

  await syncVariables(db, id, body);
  await syncTags(db, id, tagIds);

  return (await getPrompt(id))!;
}

export async function updatePrompt(
  id: number,
  title: string,
  body: string,
  tagIds: number[] = [],
): Promise<Prompt> {
  const db = await getDb();
  await db.query(
    `UPDATE prompts
     SET title = $1, body = $2, version = version + 1, updated_at = NOW()
     WHERE id = $3`,
    [title, body, id],
  );

  await syncVariables(db, id, body);
  await syncTags(db, id, tagIds);

  return (await getPrompt(id))!;
}

export async function deletePrompt(id: number): Promise<void> {
  const db = await getDb();
  // soft delete
  await db.query(`UPDATE prompts SET deleted = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  const result = await db.query<Tag>(`SELECT id, name FROM tags ORDER BY name ASC`);
  return result.rows;
}

export async function createTag(name: string): Promise<Tag> {
  const db = await getDb();
  const result = await db.query<Tag>(
    `INSERT INTO tags (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [name.trim()],
  );
  return result.rows[0];
}

export async function getPromptTags(promptId: number): Promise<Tag[]> {
  const db = await getDb();
  const result = await db.query<Tag>(
    `SELECT t.id, t.name
     FROM tags t
     JOIN prompt_tags pt ON pt.tag_id = t.id
     WHERE pt.prompt_id = $1
     ORDER BY t.name ASC`,
    [promptId],
  );
  return result.rows;
}

// ── Variables ─────────────────────────────────────────────────────────────────

export async function getPromptVariables(promptId: number): Promise<Variable[]> {
  const db = await getDb();
  const result = await db.query<Variable>(
    `SELECT id, prompt_id, name, default_value FROM variables WHERE prompt_id = $1 ORDER BY name`,
    [promptId],
  );
  return result.rows;
}

// ── internal helpers ──────────────────────────────────────────────────────────

async function syncVariables(db: Awaited<ReturnType<typeof getDb>>, promptId: number, body: string) {
  const names = extractVariables(body);
  // remove variables no longer in body
  if (names.length > 0) {
    const placeholders = names.map((_, i) => `$${i + 2}`).join(', ');
    await db.query(
      `DELETE FROM variables WHERE prompt_id = $1 AND name NOT IN (${placeholders})`,
      [promptId, ...names],
    );
  } else {
    await db.query(`DELETE FROM variables WHERE prompt_id = $1`, [promptId]);
  }
  // upsert current variables
  for (const name of names) {
    await db.query(
      `INSERT INTO variables (prompt_id, name) VALUES ($1, $2)
       ON CONFLICT (prompt_id, name) DO NOTHING`,
      [promptId, name],
    );
  }
}

async function syncTags(db: Awaited<ReturnType<typeof getDb>>, promptId: number, tagIds: number[]) {
  await db.query(`DELETE FROM prompt_tags WHERE prompt_id = $1`, [promptId]);
  for (const tagId of tagIds) {
    await db.query(
      `INSERT INTO prompt_tags (prompt_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [promptId, tagId],
    );
  }
}
