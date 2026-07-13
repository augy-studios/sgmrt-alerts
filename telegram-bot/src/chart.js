'use strict';

const QUICKCHART_URL = 'https://quickchart.io/chart';

const LEVEL_VALUE = { l: 1, m: 2, h: 3, na: 0.15 };
const LEVEL_COLOR = { l: '#2e7d32', m: '#f9a825', h: '#c62828', na: '#9e9e9e' };

function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' });
}

// Renders a crowd-forecast bar chart via QuickChart's POST /chart endpoint
// (https://quickchart.io/documentation/) and returns the PNG as a Buffer,
// suitable for ctx.replyWithPhoto({ source: buffer }).
async function renderForecastChart(title, slots) {
    const labelEvery = slots.length > 24 ? 4 : 2;
    const config = {
        type: 'bar',
        data: {
            labels: slots.map((s) => formatTime(s.StartTime)),
            datasets: [
                {
                    label: 'Crowd Level',
                    data: slots.map((s) => LEVEL_VALUE[(s.CrowdLevel || 'na').toLowerCase()] ?? 0),
                    backgroundColor: slots.map((s) => LEVEL_COLOR[(s.CrowdLevel || 'na').toLowerCase()] ?? LEVEL_COLOR.na),
                },
            ],
        },
        options: {
            plugins: {
                legend: { display: false },
                title: { display: true, text: title, font: { size: 16 } },
            },
            scales: {
                y: { min: 0, max: 3, ticks: { display: false }, grid: { display: false } },
                x: { ticks: { autoSkip: false, callback: `eval:function(value, index) { return index % ${labelEvery} === 0 ? this.getLabelForValue(value) : ''; }` } },
            },
        },
    };

    const res = await fetch(QUICKCHART_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart: config, width: 640, height: 320, backgroundColor: 'white', format: 'png' }),
    });

    if (!res.ok) throw new Error(`QuickChart error ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

module.exports = { renderForecastChart, formatTime };
