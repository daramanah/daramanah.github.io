// DarAmanah — SPA Router + Init

import { isAuthenticated } from './auth.js';

const routes = {
  '/login': () => import('./pages/login.js'),
  '/register': () => import('./pages/register.js'),
  '/dashboard': () => import('./pages/dashboard.js'),
  '/properties': () => import('./pages/properties.js'),
  '/profile': () => import('./pages/profile.js'),
};

const publicRoutes = ['/login', '/register'];

const appRoot = document.getElementById('app');

async function navigate() {
  const hash = window.location.hash || '';
  const path = hash.replace('#', '') || '/dashboard';

  // Auth guard
  if (!publicRoutes.includes(path) && !isAuthenticated()) {
    window.location.hash = '#/login';
    return;
  }

  // Already logged in, redirect away from login/register
  if (publicRoutes.includes(path) && isAuthenticated()) {
    window.location.hash = '#/dashboard';
    return;
  }

  const loader = routes[path];
  if (!loader) {
    window.location.hash = '#/dashboard';
    return;
  }

  // Show loading state
  if (!publicRoutes.includes(path)) {
    appRoot.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-brand-sand">
        <div class="spinner"></div>
      </div>`;
  }

  try {
    const page = await loader();
    appRoot.innerHTML = page.render();
    if (page.bind) await page.bind();
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

// Listen for hash changes
window.addEventListener('hashchange', navigate);

// Initial navigation
navigate();
