const SAFE_UPLOAD_PATH = /^\/upload\/[a-z0-9._-]+$/i;

function safeStaffUploadPathname(pathname: string): string | null {
  return SAFE_UPLOAD_PATH.test(pathname) ? pathname : null;
}

/**
 * Staff images live under `/upload/…` on the API. Stored URLs often include
 * `API_PUBLIC_URL` (e.g. the Vite panel on :5173). When the site runs on another
 * origin (e.g. Next on :3000), rewrite to a root-relative path so the active
 * dev server's `/upload` proxy serves the file.
 */
export function sameOriginStaffUploadUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const t = String(url).trim();
  if (!t) return null;

  let pathname: string;
  try {
    pathname = /^https?:\/\//i.test(t) ? new URL(t).pathname : new URL(t, "http://upload.local").pathname;
  } catch {
    return t;
  }

  const p = safeStaffUploadPathname(pathname);
  return p ?? t;
}
