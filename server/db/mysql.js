import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...config.mysql,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

export async function initMysqlDatabase() {
  const db = getPool();
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  for (const statement of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
    await db.execute(statement);
  }
}

export async function mysqlExecute(sql, params = []) {
  return getPool().execute(sql, params);
}

export async function upsertWatchlist(userId, dataJson) {
  await mysqlExecute(
    `INSERT INTO watchlists (user_id, data) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
    [userId, dataJson],
  );
}

export function isMysqlDuplicateError(err) {
  return err?.code === 'ER_DUP_ENTRY';
}
