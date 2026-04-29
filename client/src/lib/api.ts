import { API_V1_PREFIX } from "src/constants/api";
import { getApiBaseUrl } from "src/lib/apiBaseUrl";
import { tryRefreshAccessToken } from "src/lib/authSession";
import { revokeClientSessionAfterAuthorizationFailure } from "src/lib/authUnauthorizedRecovery";
import { loadAccountSession } from "src/modules/accounts/account.session";

export { getApiBaseUrl } from "src/lib/apiBaseUrl";

/**
 * Absolute path under the API host, e.g. `/api/v1/health`.
 */
export function apiPath(path: string): string {
	const p = path.startsWith("/") ? path : `/${path}`;
	return `${getApiBaseUrl()}${p}`;
}

function isAbsoluteHttpUrl(path: string): boolean {
	return /^https?:\/\//i.test(path);
}

/** Final URL passed to `fetch` (applies API base unless `path` is already absolute). */
function resolveApiFetchUrl(path: string): string {
	return isAbsoluteHttpUrl(path) ? path : apiPath(path);
}

/** Versioned REST prefix as configured for the Viva backend. */
export function apiV1Path(suffix: string): string {
	const s = suffix.startsWith("/") ? suffix : `/${suffix}`;
	return apiPath(`${API_V1_PREFIX}${s}`);
}

export type ApiJsonInit = Omit<RequestInit, "body"> & {
	body?: unknown;
	/** Internal: avoid infinite refresh loop on 401. */
	_authRetry?: boolean;
};

export class ApiRequestError extends Error {
	readonly status: number;
	readonly bodyText?: string;

	constructor(message: string, status: number, bodyText?: string) {
		super(message);
		this.name = "ApiRequestError";
		this.status = status;
		this.bodyText = bodyText;
	}
}

type UiLang = "en" | "ru" | "am";

function getUiLang(): UiLang {
	if (typeof window === "undefined") return "am";
	const raw = window.localStorage.getItem("viva_lang");
	return raw === "en" || raw === "ru" || raw === "am" ? raw : "am";
}

function tr(key: string): string {
	const lang = getUiLang();
	const m: Record<UiLang, Record<string, string>> = {
		en: {
			errorEmailAlreadyInUse: "This email is already in use.",
			errorAuthRequired: "Authentication is required.",
			errorUnauthorized: "Your session expired or is invalid. Please sign in again.",
			errorForbidden: "You do not have permission to perform this action.",
			errorNotFound: "The requested resource was not found.",
			errorConflict: "This action conflicts with existing data.",
			errorBadRequest: "The request data is invalid. Please review and try again.",
			errorServerGeneric: "Server error. Please try again later.",
			errorInviteEmailRequired: "Email is required before sending an invitation.",
			invalidEmail: "Please enter a valid email.",
		},
		ru: {
			errorEmailAlreadyInUse: "Этот email уже используется.",
			errorAuthRequired: "Требуется авторизация.",
			errorUnauthorized: "Сессия истекла или недействительна. Войдите снова.",
			errorForbidden: "У вас нет прав для этого действия.",
			errorNotFound: "Запрошенный ресурс не найден.",
			errorConflict: "Действие конфликтует с существующими данными.",
			errorBadRequest: "Некорректные данные запроса. Проверьте и попробуйте снова.",
			errorServerGeneric: "Ошибка сервера. Попробуйте позже.",
			errorInviteEmailRequired: "Перед отправкой приглашения требуется email.",
			invalidEmail: "Введите корректный email.",
		},
		am: {
			errorEmailAlreadyInUse: "Այս էլ. հասցեն արդեն օգտագործվում է։",
			errorAuthRequired: "Պահանջվում է նույնականացում։",
			errorUnauthorized: "Սեսիան ավարտվել է կամ անվավեր է։ Խնդրում ենք նորից մուտք գործել։",
			errorForbidden: "Դուք իրավունք չունեք այս գործողությունը կատարելու։",
			errorNotFound: "Պահանջված տվյալը չի գտնվել։",
			errorConflict: "Գործողությունը հակասում է առկա տվյալներին։",
			errorBadRequest: "Հարցման տվյալները անվավեր են։ Ստուգեք և փորձեք կրկին։",
			errorServerGeneric: "Սերվերի սխալ։ Խնդրում ենք փորձել ավելի ուշ։",
			errorInviteEmailRequired: "Հրավեր ուղարկելուց առաջ պարտադիր է էլ. հասցեն։",
			invalidEmail: "Խնդրում ենք մուտքագրել վավեր էլ. հասցե։",
		},
	};
	return m[lang][key] ?? m.en[key] ?? key;
}

