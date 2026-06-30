// Shared client-side request signing for UwU Apps PWAs (Type B / guest-key sites).
// Persistent (localStorage) storage is supported for parity with Type A (login) sites
// that use this same library, but this app only ever uses sessionStorage guest keys.

const LS_KEY = 'uwu_signing_key';
const SS_KEY = 'uwu_signing_key';

export function storeSigningKey(signingKey, keyId, persistent = false) {
    const payload = JSON.stringify({ signingKey, keyId });
    if (persistent) {
        localStorage.setItem(LS_KEY, payload);
        sessionStorage.removeItem(SS_KEY);
    } else {
        sessionStorage.setItem(SS_KEY, payload);
        localStorage.removeItem(LS_KEY);
    }
}

export function getSigningKey() {
    for (const [storage, key] of [[localStorage, LS_KEY], [sessionStorage, SS_KEY]]) {
        const raw = storage.getItem(key);
        if (!raw) continue;
        try {
            return JSON.parse(raw);
        } catch {
            storage.removeItem(key);
        }
    }
    return null;
}

export function clearSigningKey() {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
}

export async function initGuestKey(appId) {
    if (getSigningKey()) return;
    const res = await fetch(`/api/auth/guest-key?app=${encodeURIComponent(appId)}`);
    if (!res.ok) throw new Error(`initGuestKey: failed to obtain guest signing key (${res.status})`);
    const data = await res.json();
    storeSigningKey(data.signing_key, data.key_id, false);
}

async function hmacHex(keyHex, message) {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        'raw', enc.encode(keyHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// An empty object body ({} or '{}') counts as "no body" — must match server treatment exactly.
function bodyToString(body) {
    if (body == null) return null;
    const str = typeof body === 'string' ? body : JSON.stringify(body);
    return str === '{}' || str === '' ? null : str;
}

export async function signedFetch(url, options = {}) {
    const key = getSigningKey();
    if (!key) {
        throw new Error('signedFetch: no signing key available — call initGuestKey() (or log in) before making API calls');
    }

    const method = (options.method || 'GET').toUpperCase();
    const u = new URL(url, location.origin);
    const path = u.pathname + u.search;
    const ts = Date.now().toString();

    const bodyStr = bodyToString(options.body);
    const bodyHash = bodyStr ? await hmacHex(key.signingKey, bodyStr) : 'empty';

    const message = `${ts}:${method}:${path}:${bodyHash}`;
    const token = await hmacHex(key.signingKey, message);

    const headers = new Headers(options.headers || {});
    headers.set('X-Request-Token', token);
    headers.set('X-Request-TS', ts);
    headers.set('X-Key-ID', key.keyId);

    return fetch(url, { ...options, headers });
}
