export type SocialProvider = "google" | "facebook" | "apple";

const AUTH_URL_BY_PROVIDER: Record<SocialProvider, string | undefined> = {
  google: import.meta.env.VITE_AUTH_GOOGLE_URL,
  facebook: import.meta.env.VITE_AUTH_FACEBOOK_URL,
  apple: import.meta.env.VITE_AUTH_APPLE_URL,
};

export function buildSocialAuthUrl(provider: SocialProvider) {
  const raw = AUTH_URL_BY_PROVIDER[provider]?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw, window.location.origin);
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const redirectTo = "/dashboard";
    url.searchParams.set("callbackUrl", callbackUrl);
    url.searchParams.set("redirectTo", redirectTo);
    return url.toString();
  } catch {
    return null;
  }
}
