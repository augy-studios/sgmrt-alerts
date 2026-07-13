'use strict';

const { Telegraf } = require('telegraf');
const config = require('./config');
require('./db'); // initialise schema before anything else touches the DB

const registerStart = require('./commands/start');
const registerStatus = require('./commands/status');
const registerFavs = require('./commands/favs');
const registerSubscribe = require('./commands/subscribe');
const registerCallbacks = require('./callbacks');
const registerSearch = require('./search'); // must be registered last (catch-all text handler)
const scheduler = require('./scheduler');

const bot = new Telegraf(config.BOT_TOKEN);

// The bot's command list is intentionally NOT set here via setMyCommands —
// it's managed manually through @BotFather instead. See SETUP.md.

registerStart(bot);
registerStatus(bot);
registerFavs(bot);
registerSubscribe(bot);
registerCallbacks(bot);
registerSearch(bot);

bot.catch((err, ctx) => {
    console.error(`Unhandled error for update ${ctx.update.update_id}:`, err);
});

scheduler.start(bot);

bot.launch().then(() => console.log('Bot launched.'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
