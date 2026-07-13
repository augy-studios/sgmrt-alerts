# SG MRT Alerts — Telegram Bot

A Telegram bot for real-time Singapore MRT/LRT service alerts and station crowd
levels, sourced from [LTA DataMall](https://datamall.lta.gov.sg). Companion to
the [main-site](../main-site) PWA — same station data and LTA endpoints, ported
to a standalone Node.js bot.

## Features

- 🚨 **/status** — current train service alerts and service notices
- ⭐ **/favs** — your favourited stations' current crowd levels, paginated
  10 per page, with a per-station button to view its crowd forecast
- 🔎 **Free-text search** — DM the bot a station code (`NS1`) or partial name
  (`bishan`) to get its current crowd level, with buttons to add/remove it
  from favourites or view its crowd forecast as a chart image
- 🔔 **/sub** / **/unsub** — get updated whenever train
  service status changes (new disruption, cleared disruption, or a new
  service notice)
- All inline buttons are backed by a SQLite table, so they keep working even
  after the bot process restarts — nothing lives only in memory

## Stack

- [telegraf](https://telegraf.js.org/) — Telegram Bot API framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — favourites,
  subscriptions, persistent button registry, and the alert-poll scheduler
- [QuickChart](https://quickchart.io/) — renders crowd forecast bar charts
  server-side as PNGs (no native canvas build required)
- Node's built-in `fetch` for calling LTA DataMall directly (Node 20+)

No secrets or user data are sent to any third party other than LTA DataMall
(train/crowd data) and QuickChart (chart image rendering — receives only a
station name and anonymised crowd-level numbers, never user identifiers).

## Project layout

```
src/
  config.js       env var loading
  db.js           SQLite connection + schema
  stations.js     station code/name map, line lookups (ported from main-site)
  lta.js          LTA DataMall client with in-process caching
  buttons.js      persistent SQLite-backed inline button registry
  chart.js        QuickChart forecast image rendering
  format.js       Telegram MarkdownV2 message formatting/escaping
  keyboards.js    inline keyboard builders
  favourites.js   favourites table access
  subscriptions.js subscriptions table access
  favs.js         /favs page builder (shared by command + pagination callback)
  stationView.js  station crowd view builder (shared by search + callbacks)
  search.js       free-text station lookup handler
  callbacks.js    central callback_query router
  scheduler.js    SQLite-backed job scheduler + status update polling
  commands/       one file per slash command
  index.js        entrypoint
```

## Quick start

See [SETUP.md](SETUP.md) for full Debian 13 VPS + tmux deployment steps.

```bash
npm install
cp .env.example .env   # fill in TELEGRAM_BOT_TOKEN and LTA_ACCOUNT_KEY
npm start
```

## Notes

- Crowd level colours match the main site: 🟢 Low, 🟡 Moderate, 🔴 High, ⚪ N/A.
- The bot's own name/username never appears in any command — commands are
  generic (`/start`, `/status`, `/favs`, `/sub`, `/unsub`) so the
  bot can be renamed freely without touching the command set.
- LTA DataMall responses are cached in-process (60s for realtime crowd, 30min
  for forecasts, 20s for alerts) to stay well under API rate limits.
