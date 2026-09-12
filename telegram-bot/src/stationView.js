'use strict';

const { getStationLines, lineForCode, stationName } = require('./stations');
const { getRealtimeForStation } = require('./lta');
const { formatStationCrowd } = require('./format');
const { stationKeyboard } = require('./keyboards');

// Returns { rich, keyboard } for a station's current crowd level, or null
// for an unknown code.
async function buildStationView(code, userId) {
    const name = stationName(code);
    if (!name) return null;

    const line = lineForCode(code);
    const lines = getStationLines(code);
    const realtimeRec = line ? await getRealtimeForStation(line.code, code) : null;

    return {
        rich: formatStationCrowd(code, lines, realtimeRec),
        keyboard: stationKeyboard(code, userId),
    };
}

module.exports = { buildStationView };
