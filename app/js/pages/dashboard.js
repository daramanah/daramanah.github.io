// DarAmanah — Dashboard Home page

import { apiFetch } from '../api.js';
import { getCachedUser, fetchUser } from '../auth.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

function render() {
  const user = getCachedUser();
  const firstName = user?.first_name || '';

  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Bonjour ${firstName}</h1>
      <p class="text-gray-500 text-sm mt-1">Bienvenue sur votre espace DarAmanah</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-brand-navy" id="dash-properties-count">-</p>
            <p class="text-xs text-gray-500">Biens enregistrés</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-amber-50 text-brand-gold rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-brand-navy" id="dash-requests-count">-</p>
            <p class="text-xs text-gray-500">Demandes en cours</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-brand-navy" id="dash-sub-status">-</p>
            <p class="text-xs text-gray-500">Abonnement</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="text-lg font-bold text-brand-navy mb-4">Actions rapides</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/properties" class="card-hover flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-brand-gold transition">
          <div class="w-10 h-10 bg-brand-sand rounded-lg flex items-center justify-center text-brand-gold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-brand-navy">Voir mes biens</p>
            <p class="text-xs text-gray-500">Consulter et gérer vos propriétés</p>
          </div>
        </a>
        <a href="#/profile" class="card-hover flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-brand-gold transition">
          <div class="w-10 h-10 bg-brand-sand rounded-lg flex items-center justify-center text-brand-gold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-brand-navy">Mon profil</p>
            <p class="text-xs text-gray-500">Modifier vos informations</p>
          </div>
        </a>
      </div>
    </div>`;

  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();

  // Load data in parallel
  try {
    const [propsData, subsData, userData] = await Promise.all([
      apiFetch('/api/properties'),
      apiFetch('/api/payments/subscriptions'),
      fetchUser(),
    ]);

    const props = propsData.properties || [];
    document.getElementById('dash-properties-count').textContent = props.length;

    // Count active requests across all properties
    const activeRequests = props.reduce((sum, p) => sum + (p.active_requests || 0), 0);
    document.getElementById('dash-requests-count').textContent = activeRequests;

    const subs = subsData.subscriptions || [];
    const activeSub = subs.find(s => s.status === 'active');
    const subEl = document.getElementById('dash-sub-status');
    if (activeSub) {
      subEl.textContent = activeSub.plan.charAt(0).toUpperCase() + activeSub.plan.slice(1);
      subEl.classList.add('text-green-600');
    } else {
      subEl.textContent = 'Aucun';
      subEl.classList.add('text-gray-400');
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

export { render, bind };
