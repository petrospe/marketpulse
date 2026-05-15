import { config } from './config.js';
import * as mysqlDb from './db/mysql.js';
import * as sqliteDb from './db/sqlite.js';

const driver = config.dbDriver;

export function getDbDriver() {
  return driver;
}

export async function initDatabase() {
  if (driver === 'mysql') {
    await mysqlDb.initMysqlDatabase();
    console.log('Database: MySQL');
    return;
  }

  await sqliteDb.initSqliteDatabase();
  console.log(`Database: SQLite (${config.sqlitePath})`);
}

export async function dbExecute(sql, params = []) {
  if (driver === 'mysql') {
    return mysqlDb.mysqlExecute(sql, params);
  }
  return sqliteDb.sqliteExecute(sql, params);
}

export async function upsertWatchlist(userId, dataJson) {
  if (driver === 'mysql') {
    await mysqlDb.upsertWatchlist(userId, dataJson);
    return;
  }
  await sqliteDb.upsertWatchlist(userId, dataJson);
}

export function isDuplicateError(err) {
  if (driver === 'mysql') {
    return mysqlDb.isMysqlDuplicateError(err);
  }
  return sqliteDb.isSqliteDuplicateError(err);
}
