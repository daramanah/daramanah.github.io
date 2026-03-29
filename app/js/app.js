// DarAmanah — SPA Router + Init

import { isAuthenticated } from './auth.js';

// Static routes
const staticRoutes = {
  '/login': () => import('./pages/login.js'),
  '/register': () => import('./pages/register.js'),
  '/dashboard': () => import('./pages/dashboard.js'),
  '/properties': () => import('./pages/properties.js'),
  '/properties/new': () => import('./pages/property-new.js'),
  '/requests': () => import('./pages/requests.js'),
  '/requests/new': () => import('./pages/request-new.js'),
  '/payments': () => import('./pages/payments.js'),
  '/payments/success': () => import('./pages/payment-success.js'),
  '/payments/cancel': () => import('./pages/payment-cancel.js'),
  '/profile': () => import('./pages/profile.js'),
};

// Dynamic routes (order matters — more specific first)
const dynamicRoutes = [
  { pattern: /^\/requests\/([a-f0-9]+)$/, loader: () => import('./pages/request-detail.js'), paramName: 'id' },
  { pattern: /^\/properties\/([a-f0-9]+)$/, loader: () => import('./pages/property-detail.js'), paramName: 'id' },
];

const publicRoutes = ['/login', '/register'];

const appRoot = document.getElementById('app');

function parsePath() {
  const hash = window.location.hash || '';
  const full = hash.replace('#', '') || '/dashboard';
  // Separate path from query string
  const [path, query] = full.split('?');
  const params = {};
  if (query) {
    for (const part of query.split('&')) {
      const [k, v] = part.split('=');
      params[k] = decodeURIComponent(v || '');
    }
  }
  return { path, query: params };
}

function isPublic(path) {
  return publicRoutes.includes(path);
}

async function navigate() {
  const { path, query } = parsePath();

  // Auth guard
  if (!isPublic(path) && !isAuthenticated()) {
    window.location.hash = '#/login';
    return;
  }
  if (isPublic(path) && isAuthenticated()) {
    window.location.hash = '#/dashboard';
    return;
  }

  // Try static route first
  let loader = staticRoutes[path];
  let routeParams = {};

  // Try dynamic routes
  if (!loader) {
    for (const route of dynamicRoutes) {
      const match = path.match(route.pattern);
      if (match) {
        loader = route.loader;
        routeParams[route.paramName] = match[1];
        break;
      }
    }
  }

  if (!loader) {
    window.location.hash = '#/dashboard';
    return;
  }

  // Loading state
  if (!isPublic(path)) {
    appRoot.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-brand-sand">
        <div class="spinner"></div>
      </div>`;
  }

  try {
    const page = await loader();
    appRoot.innerHTML = page.render({ ...routeParams, ...query });
    if (page.bind) await page.bind({ ...routeParams, ...query });
  } catch (err) {
    console.error('Navigation error:', err);
    appRoot.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-brand-sand">
        <div class="text-center">
          <p class="text-red-600 font-medium">Erreur de chargement</p>
          <a href="#/dashboard" class="text-sm text-brand-gold mt-2 inline-block hover:underline">Retour au tableau de bord</a>
        </div>
      </div>`;
  }
}

window.addEventListener('hashchange', navigate);
navigate();
