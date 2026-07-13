'use strict';

const { getStationLines, lineForCode, stationName } = require('./stations');
const { getRealtimeForStation } = require('./lta');
const { formatStationCrowdMessage } = require('./format');
const { stationKeyboard } = require('./keyboards');

async function buildStationView(code, userId) {
    const name = stationName(code);
    if (!name) return null;

    const line = lineForCode(code);
    const lines = getStationLines(code);
    const realtimeRec = line ? await getRealtimeForStation(line.code, code) : null;

    const text = formatStationCrowdMessage(code, lines, realtimeRec);
    const keyboard = stationKeyboard(code, userId);
    return { text, keyboard };
}

module.exports = { buildStationView };
