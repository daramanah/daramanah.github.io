// DarAmanah — API fetch wrapper with JWT auto-inject + auto-refresh

const API_BASE = 'https://api.daramanah.family';

function getTokens() {
  return {
    access: localStorage.getItem('da_access_token'),
    refresh: localStorage.getItem('da_refresh_token'),
  };
}

function setTokens(access, refresh) {
  if (access) localStorage.setItem('da_access_token', access);
  if (refresh) localStorage.setItem('da_refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('da_access_token');
  localStorage.removeItem('da_refresh_token');
  localStorage.removeItem('da_user');
}

async function refreshAccessToken() {
  const { refresh } = getTokens();
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) {
      setTokens(data.access_token, data.refresh_token || refresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

let isRefreshing = false;
let refreshPromise = null;

async function apiFetch(path, options = {}) {
  const { access } = getTokens();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (access) {
    headers['Authorization'] = `Bearer ${access}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // If 401, try refresh once
  if (res.status === 401 && !options._retried) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }
    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      const newAccess = getTokens().access;
      headers['Authorization'] = `Bearer ${newAccess}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers, _retried: true });
    } else {
      clearTokens();
      window.location.hash = '#/login';
      throw new Error('Session expired');
    }
  }

  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, ...data };
  }
  return data;
}

export { apiFetch, getTokens, setTokens, clearTokens, API_BASE };
