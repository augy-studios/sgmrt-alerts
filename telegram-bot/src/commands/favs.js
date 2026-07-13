'use strict';

const { buildFavsPage } = require('../favs');

function register(bot) {
    bot.command('favs', async (ctx) => {
        try {
            const { text, keyboard } = await buildFavsPage(ctx.from.id, 0);
            await ctx.reply(text, { parse_mode: 'MarkdownV2', ...(keyboard || {}) });
        } catch (err) {
            console.error('favs command error:', err);
            await ctx.reply('⚠️ Unable to load your favourites right now. Please try again shortly.');
        }
    });
}

module.exports = register;
