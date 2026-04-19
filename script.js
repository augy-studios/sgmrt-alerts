'use strict';

// ── Line Configuration ──
const LINES = [{
        code: 'EWL',
        label: 'EW Line',
        color: '#009645',
        group: 'MRT'
    },
    {
        code: 'NSL',
        label: 'NS Line',
        color: '#d42e12',
        group: 'MRT'
    },
    {
        code: 'NEL',
        label: 'NE Line',
        color: '#9900aa',
        group: 'MRT'
    },
    {
        code: 'CCL',
        label: 'CC Line',
        color: '#fa9e0d',
        group: 'MRT'
    },
    {
        code: 'CEL',
        label: 'Circle Ext',
        color: '#fa9e0d',
        group: 'MRT'
    },
    {
        code: 'DTL',
        label: 'DT Line',
        color: '#005ec4',
        group: 'MRT'
    },
    {
        code: 'TEL',
        label: 'TE Line',
        color: '#9d5b25',
        group: 'MRT'
    },
    {
        code: 'CGL',
        label: 'Changi Ext',
        color: '#009645',
        group: 'MRT'
    },
    {
        code: 'BPL',
        label: 'BP LRT',
        color: '#718573',
        group: 'LRT'
    },
    {
        code: 'SLRT',
        label: 'SK LRT',
        color: '#718573',
        group: 'LRT'
    },
    {
        code: 'PLRT',
        label: 'PG LRT',
        color: '#718573',
        group: 'LRT'
    },
];

// Alert API uses different line codes
const ALERT_LINES = [{
        code: 'EWL',
        label: 'EW Line',
        color: '#009645'
    },
    {
        code: 'NSL',
        label: 'NS Line',
        color: '#d42e12'
    },
    {
        code: 'NEL',
        label: 'NE Line',
        color: '#9900aa'
    },
    {
        code: 'CCL',
        label: 'CC Line',
        color: '#fa9e0d'
    },
    {
        code: 'DTL',
        label: 'DT Line',
        color: '#005ec4'
    },
    {
        code: 'TEL',
        label: 'TE Line',
        color: '#9d5b25'
    },
    {
        code: 'BPL',
        label: 'BP LRT',
        color: '#718573'
    },
    {
        code: 'STL',
        label: 'SK LRT',
        color: '#718573'
    },
    {
        code: 'PTL',
        label: 'PG LRT',
        color: '#718573'
    },
];

const THEMES = [
    'classic', 'rose', 'lavender', 'butter', 'lilac', 'sky', 'white'
];

// ── State ──
let selectedCrowdNowLine = null;
let selectedForecastLine = null;
let currentTab = 'alerts';
let refreshTimer = null;

// ── DOM Refs ──
const body = document.body;
const themeBtn = document.getElementById('theme-btn');
const themeModal = document.getElementById('theme-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdatedEl = document.getElementById('last-updated');
const statusBanner = document.getElementById('status-banner');
const statusBannerInner = statusBanner.querySelector('.status-banner-inner');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');

// ── Theme ──
function applyTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('mrt-theme', theme);
    document.querySelectorAll('.theme-swatch').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const themeColors = {
        classic: '#ccffcc',
        rose: '#ffcccc',
        lavender: '#ccccff',
        butter: '#ffffcc',
        lilac: '#ffccff',
        sky: '#ccffff',
        white: '#f0f0f0'
    };
    if (metaTheme) metaTheme.content = themeColors[theme] || '#ccffcc';
}

document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
        themeModal.hidden = true;
    });
});

themeBtn.addEventListener('click', () => {
    themeModal.hidden = false;
});
modalCloseBtn.addEventListener('click', () => {
    themeModal.hidden = true;
});
themeModal.addEventListener('click', (e) => {
    if (e.target === themeModal) themeModal.hidden = true;
});

// Load saved theme
const savedTheme = localStorage.getItem('mrt-theme') || 'classic';
applyTheme(savedTheme);

// ── Tabs ──
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-selected', b === btn);
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            const active = panel.id === `tab-${currentTab}`;
            panel.classList.toggle('active', active);
            panel.hidden = !active;
        });
        loadCurrentTab();
    });
});

