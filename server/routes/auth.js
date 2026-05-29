import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { dbExecute, isDuplicateError } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res) => {
  if (process.env.ALLOW_REGISTRATION !== 'true') {
    res.status(403).json({ error: 'Registration is currently disabled.' });
    return;
  }
  
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [result] = await dbExecute(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash],
    );

    const userId = result.insertId;
    const user = { id: userId, email };
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (isDuplicateError(err)) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const [rows] = await dbExecute(
    'SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1',
    [email],
  );

  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const safeUser = { id: user.id, email: user.email };
  res.json({ token: signToken(safeUser), user: safeUser });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.put('/password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  const [rows] = await dbExecute(
    'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
    [req.user.id],
  );

  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await dbExecute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

  res.json({ ok: true });
});

export default router;
