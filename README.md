# SG MRT Alerts

Real-time Singapore MRT/LRT situational awareness — service alerts, lift
maintenance, and station crowd levels — sourced from
[LTA DataMall](https://datamall.lta.gov.sg). Two ways to use it:

- 🌐 **[Web app](main-site/)** — a PWA at
  [mrtalerts.uwuapps.org](https://mrtalerts.uwuapps.org), deployed on Vercel
- 🤖 **[Telegram bot](telegram-bot/)** — DM-based lookup, favourites, and
  service status push updates, self-hosted on a VPS

Both share the same station data and LTA DataMall endpoints, just packaged
for different ways of checking in on the trains.

## Web app

An installable PWA with train alerts, lift outage tracking, real-time crowd
levels, and 30-minute crowd forecasts, in 7 themes.

→ [main-site/README.md](main-site/README.md) for features and notes
→ [main-site/api/](main-site/api/) for the Vercel serverless functions that
proxy LTA DataMall (with response caching to stay within LTA's rate limits)

## Telegram bot

Same data, DM-native: send a station code or name to look up its crowd level
and forecast, save favourites, check `/status` for alerts, and `/sub` to get
pushed a message whenever service status changes.

→ [telegram-bot/README.md](telegram-bot/README.md) for features and stack
→ [telegram-bot/SETUP.md](telegram-bot/SETUP.md) for deploying it on a
Debian VPS under tmux

## Data source

All train service alerts, lift maintenance, and crowd data come from
[LTA DataMall](https://datamall.lta.gov.sg)'s `TrainServiceAlerts`,
`FacilitiesMaintenance`, `PCDRealTime`, and `PCDForecast` APIs. Both
sub-projects cache responses (in-memory and/or via CDN headers) to stay well
under LTA's rate limits — see the API handlers in `main-site/api/` and
`telegram-bot/src/lta.js` for specifics.

## Support

If this is useful to you, consider
[buying the author a coffee](https://donate.stripe.com/28o2akeAr3hv0DK6oo).

## License

[MIT](LICENSE) © Augy Studios. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
for community guidelines.
