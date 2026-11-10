import axios from 'axios';

/** The only error type pages ever see. */
export class ApiError extends Error {
  constructor(message, status = 0, errors = null, code = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

const TOKEN_KEY = 'vt-token';
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(t) {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
export const API_ORIGIN = API_URL.replace(/\/api$/, '');

let http = null;
function client() {
  if (!http) {
    http = axios.create({ baseURL: API_URL, timeout: 40000 });
    http.interceptors.request.use((config) => {
      const t = tokenStore.get();
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });
  }
  return http;
}

const clean = (params) =>
  params
    ? Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      )
    : undefined;

function notifyAuthTrouble(status, body, url) {
  if (typeof window === 'undefined') return;
  const paused = status === 403 && body?.code === 'ACCOUNT_PAUSED';
  if ((status === 401 && !url.startsWith('/auth/login')) || paused)
    window.dispatchEvent(new CustomEvent('vt:signed-out', { detail: { paused } }));
}

function unwrap(status, body, url) {
  if (status >= 200 && status < 300 && body?.success) return body.data;
  notifyAuthTrouble(status, body, url);
  throw new ApiError(
    body?.message || 'Something went wrong. Try again.',
    status,
    body?.errors || null,
    body?.code || null,
  );
}

/**
 * One request. In mock builds (__VT_MOCK__ is the literal true) it is answered by the in-browser
 * mock; otherwise by the real API through Axios. Vite replaces __VT_MOCK__ at build time, so the
 * mock branch and its dynamic import are removed from real-backend bundles.
 */
export async function request(method, url, { params, data, files } = {}) {
  if (__VT_MOCK__) {
    const { handle } = await import('../mock/server.js');
    const res = await handle(method, url, {
      query: clean(params),
      body: data,
      files,
      token: tokenStore.get(),
    });
    return unwrap(res.status, res.body, url);
  }
  let payload = data;
  if (files) {
    payload = new FormData();
    Object.entries(data || {}).forEach(([k, v]) => v !== undefined && payload.append(k, v));
    Object.entries(files).forEach(([k, f]) => f && payload.append(k, f, f.name || `${k}.bin`));
  }
  try {
    const res = await client().request({ method, url, params: clean(params), data: payload });
    return unwrap(res.status, res.data, url);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.response) return unwrap(err.response.status, err.response.data, url);
    throw new ApiError('We could not reach the server. Check your connection and try again.', 0);
  }
}

/** Absolute URL for media the API returns as a path (e.g. /uploads/...). */
export function mediaUrl(url) {
  if (!url) return null;
  if (/^(https?:|data:|blob:|sample:|mock-upload:)/.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const get = (url, params) => request('get', url, { params });
export const post = (url, data) => request('post', url, { data });
export const put = (url, data) => request('put', url, { data });
export const patch = (url, data) => request('patch', url, { data });
export const del = (url) => request('delete', url);
