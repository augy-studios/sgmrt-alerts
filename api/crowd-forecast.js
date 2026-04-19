export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        return res.status(200).end();
    }

    const apiKey = process.env.LTA_ACCOUNT_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: 'LTA API key not configured'
        });
    }

    const {
        line
    } = req.query;
    if (!line) {
        return res.status(400).json({
            error: 'TrainLine parameter is required'
        });
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
            const body = await response.text().catch(() => '');
            console.error(`PCDForecast LTA error ${response.status}:`, body);
            throw new Error(`LTA API error: ${response.status} — ${body}`);
        }

        const data = await response.json();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(data);
    } catch (err) {
        console.error('PCDForecast error:', err);
        return res.status(500).json({
            error: err.message
        });
    }
}