// ── Line Selectors ──
function buildLineSelectors() {
    ['crowd-now-line-grid', 'crowd-forecast-line-grid'].forEach((gridId, idx) => {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.innerHTML = '';
        LINES.forEach(line => {
            const pill = document.createElement('button');
            pill.className = 'line-pill';
            pill.textContent = line.label;
            pill.dataset.code = line.code;
            pill.style.setProperty('--line-color', line.color);
            pill.title = line.code;
            pill.addEventListener('click', () => {
                grid.querySelectorAll('.line-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                if (idx === 0) {
                    selectedCrowdNowLine = line.code;
                    fetchCrowdNow(line.code);
                } else {
                    selectedForecastLine = line.code;
                    fetchCrowdForecast(line.code);
                }
            });
            grid.appendChild(pill);
        });
    });
}

// ── Fetch Helpers ──
async function apiFetch(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

function setLoading(containerId, message = 'Loading...') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>${message}</span>
    </div>`;
}

function setError(containerId, message) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `
    <div class="error-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${message}</span>
    </div>`;
}

// ── Status Banner ──
function showStatus(type, message) {
    statusBannerInner.className = `status-banner-inner ${type}`;
    const icons = {
        ok: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        warn: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    };
    statusIcon.innerHTML = icons[type] || '';
    statusText.textContent = message;
    statusBanner.hidden = false;
}

function hideStatus() {
    statusBanner.hidden = true;
}

// ── Train Alerts ──
async function fetchAlerts() {
    setLoading('alerts-content', 'Fetching live alerts...');
    try {
        const data = await apiFetch('/api/train-alerts');
        renderAlerts(data);
        updateTimestamp();
    } catch (err) {
        setError('alerts-content', 'Unable to load train alerts. Please try again.');
        console.error(err);
    }
}

function getLineInfo(code) {
    return ALERT_LINES.find(l => l.code === code) || {
        code,
        label: code,
        color: '#888'
    };
}

function renderAlerts(data) {
    const container = document.getElementById('alerts-content');
    const raw = data?.value ?? data;
    const alerts = Array.isArray(raw) ? raw : [];

    // Status 1 = normal/minor delays, Status 2 = disrupted
    const disruptions = alerts.filter(a => a.Status === 2);

    if (alerts.length === 0 || disruptions.length === 0) {
        showStatus('ok', 'All train services are operating normally');
        container.innerHTML = `
      <div class="all-clear">
        <span class="all-clear-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </span>
        <h3>All Clear</h3>
        <p>All MRT and LRT lines are operating normally.<br>No disruptions reported.</p>
      </div>`;
        return;
    }

    hideStatus();
    const disruptedCount = disruptions.length;
    showStatus('warn', `${disruptedCount} line${disruptedCount > 1 ? 's' : ''} with disruption${disruptedCount > 1 ? 's' : ''}`);

    container.innerHTML = '';
    alerts.forEach(alert => {
        const line = getLineInfo(alert.Line);
        const isDisrupted = alert.Status === 2;
        const stations = alert.Stations ? alert.Stations.split(',') : [];
        const freeBus = alert.FreePublicBus ? alert.FreePublicBus.split(',') : [];
        const shuttle = alert.FreeMRTShuttle ? alert.FreeMRTShuttle.split(',') : [];

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <span class="line-badge" style="background:${line.color}">${line.label}</span>
        </div>
        <span class="status-badge ${isDisrupted ? 'disrupted' : 'normal'}">
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor"/></svg>
          ${isDisrupted ? 'Disrupted' : 'Minor Delay'}
        </span>
      </div>

      ${alert.Direction ? `
      <div class="info-row">
        <div class="info-item">
          <span class="info-label">Direction</span>
          <span class="info-value">${alert.Direction}</span>
        </div>
        ${stations.length ? `<div class="info-item">
          <span class="info-label">Affected Stations (${stations.length})</span>
          <div class="station-chips">${stations.map(s => `<span class="station-chip">${s.trim()}</span>`).join('')}</div>
        </div>` : ''}
      </div>` : ''}

      ${freeBus.length ? `
      <div class="info-row" style="margin-top:10px">
        <div class="info-item">
          <span class="info-label">Free Bus Available At</span>
          <div class="station-chips">${freeBus.map(s => `<span class="station-chip">${s.trim()}</span>`).join('')}</div>
        </div>
      </div>` : ''}

      ${shuttle.length ? `
      <div class="info-row" style="margin-top:6px">
        <div class="info-item">
          <span class="info-label">Free MRT Shuttle</span>
          <div class="station-chips">${shuttle.map(s => `<span class="station-chip">${s.trim()}</span>`).join('')}</div>
        </div>
        ${alert.MRTShuttleDirection ? `<div class="info-item">
          <span class="info-label">Shuttle Direction</span>
          <span class="info-value">${alert.MRTShuttleDirection}</span>
        </div>` : ''}
      </div>` : ''}

      ${alert.Message?.Content ? `<div class="card-message">${alert.Message.Content}</div>` : ''}
      ${alert.Message?.CreatedDate ? `<div class="data-note">Issued: ${formatDateTime(alert.Message.CreatedDate)}</div>` : ''}
    `;
        container.appendChild(card);
    });
}

