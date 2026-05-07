let accessToken: string | null = null;

export function setAccessTokenInMemory(token: string | null): void {
	accessToken = token;
}

export function getAccessTokenInMemory(): string | null {
	return accessToken;
}

function decodeJwtPayloadExpMs(token: string): number | null {
	const parts = token.split(".");
	if (parts.length < 2) return null;
	const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
	const pad = "=".repeat((4 - (b64.length % 4)) % 4);
	try {
		const payload = JSON.parse(atob(b64 + pad)) as { exp?: number };
		if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;
		return payload.exp * 1000;
	} catch {
		return null;
	}
}

/** True when the in-memory JWT is still valid beyond `skewSec` (clock skew + latency). */
export function memoryAccessTokenLooksValid(skewSec = 45): boolean {
	const t = accessToken;
	if (!t) return false;
	const expMs = decodeJwtPayloadExpMs(t);
	if (expMs == null) return false;
	return expMs > Date.now() + skewSec * 1000;
}
