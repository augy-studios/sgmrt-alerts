'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

const resolvedPath = path.resolve(process.cwd(), config.DB_PATH);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS favourites (
    user_id       INTEGER NOT NULL,
    station_code  TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    PRIMARY KEY (user_id, station_code)
  );

  -- mode: 'all' (every status change) or 'disruptions' (only while a
  -- disruption is active, plus the update when it clears).
  CREATE TABLE IF NOT EXISTS subscriptions (
    user_id     INTEGER PRIMARY KEY,
    chat_id     INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    mode        TEXT NOT NULL DEFAULT 'all'
  );

  -- Persistent inline-button registry. Every callback button's data is
  -- "cb:<id>" where <id> = sha1(action:payload). Because the id is
  -- deterministic, re-rendering the same button (e.g. a station's
  -- "Forecast" button shown to many users) reuses the same row instead of
  -- growing the table, and buttons keep working after a bot restart since
  -- the action/payload live in SQLite, not in process memory.
  CREATE TABLE IF NOT EXISTS buttons (
    id          TEXT PRIMARY KEY,
    action      TEXT NOT NULL,
    payload     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  -- SQLite-backed scheduler: job due-times are persisted so the poll
  -- cadence survives process restarts instead of living only in a
  -- setInterval/cron timer.
  CREATE TABLE IF NOT EXISTS scheduler_jobs (
    name              TEXT PRIMARY KEY,
    interval_seconds  INTEGER NOT NULL,
    next_run_at       INTEGER NOT NULL,
    last_run_at       INTEGER
  );

  CREATE TABLE IF NOT EXISTS alert_state (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    status          INTEGER,
    segments_hash   TEXT,
    notices_hash    TEXT,
    updated_at      INTEGER
  );
`);

// subscriptions.mode was added after launch; CREATE TABLE IF NOT EXISTS
// leaves older databases without it, so add it in place. Existing
// subscribers default to 'all', which is what they signed up for.
const subColumns = db.prepare('PRAGMA table_info(subscriptions)').all().map((c) => c.name);
if (!subColumns.includes('mode')) {
    db.exec("ALTER TABLE subscriptions ADD COLUMN mode TEXT NOT NULL DEFAULT 'all'");
}

module.exports = db;
