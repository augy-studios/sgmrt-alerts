'use strict';

const { startKeyboard } = require('../keyboards');
const { RichDoc } = require('../format');
const { sendRichMessage } = require('../reply');

const INTRO = new RichDoc()
    .heading(1, '🚇 Singapore MRT/LRT Crowd & Alerts')
    .text('Real-time train service alerts and station crowd levels, straight from LTA DataMall.')
    .blank()
    .heading(2, 'What you can do')
    .bullets([
        {
            md: 'Send a station code or name (e.g. `NS1` or `Bishan`) to check its current crowd level and forecast',
            plain: 'Send a station code or name (e.g. NS1 or Bishan) to check its current crowd level and forecast',
        },
        '/status - train service alerts & service notices',
        '/favs - your favourited stations’ crowd levels',
        '/sub - get updated whenever service status changes',
        '/unsub - stop those updates',
    ])
    .build();

function register(bot) {
    const sendIntro = (ctx) => sendRichMessage(ctx.telegram, ctx.chat.id, INTRO, startKeyboard());
    bot.start(sendIntro);
    bot.help(sendIntro);
}

module.exports = register;
