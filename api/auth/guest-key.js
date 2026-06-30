import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GUEST_TTL_MS = 10 * 60 * 1000;

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Same-origin fetches sometimes arrive with no Origin header at all — that's
    // normal browser behaviour, not an attack. Only reject when Origin IS present
    // and NOT in the allowed list.
    const origin = req.headers.origin;
    if (origin) {
        const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
        if (!allowed.includes(origin)) {
            return res.status(403).json({ error: 'Origin not allowed' });
        }
    }

    const appId = (req.query.app || 'unknown').toString();
    const signingKey = crypto.randomBytes(32).toString('hex');
    const keyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + GUEST_TTL_MS).toISOString();

    try {
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/uwu_signing_keys`, {
            method: 'POST',
            headers: {
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                session_token: keyId,
                signing_key: signingKey,
                is_guest: true,
                app_id: appId,
                expires_at: expiresAt,
            }),
        });

        if (!insertRes.ok) {
            console.error('guest-key insert failed:', await insertRes.text());
            return res.status(500).json({ error: 'Failed to issue guest key' });
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json({ key_id: keyId, signing_key: signingKey });
    } catch (err) {
        console.error('guest-key error:', err);
        return res.status(500).json({ error: 'Failed to issue guest key' });
    }
}
