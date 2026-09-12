'use strict';

const { buildFavsPage } = require('../favs');
const { sendRichMessage } = require('../reply');

function register(bot) {
    bot.command('favs', async (ctx) => {
        try {
            const view = await buildFavsPage(ctx.from.id, 0);
            if (view.text) {
                await ctx.reply(view.text);
                return;
            }
            await sendRichMessage(ctx.telegram, ctx.chat.id, view.rich, view.keyboard);
        } catch (err) {
            console.error('favs command error:', err);
            await ctx.reply('⚠️ Unable to load your favourites right now. Please try again shortly.');
        }
    });
}

module.exports = register;
