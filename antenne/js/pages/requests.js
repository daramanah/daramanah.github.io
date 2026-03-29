import { apiFetch } from '../api.js';
import { getCachedBranch } from '../auth.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const STATUS_LABELS = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée', invoiced: 'Facturée', cancelled: 'Annulée' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' };
const TYPE_LABELS = { visit: 'Visite de contrôle', cleaning_apartment: 'Ménage Appartement', cleaning_villa: 'Ménage Villa', groceries: 'Courses', meter_reading: 'Relevé compteurs', repair: 'Réparation', garden: 'Jardin', arrival_pack: 'Pack Arrivée', other: 'Autre' };

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'assigned', label: 'Assignées' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminées' },
];

function renderCard(r) {
  return `
  <a href="#/requests/${r.id}" class="block bg-white rounded-xl border border-gray-200 p-4 card-hover">
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-brand-navy text-sm truncate">${r.title || TYPE_LABELS[r.type] || r.type}</h3>
        <p class="text-xs text-gray-500 mt-0.5">${r.client_first_name || ''} ${r.client_last_name || ''} — ${r.property_name || ''} (${r.property_city || ''})</p>
      </div>
      <span class="ml-3 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABELS[r.status] || r.status}</span>
    </div>
    <div class="flex items-center gap-3 text-xs text-gray-400">
      <span>${new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
      ${r.priority === 'urgent' ? '<span class="text-red-500 font-semibold">Urgent</span>' : ''}
      ${r.agent_first_name ? `<span>Agent : ${r.agent_first_name}</span>` : '<span class="text-amber-500">Non assignée</span>'}
    </div>
  </a>`;
}

function render() {
  const statusBtns = STATUS_FILTERS.map(f =>
    `<button data-status="${f.value}" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${f.value === '' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}">${f.label}</button>`
  ).join('');

  const typeOptions = Object.entries(TYPE_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Demandes</h1>
      <p class="text-gray-500 text-sm mt-1">Toutes les demandes de votre antenne</p>
    </div>

    <!-- Filtre statut -->
    <div class="flex gap-2 mb-4 overflow-x-auto pb-1" id="filters">${statusBtns}</div>

    <!-- Filtres avancés -->
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
    <div id="req-empty" class="hidden text-center py-12"><p class="text-gray-500">Aucune demande</p></div>
    <div id="req-count" class="hidden text-xs text-gray-400 mb-3"></div>
    <div id="req-list" class="hidden space-y-3"></div>`;
  return renderLayout(content);
}

let allRequests = [];
let currentStatusFilter = '';

async function bind() {
  bindLayoutEvents();

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
  } catch (err) { console.error(err); document.getElementById('req-loading').innerHTML = '<p class="text-red-600 text-sm">Erreur</p>'; }

  // Status filter buttons
  document.getElementById('filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => { b.className = b.className.replace('bg-indigo-600 text-white', 'bg-white text-gray-600 border border-gray-200'); });
    btn.className = btn.className.replace('bg-white text-gray-600 border border-gray-200', 'bg-indigo-600 text-white');
    currentStatusFilter = btn.dataset.status;
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

  let filtered = allRequests;
  if (currentStatusFilter) filtered = filtered.filter(r => r.status === currentStatusFilter);
  if (city) filtered = filtered.filter(r => (r.property_city || '') === city);
  if (type) filtered = filtered.filter(r => r.type === type);
  if (urgency) filtered = filtered.filter(r => r.priority === urgency);

  document.getElementById('req-loading').classList.add('hidden');
  if (filtered.length === 0) {
    document.getElementById('req-empty').classList.remove('hidden');
    document.getElementById('req-list').classList.add('hidden');
    document.getElementById('req-count').classList.add('hidden');
  } else {
    document.getElementById('req-empty').classList.add('hidden');
    const list = document.getElementById('req-list');
    list.innerHTML = filtered.map(renderCard).join('');
    list.classList.remove('hidden');
    const countEl = document.getElementById('req-count');
    countEl.textContent = `${filtered.length} demande${filtered.length > 1 ? 's' : ''}`;
    countEl.classList.remove('hidden');
  }
}

export { render, bind };
