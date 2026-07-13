'use strict';

const crypto = require('crypto');
const db = require('./db');
const config = require('./config');
const subscriptions = require('./subscriptions');
const { fetchTrainAlerts } = require('./lta');
const { formatAlerts } = require('./format');

const TICK_MS = 5_000;

function hash(value) {
    return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');
}

// Job due-times live in SQLite (scheduler_jobs) rather than only in a
// setInterval, so the poll cadence is inspectable/persistent across
// restarts instead of resetting silently every deploy.
function ensureJob(name, intervalSeconds) {
    db.prepare(`
      INSERT INTO scheduler_jobs (name, interval_seconds, next_run_at)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET interval_seconds = excluded.interval_seconds
    `).run(name, intervalSeconds, Date.now());
}

function claimDueJobs(now) {
    const due = db.prepare('SELECT * FROM scheduler_jobs WHERE next_run_at <= ?').all(now);
    const advance = db.prepare('UPDATE scheduler_jobs SET next_run_at = ?, last_run_at = ? WHERE name = ?');
    for (const job of due) {
        advance.run(now + job.interval_seconds * 1000, now, job.name);
    }
    return due;
}

async function pollAlerts(bot) {
    let data;
    try {
        data = await fetchTrainAlerts();
    } catch (err) {
        console.error('scheduler: failed to fetch train alerts:', err);
        return;
    }

    const value = data?.value ?? data ?? {};
    const status = Number(value.Status) || 1;
    const segments = Array.isArray(value.AffectedSegments) ? value.AffectedSegments : [];
    const notices = Array.isArray(value.Message) ? value.Message : [];
    const segmentsHash = hash(segments);
    const noticesHash = hash(notices);

    const prev = db.prepare('SELECT * FROM alert_state WHERE id = 1').get();

    if (!prev) {
        // First run after a fresh install - record the baseline without
        // notifying, otherwise every restart would re-announce whatever
        // the current status happens to be.
        db.prepare('INSERT INTO alert_state (id, status, segments_hash, notices_hash, updated_at) VALUES (1, ?, ?, ?, ?)')
            .run(status, segmentsHash, noticesHash, Date.now());
        return;
    }

    const changed = prev.status !== status || prev.segments_hash !== segmentsHash || prev.notices_hash !== noticesHash;
    if (!changed) return;

    db.prepare('UPDATE alert_state SET status = ?, segments_hash = ?, notices_hash = ?, updated_at = ? WHERE id = 1')
        .run(status, segmentsHash, noticesHash, Date.now());

    const text = `🔔 *Service status update*\n\n${formatAlerts(data)}`;
    const subs = subscriptions.listAll();
    for (const sub of subs) {
        bot.telegram.sendMessage(sub.chat_id, text, { parse_mode: 'MarkdownV2', disable_web_page_preview: true }).catch((err) => {
            const code = err?.response?.error_code;
            if (code === 403 || code === 400) subscriptions.remove(sub.user_id); // user blocked the bot / chat gone
        });
    }
}

function start(bot) {
    ensureJob('poll_alerts', config.ALERT_POLL_INTERVAL_SECONDS);

    setInterval(() => {
        const due = claimDueJobs(Date.now());
        for (const job of due) {
            if (job.name === 'poll_alerts') pollAlerts(bot).catch((err) => console.error('scheduler: pollAlerts failed:', err));
        }
    }, TICK_MS);
}

module.exports = { start };
