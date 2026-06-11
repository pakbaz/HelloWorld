import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import type { Prompt, CreatePromptDto, UpdatePromptDto } from '../models/prompt';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://localhost:5432/promptforge',
});

// GET /prompts
router.get('/', async (_req: Request, res: Response) => {
  const result = await pool.query<Prompt>('SELECT * FROM prompts ORDER BY updated_at DESC');
  res.json(result.rows);
});

// GET /prompts/:id
router.get('/:id', async (req: Request, res: Response) => {
  const result = await pool.query<Prompt>('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Prompt not found' });
    return;
  }
  res.json(result.rows[0]);
});

// POST /prompts
router.post('/', async (req: Request, res: Response) => {
  const { title, body = '' }: CreatePromptDto = req.body as CreatePromptDto;
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const result = await pool.query<Prompt>(
    `INSERT INTO prompts (title, body) VALUES ($1, $2) RETURNING *`,
    [title, body],
  );
  res.status(201).json(result.rows[0]);
});

// PATCH /prompts/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { title, body }: UpdatePromptDto = req.body as UpdatePromptDto;
  const result = await pool.query<Prompt>(
    `UPDATE prompts
        SET title      = COALESCE($2, title),
            body       = COALESCE($3, body),
            version    = version + 1,
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [req.params.id, title ?? null, body ?? null],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Prompt not found' });
    return;
  }
  res.json(result.rows[0]);
});

// DELETE /prompts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM prompts WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
