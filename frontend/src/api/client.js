const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(body.message || res.statusText);
    err.status = res.status;
    err.code = body.code;
    err.body = body;
    throw err;
  }
  return body;
}

export async function apiGet(path) {
  return request(path, { method: 'GET' });
}

export async function apiPost(path, data) {
  return request(path, {
    method: 'POST',
    body: data != null ? JSON.stringify(data) : undefined,
  });
}

export async function apiDelete(path) {
  return request(path, { method: 'DELETE' });
}

export async function apiPatch(path, data) {
  return request(path, {
    method: 'PATCH',
    body: data != null ? JSON.stringify(data) : undefined,
  });
}

// Auth
export function signup({ email, password }) {
  return apiPost('/auth/signup', { email, password });
}
export function login({ email, password }) {
  return apiPost('/auth/login', { email, password });
}
export function logout() {
  return apiPost('/auth/logout');
}
export function getMe() {
  return apiGet('/api/me');
}

// API keys
export function getApiKeys() {
  return apiGet('/api/keys');
}
export function createApiKey(label) {
  return apiPost('/api/keys', label ? { label } : {});
}
export function revokeApiKey(id) {
  return apiDelete(`/api/keys/${id}`);
}

// Dashboard analytics
export function getStats(range = '24h') {
  return apiGet(`/api/stats?range=${encodeURIComponent(range)}`);
}

export function getUsage() {
  return apiGet('/api/usage');
}

// Cached items
export function getItems({ search = '', page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('page', String(page));
  params.set('limit', String(limit));
  params.set('sort', sort);
  params.set('order', order);
  return apiGet(`/api/items?${params.toString()}`);
}

export function updateItemTtl(key, ttl) {
  return apiPatch(`/api/items/${encodeURIComponent(key)}`, { ttl });
}

export function deleteItem(key) {
  return apiDelete(`/api/items/${encodeURIComponent(key)}`);
}

export function clearAllItems() {
  return apiDelete('/api/items');
}
