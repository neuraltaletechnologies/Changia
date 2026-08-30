'use client';

/**
 * Changia API client — talks to the Express backend at /api/v1.
 * Tokens are stored in localStorage (per the project's initial-stage choice)
 * and attached as a Bearer header on every request.
 */

import {
  emitActionError,
  emitActionStart,
  emitActionSuccess,
  nextActionId,
} from '@/lib/dashboard/action-feed';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

const TOKEN_KEY = 'changia_access_token';
const USER_KEY = 'changia_user';

export interface ApiUser {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'REVIEWER' | 'CAMPAIGN_MANAGER';
  status: string;
  avatarUrl?: string | null;
  organizationId: string | null;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// ─── Token / session helpers ─────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(accessToken: string, user: ApiUser) {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): ApiUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken()) && Boolean(getStoredUser());
}

/**
 * Bounce the browser to the landing page and auto-open the login modal, keeping
 * the current location so the modal can send the user back after they sign in.
 * There is no standalone /login route any more — all auth happens in the
 * navbar modals on the marketing site.
 */
function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  // Already on the landing page (modal will handle it) — don't loop.
  if (pathname === '/' || pathname === '/sw') return;
  const next = encodeURIComponent(pathname + search);
  window.location.assign(`/?auth=login&next=${next}`);
}

// ─── Request helpers ─────────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  /**
   * Suppress the bottom-right action toast for this write request. Use for
   * high-frequency, low-signal calls (e.g. marking notifications read).
   */
  silent?: boolean;
}

async function request<T>(
  path: string,
  { method = 'GET', body, auth = true, silent = false }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Announce write requests to the dashboard action feed so the toaster can
  // show "in progress → done / failed" in the bottom-right corner.
  const tracked = method !== 'GET' && auth && !silent;
  const actionId = tracked ? nextActionId() : null;
  if (actionId) emitActionStart(actionId, method, path);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    if (actionId) {
      emitActionError(actionId, method, path, 'Network error — check your connection.');
    }
    throw networkError;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // Expired/invalid token on an authenticated call: clear the stale session
    // and send the user to the landing page to sign in again. A 401 from an
    // unauthenticated call (e.g. wrong credentials on /auth/login) must NOT
    // redirect — the caller shows the error inline.
    if (response.status === 401 && auth) {
      clearSession();
      redirectToLogin();
    }
    const errorBody = payload as ApiErrorBody | null;
    const message =
      errorBody?.error?.message ?? 'Something went wrong. Please try again.';
    const code = errorBody?.error?.code ?? 'UNKNOWN_ERROR';
    if (actionId) emitActionError(actionId, method, path, message);
    throw new ApiClientError(response.status, code, message, errorBody?.error?.details);
  }

  if (actionId) emitActionSuccess(actionId, method, path);

  return payload as T;
}

/** For multipart/form-data uploads (e.g. completion-report photos) — the
 *  browser sets its own Content-Type with boundary, so FormData must never be
 *  JSON.stringify'd or given an explicit Content-Type header. */
async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const actionId = nextActionId();
  emitActionStart(actionId, 'POST', path);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (networkError) {
    emitActionError(actionId, 'POST', path, 'Network error — check your connection.');
    throw networkError;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      redirectToLogin();
    }
    const errorBody = payload as ApiErrorBody | null;
    const message = errorBody?.error?.message ?? 'Something went wrong. Please try again.';
    const code = errorBody?.error?.code ?? 'UNKNOWN_ERROR';
    emitActionError(actionId, 'POST', path, message);
    throw new ApiClientError(response.status, code, message, errorBody?.error?.details);
  }

  emitActionSuccess(actionId, 'POST', path);

  return payload as T;
}

// ─── API methods ─────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),

  postForm: <T>(path: string, formData: FormData) => requestForm<T>(path, formData),
};

// ─── Auth API ────────────────────────────────────────────────────────────────

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: ApiUser;
  };
}

export interface RegisterResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: ApiUser;
    organization: { id: string; name: string; slug: string };
  };
}

export async function loginRequest(email: string, password: string) {
  const result = await api.post<LoginResponse>(
    '/auth/login',
    { email, password },
    { auth: false }
  );
  return result.data;
}

export async function registerRequest(data: {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  termsAccepted: boolean;
}) {
  const result = await api.post<RegisterResponse>('/auth/register', data, {
    auth: false,
  });
  return result.data;
}

export async function meRequest() {
  const result = await api.get<{ success: boolean; data: { user: ApiUser } }>(
    '/auth/me'
  );
  return result.data.user;
}

export async function changePasswordRequest(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return api.post<{ success: boolean; message: string }>(
    '/auth/change-password',
    data
  );
}
