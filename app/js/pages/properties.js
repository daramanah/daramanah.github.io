// DarAmanah — Properties list page

import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const TYPE_LABELS = {
  villa: 'Villa',
  apartment: 'Appartement',
  house: 'Maison',
  riad: 'Riad',
  land: 'Terrain',
  commercial: 'Commercial',
  other: 'Autre',
};

const COUNTRY_FLAGS = { MA: '🇲🇦', DZ: '🇩🇿', TN: '🇹🇳' };

function renderPropertyCard(p) {
  const flag = COUNTRY_FLAGS[p.country] || '';
  const typeName = TYPE_LABELS[p.type] || p.type || 'Bien';
  const surface = p.surface_m2 ? `${p.surface_m2} m²` : '';
  const rooms = p.rooms ? `${p.rooms} pièces` : '';
  const details = [typeName, surface, rooms].filter(Boolean).join(' · ');
  const activeReqs = p.active_requests || 0;

  return `
  <a href="#/properties/${p.id}" class="block bg-white rounded-xl border border-gray-200 p-5 card-hover cursor-pointer">
    <div class="flex items-start justify-between mb-3">
      <div>
        <h3 class="font-bold text-brand-navy">${p.name}</h3>
        <p class="text-sm text-gray-500 mt-0.5">${flag} ${p.service_area_city || p.city || ''} ${p.address_text ? '· ' + p.address_text : ''}</p>
      </div>
      ${activeReqs > 0 ? `<span class="bg-amber-100 text-brand-gold text-xs font-semibold px-2 py-1 rounded-full">${activeReqs} demande${activeReqs > 1 ? 's' : ''}</span>` : ''}
    </div>
    <p class="text-xs text-gray-400 mb-4">${details}</p>
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1 text-xs ${p.status === 'active' ? 'text-green-600' : 'text-gray-400'}">
        <span class="w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}"></span>
        ${p.status === 'active' ? 'Actif' : p.status === 'archived' ? 'Archivé' : p.status || 'Actif'}
      </span>
    </div>
  </a>`;
}

function render() {
  const content = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-serif font-bold text-brand-navy">Mes Biens</h1>
        <p class="text-gray-500 text-sm mt-1">Gérez vos propriétés au Maghreb</p>
      </div>
      <a href="#/properties/new" class="text-sm bg-brand-navy text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition inline-flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
        Ajouter un bien
      </a>
    </div>

    <div id="properties-loading" class="flex items-center justify-center py-12">
      <div class="spinner"></div>
    </div>

    <div id="properties-empty" class="hidden text-center py-12">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
      </div>
      <p class="text-gray-500 font-medium">Aucun bien enregistré</p>
      <p class="text-sm text-gray-400 mt-1">Contactez-nous pour ajouter votre premier bien</p>
    </div>

    <div id="properties-list" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4"></div>`;

  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();

  try {
    const data = await apiFetch('/api/properties');
    const properties = data.properties || [];

    document.getElementById('properties-loading').classList.add('hidden');

    if (properties.length === 0) {
      document.getElementById('properties-empty').classList.remove('hidden');
    } else {
      const list = document.getElementById('properties-list');
      list.innerHTML = properties.map(renderPropertyCard).join('');
      list.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Properties load error:', err);
    document.getElementById('properties-loading').innerHTML =
      '<p class="text-red-600 text-sm">Erreur de chargement</p>';
  }
}

export { render, bind };
