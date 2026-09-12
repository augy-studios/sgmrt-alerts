'use strict';

const { fetchTrainAlerts } = require('../lta');
const { formatAlerts } = require('../format');
const { statusKeyboard } = require('../keyboards');
const { sendRichMessage } = require('../reply');

function register(bot) {
    bot.command('status', async (ctx) => {
        try {
            const data = await fetchTrainAlerts();
            await sendRichMessage(ctx.telegram, ctx.chat.id, formatAlerts(data), statusKeyboard());
        } catch (err) {
            console.error('status command error:', err);
            await ctx.reply('⚠️ Unable to fetch service status right now. Please try again shortly.');
        }
    });
}

module.exports = register;
