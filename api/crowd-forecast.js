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
        // PCDForecast returns up to 500 records per page; a full line can have
        // 30+ stations × 40 half-hour slots ≈ 1200+ records, so we paginate.
        const allRecords = [];
        let skip = 0;
        const PAGE_SIZE = 500;

        while (true) {
            const url = `https://datamall2.mytransport.sg/ltaodataservice/PCDForecast?TrainLine=${encodeURIComponent(line)}&$skip=${skip}`;
            const response = await fetch(url, {
                headers: {
                    AccountKey: apiKey,
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`LTA API error: ${response.status}`);
            }

            const data = await response.json();
            const page = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
            allRecords.push(...page);

            if (page.length < PAGE_SIZE) break;
            skip += PAGE_SIZE;
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
        return res.status(200).json({ value: allRecords });
    } catch (err) {
        console.error('PCDForecast error:', err);
        return res.status(500).json({ error: err.message });
    }
}
