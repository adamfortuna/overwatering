// Verify a GitHub Actions OIDC token (RS256 JWT from token.actions.githubusercontent.com), so a
// workflow in our repo can call the API without a stored secret.
const ISSUER = 'https://token.actions.githubusercontent.com';
type Jwk = JsonWebKey & { kid: string };
let jwks: { at: number; keys: Jwk[] } | null = null;

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

async function keys(): Promise<Jwk[]> {
	if (jwks && Date.now() - jwks.at < 3600_000) return jwks.keys;
	const r = await fetch(`${ISSUER}/.well-known/jwks`, { signal: AbortSignal.timeout(5000) });
	jwks = { at: Date.now(), keys: ((await r.json()) as { keys: Jwk[] }).keys };
	return jwks.keys;
}

/** True if `token` is a valid GitHub Actions OIDC token for `repository` with audience `aud`. */
export async function verifyGithubOidc(token: string, repository: string, aud: string): Promise<boolean> {
	const [h, p, sig] = token.split('.');
	if (!h || !p || !sig) return false;
	try {
		const header = JSON.parse(new TextDecoder().decode(b64url(h)));
		const claims = JSON.parse(new TextDecoder().decode(b64url(p)));
		if (header.alg !== 'RS256') return false;
		const jwk = (await keys()).find((k) => k.kid === header.kid);
		if (!jwk) return false;
		const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
		const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(sig), new TextEncoder().encode(`${h}.${p}`));
		const now = Date.now() / 1000;
		const audOk = Array.isArray(claims.aud) ? claims.aud.includes(aud) : claims.aud === aud;
		return ok && claims.iss === ISSUER && audOk && claims.repository === repository && claims.exp > now && (claims.nbf ?? 0) <= now + 60;
	} catch {
		return false;
	}
}
