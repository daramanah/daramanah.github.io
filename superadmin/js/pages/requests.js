import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const STATUS_LABELS = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée', invoiced: 'Facturée', cancelled: 'Annulée' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' };

let allRequests = [];
let admins = [];
let showStale = false;

function renderCard(r) {
  const claimed = r.claimed_by
    ? `<span class="text-xs text-gray-500">Pris par <strong>${r.claimed_by_first_name || '—'} ${r.claimed_by_last_name || ''}</strong></span>`
    : `<span class="text-xs text-amber-600 font-medium">Non prise en charge</span>`;
  const releaseBadge = r.release_requested
    ? `<span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium">Release demandé</span>`
    : '';
  return `<div class="bg-white rounded-xl border border-gray-200 p-4">
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-brand-navy text-sm truncate">${r.title || r.type}</h3>
        <p class="text-xs text-gray-500 mt-0.5">${r.client_first_name || ''} ${r.client_last_name || ''} — ${r.property_name || ''} (${r.property_city || '—'}, ${r.property_country || '—'})</p>
      </div>
      <span class="ml-3 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABELS[r.status] || r.status}</span>
    </div>
    <div class="flex items-center flex-wrap gap-2 text-xs text-gray-400 mb-3">
      <span>${new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
      ${r.priority === 'urgent' ? '<span class="text-red-500 font-semibold">Urgent</span>' : ''}
      ${claimed}
      ${releaseBadge}
    </div>
    <div class="flex gap-2">
      <button data-reassign="${r.id}" data-country="${r.property_country || ''}" class="reassign-btn text-xs px-3 py-1.5 rounded-lg bg-brand-gold text-white hover:opacity-90">Réassigner</button>
      <a href="#/history/${r.id}" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Historique</a>
    </div>
  </div>`;
}

function render(params) {
  showStale = params?.tab === 'stale';
  const heading = showStale ? 'Demandes non prises en charge > 24h' : 'Toutes les demandes';
  const content = `
    <div class="mb-6 flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-serif font-bold text-brand-navy">${heading}</h1>
        <p class="text-gray-500 text-sm mt-1">Vue globale cross-pays avec actions de réassignation.</p>
      </div>
      <div class="flex gap-2">
        <a href="#/requests" class="px-3 py-1.5 rounded-lg text-xs font-medium ${!showStale ? 'bg-brand-gold text-white' : 'bg-white border border-gray-200 text-gray-600'}">Toutes</a>
        <a href="#/requests?tab=stale" class="px-3 py-1.5 rounded-lg text-xs font-medium ${showStale ? 'bg-brand-gold text-white' : 'bg-white border border-gray-200 text-gray-600'}">Stale &gt;24h</a>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 mb-6">
      <select id="filter-country" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200">
        <option value="">Tous pays</option>
        <option value="MA">Maroc</option>
        <option value="DZ">Algérie</option>
        <option value="TN">Tunisie</option>
      </select>
      <select id="filter-status" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200">
        <option value="">Tous statuts</option>
        ${Object.entries(STATUS_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="filter-claim" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200">
        <option value="">Claim : tous</option>
        <option value="unclaimed">Non prises</option>
        <option value="claimed">Prises</option>
        <option value="release">Release demandé</option>
      </select>
    </div>

    <div id="req-loading" class="flex justify-center py-8"><div class="spinner"></div></div>
    <div id="req-empty" class="hidden text-center py-10 text-gray-500 text-sm">Aucune demande</div>
    <div id="req-list" class="hidden space-y-3"></div>

    <div id="reassign-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-5 max-w-md w-full">
        <h3 class="text-base font-bold text-brand-navy mb-2">Réassigner la demande</h3>
        <p class="text-sm text-gray-600 mb-3">Sélectionner admin destinataire (même pays que la demande).</p>
        <select id="reassign-target" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></select>
        <div class="flex justify-end gap-2 mt-3">
          <button id="reassign-cancel" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button id="reassign-submit" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Confirmer</button>
        </div>
      </div>
    </div>`;
  return renderLayout(content);
}

