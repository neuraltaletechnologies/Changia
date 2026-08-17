'use client';

/**
 * Changia API client — talks to the Express backend at /api/v1.
 * Tokens are stored in localStorage (per the project's initial-stage choice)
 * and attached as a Bearer header on every request.
 */

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
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'CAMPAIGN_MANAGER';
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

// ─── Request helpers ─────────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {}
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // Expired/invalid token: clear the stale session so the auth guard can
    // redirect the user back to login.
    if (response.status === 401) {
      clearSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    const errorBody = payload as ApiErrorBody | null;
    const message =
      errorBody?.error?.message ?? 'Something went wrong. Please try again.';
    const code = errorBody?.error?.code ?? 'UNKNOWN_ERROR';
    throw new ApiClientError(response.status, code, message, errorBody?.error?.details);
  }

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
