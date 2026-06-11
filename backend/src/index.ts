import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import promptsRouter from './routes/prompts';

const app = express();
const PORT = process.env.PORT ?? 3001;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(apiLimiter);

app.use('/prompts', promptsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`PromptForge backend listening on http://localhost:${PORT}`);
});

export default app;
