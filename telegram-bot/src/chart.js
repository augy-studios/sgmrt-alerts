'use strict';

const QUICKCHART_URL = 'https://quickchart.io/chart';

// Matches main-site/style.css's --crowd-l/-m/-h/-na so the chart image
// looks consistent with the web app's crowd colours.
const LEVEL_COLOR = { l: '#4caf82', m: '#ff9800', h: '#f44336', na: '#9e9e9e' };
const NOW_LINE_COLOR = '#1a1a1a';

function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' });
}

// Renders a crowd-forecast chart via QuickChart's POST /chart endpoint
// (https://quickchart.io/documentation/) and returns the PNG as a Buffer,
// suitable for ctx.replyWithPhoto({ source: buffer }). Styled as a single
// continuous colour-coded timeline strip (touching bars, hidden value axis)
// to match the horizontal forecast timeline on the web app, including a
// "Now" marker when the current time falls within the forecast range.
async function renderForecastChart(title, slots) {
    const now = Date.now();
    const startMs = new Date(slots[0].StartTime).getTime();
    const endMs = new Date(slots[slots.length - 1].EndTime).getTime();
    const slotMs = (new Date(slots[0].EndTime).getTime() - startMs) || 30 * 60000;
    const nowIndex = (now - startMs) / slotMs;
    const showNowLine = now >= startMs && now <= endMs;

    const config = {
        type: 'bar',
        data: {
            labels: slots.map((s) => formatTime(s.StartTime)),
            datasets: [
                {
                    data: slots.map(() => 1),
                    backgroundColor: slots.map((s) => LEVEL_COLOR[(s.CrowdLevel || 'na').toLowerCase()] ?? LEVEL_COLOR.na),
                    borderWidth: 0,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                },
            ],
        },
        options: {
            plugins: {
                legend: { display: false },
                title: { display: true, text: title, font: { size: 18 }, padding: { bottom: 12 } },
                annotation: showNowLine
                    ? {
                        annotations: {
                            nowLine: {
                                type: 'line',
                                xMin: nowIndex,
                                xMax: nowIndex,
                                borderColor: NOW_LINE_COLOR,
                                borderWidth: 3,
                                label: { display: true, content: 'Now', position: 'start', backgroundColor: NOW_LINE_COLOR },
                            },
                        },
                    }
                    : undefined,
            },
            scales: {
                y: { min: 0, max: 1, display: false },
                x: {
                    grid: { display: false },
                    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12, font: { size: 11 } },
                },
            },
        },
    };

    const res = await fetch(QUICKCHART_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart: config, width: 640, height: 300, backgroundColor: 'white', format: 'png', version: '4' }),
    });

    if (!res.ok) throw new Error(`QuickChart error ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

module.exports = { renderForecastChart, formatTime };
