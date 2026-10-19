/**
 * Client-side auth helper.
 *
 * The server accepts two authentication methods on every API route:
 *   1. `Authorization: Bearer <token>` header  (token kept in localStorage)
 *   2. the `cp_session` httpOnly cookie
 *
 * Some in-app browsers / embedded webviews block cookies entirely, which used
 * to log users out between requests ("Unauthorized" in the chat). authFetch
 * always attaches the Bearer token so sessions survive those environments;
 * the cookie keeps working as a fallback wherever it is allowed.
 */

const TOKEN_KEY = 'cp_token'

export function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable — cookie path may still work */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** fetch() wrapper that attaches the Bearer token to every request. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || undefined)
  const token = getToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  // Token rejected server-side (expired/rotated) — drop it so the UI returns
  // to the signed-out state instead of looping on 401s.
  if (res.status === 401) clearToken()
  return res
}
