import { AuthUser } from '../types';

const base = '/api';
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function refresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(base + '/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (r) => {
      if (!r.ok) {
        accessToken = null;
        return null;
      }
      const d = await r.json();
      accessToken = d.accessToken;
      return accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function api<T = any>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.body && !(opts.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let r = await fetch(base + path, { ...opts, headers, credentials: 'include', signal: controller.signal });
    if (r.status === 401 && retry && path !== '/auth/refresh') {
      const t = await refresh();
      if (t) return api<T>(path, opts, false);
    }
    if (!r.ok) {
      const e = await r.json().catch(() => ({ error: { message: r.statusText } }));
      const err: any = new Error(e.error?.message || 'Request failed');
      err.code = e.error?.code;
      err.status = r.status;
      err.organizations = e.error?.organizations;
      throw err;
    }
    return r.status === 204 ? (undefined as T) : r.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function bootstrap() {
  return refresh();
}

export async function apiLogin(email: string, password: string, rememberMe = false): Promise<AuthUser> {
  const r = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, rememberMe })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err: any = new Error(d.error?.message || 'Identifiants invalides');
    err.code = d.error?.code;
    err.status = r.status;
    err.organizations = d.error?.organizations;
    throw err;
  }
  setAccessToken(d.accessToken);
  return d.user;
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
  organizationSlug = 'horizon'
): Promise<{ user: AuthUser; verificationCode?: string }> {
  const r = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password, organizationSlug })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err: any = new Error(d.error?.message || "Erreur lors de l'inscription");
    err.code = d.error?.code;
    err.status = r.status;
    throw err;
  }
  return d;
}

export async function apiVerify(code: string): Promise<boolean> {
  const r = await fetch(base + '/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err: any = new Error(d.error?.message || 'Code de vérification invalide');
    err.code = d.error?.code;
    err.status = r.status;
    throw err;
  }
  return true;
}

export async function apiGetMe(): Promise<AuthUser> {
  const d = await api<{ user: AuthUser }>('/auth/me');
  return d.user;
}
