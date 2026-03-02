import { navItems } from './nav.js';
import { getCachedUser, getCachedBranch, logout } from '../auth.js';

const FLAGS = { MA: '\u{1F1F2}\u{1F1E6}', DZ: '\u{1F1E9}\u{1F1FF}', TN: '\u{1F1F9}\u{1F1F3}' };
const COUNTRY_NAMES = { MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie' };

function getCurrentRoute() {
  const hash = window.location.hash || '#/dashboard';
  return hash.replace('#/', '').split('?')[0].split('/')[0];
}

function renderLayout(contentHtml) {
  const user = getCachedUser();
  const branch = getCachedBranch();
  const route = getCurrentRoute();
  const initials = user ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') : '?';
  const displayName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';
  const flag = branch ? FLAGS[branch.country] || '' : '';
  const countryName = branch ? COUNTRY_NAMES[branch.country] || '' : '';

  const sidebarLinks = navItems.map(item => {
    const active = route === item.id ? 'active' : '';
    return `<a href="${item.hash}" class="sidebar-link ${active} flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-brand-sand transition">${item.icon}<span>${item.label}</span></a>`;
  }).join('');

  const bottomNavLinks = navItems.map(item => {
    const active = route === item.id ? 'active' : '';
    return `<a href="${item.hash}" class="bottom-nav-item ${active} flex flex-col items-center gap-1 text-xs text-gray-500">${item.icon}<span>${item.label}</span></a>`;
  }).join('');

  return `
  <aside class="sidebar hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex-col z-40">
    <div class="h-16 flex items-center px-6 border-b border-gray-100">
      <a href="/antenne/" class="text-xl font-serif font-bold text-brand-navy">DarAmanah</a>
      <span class="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full ml-1.5">Antenne</span>
    </div>
    ${branch ? `<div class="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-sm"><span class="text-lg">${flag}</span><span class="font-medium text-brand-navy">${countryName} — ${branch.city}</span></div>` : ''}
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">${sidebarLinks}</nav>
    <div class="p-4 border-t border-gray-100">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">${initials}</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">${displayName}</p>
          <p class="text-xs text-gray-500 truncate">${user?.email || ''}</p>
        </div>
        <button id="sidebar-logout" class="text-gray-400 hover:text-red-600 transition" title="Déconnexion">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>
    </div>
  </aside>
  <header class="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
    <div class="flex items-center gap-1.5">
      <span class="text-lg font-serif font-bold text-brand-navy">DarAmanah</span>
      <span class="text-[9px] bg-indigo-600 text-white px-1 py-0.5 rounded-full">Antenne</span>
      ${branch ? `<span class="text-sm ml-1">${flag}</span>` : ''}
    </div>
    <button id="mobile-logout" class="text-gray-400 hover:text-red-600 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg></button>
  </header>
  <main class="md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen bg-brand-sand">
    <div class="page-enter p-4 md:p-8 max-w-6xl mx-auto">${contentHtml}</div>
  </main>
  <nav class="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 z-40">${bottomNavLinks}</nav>`;
}

function bindLayoutEvents() {
  document.getElementById('sidebar-logout')?.addEventListener('click', () => logout());
  document.getElementById('mobile-logout')?.addEventListener('click', () => logout());
}

export { renderLayout, bindLayoutEvents };
