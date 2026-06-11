import express from 'express';
import cors from 'cors';
import promptsRouter from './routes/prompts';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use('/prompts', promptsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`PromptForge backend listening on http://localhost:${PORT}`);
});

export default app;
