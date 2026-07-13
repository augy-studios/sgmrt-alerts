'use strict';

const { resolveCallback } = require('./buttons');
const favourites = require('./favourites');
const { lineForCode, stationName } = require('./stations');
const { getForecastSlotsForStation, fetchTrainAlerts } = require('./lta');
const { renderForecastChart } = require('./chart');
const { buildStationView } = require('./stationView');
const { buildFavsPage } = require('./favs');
const { stationKeyboard, statusKeyboard } = require('./keyboards');
const { formatAlerts } = require('./format');

async function handleFavToggle(ctx, code) {
    const nowFav = favourites.toggle(ctx.from.id, code);
    await ctx.answerCbQuery(nowFav ? `Added ${stationName(code) || code} to favourites` : `Removed ${stationName(code) || code} from favourites`);
    try {
        await ctx.editMessageReplyMarkup(stationKeyboard(code, ctx.from.id).reply_markup);
    } catch {
        // message may be unchanged / too old to edit — safe to ignore
    }
}

async function handleForecast(ctx, code) {
    const line = lineForCode(code);
    if (!line) {
        await ctx.answerCbQuery('Unknown station.', { show_alert: true });
        return;
    }

    await ctx.answerCbQuery('Generating forecast…');
    try {
        const slots = await getForecastSlotsForStation(line.code, code);
        if (!slots.length) {
            await ctx.reply(`No forecast data available for ${stationName(code) || code} today.`);
            return;
        }
        const title = `${stationName(code) || code} (${code}) — Crowd Forecast`;
        const buffer = await renderForecastChart(title, slots);
        await ctx.replyWithPhoto({ source: buffer }, { caption: `📊 ${title}\nLow / Moderate / High crowd level by time slot.` });
    } catch (err) {
        console.error('forecast callback error:', err);
        await ctx.reply('⚠️ Unable to generate the forecast chart right now. Please try again shortly.');
    }
}

async function handleView(ctx, code) {
    await ctx.answerCbQuery();
    try {
        const view = await buildStationView(code, ctx.from.id);
        if (!view) {
            await ctx.reply('Unknown station.');
            return;
        }
        await ctx.reply(view.text, { parse_mode: 'MarkdownV2', ...view.keyboard });
    } catch (err) {
        console.error('view callback error:', err);
        await ctx.reply('⚠️ Unable to load that station right now. Please try again shortly.');
    }
}

async function handleFavsPage(ctx, page) {
    try {
        const { text, keyboard } = await buildFavsPage(ctx.from.id, Number(page));
        await ctx.answerCbQuery();
        await ctx.editMessageText(text, { parse_mode: 'MarkdownV2', ...(keyboard || {}) });
    } catch (err) {
        console.error('favs_page callback error:', err);
        await ctx.answerCbQuery('Unable to load that page.', { show_alert: true });
    }
}

async function handleRefreshStatus(ctx) {
    try {
        const data = await fetchTrainAlerts();
        const text = formatAlerts(data);
        await ctx.answerCbQuery('Refreshed');
        await ctx.editMessageText(text, { parse_mode: 'MarkdownV2', ...statusKeyboard() });
    } catch (err) {
        // Telegram errors when the new text is identical to the old one — not a real failure.
        if (err?.response?.description?.includes('message is not modified')) {
            await ctx.answerCbQuery('Already up to date');
            return;
        }
        console.error('refresh_status callback error:', err);
        await ctx.answerCbQuery('Unable to refresh right now.', { show_alert: true });
    }
}

function register(bot) {
    bot.on('callback_query', async (ctx) => {
        const row = resolveCallback(ctx.callbackQuery.data);
        if (!row) {
            await ctx.answerCbQuery('This button has expired.', { show_alert: true });
            return;
        }

        switch (row.action) {
            case 'fav_toggle':
                return handleFavToggle(ctx, row.payload);
            case 'forecast':
                return handleForecast(ctx, row.payload);
            case 'view':
                return handleView(ctx, row.payload);
            case 'favs_page':
                return handleFavsPage(ctx, row.payload);
            case 'refresh_status':
                return handleRefreshStatus(ctx);
            case 'noop':
                return ctx.answerCbQuery();
            default:
                return ctx.answerCbQuery();
        }
    });
}

module.exports = register;
