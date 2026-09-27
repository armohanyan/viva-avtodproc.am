const RETURN_PARAM = "returnTo";
const FOCUS_PARAM = "at";

const ALLOWED_PREFIXES = [
	"/dashboard/",
	"/instructor/",
	"/exam-tests",
	"/thematic-questions",
	"/road-signs",
];

function isSafeAppPath(raw: string): boolean {
	if (!raw.startsWith("/") || raw.startsWith("//")) return false;
	if (raw.includes("\\") || raw.includes("://")) return false;
	const path = raw.split("?")[0] ?? raw;
	return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

/** Current quiz URL, including which question was open, so comment Back can return here. */
export function withQuestionSessionReturn(detailPath: string, questionIndex: number): string {
	if (typeof window === "undefined") return detailPath;
	const current = new URL(window.location.href);
	if (Number.isInteger(questionIndex) && questionIndex >= 0) {
		current.searchParams.set(FOCUS_PARAM, String(questionIndex));
	}
	const returnTo = `${current.pathname}${current.search}`;
	const [path, query = ""] = detailPath.split("?");
	const params = new URLSearchParams(query);
	params.set(RETURN_PARAM, returnTo);
	const qs = params.toString();
	return qs ? `${path}?${qs}` : path;
}

export function readQuestionReturnTo(fallback: string): string {
	if (typeof window === "undefined") return fallback;
	const raw = new URLSearchParams(window.location.search).get(RETURN_PARAM);
	if (!raw || !isSafeAppPath(raw)) return fallback;
	return raw;
}

/** Keep the open question on the quiz URL so Back restores the same place. */
export function rememberQuizQuestionIndex(questionIndex: number): void {
	if (typeof window === "undefined") return;
	if (!Number.isInteger(questionIndex) || questionIndex < 0) return;
	const url = new URL(window.location.href);
	if (url.searchParams.get(FOCUS_PARAM) === String(questionIndex)) return;
	url.searchParams.set(FOCUS_PARAM, String(questionIndex));
	window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Back to the page that opened this question, or the section list if this tab has no history. */
export function leaveQuestionDetail(setLocation: (path: string) => void, fallback: string): void {
	if (typeof window !== "undefined" && window.history.length > 1) {
		window.history.back();
		return;
	}
	setLocation(readQuestionReturnTo(fallback));
}

/** Question index passed back from the comment page (`?at=`). */
export function readQuizFocusIndex(): number | null {
	if (typeof window === "undefined") return null;
	const raw = new URLSearchParams(window.location.search).get(FOCUS_PARAM);
	if (raw == null || !/^\d+$/.test(raw)) return null;
	return Number.parseInt(raw, 10);
}