// ── Facilities / Lifts ──
async function fetchFacilities() {
    setLoading('lifts-content', 'Fetching lift status...');
    try {
        const data = await apiFetch('/api/facilities');
        renderLifts(data);
        updateTimestamp();
    } catch (err) {
        setError('lifts-content', 'Unable to load lift information. Please try again.');
        console.error(err);
    }
}

function renderLifts(data) {
    const container = document.getElementById('lifts-content');
    const raw = data?.value ?? data;
    const lifts = Array.isArray(raw) ? raw : [];

    if (lifts.length === 0) {
        container.innerHTML = `
      <div class="all-clear">
        <span class="all-clear-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <polyline points="9 10 12 7 15 10"/>
            <polyline points="9 14 12 17 15 14"/>
          </svg>
        </span>
        <h3>All Lifts Operational</h3>
        <p>No lift maintenance reported at this time.<br>All station lifts are accessible.</p>
      </div>`;
        return;
    }

    container.innerHTML = `
    <div class="section-actions">
      <span class="results-count">${lifts.length} lift${lifts.length !== 1 ? 's' : ''} under maintenance</span>
      <input class="filter-input" id="lift-filter" placeholder="Filter by station…" aria-label="Filter lifts by station" />
    </div>
    <div class="lift-grid" id="lift-grid"></div>`;

    const liftGrid = document.getElementById('lift-grid');
    const filterInput = document.getElementById('lift-filter');

    function renderLiftCards(items) {
        liftGrid.innerHTML = '';
        items.forEach(lift => {
            const line = getLineInfo(lift.Line);
            const card = document.createElement('div');
            card.className = 'lift-card';
            card.style.setProperty('--line-color', line.color);
            card.innerHTML = `
        <div class="lift-station">
          <span class="line-badge" style="background:${line.color};font-size:0.65rem;padding:1px 7px">${lift.Line}</span>
          ${lift.StationName}
        </div>
        ${lift.LiftID ? `<div class="lift-id">Lift ID: ${lift.LiftID}</div>` : ''}
        ${lift.LiftDesc ? `<div class="lift-desc">${lift.LiftDesc}</div>` : ''}
        <div class="lift-id">${lift.StationCode}</div>
      `;
            liftGrid.appendChild(card);
        });
        if (items.length === 0) {
            liftGrid.innerHTML = '<div class="data-note" style="padding:20px">No matching stations found.</div>';
        }
    }

    renderLiftCards(lifts);

    filterInput.addEventListener('input', () => {
        const q = filterInput.value.toLowerCase();
        renderLiftCards(lifts.filter(l =>
            l.StationName.toLowerCase().includes(q) ||
            (l.StationCode || '').toLowerCase().includes(q)
        ));
    });
}

