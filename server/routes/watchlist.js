import { Router } from 'express';
import { readDefaultWatchlist, writeDefaultWatchlist } from '../lib/default-watchlist.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const items = readDefaultWatchlist();
  res.json({ items });
});

router.put('/', requireAuth, async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'items must be an array' });
    return;
  }

  const normalized = items.map((item) => ({
    s: String(item.s ?? '').toUpperCase().trim(),
    d: String(item.d ?? '').trim(),
    cat: String(item.cat ?? 'tech'),
  }));

  writeDefaultWatchlist(normalized);
  res.json({ items: normalized });
});

export default router;
