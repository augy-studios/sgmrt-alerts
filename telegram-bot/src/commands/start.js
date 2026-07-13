'use strict';

const { startKeyboard } = require('../keyboards');

const INTRO = [
    '🚇 *Singapore MRT/LRT Crowd & Alerts*',
    '',
    'Real\\-time train service alerts and station crowd levels, straight from LTA DataMall\\.',
    '',
    '*What you can do:*',
    '• Send a station code or name \\(e\\.g\\. `NS1` or `Bishan`\\) to check its current crowd level and forecast',
    '• /status \\- train service alerts \\& service notices',
    '• /favs \\- your favourited stations\' crowd levels',
    '• /sub \\- get updated whenever service status changes',
    '• /unsub \\- stop those updates',
].join('\n');

function register(bot) {
    bot.start(async (ctx) => {
        await ctx.reply(INTRO, { parse_mode: 'MarkdownV2', disable_web_page_preview: true, ...startKeyboard() });
    });

    bot.help(async (ctx) => {
        await ctx.reply(INTRO, { parse_mode: 'MarkdownV2', disable_web_page_preview: true, ...startKeyboard() });
    });
}

module.exports = register;