export function getApiErrorMessage(err: unknown): string {
	if (err instanceof ApiRequestError) {
		const status = err.status;
		const raw = (err.message || "").trim();
		const m = raw.toLowerCase();

		if (
			m.includes("email already in use") ||
			m.includes("email already registered") ||
			m.includes("this email is already registered") ||
			m.includes("this email is already in use")
		) {
			return tr("errorEmailAlreadyInUse");
		}
		if (
			m.includes("student email is required to send invitation") ||
			m.includes("instructor email is required to send invitation") ||
			m.includes("admin email is required to send invitation") ||
			m.includes("super admin email is required to send invitation") ||
			m.includes("email is required when invitetosystem is true")
		) {
			return tr("errorInviteEmailRequired");
		}
		if (m.includes("authentication required")) return tr("errorAuthRequired");
		if (m.includes("invalid or expired token")) return tr("errorUnauthorized");
		if (m.includes("invalid email")) return tr("invalidEmail");

		if (status === 401) return tr("errorUnauthorized");
		if (status === 403) return tr("errorForbidden");
		if (status === 404) return tr("errorNotFound");
		if (status === 409) return tr("errorConflict");
		if (status >= 500) return tr("errorServerGeneric");

		// For known validation-like 400 responses, prefer localized user-friendly text.
		if (
			status === 400 &&
			(m.includes("invalid request") ||
				m.includes("required") ||
				m.includes("must be") ||
				m.includes("invalid route parameters") ||
				m.includes("invalid query") ||
				m.includes("invalid request body"))
		) {
			return tr("errorBadRequest");
		}

		// Keep explicit backend business messages when they are already understandable.
		return raw || tr("errorBadRequest");
	}
	if (err instanceof Error) return err.message;
	return String(err);
}

/**
 * `fetch` against the API with JSON helpers. Uses `apiPath` for relative URLs.
 */
function shouldAttemptAuthRefreshRetry(path: string): boolean {
	const p = path.includes("?") ? path.slice(0, path.indexOf("?")) : path;
	return (
		typeof window !== "undefined" &&
		!p.endsWith("/auth/login") &&
		!p.endsWith("/auth/register") &&
		!p.endsWith("/auth/refresh") &&
		!p.endsWith("/auth/logout") &&
		!p.endsWith("/auth/verify-admin-mfa") &&
		!p.endsWith("/auth/resend-admin-mfa") &&
		!p.endsWith("/auth/setup-password") &&
		!p.endsWith("/auth/forgot-password") &&
		!p.endsWith("/auth/reset-password") &&
		!p.includes("/auth/student-invitation") &&
		!p.includes("/auth/password-reset")
	);
}

export async function apiFetch(path: string, init: ApiJsonInit = {}): Promise<Response> {
	const { body, headers, _authRetry, ...rest } = init;
	const hdrs = new Headers(headers);

	if (body !== undefined && body !== null && !(body instanceof FormData) && !hdrs.has("Content-Type")) {
		hdrs.set("Content-Type", "application/json");
	}

	const res = await fetch(resolveApiFetchUrl(path), {
		...rest,
		credentials: "include",
		headers: hdrs,
		body:
			body === undefined || body === null
				? undefined
				: body instanceof FormData || typeof body === "string"
					? (body as BodyInit)
					: JSON.stringify(body),
	});

	if (res.status === 401 && typeof window !== "undefined" && shouldAttemptAuthRefreshRetry(path)) {
		if (!_authRetry) {
			const refreshed = await tryRefreshAccessToken();
			if (refreshed === "rate_limited") {
				return res;
			}
			if (refreshed === "ok") {
				const retryHeaders = new Headers(headers);
				const token = loadAccountSession()?.accessToken;

				if (token) {
					retryHeaders.set("Authorization", `Bearer ${token}`);
				} else {
					retryHeaders.delete("Authorization");
				}

				return apiFetch(path, { ...init, _authRetry: true, headers: retryHeaders });
			}
		}
		revokeClientSessionAfterAuthorizationFailure();
	}

	return res;
}

/** Coalesce identical in-flight GET+JSON reads (e.g. React Strict Mode double-mount). */
const inFlightApiJson = new Map<string, Promise<unknown>>();

function apiJsonDedupeKey(path: string, init: ApiJsonInit): string | null {
	const method = (init.method ?? "GET").toUpperCase();
	if (method !== "GET") return null;
	if (init.body !== undefined && init.body !== null) return null;
	if (init.signal !== undefined) return null;
	const hdrs = new Headers(init.headers);
	const auth = hdrs.get("Authorization") ?? "";
	return `${resolveApiFetchUrl(path)}\u0000${auth}`;
}

async function apiJsonOnce<T>(path: string, init: ApiJsonInit = {}): Promise<T> {
	const res = await apiFetch(path, init);
	const text = await res.text();
	if (!res.ok) {
		let message = text || res.statusText;
		if (text) {
			try {
				const j = JSON.parse(text) as { message?: string };
				if (typeof j.message === "string" && j.message.trim()) {
					message = j.message.trim();
				}
			} catch {
				/* keep raw message */
			}
		}
		throw new ApiRequestError(message, res.status, text || undefined);
	}
	if (!text) {
		return undefined as T;
	}
	return JSON.parse(text) as T;
}

export async function apiJson<T>(path: string, init: ApiJsonInit = {}): Promise<T> {
	const key = apiJsonDedupeKey(path, init);
	if (!key) {
		return apiJsonOnce<T>(path, init);
	}
	const existing = inFlightApiJson.get(key);
	if (existing) {
		return existing as Promise<T>;
	}
	const created = apiJsonOnce<T>(path, init).finally(() => {
		inFlightApiJson.delete(key);
	});
	inFlightApiJson.set(key, created);
	return created;
}
