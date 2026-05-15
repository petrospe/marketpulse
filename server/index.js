import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { getDbDriver, initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: getDbDriver() });
});

app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);

async function start() {
  await initDatabase();
  app.listen(config.port, () => {
    console.log(`MarketPulse API listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
