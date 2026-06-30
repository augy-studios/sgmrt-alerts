// Shared server-side request signature verification for UwU Apps PWAs.
// Talks to Supabase over its PostgREST API directly (no @supabase/supabase-js
// dependency) using SUPABASE_URL / SUPABASE_SERVICE_KEY.
//
// This app has no login system, so only the guest-key (session_token = key_id)
// path is exercised; the Authorization: Bearer login-session path described in
// the shared spec is intentionally not implemented here.

import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FRESHNESS_MS = 30 * 1000;

function hmacHex(keyHex, message) {
    return crypto.createHmac('sha256', keyHex).update(message).digest('hex');
}

function timingSafeEqualHex(a, b) {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

async function rest(path, init = {}) {
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    });
}

// An empty object body ({} or '{}') counts as "no body" — Vercel sets req.body = {}
// for GET/DELETE requests even when nothing was sent, so this must match the client.
function bodyToString(body) {
    if (body == null) return null;
    const str = typeof body === 'string' ? body : JSON.stringify(body);
    return str === '{}' || str === '' ? null : str;
}

export async function verifySignedRequest(req) {
    const token = req.headers['x-request-token'];
    const ts = req.headers['x-request-ts'];
    const keyId = req.headers['x-key-id'];

    if (!token || !ts || !keyId) {
        return { valid: false, reason: 'missing signing headers' };
    }

    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > FRESHNESS_MS) {
        return { valid: false, reason: 'stale or invalid timestamp' };
    }

    const lookupRes = await rest(
        `uwu_signing_keys?session_token=eq.${encodeURIComponent(keyId)}&select=signing_key,expires_at`
    );
    if (!lookupRes.ok) return { valid: false, reason: 'signing key lookup failed' };
    const [row] = await lookupRes.json();
    if (!row) return { valid: false, reason: 'unknown key id' };
    if (new Date(row.expires_at).getTime() < Date.now()) {
        return { valid: false, reason: 'signing key expired' };
    }

    const method = req.method.toUpperCase();
    const path = req.url;
    const bodyStr = bodyToString(req.body);
    const bodyHash = bodyStr ? hmacHex(row.signing_key, bodyStr) : 'empty';
    const message = `${ts}:${method}:${path}:${bodyHash}`;
    const expected = hmacHex(row.signing_key, message);

    if (!timingSafeEqualHex(token, expected)) {
        return { valid: false, reason: 'signature mismatch' };
    }

    const usedRes = await rest(`uwu_used_request_tokens?token=eq.${encodeURIComponent(token)}&select=token`);
    if (usedRes.ok) {
        const usedRows = await usedRes.json();
        if (usedRows.length > 0) return { valid: false, reason: 'replayed token' };
    }

    await rest('uwu_used_request_tokens', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({ token, session_token: keyId, used_at: new Date().toISOString() }),
    });

    return { valid: true, reason: 'ok' };
}
