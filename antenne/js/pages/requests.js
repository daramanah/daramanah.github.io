import { apiFetch } from '../api.js';
import { getCachedBranch, getCachedUser } from '../auth.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const STATUS_LABELS = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée', invoiced: 'Facturée', cancelled: 'Annulée' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' };
const TYPE_LABELS = { visit: 'Visite de contrôle', cleaning_apartment: 'Ménage Appartement', cleaning_villa: 'Ménage Villa', groceries: 'Courses', meter_reading: 'Relevé compteurs', repair: 'Réparation', garden: 'Jardin', arrival_pack: 'Pack Arrivée', other: 'Autre' };

// Tabs for the Pool + Claim model: 'free' | 'mine' | 'others'
let currentTab = 'free';
let currentUserId = null;

function renderCard(r, tab) {
  const statusBadge = `<span class="ml-3 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABELS[r.status] || r.status}</span>`;
  const claimedBadge = (tab === 'others')
    ? `<span class="text-xs text-gray-500">Pris par <strong>${r.claimed_by_first_name || '—'} ${r.claimed_by_last_name || ''}</strong></span>`
    : '';
  const releaseBadge = r.release_requested
    ? `<span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium">Release demandé</span>`
    : '';
  const actionButton = (tab === 'free')
    ? `<button data-claim="${r.id}" class="claim-btn mt-3 w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition">Prendre en charge</button>`
    : '';
  const openTag = (tab === 'others')
    ? `<div class="block bg-white rounded-xl border border-gray-200 p-4 opacity-70">`
    : `<a href="#/requests/${r.id}" class="block bg-white rounded-xl border border-gray-200 p-4 card-hover">`;
  const closeTag = (tab === 'others') ? '</div>' : '</a>';
  return `${openTag}
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-brand-navy text-sm truncate">${r.title || TYPE_LABELS[r.type] || r.type}</h3>
        <p class="text-xs text-gray-500 mt-0.5">${r.client_first_name || ''} ${r.client_last_name || ''} — ${r.property_name || ''} (${r.property_city || ''})</p>
      </div>
      ${statusBadge}
    </div>
    <div class="flex items-center flex-wrap gap-2 text-xs text-gray-400">
      <span>${new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
      ${r.priority === 'urgent' ? '<span class="text-red-500 font-semibold">Urgent</span>' : ''}
      ${claimedBadge}
      ${releaseBadge}
    </div>
    ${actionButton}
  ${closeTag}`;
}

