import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const STATUS_LABELS = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée', invoiced: 'Facturée', cancelled: 'Annulée' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' };
const SPECIALTY_LABELS = {
  visit: 'Visite', cleaning: 'Ménage', groceries: 'Courses',
  meter_reading: 'Relevé compteurs', repair: 'Réparation', garden: 'Jardin',
};

let allRequests = [];
let admins = [];
let allAgents = [];
let showStale = false;
let currentAssignRequestId = null;

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function friendlyErr(err) {
  if (!err) return 'Erreur inconnue';
  switch (err.code) {
    case 'ASSIGNEE_WRONG_COUNTRY': return "Cet agent n'est pas dans le pays de la demande.";
    case 'ASSIGNEE_INACTIVE':      return "Cet agent est inactif.";
    case 'INVALID_ASSIGNEE':       return "Agent introuvable.";
    case 'NOT_FOUND':              return "Cette demande n'existe plus.";
    case 'MISSING_FIELDS':         return "Champs requis manquants.";
    case 'INVALID_BODY':           return "Données invalides.";
    case 'MUST_CLAIM_FIRST':       return "Vous devez d'abord prendre en charge cette demande.";
    default:                       return err.message || 'Erreur';
  }
}

function renderCard(r) {
  const claimed = r.claimed_by
    ? `<span class="text-xs text-gray-500">Pris par <strong>${r.claimed_by_first_name || '—'} ${r.claimed_by_last_name || ''}</strong></span>`
    : `<span class="text-xs text-amber-600 font-medium">Non prise en charge</span>`;
  const releaseBadge = r.release_requested
    ? `<span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium">Release demandé</span>`
    : '';
  const canAssign = r.status === 'pending' || r.status === 'assigned';
  const assignBtn = canAssign
    ? `<button data-assign-agent="${r.id}" class="assign-agent-btn text-xs px-3 py-1.5 rounded-lg bg-brand-gold text-white hover:opacity-90">Assigner un agent</button>`
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
    <div class="flex gap-2 flex-wrap">
      ${assignBtn}
      <button data-reassign="${r.id}" data-country="${r.property_country || ''}" class="reassign-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Confier à un autre admin</button>
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
        <h3 class="text-base font-bold text-brand-navy mb-2">Confier à un autre admin</h3>
        <p class="text-sm text-gray-600 mb-3">Sélectionner admin destinataire (même pays que la demande).</p>
        <select id="reassign-target" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></select>
        <div class="flex justify-end gap-2 mt-3">
          <button id="reassign-cancel" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button id="reassign-submit" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Confirmer</button>
        </div>
      </div>
    </div>

    <div id="assign-agent-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 id="assign-agent-title" class="text-base font-bold text-brand-navy mb-1">Assigner un agent</h3>
        <p id="assign-agent-subtitle" class="text-xs text-gray-500 mb-3"></p>
        <div id="assign-agent-options" class="space-y-2 mb-3"></div>
        <div class="mb-3">
          <label class="block text-xs text-gray-600 mb-1">Date d'intervention (optionnel)</label>
          <input id="assign-agent-date" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <div class="flex justify-end gap-2">
          <button id="assign-agent-cancel" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button id="assign-agent-submit" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Assigner</button>
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
    list.querySelectorAll('.assign-agent-btn').forEach(btn => {
      btn.addEventListener('click', () => openAssignAgentModal(btn.dataset.assignAgent));
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

function openAssignAgentModal(requestId) {
  const r = allRequests.find(x => x.id === requestId);
  if (!r) return;
  currentAssignRequestId = requestId;

  document.getElementById('assign-agent-title').textContent = `Assigner un agent — ${r.title || r.type}`;
  document.getElementById('assign-agent-subtitle').textContent =
    `${r.property_name || '—'} · ${r.property_city || '—'}, ${r.property_country || '—'}`;
  document.getElementById('assign-agent-date').value = '';

  const country = r.property_country;
  // Memberships eligibles : meme pays, actif, hors pool.
  const eligible = [];
  for (const a of allAgents) {
    for (const m of (a.memberships || [])) {
      if (m.branch_country === country
          && m.active === 1
          && m.branch_id && !m.branch_id.startsWith('branch_pool_')) {
        eligible.push({ agent: a, m });
      }
    }
  }

  const listEl = document.getElementById('assign-agent-options');
  const submitBtn = document.getElementById('assign-agent-submit');
  if (eligible.length === 0) {
    listEl.innerHTML = `<p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">Aucun agent disponible dans ce pays. Créez ou affectez un agent dans la page Agents.</p>`;
    submitBtn.disabled = true;
  } else {
    submitBtn.disabled = false;
    listEl.innerHTML = eligible.map(({ agent, m }, idx) => {
      const specs = (m.specialties?.list || []).map(s => SPECIALTY_LABELS[s] || s).join(', ') || '—';
      const otherSpec = m.specialties?.other ? ` · Autre : ${escapeHtml(m.specialties.other)}` : '';
      const avail = m.availability === 'available' ? 'disponible' : m.availability === 'busy' ? 'occupé' : 'absent';
      return `<label class="flex items-start gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
        <input type="radio" name="assign-agent-choice" value="${m.team_member_id}" data-branch="${m.branch_id}" ${idx === 0 ? 'checked' : ''} class="mt-1">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-brand-navy">${escapeHtml(agent.first_name)} ${escapeHtml(agent.last_name)} — ${escapeHtml(m.branch_name)}</p>
          <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(specs)}${otherSpec} · <span class="italic">${avail}</span></p>
        </div>
      </label>`;
    }).join('');
  }

  document.getElementById('assign-agent-modal').classList.remove('hidden');
}

function closeAssignAgentModal() {
  document.getElementById('assign-agent-modal').classList.add('hidden');
  currentAssignRequestId = null;
}

async function submitAssignAgent() {
  if (!currentAssignRequestId) return;
  const chosen = document.querySelector('input[name="assign-agent-choice"]:checked');
  if (!chosen) {
    alert('Sélectionnez un agent.');
    return;
  }
  const teamMemberId = chosen.value;
  const branchId = chosen.dataset.branch;
  const dateValue = document.getElementById('assign-agent-date').value;

  const body = { assigned_to: teamMemberId, branch_id: branchId };
  if (dateValue) body.scheduled_date = new Date(dateValue).toISOString();

  const btn = document.getElementById('assign-agent-submit');
  btn.disabled = true;
  btn.textContent = 'Envoi…';
  try {
    await apiFetch(`/api/admin/requests/${currentAssignRequestId}/assign`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    closeAssignAgentModal();
    await loadAll();
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      closeAssignAgentModal();
      await loadAll();
    }
    alert(friendlyErr(err));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Assigner';
  }
}

async function loadAll() {
  const endpoint = showStale ? '/api/admin/stale-requests' : '/api/admin/requests';
  const [requestsData, agentsData] = await Promise.all([
    apiFetch(endpoint),
    apiFetch('/api/admin/team-members'),
  ]);
  allRequests = requestsData.requests || [];
  allAgents = agentsData.agents || [];

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
}

async function bind(params) {
  bindLayoutEvents();
  showStale = params?.tab === 'stale';

  try {
    await loadAll();
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

  document.getElementById('assign-agent-cancel')?.addEventListener('click', closeAssignAgentModal);
  document.getElementById('assign-agent-submit')?.addEventListener('click', submitAssignAgent);
}

export { render, bind };
