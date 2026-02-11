import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import Database from 'better-sqlite3';

const dbPath = process.env.DB_PATH || 'reminder.db';
const dir = dirname(dbPath);
if (dir !== '.' && !existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}
const db = new Database(dbPath);

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS one_off_cancellations (
    date TEXT PRIMARY KEY
  );
`);

export const store = {
  getSetting: (key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  },
  setSetting: (key: string, value: string) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  },
  isCancelled: (date: string) => {
    const row = db.prepare('SELECT date FROM one_off_cancellations WHERE date = ?').get(date);
    return !!row;
  },
  cancelDate: (date: string) => {
    db.prepare('INSERT OR IGNORE INTO one_off_cancellations (date) VALUES (?)').run(date);
  },
  uncancelDate: (date: string) => {
    db.prepare('DELETE FROM one_off_cancellations WHERE date = ?').run(date);
  }
};
