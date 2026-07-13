'use strict';

require('dotenv').config();

function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

module.exports = {
    BOT_TOKEN: required('TELEGRAM_BOT_TOKEN'),
    LTA_ACCOUNT_KEY: required('LTA_ACCOUNT_KEY'),
    WEBAPP_URL: process.env.WEBAPP_URL || '',
    DONATE_URL: process.env.DONATE_URL || 'https://donate.stripe.com/28o2akeAr3hv0DK6oo',
    DB_PATH: process.env.DB_PATH || './data/bot.sqlite3',
    ALERT_POLL_INTERVAL_SECONDS: Number(process.env.ALERT_POLL_INTERVAL_SECONDS || 60),
};
