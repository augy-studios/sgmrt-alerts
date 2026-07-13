'use strict';

const { findStations, stationName } = require('./stations');
const { buildStationView } = require('./stationView');
const { candidateListKeyboard } = require('./keyboards');
const { esc } = require('./format');

// Free-text DM handler: user types a station code (NS1) or partial name
// (Bishan). Registered last so it only catches plain text, not commands.
function register(bot) {
    bot.on('text', async (ctx, next) => {
        const text = ctx.message.text || '';
        if (text.startsWith('/')) return next();

        const matches = findStations(text);
        if (matches.length === 0) {
            await ctx.reply(`No matching station found for "${esc(text.trim())}"\\.\nTry a station code \\(e\\.g\\. \`NS1\`\\) or a station name \\(e\\.g\\. \`Bishan\`\\)\\.`, { parse_mode: 'MarkdownV2' });
            return;
        }

        if (matches.length === 1) {
            const view = await buildStationView(matches[0], ctx.from.id);
            await ctx.reply(view.text, { parse_mode: 'MarkdownV2', ...view.keyboard });
            return;
        }

        const lines = matches.map((code) => `• ${esc(stationName(code))} \\(${esc(code)}\\)`).join('\n');
        await ctx.reply(`Multiple stations match "${esc(text.trim())}" \\- pick one:\n\n${lines}`, {
            parse_mode: 'MarkdownV2',
            ...candidateListKeyboard(matches),
        });
    });
}

module.exports = register;
