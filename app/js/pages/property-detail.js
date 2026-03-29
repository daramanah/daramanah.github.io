// DarAmanah — Property Detail page

import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const TYPE_LABELS = { villa: 'Villa', apartment: 'Appartement', house: 'Maison', riad: 'Riad', land: 'Terrain', commercial: 'Commercial', other: 'Autre' };
const COUNTRY_FLAGS = { MA: '\u{1F1F2}\u{1F1E6}', DZ: '\u{1F1E9}\u{1F1FF}', TN: '\u{1F1F9}\u{1F1F3}' };
const STATUS_LABELS = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée', invoiced: 'Facturée', cancelled: 'Annulée' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' };

let propertyId = null;

function render(params) {
  propertyId = params?.id;
  const content = `
    <div class="mb-6">
      <a href="#/properties" class="text-sm text-brand-gold hover:underline inline-flex items-center gap-1 mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Retour aux biens
      </a>
      <div id="detail-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
      <div id="detail-content" class="hidden"></div>
      <div id="detail-error" class="hidden text-center py-12">
        <p class="text-red-600 font-medium">Bien introuvable</p>
        <a href="#/properties" class="text-sm text-brand-gold mt-2 inline-block hover:underline">Retour aux biens</a>
      </div>
    </div>`;
  return renderLayout(content);
}

async function bind(params) {
  bindLayoutEvents();
  propertyId = params?.id;
  if (!propertyId) { document.getElementById('detail-error').classList.remove('hidden'); return; }

  try {
    const [propData, reqsData, subsData] = await Promise.all([
      apiFetch(`/api/properties/${propertyId}`),
      apiFetch(`/api/requests?property_id=${propertyId}`),
      apiFetch('/api/payments/subscriptions'),
    ]);

    const p = propData.property;
    const requests = reqsData.requests || [];
    // Find subscription matching this property's service area
    const sub = (subsData.subscriptions || []).find(s =>
      (p.service_area_id && s.service_area_id === p.service_area_id) || s.property_id === propertyId
    );

    const flag = COUNTRY_FLAGS[p.country] || '';
    const typeName = TYPE_LABELS[p.type] || p.type || 'Bien';
    const surface = p.surface_m2 ? `${p.surface_m2} m\u00B2` : '';
    const rooms = p.rooms ? `${p.rooms} pi\u00E8ces` : '';
    const details = [typeName, surface, rooms].filter(Boolean).join(' \u00B7 ');

    const requestCards = requests.length > 0 ? requests.map(r => `
      <a href="#/requests/${r.id}" class="block p-4 border border-gray-200 rounded-lg card-hover">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-semibold text-brand-navy">${r.title || r.type || 'Demande'}</span>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABELS[r.status] || r.status}</span>
        </div>
        <p class="text-xs text-gray-500">${new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
      </a>`).join('') : '<p class="text-sm text-gray-400 text-center py-4">Aucune demande pour ce bien</p>';

    const cityName = p.service_area_city || p.city || '';
    const subBanner = sub
      ? `<div class="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <span class="w-2 h-2 bg-green-500 rounded-full"></span>
          <span class="text-sm text-green-700 font-medium">Abonnement ${(sub.plan || '').charAt(0).toUpperCase() + (sub.plan || '').slice(1)} actif</span>
        </div>`
      : `<div class="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <p class="text-sm text-amber-800">Aucun abonnement actif pour ${cityName}. Souscrivez pour planifier des visites r\u00e9guli\u00e8res.</p>
          <a href="#/payments" class="text-sm bg-brand-gold text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition whitespace-nowrap">Souscrire pour ${cityName}</a>
        </div>`;

    document.getElementById('detail-content').innerHTML = `
      <!-- Property Header -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-serif font-bold text-brand-navy">${p.name}</h1>
          <p class="text-gray-500 text-sm mt-1">${flag} ${cityName} ${p.address_text ? '\u00b7 ' + p.address_text : ''}</p>
        </div>
        <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
          <span class="w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}"></span>
          ${p.status === 'active' ? 'Actif' : p.status || 'Actif'}
        </span>
      </div>
      ${subBanner}

      <!-- Info Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h2 class="text-sm font-bold text-brand-navy mb-3">Informations</h2>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Type</span><span class="font-medium">${typeName}</span></div>
            ${surface ? `<div class="flex justify-between"><span class="text-gray-500">Surface</span><span class="font-medium">${surface}</span></div>` : ''}
            ${rooms ? `<div class="flex justify-between"><span class="text-gray-500">Pi\u00E8ces</span><span class="font-medium">${rooms}</span></div>` : ''}
            <div class="flex justify-between"><span class="text-gray-500">Zone de service</span><span class="font-medium">${p.service_area_city || p.city || '-'}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Pays</span><span class="font-medium">${flag} ${p.country || '-'}</span></div>
          </div>
          ${p.description ? `<p class="text-sm text-gray-500 mt-4 pt-3 border-t border-gray-100">${p.description}</p>` : ''}
        </div>

        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h2 class="text-sm font-bold text-brand-navy mb-3">Abonnement</h2>
          ${sub ? `
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">Formule</span><span class="font-medium capitalize">${sub.plan}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Statut</span><span class="font-medium ${sub.status === 'active' ? 'text-green-600' : 'text-gray-500'}">${sub.status === 'active' ? 'Actif' : sub.status}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Montant</span><span class="font-medium">${(sub.price_monthly / 100).toFixed(0)}\u20AC/mois</span></div>
            </div>
          ` : `
            <p class="text-sm text-gray-400">Aucun abonnement actif</p>
            <a href="#/payments" class="inline-block mt-3 text-sm text-brand-gold hover:underline">Souscrire un abonnement</a>
          `}
        </div>
      </div>

      <!-- Requests -->
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-brand-navy">Demandes (${requests.length})</h2>
          <a href="#/requests/new?property=${propertyId}" class="text-sm bg-brand-navy text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition">
            Nouvelle demande
          </a>
        </div>
        <div class="space-y-3">${requestCards}</div>
      </div>`;

    document.getElementById('detail-loading').classList.add('hidden');
    document.getElementById('detail-content').classList.remove('hidden');
  } catch (err) {
    console.error('Property detail error:', err);
    document.getElementById('detail-loading').classList.add('hidden');
    document.getElementById('detail-error').classList.remove('hidden');
  }
}

export { render, bind };