// ── Crowd Now ──
async function fetchCrowdNow(lineCode) {
    setLoading('crowd-now-content', `Loading crowd data for ${lineCode}…`);
    try {
        const data = await apiFetch(`/api/crowd-realtime?line=${encodeURIComponent(lineCode)}`);
        renderCrowdNow(data, lineCode);
        updateTimestamp();
    } catch (err) {
        setError('crowd-now-content', 'Unable to load crowd density data. Please try again.');
        console.error(err);
    }
}

const CROWD_LABEL = {
    l: 'Low',
    m: 'Moderate',
    h: 'High',
    na: 'N/A'
};
const CROWD_COLOR = {
    l: '#4caf82',
    m: '#ff9800',
    h: '#f44336',
    na: '#9e9e9e'
};

function renderCrowdNow(data, lineCode) {
    const container = document.getElementById('crowd-now-content');
    const raw = data?.value ?? data;
    const records = Array.isArray(raw) ? raw : [];

    if (records.length === 0) {
        container.innerHTML = `
      <div class="all-clear">
        <span class="all-clear-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" opacity="0.6">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </span>
        <h3 style="color:var(--text-muted)">No Data Available</h3>
        <p>Crowd density data is not available for ${lineCode} at this time.</p>
      </div>`;
        return;
    }

    const line = LINES.find(l => l.code === lineCode) || {
        color: '#888'
    };

    container.innerHTML = `
    <div class="section-actions">
      <span class="results-count">${records.length} station${records.length !== 1 ? 's' : ''}</span>
      <input class="filter-input" id="crowd-filter" placeholder="Filter station…" aria-label="Filter stations" />
    </div>
    <div class="crowd-grid" id="crowd-grid"></div>`;

    const crowdGrid = document.getElementById('crowd-grid');
    const filterInput = document.getElementById('crowd-filter');

    function renderCrowdCards(items) {
        crowdGrid.innerHTML = '';
        items.forEach(rec => {
            const lvl = (rec.CrowdLevel || 'na').toLowerCase();
            const color = CROWD_COLOR[lvl] || CROWD_COLOR.na;
            const card = document.createElement('div');
            card.className = 'crowd-card';
            card.style.setProperty('--crowd-color', color);
            const timeStr = rec.StartTime ?
                formatTime(rec.StartTime) + '–' + formatTime(rec.EndTime) :
                '';
            card.innerHTML = `
        <div class="crowd-station">${rec.Station}</div>
        <span class="crowd-level-pill ${lvl}">
          <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="currentColor"/></svg>
          ${CROWD_LABEL[lvl] || 'N/A'}
        </span>
        ${timeStr ? `<div class="crowd-time">${timeStr}</div>` : ''}
      `;
            crowdGrid.appendChild(card);
        });
        if (items.length === 0) {
            crowdGrid.innerHTML = '<div class="data-note" style="padding:20px">No matching stations.</div>';
        }
    }

    renderCrowdCards(records);

    filterInput.addEventListener('input', () => {
        const q = filterInput.value.toLowerCase();
        renderCrowdCards(records.filter(r => r.Station.toLowerCase().includes(q)));
    });
}

// ── Crowd Forecast ──
async function fetchCrowdForecast(lineCode) {
    setLoading('crowd-forecast-content', `Loading forecast for ${lineCode}…`);
    try {
        const data = await apiFetch(`/api/crowd-forecast?line=${encodeURIComponent(lineCode)}`);
        renderCrowdForecast(data, lineCode);
        updateTimestamp();
    } catch (err) {
        setError('crowd-forecast-content', 'Unable to load crowd forecast. Please try again.');
        console.error(err);
    }
}

