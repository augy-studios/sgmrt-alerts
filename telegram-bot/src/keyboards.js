'use strict';

const { Markup } = require('telegraf');
const config = require('./config');
const { callbackButton } = require('./buttons');
const favourites = require('./favourites');
const { stationName } = require('./stations');

function startKeyboard() {
    const rows = [[Markup.button.url('☕ Support / Donate', config.DONATE_URL)]];
    if (config.WEBAPP_URL) rows.push([Markup.button.url('🌐 Open Web App', config.WEBAPP_URL)]);
    return Markup.inlineKeyboard(rows);
}

function statusKeyboard() {
    return Markup.inlineKeyboard([[callbackButton('🔄 Refresh', 'refresh_status', '-')]]);
}

function stationKeyboard(code, userId) {
    const isFav = favourites.isFavourite(userId, code);
    return Markup.inlineKeyboard([
        [
            callbackButton(isFav ? '💔 Remove Favourite' : '⭐ Add Favourite', 'fav_toggle', code),
            callbackButton('📊 Crowd Forecast', 'forecast', code),
        ],
        [callbackButton('🔄 Refresh', 'view', code)],
    ]);
}

function candidateListKeyboard(codes) {
    const rows = codes.map((code) => [callbackButton(`${stationName(code)} (${code})`, 'view', code)]);
    return Markup.inlineKeyboard(rows);
}

function favsPageKeyboard(pageCodes, page, totalPages) {
    const rows = [];
    for (let i = 0; i < pageCodes.length; i += 2) {
        const row = pageCodes.slice(i, i + 2).map((code) =>
            callbackButton(`📊 ${stationName(code) || code}`, 'forecast', code)
        );
        rows.push(row);
    }

    const navRow = [];
    navRow.push(
        page > 0
            ? callbackButton('◀ Prev', 'favs_page', page - 1)
            : callbackButton(' ', 'noop', 'prev-disabled')
    );
    navRow.push(callbackButton(`Page ${page + 1}/${totalPages}`, 'noop', 'page-label'));
    navRow.push(
        page < totalPages - 1
            ? callbackButton('Next ▶', 'favs_page', page + 1)
            : callbackButton(' ', 'noop', 'next-disabled')
    );
    rows.push(navRow);

    return Markup.inlineKeyboard(rows);
}

module.exports = { startKeyboard, statusKeyboard, stationKeyboard, candidateListKeyboard, favsPageKeyboard };
