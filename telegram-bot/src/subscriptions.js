'use strict';

const db = require('./db');

// 'all': every status change. 'disruptions': only while a disruption is
// active, plus the update when it clears.
const MODES = ['all', 'disruptions'];

const modeStmt = db.prepare('SELECT mode FROM subscriptions WHERE user_id = ?');
const addStmt = db.prepare(`
  INSERT INTO subscriptions (user_id, chat_id, created_at) VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET chat_id = excluded.chat_id
`);
const setModeStmt = db.prepare(`
  INSERT INTO subscriptions (user_id, chat_id, created_at, mode) VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET chat_id = excluded.chat_id, mode = excluded.mode
`);
const removeStmt = db.prepare('DELETE FROM subscriptions WHERE user_id = ?');
const listStmt = db.prepare('SELECT user_id, chat_id, mode FROM subscriptions');

function isSubscribed(userId) {
    return !!modeStmt.get(userId);
}

// The subscriber's mode, or null if not subscribed.
function getMode(userId) {
    return modeStmt.get(userId)?.mode ?? null;
}

// Subscribes if needed, keeping an existing subscriber's mode.
function add(userId, chatId) {
    addStmt.run(userId, chatId, Date.now());
}

// Subscribes if needed and sets the mode.
function setMode(userId, chatId, mode) {
    if (!MODES.includes(mode)) throw new Error(`unknown subscription mode: ${mode}`);
    setModeStmt.run(userId, chatId, Date.now(), mode);
}

function remove(userId) {
    removeStmt.run(userId);
}

function listAll() {
    return listStmt.all();
}

module.exports = { MODES, isSubscribed, getMode, add, setMode, remove, listAll };
