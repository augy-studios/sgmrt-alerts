'use strict';

const config = require('./config');

const BASE = 'https://datamall2.mytransport.sg/ltaodataservice';
const HEADERS = { AccountKey: config.LTA_ACCOUNT_KEY, Accept: 'application/json' };

// Simple in-process TTL cache. The bot runs as a single long-lived process
// (tmux), so this avoids hammering LTA DataMall when multiple users query
// the same line within a short window. In-flight promises are shared so
// concurrent requests for the same key during a cold cache don't each
// trigger their own LTA fetch.
const cache = new Map();
const inFlight = new Map();

async function cached(key, ttlMs, fetcher) {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.data;

    let promise = inFlight.get(key);
    if (!promise) {
        promise = fetcher()
            .then((data) => {
                cache.set(key, { data, expires: Date.now() + ttlMs });
                return data;
            })
            .finally(() => inFlight.delete(key));
        inFlight.set(key, promise);
    }
    return promise;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// LTA's Apigee gateway reports burst/spike rate limiting as a 500 with a
// ratelimit fault code, not a 429 — so we can't rely on status alone.
function isRateLimitFault(status, body) {
    return status === 429 || /ratelimit|spikearrest|quotaviolation/i.test(body || '');
}

const MAX_RETRIES = 2;

async function ltaGet(path) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
        if (res.ok) return res.json();

        const body = await res.text().catch(() => '');
        if (isRateLimitFault(res.status, body) && attempt < MAX_RETRIES) {
            await sleep(500 * 2 ** attempt); // 500ms, then 1000ms
            continue;
        }
        throw new Error(`LTA API error ${res.status} for ${path}${body ? ` — ${body}` : ''}`);
    }
}

async function fetchTrainAlerts() {
    return cached('alerts', 20_000, () => ltaGet('/TrainServiceAlerts'));
}

async function fetchCrowdRealtime(lineCode) {
    return cached(`realtime:${lineCode}`, 60_000, async () => {
        const data = await ltaGet(`/PCDRealTime?TrainLine=${encodeURIComponent(lineCode)}`);
        return Array.isArray(data?.value) ? data.value : [];
    });
}

const FORECAST_TTL_MS = 24 * 60 * 60 * 1000; // a day's forecast doesn't change intraday
const PAGE_DELAY_MS = 200; // spacing between paginated requests, to stay under LTA's burst rate limit

async function fetchCrowdForecast(lineCode) {
    return cached(`forecast:${lineCode}`, FORECAST_TTL_MS, async () => {
        const allRecords = [];
        let skip = 0;
        const PAGE_SIZE = 500;
        for (;;) {
            const data = await ltaGet(`/PCDForecast?TrainLine=${encodeURIComponent(lineCode)}&$skip=${skip}`);
            const page = Array.isArray(data?.value) ? data.value : [];
            allRecords.push(...page);
            if (page.length < PAGE_SIZE) break;
            skip += PAGE_SIZE;
            await sleep(PAGE_DELAY_MS);
        }
        return allRecords; // array of { Date, Stations: [{ Station, Interval: [{Start, CrowdLevel}] }] }
    });
}

async function getRealtimeForStation(lineCode, stationCode) {
    const records = await fetchCrowdRealtime(lineCode);
    return records.find((r) => r.Station === stationCode) || null;
}

// Flattens PCDForecast's nested Date -> Stations -> Interval shape into a
// sorted list of { Station, StartTime, EndTime, CrowdLevel } slots, same
// transform the web app applies in openForecastModal().
async function getForecastSlotsForStation(lineCode, stationCode) {
    const dateEntries = await fetchCrowdForecast(lineCode);
    const intervals = dateEntries
        .flatMap((d) => d.Stations || [])
        .filter((s) => s.Station === stationCode)
        .flatMap((s) => s.Interval || []);

    return intervals
        .slice()
        .sort((a, b) => new Date(a.Start) - new Date(b.Start))
        .map((s, i, arr) => ({
            ...s,
            StartTime: s.Start,
            EndTime: arr[i + 1] ? arr[i + 1].Start : new Date(new Date(s.Start).getTime() + 30 * 60000).toISOString(),
        }));
}

module.exports = {
    fetchTrainAlerts,
    fetchCrowdRealtime,
    fetchCrowdForecast,
    getRealtimeForStation,
    getForecastSlotsForStation,
};
