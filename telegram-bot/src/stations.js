'use strict';

// Ported from main-site/script.js (STATION_NAMES / LINES / CODE_PREFIX_TO_LINE)
// so the bot stays consistent with the web app's station data.

const STATION_NAMES = {
    // East West Line
    EW1: 'Pasir Ris', EW2: 'Tampines', EW3: 'Simei', EW4: 'Tanah Merah',
    EW5: 'Bedok', EW6: 'Kembangan', EW7: 'Eunos', EW8: 'Paya Lebar',
    EW9: 'Aljunied', EW10: 'Kallang', EW11: 'Lavender', EW12: 'Bugis',
    EW13: 'City Hall', EW14: 'Raffles Place', EW15: 'Tanjong Pagar',
    EW16: 'Outram Park', EW17: 'Tiong Bahru', EW18: 'Redhill',
    EW19: 'Queenstown', EW20: 'Commonwealth', EW21: 'Buona Vista',
    EW22: 'Dover', EW23: 'Clementi', EW24: 'Jurong East',
    EW25: 'Chinese Garden', EW26: 'Lakeside', EW27: 'Boon Lay',
    EW28: 'Pioneer', EW29: 'Joo Koon', EW30: 'Gul Circle',
    EW31: 'Tuas Crescent', EW32: 'Tuas West Road', EW33: 'Tuas Link',
    // Changi Airport Branch
    CG1: 'Expo', CG2: 'Changi Airport',
    // North South Line
    NS1: 'Jurong East', NS2: 'Bukit Batok', NS3: 'Bukit Gombak',
    NS4: 'Choa Chu Kang', NS5: 'Yew Tee', NS7: 'Kranji',
    NS8: 'Marsiling', NS9: 'Woodlands', NS10: 'Admiralty',
    NS11: 'Sembawang', NS12: 'Canberra', NS13: 'Yishun',
    NS14: 'Khatib', NS15: 'Yio Chu Kang', NS16: 'Ang Mo Kio',
    NS17: 'Bishan', NS18: 'Braddell', NS19: 'Toa Payoh',
    NS20: 'Novena', NS21: 'Newton', NS22: 'Orchard',
    NS23: 'Somerset', NS24: 'Dhoby Ghaut', NS25: 'City Hall',
    NS26: 'Raffles Place', NS27: 'Marina Bay', NS28: 'Marina South Pier',
    // North East Line
    NE1: 'HarbourFront', NE3: 'Outram Park', NE4: 'Chinatown',
    NE5: 'Clarke Quay', NE6: 'Dhoby Ghaut', NE7: 'Little India',
    NE8: 'Farrer Park', NE9: 'Boon Keng', NE10: 'Potong Pasir',
    NE11: 'Woodleigh', NE12: 'Serangoon', NE13: 'Kovan',
    NE14: 'Hougang', NE15: 'Buangkok', NE16: 'Sengkang', NE17: 'Punggol', NE18: 'Punggol Coast',
    // Circle Line
    CC1: 'Dhoby Ghaut', CC2: 'Bras Basah', CC3: 'Esplanade',
    CC4: 'Promenade', CC5: 'Nicoll Highway', CC6: 'Stadium',
    CC7: 'Mountbatten', CC8: 'Dakota', CC9: 'Paya Lebar',
    CC10: 'MacPherson', CC11: 'Tai Seng', CC12: 'Bartley',
    CC13: 'Serangoon', CC14: 'Lorong Chuan', CC15: 'Bishan',
    CC16: 'Marymount', CC17: 'Caldecott', CC18: 'Bukit Brown', CC19: 'Botanic Gardens',
    CC20: 'Farrer Road', CC21: 'Holland Village', CC22: 'Buona Vista',
    CC23: 'one-north', CC24: 'Kent Ridge', CC25: 'Haw Par Villa',
    CC26: 'Pasir Panjang', CC27: 'Labrador Park', CC28: 'Telok Blangah',
    CC29: 'HarbourFront', CC30: 'Keppel', CC31: 'Cantonment', CC32: 'Prince Edward Road',
    CC33: 'Marina Bay', CC34: 'Bayfront',
    // Downtown Line
    DT1: 'Bukit Panjang', DT2: 'Cashew', DT3: 'Hillview', DT4: 'Hume',
    DT5: 'Beauty World', DT6: 'King Albert Park', DT7: 'Sixth Avenue',
    DT8: 'Tan Kah Kee', DT9: 'Botanic Gardens', DT10: 'Stevens',
    DT11: 'Newton', DT12: 'Little India', DT13: 'Rochor',
    DT14: 'Bugis', DT15: 'Promenade', DT16: 'Bayfront',
    DT17: 'Downtown', DT18: 'Telok Ayer', DT19: 'Chinatown',
    DT20: 'Fort Canning', DT21: 'Bencoolen', DT22: 'Jalan Besar',
    DT23: 'Bendemeer', DT24: 'Geylang Bahru', DT25: 'Mattar',
    DT26: 'MacPherson', DT27: 'Ubi', DT28: 'Kaki Bukit',
    DT29: 'Bedok North', DT30: 'Bedok Reservoir', DT31: 'Tampines West',
    DT32: 'Tampines', DT33: 'Tampines East', DT34: 'Upper Changi', DT35: 'Expo',
    DT36: 'Xilin', DT37: 'Sungei Bedok',
    // Thomson-East Coast Line
    TE1: 'Woodlands North', TE2: 'Woodlands', TE3: 'Woodlands South',
    TE4: 'Springleaf', TE5: 'Lentor', TE6: 'Mayflower',
    TE7: 'Bright Hill', TE8: 'Upper Thomson', TE9: 'Caldecott',
    TE10: 'Mount Pleasant', TE11: 'Stevens', TE12: 'Napier',
    TE13: 'Orchard Boulevard', TE14: 'Orchard', TE15: 'Great World',
    TE16: 'Havelock', TE17: 'Outram Park', TE18: 'Maxwell',
    TE19: 'Shenton Way', TE20: 'Marina Bay', TE21: 'Marina South',
    TE22: 'Gardens by the Bay', TE22A: 'Founders\' Memorial',
    TE23: 'Tanjong Rhu', TE24: 'Katong Park', TE25: 'Tanjong Katong',
    TE26: 'Marine Parade', TE27: 'Marine Terrace', TE28: 'Siglap',
    TE29: 'Bayshore', TE30: 'Bedok South', TE31: 'Sungei Bedok',
    // Bukit Panjang LRT
    BP1: 'Choa Chu Kang', BP2: 'South View', BP3: 'Keat Hong',
    BP4: 'Teck Whye', BP5: 'Phoenix', BP6: 'Bukit Panjang',
    BP7: 'Petir', BP8: 'Pending', BP9: 'Bangkit', BP10: 'Fajar',
    BP11: 'Segar', BP12: 'Jelapang', BP13: 'Senja',
    // Sengkang LRT
    SE1: 'Compassvale', SE2: 'Rumbia', SE3: 'Bakau', SE4: 'Kangkar', SE5: 'Ranggung',
    SW1: 'Cheng Lim', SW2: 'Farmway', SW3: 'Kupang', SW4: 'Thanggam',
    SW5: 'Fernvale', SW6: 'Layar', SW7: 'Tongkang', SW8: 'Renjong',
    // Punggol LRT
    PE1: 'Cove', PE2: 'Meridian', PE3: 'Coral Edge', PE4: 'Riviera',
    PE5: 'Kadaloor', PE6: 'Oasis', PE7: 'Damai',
    PW1: 'Sam Kee', PW2: 'Teck Lee', PW3: 'Punggol Point', PW4: 'Samudera',
    PW5: 'Nibong', PW6: 'Sumang', PW7: 'Soo Teck',
};

