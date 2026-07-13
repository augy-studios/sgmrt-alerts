'use strict';

const subscriptions = require('../subscriptions');

function register(bot) {
    bot.command('sub', async (ctx) => {
        subscriptions.add(ctx.from.id, ctx.chat.id);
        await ctx.reply('🔔 Subscribed. You’ll get an update here whenever train service status changes.\nSend /unsub to stop.');
    });

    bot.command('unsub', async (ctx) => {
        subscriptions.remove(ctx.from.id);
        await ctx.reply('🔕 Unsubscribed. You won’t receive service status updates anymore.');
    });
}

module.exports = register;