function render() {
  const tabs = [
    { key: 'free',   label: 'Demandes libres'     },
    { key: 'mine',   label: 'Mes demandes'        },
    { key: 'others', label: "Prises par d'autres" },
  ];
  const tabsHtml = tabs.map(t =>
    `<button data-tab="${t.key}" class="tab-btn px-4 py-2 text-sm font-medium border-b-2 transition ${t.key === currentTab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">${t.label} <span class="tab-count ml-1 text-xs text-gray-400">·</span></button>`
  ).join('');

  const typeOptions = Object.entries(TYPE_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  const content = `
    <div class="mb-4">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Demandes</h1>
      <p class="text-gray-500 text-sm mt-1">Pool de demandes de votre pays — prenez en charge celles que vous traitez.</p>
    </div>

    <div class="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto" id="tabs">${tabsHtml}</div>

    <div class="flex flex-wrap gap-3 mb-6">
      <select id="filter-city" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200">
        <option value="">Toutes les villes</option>
      </select>
      <select id="filter-type" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200">
        <option value="">Tous les types</option>
        ${typeOptions}
      </select>
      <select id="filter-urgency" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200">
        <option value="">Toutes urgences</option>
        <option value="normal">Normal</option>
        <option value="urgent">Urgent</option>
      </select>
    </div>

    <div id="req-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    <div id="req-empty" class="hidden text-center py-12"><p class="text-gray-500">Aucune demande dans cet onglet</p></div>
    <div id="req-count" class="hidden text-xs text-gray-400 mb-3"></div>
    <div id="req-list" class="hidden space-y-3"></div>`;
  return renderLayout(content);
}

let allRequests = [];

function tabPredicate(r, tab) {
  if (tab === 'free')   return !r.claimed_by && r.status === 'pending';
  if (tab === 'mine')   return r.claimed_by === currentUserId;
  if (tab === 'others') return r.claimed_by && r.claimed_by !== currentUserId;
  return false;
}

function computeCounts() {
  const counts = { free: 0, mine: 0, others: 0 };
  for (const r of allRequests) {
    if (tabPredicate(r, 'free'))   counts.free++;
    if (tabPredicate(r, 'mine'))   counts.mine++;
    if (tabPredicate(r, 'others')) counts.others++;
  }
  return counts;
}

async function bind() {
  bindLayoutEvents();
  const user = getCachedUser();
  currentUserId = user?.id || null;

  // Load city options from service areas
  const branch = getCachedBranch();
  if (branch) {
    try {
      const saData = await apiFetch(`/api/service-areas?country=${branch.country}`);
      const areas = saData.service_areas || [];
      const citySelect = document.getElementById('filter-city');
      areas.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.city;
        opt.textContent = a.city;
        citySelect.appendChild(opt);
      });
    } catch {}
  }

  try {
    const data = await apiFetch('/api/admin/requests');
    allRequests = data.requests || [];
    applyFilters();
  } catch (err) {
    console.error(err);
    const loadingEl = document.getElementById('req-loading');
    const p = document.createElement('p');
    p.className = 'text-red-600 text-sm';
    p.textContent = 'Erreur de chargement';
    loadingEl.replaceChildren(p);
  }

  // Tab switching
  document.getElementById('tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.className = b.className.replace('border-indigo-600 text-indigo-600', 'border-transparent text-gray-500 hover:text-gray-700');
    });
    btn.className = btn.className.replace('border-transparent text-gray-500 hover:text-gray-700', 'border-indigo-600 text-indigo-600');
    currentTab = btn.dataset.tab;
    applyFilters();
  });

  // Dropdown filters
  document.getElementById('filter-city')?.addEventListener('change', applyFilters);
  document.getElementById('filter-type')?.addEventListener('change', applyFilters);
  document.getElementById('filter-urgency')?.addEventListener('change', applyFilters);
}

function applyFilters() {
  const city = document.getElementById('filter-city')?.value || '';
  const type = document.getElementById('filter-type')?.value || '';
  const urgency = document.getElementById('filter-urgency')?.value || '';

  let filtered = allRequests.filter(r => tabPredicate(r, currentTab));
  if (city) filtered = filtered.filter(r => (r.property_city || '') === city);
  if (type) filtered = filtered.filter(r => r.type === type);
  if (urgency) filtered = filtered.filter(r => r.priority === urgency);

  // Update tab counts (across all requests — ignores local filters)
  const counts = computeCounts();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const key = btn.dataset.tab;
    const countSpan = btn.querySelector('.tab-count');
    if (countSpan) countSpan.textContent = `· ${counts[key]}`;
  });

  document.getElementById('req-loading').classList.add('hidden');
  if (filtered.length === 0) {
    document.getElementById('req-empty').classList.remove('hidden');
    document.getElementById('req-list').classList.add('hidden');
    document.getElementById('req-count').classList.add('hidden');
  } else {
    document.getElementById('req-empty').classList.add('hidden');
    const list = document.getElementById('req-list');
    list.innerHTML = filtered.map(r => renderCard(r, currentTab)).join('');
    list.classList.remove('hidden');
    const countEl = document.getElementById('req-count');
    countEl.textContent = `${filtered.length} demande${filtered.length > 1 ? 's' : ''}`;
    countEl.classList.remove('hidden');

    // Wire claim buttons (only present in "free" tab)
    list.querySelectorAll('.claim-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.claim;
        btn.disabled = true; btn.textContent = 'Prise en charge…';
        try {
          await apiFetch(`/api/admin/requests/${id}/claim`, { method: 'POST' });
          window.location.hash = `#/requests/${id}`;
        } catch (err) {
          btn.disabled = false; btn.textContent = 'Prendre en charge';
          alert(err.message || 'Erreur lors du claim');
        }
      });
    });
  }
}

export { render, bind };