// Prefix -> the TrainLine code expected by PCDRealTime / PCDForecast.
const CODE_PREFIX_TO_LINE = {
    EW: { code: 'EWL', label: 'EW Line', color: '#009645' },
    CG: { code: 'CGL', label: 'Changi Ext', color: '#009645' },
    NS: { code: 'NSL', label: 'NS Line', color: '#d42e12' },
    NE: { code: 'NEL', label: 'NE Line', color: '#9900aa' },
    CC: { code: 'CCL', label: 'CC Line', color: '#fa9e0d' },
    DT: { code: 'DTL', label: 'DT Line', color: '#005ec4' },
    TE: { code: 'TEL', label: 'TE Line', color: '#9d5b25' },
    BP: { code: 'BPL', label: 'BP LRT', color: '#718573' },
    SE: { code: 'SLRT', label: 'SK LRT', color: '#718573' },
    SW: { code: 'SLRT', label: 'SK LRT', color: '#718573' },
    PE: { code: 'PLRT', label: 'PG LRT', color: '#718573' },
    PW: { code: 'PLRT', label: 'PG LRT', color: '#718573' },
};

// TrainServiceAlerts uses slightly different line codes for LRTs (STL/PTL, no CGL).
const ALERT_LINE_INFO = {
    EWL: { label: 'EW Line', color: '#009645' },
    NSL: { label: 'NS Line', color: '#d42e12' },
    NEL: { label: 'NE Line', color: '#9900aa' },
    CCL: { label: 'CC Line', color: '#fa9e0d' },
    DTL: { label: 'DT Line', color: '#005ec4' },
    TEL: { label: 'TE Line', color: '#9d5b25' },
    BPL: { label: 'BP LRT', color: '#718573' },
    STL: { label: 'SK LRT', color: '#718573' },
    PTL: { label: 'PG LRT', color: '#718573' },
};

const NAME_TO_CODES = {};
for (const [code, name] of Object.entries(STATION_NAMES)) {
    (NAME_TO_CODES[name] ??= []).push(code);
}

function stationName(code) {
    if (!code) return null;
    return STATION_NAMES[code.trim().toUpperCase()] || null;
}

function lineForCode(code) {
    const prefix = (code.match(/^[A-Za-z]+/) || [])[0]?.toUpperCase();
    return (prefix && CODE_PREFIX_TO_LINE[prefix]) || null;
}

function getAlertLineInfo(code) {
    return ALERT_LINE_INFO[code] || { label: code, color: '#888' };
}

// All distinct lines serving the same physical station (interchange detection).
function getStationLines(code) {
    const name = stationName(code);
    const allCodes = name ? (NAME_TO_CODES[name] || [code]) : [code];
    const seen = new Set();
    const lines = [];
    for (const c of allCodes) {
        const info = lineForCode(c);
        if (info && !seen.has(info.code)) {
            seen.add(info.code);
            lines.push(info);
        }
    }
    return lines;
}

// Resolve free-text (station code or partial name) to a list of candidate codes.
function findStations(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const upper = trimmed.toUpperCase();
    if (STATION_NAMES[upper]) return [upper];

    const results = new Set();
    for (const code of Object.keys(STATION_NAMES)) {
        if (code.startsWith(upper)) results.add(code);
    }

    const lower = trimmed.toLowerCase();
    for (const [code, name] of Object.entries(STATION_NAMES)) {
        if (name.toLowerCase().includes(lower)) results.add(code);
    }

    return [...results].slice(0, 20);
}

module.exports = {
    STATION_NAMES,
    CODE_PREFIX_TO_LINE,
    ALERT_LINE_INFO,
    NAME_TO_CODES,
    stationName,
    lineForCode,
    getAlertLineInfo,
    getStationLines,
    findStations,
};
