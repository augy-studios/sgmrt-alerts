'use strict';

const { fetchTrainAlerts } = require('../lta');
const { formatAlerts } = require('../format');
const { statusKeyboard } = require('../keyboards');

function register(bot) {
    bot.command('status', async (ctx) => {
        try {
            const data = await fetchTrainAlerts();
            await ctx.reply(formatAlerts(data), { parse_mode: 'MarkdownV2', ...statusKeyboard() });
        } catch (err) {
            console.error('status command error:', err);
            await ctx.reply('⚠️ Unable to fetch service status right now. Please try again shortly.');
        }
    });
}

module.exports = register;