function fillNode(el, htmlString) {
  el.replaceChildren();
  el.insertAdjacentHTML('beforeend', htmlString);
}

function applyFilters() {
  const country = document.getElementById('filter-country')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const claim = document.getElementById('filter-claim')?.value || '';

  let filtered = allRequests;
  if (country) filtered = filtered.filter(r => (r.property_country || '') === country);
  if (status) filtered = filtered.filter(r => r.status === status);
  if (claim === 'unclaimed') filtered = filtered.filter(r => !r.claimed_by);
  if (claim === 'claimed') filtered = filtered.filter(r => !!r.claimed_by);
  if (claim === 'release') filtered = filtered.filter(r => !!r.release_requested);

  document.getElementById('req-loading').classList.add('hidden');
  const list = document.getElementById('req-list');
  if (filtered.length === 0) {
    document.getElementById('req-empty').classList.remove('hidden');
    list.classList.add('hidden');
  } else {
    document.getElementById('req-empty').classList.add('hidden');
    fillNode(list, filtered.map(renderCard).join(''));
    list.classList.remove('hidden');
    list.querySelectorAll('.reassign-btn').forEach(btn => {
      btn.addEventListener('click', () => openReassignModal(btn.dataset.reassign, btn.dataset.country));
    });
  }
}

let currentReassignId = null;
function openReassignModal(requestId, country) {
  currentReassignId = requestId;
  const targetSelect = document.getElementById('reassign-target');
  const countryAdmins = admins.filter(a => a.branch_country === country);
  targetSelect.replaceChildren();
  if (countryAdmins.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Aucun admin disponible pour ce pays';
    targetSelect.appendChild(opt);
  } else {
    for (const a of countryAdmins) {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.first_name || ''} ${a.last_name || ''} (${a.email})`;
      targetSelect.appendChild(opt);
    }
  }
  document.getElementById('reassign-modal').classList.remove('hidden');
}

async function bind(params) {
  bindLayoutEvents();
  showStale = params?.tab === 'stale';
  const endpoint = showStale ? '/api/admin/stale-requests' : '/api/admin/requests';

  try {
    const data = await apiFetch(endpoint);
    allRequests = data.requests || [];

    // Build a minimal admin roster from claimed_by side-data (until a dedicated
    // endpoint to list branch_admins exists). Works for admins who have claimed
    // at least once, which covers the reassign use case in practice.
    const seen = new Set();
    admins = [];
    for (const r of allRequests) {
      if (r.claimed_by && !seen.has(r.claimed_by)) {
        seen.add(r.claimed_by);
        admins.push({
          id: r.claimed_by,
          first_name: r.claimed_by_first_name,
          last_name: r.claimed_by_last_name,
          email: r.claimed_by_email || '',
          branch_country: r.property_country,
        });
      }
    }

    applyFilters();
  } catch (err) {
    console.error(err);
    const loadingEl = document.getElementById('req-loading');
    const p = document.createElement('p');
    p.className = 'text-red-600 text-sm text-center';
    p.textContent = 'Erreur de chargement';
    loadingEl.replaceChildren(p);
  }

  document.getElementById('filter-country')?.addEventListener('change', applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('filter-claim')?.addEventListener('change', applyFilters);

  const modal = document.getElementById('reassign-modal');
  document.getElementById('reassign-cancel')?.addEventListener('click', () => modal?.classList.add('hidden'));
  document.getElementById('reassign-submit')?.addEventListener('click', async () => {
    const toUserId = document.getElementById('reassign-target').value;
    if (!toUserId || !currentReassignId) return;
    const btn = document.getElementById('reassign-submit');
    btn.disabled = true; btn.textContent = 'Envoi…';
    try {
      await apiFetch(`/api/admin/requests/${currentReassignId}/reassign`, { method: 'POST', body: JSON.stringify({ to_user_id: toUserId }) });
      modal?.classList.add('hidden');
      window.location.reload();
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Confirmer';
      alert(err.message || 'Erreur');
    }
  });
}

export { render, bind };
