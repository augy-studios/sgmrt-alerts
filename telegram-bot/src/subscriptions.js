'use strict';

const db = require('./db');

const isSubStmt = db.prepare('SELECT 1 FROM subscriptions WHERE user_id = ?');
const addStmt = db.prepare(`
  INSERT INTO subscriptions (user_id, chat_id, created_at) VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET chat_id = excluded.chat_id
`);
const removeStmt = db.prepare('DELETE FROM subscriptions WHERE user_id = ?');
const listStmt = db.prepare('SELECT user_id, chat_id FROM subscriptions');

function isSubscribed(userId) {
    return !!isSubStmt.get(userId);
}

function add(userId, chatId) {
    addStmt.run(userId, chatId, Date.now());
}

function remove(userId) {
    removeStmt.run(userId);
}

function listAll() {
    return listStmt.all();
}

module.exports = { isSubscribed, add, remove, listAll };
