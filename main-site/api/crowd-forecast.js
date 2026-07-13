// PCDForecast represents a full day's forecast per line and doesn't change
// intraday, so we only need to fetch it once a day per line. This module-level
// cache persists across warm invocations of this serverless function, and
// in-flight promises are shared so concurrent requests for the same line
// during a cold cache don't each fire their own paginated LTA fetch.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map(); // line -> { data, fetchedAt }
const inFlight = new Map(); // line -> Promise<records>

const PAGE_DELAY_MS = 200; // spacing between paginated requests, to stay under LTA's burst rate limit
const MAX_RETRIES = 2;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// LTA's Apigee gateway reports burst/spike rate limiting as a 500 with a
// ratelimit fault code, not a 429 - so we can't rely on status alone.
function isRateLimitFault(status, body) {
    return status === 429 || /ratelimit|spikearrest|quotaviolation/i.test(body || '');
}

async function fetchPage(line, skip, apiKey) {
    const url = `https://datamall2.mytransport.sg/ltaodataservice/PCDForecast?TrainLine=${encodeURIComponent(line)}&$skip=${skip}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(url, {
            headers: {
                AccountKey: apiKey,
                Accept: 'application/json',
            },
        });

        if (response.ok) return response.json();

        const body = await response.text().catch(() => '');
        if (isRateLimitFault(response.status, body) && attempt < MAX_RETRIES) {
            await sleep(500 * 2 ** attempt); // 500ms, then 1000ms
            continue;
        }

        throw new Error(`LTA API error: ${response.status}${body ? ` - ${body}` : ''}`);
    }
}

async function fetchForecastFromLta(line, apiKey) {
    // PCDForecast returns up to 500 records per page; a full line can have
    // 30+ stations × 40 half-hour slots ≈ 1200+ records, so we paginate.
    const allRecords = [];
    let skip = 0;
    const PAGE_SIZE = 500;

    while (true) {
        const data = await fetchPage(line, skip, apiKey);
        const page = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
        allRecords.push(...page);

        if (page.length < PAGE_SIZE) break;
        skip += PAGE_SIZE;
        await sleep(PAGE_DELAY_MS);
    }

    return allRecords;
}

async function getForecast(line, apiKey) {
    const cached = cache.get(line);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.data;
    }

    let promise = inFlight.get(line);
    if (!promise) {
        promise = fetchForecastFromLta(line, apiKey)
            .then((data) => {
                cache.set(line, { data, fetchedAt: Date.now() });
                return data;
            })
            .finally(() => inFlight.delete(line));
        inFlight.set(line, promise);
    }
    return promise;
}

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        return res.status(200).end();
    }

    const apiKey = process.env.LTA_ACCOUNT_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'LTA API key not configured' });
    }

    const { line } = req.query;
    if (!line) {
        return res.status(400).json({ error: 'TrainLine parameter is required' });
    }

    try {
        const allRecords = await getForecast(line, apiKey);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
        return res.status(200).json({ value: allRecords });
    } catch (err) {
        console.error('PCDForecast error:', err);
        return res.status(500).json({ error: err.message });
    }
}