function renderCrowdForecast(data, lineCode) {
    const container = document.getElementById('crowd-forecast-content');
    const raw = data?.value ?? data;
    const records = Array.isArray(raw) ? raw : [];

    if (records.length === 0) {
        container.innerHTML = `
      <div class="all-clear">
        <span class="all-clear-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" opacity="0.6">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </span>
        <h3 style="color:var(--text-muted)">No Forecast Available</h3>
        <p>Crowd forecast is not available for ${lineCode} at this time.</p>
      </div>`;
        return;
    }

    // Group by station, collect time slots
    const stationMap = {};
    const timeSlots = new Set();
    records.forEach(r => {
        const station = r.Station;
        const time = formatTime(r.Start);
        if (!stationMap[station]) stationMap[station] = {};
        stationMap[station][time] = (r.CrowdLevel || 'na').toLowerCase();
        timeSlots.add(time);
    });

    // Sort time slots
    const sortedTimes = Array.from(timeSlots).sort();
    const stations = Object.keys(stationMap).sort();

    // Limit columns for readability: show current + next 8 slots
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    let startIdx = sortedTimes.findIndex(t => t >= currentHHMM);
    if (startIdx < 0) startIdx = 0;
    const visibleTimes = sortedTimes.slice(startIdx, startIdx + 10);

    container.innerHTML = `
    <div class="section-actions">
      <span class="results-count">${stations.length} stations · showing next ${visibleTimes.length} time slots</span>
      <input class="filter-input" id="forecast-filter" placeholder="Filter station…" aria-label="Filter stations" />
    </div>
    <div class="forecast-wrap">
      <table class="forecast-table" id="forecast-table">
        <thead>
          <tr>
            <th>Station</th>
            ${visibleTimes.map(t => `<th>${t}</th>`).join('')}
          </tr>
        </thead>
        <tbody id="forecast-body"></tbody>
      </table>
    </div>`;

    const tbody = document.getElementById('forecast-body');
    const filterInput = document.getElementById('forecast-filter');

    function renderRows(list) {
        tbody.innerHTML = '';
        list.forEach(station => {
            const tr = document.createElement('tr');
            let cells = `<td><strong>${station}</strong></td>`;
            visibleTimes.forEach(t => {
                const lvl = stationMap[station][t] || 'na';
                cells += `<td><span class="crowd-dot ${lvl}"></span>${CROWD_LABEL[lvl] || 'N/A'}</td>`;
            });
            tr.innerHTML = cells;
            tbody.appendChild(tr);
        });
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${visibleTimes.length + 1}" style="text-align:center;color:var(--text-muted);padding:20px">No matching stations.</td></tr>`;
        }
    }

    renderRows(stations);
    filterInput.addEventListener('input', () => {
        const q = filterInput.value.toLowerCase();
        renderRows(stations.filter(s => s.toLowerCase().includes(q)));
    });
}

// ── Helpers ──
function formatTime(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    } catch {
        return isoStr;
    }
}

function formatDateTime(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return d.toLocaleString('en-SG', {
            timeZone: 'Asia/Singapore',
            hour12: false,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoStr;
    }
}

function updateTimestamp() {
    const now = new Date();
    const t = now.toLocaleTimeString('en-SG', {
        timeZone: 'Asia/Singapore',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    lastUpdatedEl.textContent = `Updated ${t}`;
}

// ── Tab Load Dispatch ──
function loadCurrentTab() {
    switch (currentTab) {
        case 'alerts':
            fetchAlerts();
            break;
        case 'lifts':
            fetchFacilities();
            break;
        case 'crowd-now':
            if (selectedCrowdNowLine) fetchCrowdNow(selectedCrowdNowLine);
            break;
        case 'crowd-forecast':
            if (selectedForecastLine) fetchCrowdForecast(selectedForecastLine);
            break;
    }
}

// ── Refresh ──
refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    loadCurrentTab();
    setTimeout(() => refreshBtn.classList.remove('spinning'), 800);
});

// ── Auto-refresh every 60s ──
function setupAutoRefresh() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (currentTab === 'alerts' || currentTab === 'lifts') {
            loadCurrentTab();
        } else if (currentTab === 'crowd-now' && selectedCrowdNowLine) {
            fetchCrowdNow(selectedCrowdNowLine);
        }
    }, 60000);
}

// ── PWA Service Worker ──
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── Init ──
buildLineSelectors();
fetchAlerts();
setupAutoRefresh();