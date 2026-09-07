/**
 * apiClient.ts — Server-side API client untuk novesia-admin
 * Memanggil novesia-api menggunakan ADMIN_API_KEY di header.
 * Digunakan di semua Next.js API routes (server-side only).
 */

const API_BASE = (process.env.NOVESIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.novesia.cc').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'novesia_admin_api_key_2026_change_in_prod';

function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-admin-key': ADMIN_API_KEY,
  };
}

async function safeFetch(url: string, options: RequestInit, pathWithParams: string): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1')) {
      const fallbackUrl = `https://api.novesia.cc${pathWithParams}`;
      try {
        console.warn(`[apiClient] Local API offline (${url}). Fallback ke live API: ${fallbackUrl}`);
        return await fetch(fallbackUrl, options);
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  let relativePath = path;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) relativePath += `?${qs}`;
  }

  const url = `${API_BASE}${relativePath}`;

  const res = await safeFetch(url, {
    method: 'GET',
    headers: adminHeaders(),
    cache: 'no-store',
  }, relativePath);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: adminHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }, path);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }, path);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }, path);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: adminHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }, path);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Upload multipart/form-data (untuk upload cover, dll)
 */
export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  // Jangan set Content-Type — biarkan fetch set boundary otomatis
  const headers: Record<string, string> = {
    'x-admin-key': ADMIN_API_KEY,
  };

  const res = await safeFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  }, path);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}
