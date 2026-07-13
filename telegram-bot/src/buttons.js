'use strict';

const crypto = require('crypto');
const { Markup } = require('telegraf');
const db = require('./db');

const upsertStmt = db.prepare(`
  INSERT INTO buttons (id, action, payload, created_at)
  VALUES (@id, @action, @payload, @now)
  ON CONFLICT(id) DO NOTHING
`);
const resolveStmt = db.prepare('SELECT action, payload FROM buttons WHERE id = ?');

function idFor(action, payload) {
    return crypto.createHash('sha1').update(`${action}:${payload}`).digest('base64url').slice(0, 12);
}

// Deterministic id => re-rendering the same button reuses its row, so the
// table stays bounded by the number of distinct (action, payload) pairs
// rather than growing per message sent.
function ensureButton(action, payload) {
    const id = idFor(action, String(payload));
    upsertStmt.run({ id, action, payload: String(payload), now: Date.now() });
    return id;
}

function callbackButton(text, action, payload) {
    const id = ensureButton(action, payload);
    return Markup.button.callback(text, `cb:${id}`);
}

function resolveCallback(callbackData) {
    if (!callbackData || !callbackData.startsWith('cb:')) return null;
    const id = callbackData.slice(3);
    return resolveStmt.get(id) || null;
}

module.exports = { callbackButton, resolveCallback };
