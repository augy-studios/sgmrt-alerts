'use strict';

const { stationName, getAlertLineInfo } = require('./stations');
const { formatTime } = require('./chart');

const CROWD_EMOJI = { l: '🟢', m: '🟡', h: '🔴', na: '⚪' };
const CROWD_LABEL = { l: 'Low', m: 'Moderate', h: 'High', na: 'N/A' };

// Escapes text for Telegram's Rich Markdown dialect. Only apply this to
// *variable* content (station names, LTA-supplied strings, user input) -
// literal markup we author ourselves (e.g. "**bold**", "# Heading", table
// pipes) must stay unescaped.
const MD_SPECIAL = /([\\*_~`|[\]#>=])/g;

function escapeMd(text) {
    return String(text).replace(MD_SPECIAL, '\\$1');
}

// Escape for a GFM table cell; also flattens newlines so the row stays intact.
function escapeCell(text) {
    return escapeMd(String(text).replace(/\n/g, ' '));
}

// Builds a rich message as two parallel renderings: Rich Markdown for
// current clients and plain text with the same information as the fallback.
// Methods take *raw* text and escape it for the markdown track themselves;
// use line(md, plain) when a line needs authored inline markup.
class RichDoc {
    constructor() {
        this.md = [];
        this.plain = [];
    }

    heading(level, text) {
        this.md.push(`${'#'.repeat(level)} ${escapeMd(text)}`);
        this.plain.push(text);
        return this;
    }

    text(raw) {
        return this.line(escapeMd(raw), raw);
    }

    line(md, plain) {
        this.md.push(md);
        this.plain.push(plain);
        return this;
    }

    blank() {
        if (this.md.length && this.md[this.md.length - 1] !== '') this.md.push('');
        if (this.plain.length && this.plain[this.plain.length - 1] !== '') this.plain.push('');
        return this;
    }

    // items: raw strings, or { md, plain } for items with inline markup.
    bullets(items) {
        for (const item of items) {
            if (typeof item === 'string') this.line(`- ${escapeMd(item)}`, `• ${item}`);
            else this.line(`- ${item.md}`, `• ${item.plain}`);
        }
        return this;
    }

    // headers/rows hold raw cell values. plainRow(row) customises how a row
    // reads in the plain fallback; by default cells are joined with " · ".
    table(headers, rows, plainRow = (row) => row.filter((v) => v !== '').join(' · ')) {
        this.blank();
        this.md.push(`| ${headers.map(escapeCell).join(' | ')} |`);
        this.md.push(`| ${headers.map(() => '---').join(' | ')} |`);
        for (const row of rows) {
            this.md.push(`| ${row.map(escapeCell).join(' | ')} |`);
            this.plain.push(plainRow(row));
        }
        this.blank();
        return this;
    }

    build() {
        return {
            markdown: this.md.join('\n').trim(),
            fallback: this.plain.join('\n').trim(),
        };
    }
}

function crowdLevelOf(rec) {
    return (rec?.CrowdLevel || 'na').toLowerCase();
}

function stationLabel(code) {
    return `${stationName(code) || code} (${code})`;
}

function formatStationCrowd(code, lines, realtimeRec) {
    const lvl = crowdLevelOf(realtimeRec);
    const badges = lines.map((l) => l.label).join(' · ');
    const timeStr = realtimeRec?.StartTime
        ? ` (${formatTime(realtimeRec.StartTime)}–${formatTime(realtimeRec.EndTime)})`
        : '';

    const doc = new RichDoc().heading(1, stationLabel(code));
    if (badges) doc.line(`_${escapeMd(badges)}_`, badges);
    doc.blank().line(
        `${CROWD_EMOJI[lvl]} **${CROWD_LABEL[lvl]}** crowd level right now${escapeMd(timeStr)}`,
        `${CROWD_EMOJI[lvl]} ${CROWD_LABEL[lvl]} crowd level right now${timeStr}`
    );
    return doc.build();
}

function formatFavourites(entries, page, totalPages) {
    const rows = entries.map(({ code, rec }) => {
        const lvl = crowdLevelOf(rec);
        return [CROWD_EMOJI[lvl], stationLabel(code), CROWD_LABEL[lvl]];
    });
    return new RichDoc()
        .heading(1, '⭐ Your Favourite Stations')
        .text(`Page ${page + 1}/${totalPages}`)
        .table(['', 'Station', 'Crowd'], rows, ([emoji, station, level]) => `${emoji} ${station} - ${level}`)
        .build();
}

function formatCandidates(query, codes) {
    return new RichDoc()
        .heading(2, `Multiple stations match “${query}”`)
        .text('Pick one:')
        .blank()
        .bullets(codes.map(stationLabel))
        .build();
}

function splitList(value) {
    return value ? String(value).split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function addNotices(doc, notices) {
    if (!notices.length) return;
    doc.blank().heading(2, 'Service Notices').bullets(notices.map((n) => String(n.Content)));
}

// Appends the train service alert summary to `doc` (shared by /status, the
// refresh button and the /sub broadcast). `level` is the heading level of
// the summary line, so it can sit under a title heading.
function addAlerts(doc, data, level = 1) {
    const value = data?.value ?? data ?? {};
    const status = Number(value.Status) || 1;
    const segments = Array.isArray(value.AffectedSegments) ? value.AffectedSegments : [];
    const notices = Array.isArray(value.Message) ? value.Message : [];

    if (status <= 1 && segments.length === 0) {
        doc.heading(level, '✅ All train services are operating normally').text('No disruptions reported.');
        addNotices(doc, notices);
        return doc;
    }

    doc.heading(level, `⚠️ ${segments.length} line(s) with disruption(s)`);
    const rows = segments.map((seg) => {
        const line = getAlertLineInfo(seg.Line);
        const disrupted = Number(seg.Status ?? status) > 1;
        const stations = splitList(seg.Stations).map((s) => (stationName(s) ? stationLabel(s) : s));
        return [line.label, disrupted ? '🔴 Disrupted' : '🟡 Minor Delay', seg.Direction || '—', stations.join(', ') || '—'];
    });
    doc.table(['Line', 'Status', 'Direction', 'Affected stations'], rows);

    for (const seg of segments) {
        const freeBus = splitList(seg.FreePublicBus);
        const shuttle = splitList(seg.FreeMRTShuttle);
        if (!freeBus.length && !shuttle.length) continue;
        doc.heading(2, `${getAlertLineInfo(seg.Line).label} alternatives`);
        const items = [];
        if (freeBus.length) items.push(`Free bus at: ${freeBus.join(', ')}`);
        if (shuttle.length) {
            items.push(`Free shuttle: ${shuttle.join(', ')}${seg.MRTShuttleDirection ? ` (${seg.MRTShuttleDirection})` : ''}`);
        }
        doc.bullets(items);
    }

    addNotices(doc, notices);
    return doc;
}

function formatAlerts(data) {
    return addAlerts(new RichDoc(), data).build();
}

function formatAlertUpdate(data) {
    return addAlerts(new RichDoc().heading(1, '🔔 Service status update').blank(), data, 2).build();
}

module.exports = {
    escapeMd,
    escapeCell,
    RichDoc,
    crowdLevelOf,
    CROWD_EMOJI,
    CROWD_LABEL,
    stationLabel,
    formatStationCrowd,
    formatFavourites,
    formatCandidates,
    formatAlerts,
    formatAlertUpdate,
};
