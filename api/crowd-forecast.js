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
        const response = await fetch(
            `https://datamall2.mytransport.sg/ltaodataservice/PCDForecast?TrainLine=${encodeURIComponent(line)}`, {
                headers: {
                    AccountKey: apiKey,
                    Accept: 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`LTA API error: ${response.status}`);
        }

        const data = await response.json();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
        return res.status(200).json(data);
    } catch (err) {
        console.error('PCDForecast error:', err);
        return res.status(500).json({ error: err.message });
    }
}
