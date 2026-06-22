import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';
import { escapeHtml } from '../utils.js';

const TYPE_LABELS = { visit: 'Visite', cleaning: 'Ménage', repair: 'Réparation', garden: 'Jardin', meter_reading: 'Relevé compteurs', airbnb_prep: 'Préparation Airbnb', key_handover: 'Remise de clés', other: 'Autre' };
const STATUS_LABELS = { assigned: 'À faire', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée' };
const STATUS_COLORS = { assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-teal-100 text-teal-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800' };

function getPositionSilently(timeoutMs = 5000) {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ location_lat: pos.coords.latitude, location_lng: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

let missionId = null;

function render(params) {
  missionId = params?.id;
  const content = `
    <a href="#/missions" class="text-sm text-teal-700 hover:underline inline-flex items-center gap-1 mb-3">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Retour
    </a>
    <div id="md-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    <div id="md-content" class="hidden"></div>
    <div id="md-error" class="hidden text-center py-12">
      <p class="text-red-600 font-medium">Mission introuvable</p>
      <a href="#/missions" class="text-sm text-teal-700 mt-2 inline-block hover:underline">Retour aux missions</a>
    </div>`;
  return renderLayout(content);
}

async function bind(params) {
  bindLayoutEvents();
  missionId = params?.id;
  if (!missionId) { document.getElementById('md-error').classList.remove('hidden'); document.getElementById('md-loading').classList.add('hidden'); return; }

  try {
    const data = await apiFetch('/api/terrain/missions?status=assigned,in_progress,completed,validated');
    const mission = (data.missions || []).find(m => m.id === missionId);
    if (!mission) {
      document.getElementById('md-loading').classList.add('hidden');
      document.getElementById('md-error').classList.remove('hidden');
      return;
    }

    const typeLabel = TYPE_LABELS[mission.type] || mission.type || '';
    const statusLabel = STATUS_LABELS[mission.status] || mission.status;
    const statusColor = STATUS_COLORS[mission.status] || 'bg-gray-100 text-gray-700';
    const client = `${escapeHtml(mission.client_first_name || '')} ${escapeHtml(mission.client_last_name || '')}`.trim();
    const phone = mission.client_phone || '';
    const date = mission.scheduled_date ? new Date(mission.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    let action = '';
    if (mission.status === 'assigned') {
      action = `
        <div class="mt-6">
          <div id="start-error" class="hidden mb-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>
          <button id="btn-start" class="w-full bg-teal-600 text-white py-3 rounded-xl text-base font-semibold hover:bg-teal-700 transition">Démarrer la mission</button>
        </div>`;
    } else if (mission.status === 'in_progress') {
      action = `
        <div class="mt-6">
          <a href="#/missions/${missionId}/report" class="block w-full bg-teal-600 text-white py-3 rounded-xl text-base font-semibold hover:bg-teal-700 transition text-center">Remplir le rapport</a>
        </div>`;
    } else if (mission.status === 'completed' || mission.status === 'validated') {
      action = `
        <div class="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p class="text-sm font-medium text-green-700">Mission terminée</p>
        </div>`;
    }

    document.getElementById('md-content').innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <div>
          <span class="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">${escapeHtml(typeLabel)}</span>
          <h1 class="text-2xl font-serif font-bold text-brand-navy mt-2">${escapeHtml(mission.title || '')}</h1>
        </div>
        <span class="text-xs px-3 py-1 rounded-full font-semibold ${statusColor}">${escapeHtml(statusLabel)}</span>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 class="text-sm font-bold text-brand-navy mb-3">Bien</h2>
        <p class="text-sm text-gray-700">${escapeHtml(mission.property_name || '')}</p>
        <p class="text-sm text-gray-600 mt-1">${escapeHtml(mission.property_address || '')}</p>
        ${mission.property_city ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(mission.property_city)}</p>` : ''}
      </div>

      ${client || phone ? `
      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 class="text-sm font-bold text-brand-navy mb-3">Client</h2>
        ${client ? `<p class="text-sm text-gray-700">${client}</p>` : ''}
        ${phone ? `<a href="tel:${escapeHtml(phone)}" class="text-sm text-teal-700 hover:underline mt-1 inline-flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>${escapeHtml(phone)}</a>` : ''}
      </div>` : ''}

      ${date ? `
      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 class="text-sm font-bold text-brand-navy mb-1">Date prévue</h2>
        <p class="text-sm text-gray-700">${date}</p>
      </div>` : ''}

      ${mission.description ? `
      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 class="text-sm font-bold text-brand-navy mb-3">Description</h2>
        <p class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(mission.description)}</p>
      </div>` : ''}

      ${action}`;

    document.getElementById('md-loading').classList.add('hidden');
    document.getElementById('md-content').classList.remove('hidden');

    document.getElementById('btn-start')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-start');
      const errEl = document.getElementById('start-error');
      btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; errEl.classList.add('hidden');
      try {
        const body = await getPositionSilently();
        await apiFetch(`/api/terrain/missions/${missionId}/start`, { method: 'PUT', body: JSON.stringify(body) });
        window.location.hash = `#/missions/${missionId}/report`;
      } catch (err) {
        errEl.textContent = err.message || 'Erreur au démarrage de la mission';
        errEl.classList.remove('hidden');
        btn.disabled = false; btn.textContent = 'Démarrer la mission';
      }
    });
  } catch (err) {
    console.error('Mission detail error:', err);
    document.getElementById('md-loading').classList.add('hidden');
    document.getElementById('md-error').classList.remove('hidden');
  }
}

export { render, bind };
