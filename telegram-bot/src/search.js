'use strict';

const { findStations } = require('./stations');
const { buildStationView } = require('./stationView');
const { candidateListKeyboard } = require('./keyboards');
const { formatCandidates } = require('./format');
const { sendRichMessage } = require('./reply');

// Free-text DM handler: user types a station code (NS1) or partial name
// (Bishan). Registered last so it only catches plain text, not commands.
function register(bot) {
    bot.on('text', async (ctx, next) => {
        const text = ctx.message.text || '';
        if (text.startsWith('/')) return next();

        const query = text.trim();
        const matches = findStations(text);
        if (matches.length === 0) {
            await ctx.reply(`No matching station found for "${query}".\nTry a station code (e.g. NS1) or a station name (e.g. Bishan).`);
            return;
        }

        if (matches.length === 1) {
            const view = await buildStationView(matches[0], ctx.from.id);
            await sendRichMessage(ctx.telegram, ctx.chat.id, view.rich, view.keyboard);
            return;
        }

        await sendRichMessage(ctx.telegram, ctx.chat.id, formatCandidates(query, matches), candidateListKeyboard(matches));
    });
}

module.exports = register;
