import { API_V1_PREFIX } from "src/constants/api.constants";

/** Supported OAuth providers. Facebook is currently hidden in the auth UI but kept for API compatibility. */
export type SocialProvider = "google" | "facebook";

/**
 * Starts server-side OAuth (Google / Facebook on the API).
 * `next` is where the user lands after success (must be a relative path); refresh cookie is set on the API host.
 */
export function buildSocialAuthUrl(provider: SocialProvider, nextPath = "/auth/callback") {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  const ro = encodeURIComponent(window.location.origin);
  return `${API_V1_PREFIX}/auth/oauth/${provider}/start?next=${encodeURIComponent(next)}&ro=${ro}`;
}
