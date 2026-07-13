'use strict';

const db = require('./db');

const isFavStmt = db.prepare('SELECT 1 FROM favourites WHERE user_id = ? AND station_code = ?');
const addStmt = db.prepare('INSERT OR IGNORE INTO favourites (user_id, station_code, created_at) VALUES (?, ?, ?)');
const removeStmt = db.prepare('DELETE FROM favourites WHERE user_id = ? AND station_code = ?');
const listStmt = db.prepare('SELECT station_code FROM favourites WHERE user_id = ? ORDER BY created_at ASC');

function isFavourite(userId, code) {
    return !!isFavStmt.get(userId, code);
}

function add(userId, code) {
    addStmt.run(userId, code, Date.now());
}

function remove(userId, code) {
    removeStmt.run(userId, code);
}

function toggle(userId, code) {
    if (isFavourite(userId, code)) {
        remove(userId, code);
        return false;
    }
    add(userId, code);
    return true;
}

function list(userId) {
    return listStmt.all(userId).map((r) => r.station_code);
}

module.exports = { isFavourite, add, remove, toggle, list };
