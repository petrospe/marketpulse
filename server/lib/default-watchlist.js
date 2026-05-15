import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDataDir = path.join(__dirname, '../../config-data');
const watchlistPath = path.join(configDataDir, 'default-watchlist.json');
const examplePath = path.join(configDataDir, 'default-watchlist.example.json');

export function getDefaultWatchlistPath() {
  return watchlistPath;
}

function ensureWatchlistFile() {
  fs.mkdirSync(configDataDir, { recursive: true });
  if (!fs.existsSync(watchlistPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, watchlistPath);
  }
}

export function readDefaultWatchlist() {
  ensureWatchlistFile();

  if (fs.existsSync(watchlistPath)) {
    return JSON.parse(fs.readFileSync(watchlistPath, 'utf8'));
  }

  if (fs.existsSync(examplePath)) {
    return JSON.parse(fs.readFileSync(examplePath, 'utf8'));
  }

  return [];
}

export function writeDefaultWatchlist(items) {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }

  ensureWatchlistFile();
  fs.writeFileSync(watchlistPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  return items;
}
