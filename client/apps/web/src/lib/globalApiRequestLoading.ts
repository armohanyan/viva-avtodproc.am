/**
 * Tracks in-flight browser `apiFetch` calls for a global top-bar loader.
 * Uses reference counting so parallel requests keep the bar until the last one finishes.
 */

const listeners = new Set<() => void>();
let inFlight = 0;

export function subscribeGlobalApiRequestLoading(onStoreChange: () => void): () => void {
	listeners.add(onStoreChange);
	return () => listeners.delete(onStoreChange);
}

export function getGlobalApiRequestLoadingSnapshot(): boolean {
	return inFlight > 0;
}

function emit(): void {
	for (const fn of listeners) fn();
}

/** Call once per physical request (paired with `endGlobalApiRequest` in `finally`). */
export function beginGlobalApiRequest(): void {
	if (typeof window === "undefined") return;
	const wasIdle = inFlight === 0;
	inFlight += 1;
	if (wasIdle) emit();
}

export function endGlobalApiRequest(): void {
	if (typeof window === "undefined") return;
	if (inFlight === 0) return;
	inFlight -= 1;
	if (inFlight === 0) emit();
}
