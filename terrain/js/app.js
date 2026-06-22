// DarAmanah Terrain — SPA Router
import { isAuthenticated } from './auth.js';

const staticRoutes = {
  '/login': () => import('./pages/login.js'),
  '/missions': () => import('./pages/missions.js'),
};

const dynamicRoutes = []; // Phase 4 : /missions/:id, /missions/:id/report

const appRoot = document.getElementById('app');

function parsePath() {
  const hash = window.location.hash || '';
  const full = hash.replace('#', '') || '/missions';
  const [path, query] = full.split('?');
  const params = {};
  if (query) { for (const p of query.split('&')) { const [k, v] = p.split('='); params[k] = decodeURIComponent(v || ''); } }
  return { path, query: params };
}

async function navigate() {
  const { path, query } = parsePath();

  if (path !== '/login' && !isAuthenticated()) { window.location.hash = '#/login'; return; }
  if (path === '/login' && isAuthenticated()) { window.location.hash = '#/missions'; return; }

  let loader = staticRoutes[path];
  let routeParams = {};
  if (!loader) {
    for (const route of dynamicRoutes) {
      const match = path.match(route.pattern);
      if (match) { loader = route.loader; routeParams[route.paramName] = match[1]; break; }
    }
  }
  if (!loader) { window.location.hash = '#/missions'; return; }

  if (path !== '/login') {
    appRoot.innerHTML = '<div class="flex items-center justify-center min-h-screen bg-brand-sand"><div class="spinner"></div></div>';
  }

  try {
    const page = await loader();
    appRoot.innerHTML = page.render({ ...routeParams, ...query });
    if (page.bind) await page.bind({ ...routeParams, ...query });
  } catch (err) {
    console.error('Navigation error:', err);
    appRoot.innerHTML = '<div class="flex items-center justify-center min-h-screen bg-brand-sand"><div class="text-center"><p class="text-red-600 font-medium">Erreur de chargement</p><a href="#/missions" class="text-sm text-teal-700 mt-2 inline-block hover:underline">Retour</a></div></div>';
  }
}

window.addEventListener('hashchange', navigate);
navigate();
