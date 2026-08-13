const tokenKey = 'planner_token';

export function getApiBase() {
  const stored = localStorage.getItem('planner_api_base');
  if (stored) return stored.replace(/\/+$/, '');
  if (window.electronAPI?.apiBase) return window.electronAPI.apiBase.replace(/\/+$/, '');
  return '';
}

export function setApiBase(value) {
  localStorage.setItem('planner_api_base', value || '');
}

export function getToken() {
  return localStorage.getItem(tokenKey);
}

export function setToken(token) {
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
}

export function clearSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem('planner_user');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const options = { method, headers: { ...headers } };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${getApiBase()}${path}`, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    if (response.status === 401) clearSession();
    const error = new Error(data.error || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const authApi = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  me: () => request('/api/me'),
};

export const subjectApi = {
  list: () => request('/api/subjects'),
  create: (payload) => request('/api/subjects', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/api/subjects/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/api/subjects/${id}`, { method: 'DELETE' }),
};

export const planApi = {
  list: () => request('/api/plans'),
  create: (plans) => request('/api/plans', { method: 'POST', body: { plans } }),
  update: (id, payload) => request(`/api/plans/${id}`, { method: 'PUT', body: payload }),
  patchStatus: (id, status) => request(`/api/plans/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => request(`/api/plans/${id}`, { method: 'DELETE' }),
};
