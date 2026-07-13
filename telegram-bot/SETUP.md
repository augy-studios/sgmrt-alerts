# Setup — Debian 13 VPS (tmux)

Step-by-step deployment for running this bot persistently on a Debian 13 VPS
inside a `tmux` session.

## 1. Create the bot with BotFather

1. On Telegram, message [@BotFather](https://t.me/BotFather).
2. `/newbot` → follow the prompts → copy the bot token it gives you.
3. Optional but recommended, still via BotFather:
   - `/setdescription` — shown on the bot's profile
   - `/setabouttext` — shown when someone shares the bot
   - `/setuserpic` — bot avatar
   - `/setprivacy` → **Disable** if you ever want the bot to read group
     messages that aren't commands; leave **Enabled** (default) for
     DM-only use, which is all this bot needs.

4. Set the command list yourself via `/setcommands` in BotFather (the bot
   does **not** set this automatically). Select your bot, then send:

   ```text
   start - About this bot
   status - Train service alerts & notices
   favs - Your favourited stations' crowd levels
   sub - Get updated on service status changes
   unsub - Stop service status updates
   ```

## 2. Get an LTA DataMall API key

Request one at
https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html if you
don't already have one. This is the same key used by `main-site`'s Vercel API
routes (`LTA_ACCOUNT_KEY`) — you can reuse it here.

## 3. Install Node.js on the VPS

Debian 13 ships an older Node in its default repos; use NodeSource to get
Node 20+:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
node -v   # should print v20.x or newer
```

`build-essential` is only needed as a fallback in case `better-sqlite3`
can't find a prebuilt binary for your VPS's architecture (rare on standard
x86_64 Debian) and has to compile from source.

## 4. Get the code onto the VPS

```bash
git clone <your-fork-or-repo-url> sgmrt-alerts
cd sgmrt-alerts/telegram-bot
```

(If you're pushing this bot from your own machine first: `git add`, `git
commit`, `git push` from the repo root, then `git clone` on the VPS.)

## 5. Install dependencies and configure

```bash
npm install
cp .env.example .env
nano .env   # or vim/your editor of choice
```

Fill in:
- `TELEGRAM_BOT_TOKEN` — from step 1
- `LTA_ACCOUNT_KEY` — from step 2
- `WEBAPP_URL` — the public URL of the main-site PWA (leave blank to omit
  the "Open Web App" button on `/start`)
- `DONATE_URL` — defaults to the same Stripe donation link used by main-site;
  change or leave as-is
- `DB_PATH` — defaults to `./data/bot.sqlite3`, fine to leave alone
- `ALERT_POLL_INTERVAL_SECONDS` — how often (seconds) the bot checks LTA for
  service status changes to send to subscribers; defaults to 60

## 6. Run it in tmux

```bash
tmux new -s sgmrt-bot
cd ~/sgmrt-alerts/telegram-bot
npm start
```

Detach with `Ctrl+B` then `D` — the bot keeps running. Reattach later with:

```bash
tmux attach -t sgmrt-bot
```

To stop it: reattach, then `Ctrl+C`.

### Restarting after a code update

```bash
tmux attach -t sgmrt-bot
# Ctrl+C to stop the running process
git pull
npm install   # only needed if package.json changed
npm start
```

Favourites, subscriptions, and inline buttons all persist in
`data/bot.sqlite3` across restarts — no data is lost.

## 7. (Optional) Survive VPS reboots with systemd

tmux alone won't restart the bot after a VPS reboot. If you want that, run it
as a systemd service instead of (or in addition to) tmux:

```ini
# /etc/systemd/system/sgmrt-bot.service
[Unit]
Description=SG MRT Alerts Telegram Bot
After=network-online.target

[Service]
Type=simple
User=YOUR_LINUX_USER
WorkingDirectory=/home/YOUR_LINUX_USER/sgmrt-alerts/telegram-bot
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/home/YOUR_LINUX_USER/sgmrt-alerts/telegram-bot/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sgmrt-bot
sudo journalctl -u sgmrt-bot -f   # tail logs
```

If you go this route, stop running it manually in tmux to avoid two bot
processes polling Telegram at once (Telegram will reject the second
`getUpdates` connection, but it's still wasted LTA API calls).

## Troubleshooting

- **`Missing required environment variable`** on startup — `.env` wasn't
  filled in or isn't being read; confirm you're running `npm start` from
  inside `telegram-bot/` where `.env` lives.
- **`better-sqlite3` fails to install** — run
  `sudo apt-get install -y build-essential python3` and re-run
  `npm install` so it can compile from source.
- **No status updates after /sub** — check the process is still
  running (`tmux attach -t sgmrt-bot` or `journalctl -u sgmrt-bot -f`) and
  that `ALERT_POLL_INTERVAL_SECONDS` isn't set absurdly high.
- **Forecast chart fails to send** — QuickChart's public endpoint
  (quickchart.io) has generous free-tier rate limits but isn't unlimited; if
  you hit limits, self-host QuickChart (see their
  [Docker instructions](https://quickchart.io/documentation/self-hosting/))
  and point `chart.js`'s `QUICKCHART_URL` at your own instance.
