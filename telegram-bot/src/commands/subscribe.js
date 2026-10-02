'use strict';

const subscriptions = require('../subscriptions');
const { subModeKeyboard } = require('../keyboards');
const { formatSubscription } = require('../format');

function register(bot) {
    bot.command('sub', async (ctx) => {
        // Re-sending /sub keeps the existing mode and just shows the picker again.
        subscriptions.add(ctx.from.id, ctx.chat.id);
        const mode = subscriptions.getMode(ctx.from.id);
        await ctx.reply(formatSubscription(mode), subModeKeyboard(mode));
    });

    bot.command('unsub', async (ctx) => {
        subscriptions.remove(ctx.from.id);
        await ctx.reply('🔕 Unsubscribed. You won’t receive service status updates anymore.');
    });
}

module.exports = register;
