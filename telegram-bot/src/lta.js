'use strict';

const config = require('./config');

const BASE = 'https://datamall2.mytransport.sg/ltaodataservice';
const HEADERS = { AccountKey: config.LTA_ACCOUNT_KEY, Accept: 'application/json' };

// Simple in-process TTL cache. The bot runs as a single long-lived process
// (tmux), so this avoids hammering LTA DataMall when multiple users query
// the same line within a short window.
const cache = new Map();

async function cached(key, ttlMs, fetcher) {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.data;
    const data = await fetcher();
    cache.set(key, { data, expires: Date.now() + ttlMs });
    return data;
}

async function ltaGet(path) {
    const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`LTA API error ${res.status} for ${path}`);
    return res.json();
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

async function fetchCrowdForecast(lineCode) {
    return cached(`forecast:${lineCode}`, 30 * 60_000, async () => {
        const allRecords = [];
        let skip = 0;
        const PAGE_SIZE = 500;
        for (;;) {
            const data = await ltaGet(`/PCDForecast?TrainLine=${encodeURIComponent(lineCode)}&$skip=${skip}`);
            const page = Array.isArray(data?.value) ? data.value : [];
            allRecords.push(...page);
            if (page.length < PAGE_SIZE) break;
            skip += PAGE_SIZE;
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
