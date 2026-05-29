import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, '..');

dotenv.config({ path: path.join(packageRoot, '.env') });

/**
 * Use MySQL when DB_DRIVER=mysql or any MySQL-related env var is set in .env.
 * Otherwise fall back to SQLite (zero-config local dev).
 */
export function resolveDbDriver() {
  if (process.env.DB_DRIVER === 'sqlite') {
    return 'sqlite';
  }
  if (process.env.DB_DRIVER === 'mysql') {
    return 'mysql';
  }

  const mysqlConfigured =
    process.env.DB_USER !== undefined ||
    process.env.DB_PASSWORD !== undefined ||
    process.env.DB_HOST !== undefined ||
    process.env.DB_NAME !== undefined;

  return mysqlConfigured ? 'mysql' : 'sqlite';
}

export const config = {
  allowRegistration: process.env.ALLOW_REGISTRATION ?? 'false',
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-in-production',
  dbDriver: resolveDbDriver(),
  sqlitePath: process.env.SQLITE_PATH ?? path.join(packageRoot, 'data', 'marketpulse.sqlite'),
  mysql: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'marketpulse',
  },
};
