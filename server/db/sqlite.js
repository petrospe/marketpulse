import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(config.sqlitePath);
    fs.mkdirSync(dir, { recursive: true });
    db = new Database(config.sqlitePath);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function isSelect(sql) {
  return sql.trim().toUpperCase().startsWith('SELECT');
}

export async function initSqliteDatabase() {
  const database = getDb();
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema-sqlite.sql'), 'utf8');
  for (const statement of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
    database.exec(statement);
  }
}

export async function sqliteExecute(sql, params = []) {
  const database = getDb();

  if (isSelect(sql)) {
    const rows = database.prepare(sql).all(...params);
    return [rows];
  }

  const result = database.prepare(sql).run(...params);
  return [{ insertId: Number(result.lastInsertRowid), affectedRows: result.changes }];
}

export async function upsertWatchlist(userId, dataJson) {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO watchlists (user_id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         data = excluded.data,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .run(userId, dataJson);
}

export function isSqliteDuplicateError(err) {
  return err?.code === 'SQLITE_CONSTRAINT_UNIQUE';
}
