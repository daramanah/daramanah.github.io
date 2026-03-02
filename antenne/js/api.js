// DarAmanah Antenne — API fetch wrapper (same pattern as client SPA)
const API_BASE = 'https://api.daramanah.family';

function getTokens() {
  return { access: localStorage.getItem('da_ant_access'), refresh: localStorage.getItem('da_ant_refresh') };
}
function setTokens(access, refresh) {
  if (access) localStorage.setItem('da_ant_access', access);
  if (refresh) localStorage.setItem('da_ant_refresh', refresh);
}
function clearTokens() {
  localStorage.removeItem('da_ant_access');
  localStorage.removeItem('da_ant_refresh');
  localStorage.removeItem('da_ant_user');
  localStorage.removeItem('da_ant_branch');
}

async function refreshAccessToken() {
  const { refresh } = getTokens();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }) });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) { setTokens(data.access_token, data.refresh_token || refresh); return true; }
    return false;
  } catch { return false; }
}

let isRefreshing = false, refreshPromise = null;

async function apiFetch(path, options = {}) {
  const { access } = getTokens();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (access) headers['Authorization'] = `Bearer ${access}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && !options._retried) {
    if (!isRefreshing) { isRefreshing = true; refreshPromise = refreshAccessToken(); }
    const refreshed = await refreshPromise;
    isRefreshing = false; refreshPromise = null;
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getTokens().access}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers, _retried: true });
    } else { clearTokens(); window.location.hash = '#/login'; throw new Error('Session expired'); }
  }
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export { apiFetch, getTokens, setTokens, clearTokens };
