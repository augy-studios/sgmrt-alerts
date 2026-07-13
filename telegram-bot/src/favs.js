'use strict';

const favourites = require('./favourites');
const { lineForCode } = require('./stations');
const { fetchCrowdRealtime } = require('./lta');
const { formatFavouriteLine } = require('./format');
const { favsPageKeyboard } = require('./keyboards');

const PAGE_SIZE = 10;

async function buildFavsPage(userId, page) {
    const allCodes = favourites.list(userId);
    if (!allCodes.length) {
        return { text: 'You haven’t favourited any stations yet\\.\nSend a station code or name \\(e\\.g\\. `NS1` or `Bishan`\\) to look one up, then tap ⭐ Add Favourite\\.', keyboard: undefined };
    }

    const totalPages = Math.ceil(allCodes.length / PAGE_SIZE);
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    const pageCodes = allCodes.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

    const byLine = {};
    for (const code of pageCodes) {
        const line = lineForCode(code);
        if (!line) continue;
        (byLine[line.code] ??= []).push(code);
    }

    const realtimeByLine = {};
    await Promise.all(
        Object.keys(byLine).map(async (lineCode) => {
            realtimeByLine[lineCode] = await fetchCrowdRealtime(lineCode);
        })
    );

    const lines = pageCodes.map((code) => {
        const line = lineForCode(code);
        const records = line ? realtimeByLine[line.code] || [] : [];
        const rec = records.find((r) => r.Station === code) || null;
        return formatFavouriteLine(code, rec);
    });

    const text = `⭐ *Your Favourite Stations* \\(Page ${safePage + 1}/${totalPages}\\)\n\n${lines.join('\n')}`;
    const keyboard = favsPageKeyboard(pageCodes, safePage, totalPages);
    return { text, keyboard };
}

module.exports = { buildFavsPage };
