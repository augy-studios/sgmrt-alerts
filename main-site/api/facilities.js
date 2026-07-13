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

    try {
        const response = await fetch(
            'https://datamall2.mytransport.sg/ltaodataservice/v2/FacilitiesMaintenance', {
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
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json(data);
    } catch (err) {
        console.error('FacilitiesMaintenance error:', err);
        return res.status(500).json({
            error: err.message
        });
    }
}