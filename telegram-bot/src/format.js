'use strict';

const { stationName, getAlertLineInfo } = require('./stations');
const { formatTime } = require('./chart');

const CROWD_EMOJI = { l: '🟢', m: '🟡', h: '🔴', na: '⚪' };
const CROWD_LABEL = { l: 'Low', m: 'Moderate', h: 'High', na: 'N/A' };

// Escapes text for Telegram MarkdownV2. Only apply this to *variable*
// content (station names, LTA-supplied strings) — literal formatting
// characters we write ourselves (e.g. "*bold*") should stay unescaped.
function esc(text) {
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function crowdLevelOf(rec) {
    return (rec?.CrowdLevel || 'na').toLowerCase();
}

function formatStationHeader(code) {
    const name = stationName(code) || code;
    return `${esc(name)} \\(${esc(code)}\\)`;
}

function formatStationCrowdMessage(code, lines, realtimeRec) {
    const lvl = crowdLevelOf(realtimeRec);
    const badges = lines.map((l) => esc(l.label)).join(' · ');
    const timeStr = realtimeRec?.StartTime
        ? `${esc(formatTime(realtimeRec.StartTime))}–${esc(formatTime(realtimeRec.EndTime))}`
        : null;

    const parts = [
        `*${formatStationHeader(code)}*`,
        badges ? `_${badges}_` : null,
        '',
        `${CROWD_EMOJI[lvl]} *${CROWD_LABEL[lvl]}* crowd level right now${timeStr ? ` \\(${timeStr}\\)` : ''}`,
    ].filter((p) => p !== null);

    return parts.join('\n');
}

function formatFavouriteLine(code, rec) {
    const lvl = crowdLevelOf(rec);
    const name = stationName(code) || code;
    return `${CROWD_EMOJI[lvl]} *${esc(name)}* \\(${esc(code)}\\) — ${CROWD_LABEL[lvl]}`;
}

function formatNotices(notices) {
    if (!notices.length) return '';
    const items = notices.map((n) => `• ${esc(n.Content)}`).join('\n');
    return `*Service Notices*\n${items}`;
}

function formatAlerts(data) {
    const value = data?.value ?? data ?? {};
    const status = Number(value.Status) || 1;
    const segments = Array.isArray(value.AffectedSegments) ? value.AffectedSegments : [];
    const notices = Array.isArray(value.Message) ? value.Message : [];

    if (status <= 1 && segments.length === 0) {
        const notice = formatNotices(notices);
        return [
            '✅ *All train services are operating normally*',
            'No disruptions reported\\.',
            notice ? `\n${notice}` : null,
        ].filter((p) => p !== null).join('\n');
    }

    const lines = [`⚠️ *${segments.length} line\\(s\\) with disruption\\(s\\)*`, ''];
    for (const seg of segments) {
        const line = getAlertLineInfo(seg.Line);
        const disrupted = Number(seg.Status ?? status) > 1;
        lines.push(`*${esc(line.label)}* — ${disrupted ? '🔴 Disrupted' : '🟡 Minor Delay'}`);
        if (seg.Direction) lines.push(`Direction: ${esc(seg.Direction)}`);

        const stations = seg.Stations ? seg.Stations.split(',').map((s) => s.trim()) : [];
        if (stations.length) {
            const names = stations.map((s) => (stationName(s) ? `${esc(stationName(s))} \\(${esc(s)}\\)` : esc(s)));
            lines.push(`Affected: ${names.join(', ')}`);
        }

        const freeBus = seg.FreePublicBus ? seg.FreePublicBus.split(',').map((s) => s.trim()) : [];
        if (freeBus.length) lines.push(`Free bus at: ${freeBus.map(esc).join(', ')}`);

        const shuttle = seg.FreeMRTShuttle ? seg.FreeMRTShuttle.split(',').map((s) => s.trim()) : [];
        if (shuttle.length) {
            lines.push(`Free shuttle: ${shuttle.map(esc).join(', ')}${seg.MRTShuttleDirection ? ` \\(${esc(seg.MRTShuttleDirection)}\\)` : ''}`);
        }
        lines.push('');
    }

    const notice = formatNotices(notices);
    if (notice) lines.push(notice);

    return lines.join('\n').trim();
}

module.exports = {
    esc,
    crowdLevelOf,
    CROWD_EMOJI,
    CROWD_LABEL,
    formatStationHeader,
    formatStationCrowdMessage,
    formatFavouriteLine,
    formatNotices,
    formatAlerts,
};
