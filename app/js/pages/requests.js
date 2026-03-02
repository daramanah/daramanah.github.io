// DarAmanah — Requests list page

import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const STATUS_LABELS = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée', invoiced: 'Facturée', cancelled: 'Annulée' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' };
const TYPE_LABELS = { visit: 'Visite de contrôle', cleaning_apartment: 'Ménage Appartement', cleaning_villa: 'Ménage Villa', groceries: 'Courses', meter_reading: 'Relevé compteurs', arrival_pack: 'Pack Arrivée', other: 'Autre' };

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminées' },
];

function renderRequestCard(r) {
  return `
  <a href="#/requests/${r.id}" class="block bg-white rounded-xl border border-gray-200 p-5 card-hover">
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-brand-navy text-sm truncate">${r.title || TYPE_LABELS[r.type] || r.type || 'Demande'}</h3>
        <p class="text-xs text-gray-500 mt-0.5">${r.property_name || ''} — ${r.property_address || ''}</p>
      </div>
      <span class="ml-3 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABELS[r.status] || r.status}</span>
    </div>
    <div class="flex items-center gap-3 text-xs text-gray-400">
      <span>${new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
      ${r.priority === 'urgent' ? '<span class="text-red-500 font-semibold">Urgent</span>' : ''}
      ${r.agent_first_name ? `<span>Agent : ${r.agent_first_name} ${r.agent_last_name || ''}</span>` : ''}
    </div>
  </a>`;
}

function render() {
  const filterBtns = FILTERS.map(f =>
    `<button data-status="${f.value}" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${f.value === '' ? 'bg-brand-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-gold'}">${f.label}</button>`
  ).join('');

  const content = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-serif font-bold text-brand-navy">Mes Demandes</h1>
        <p class="text-gray-500 text-sm mt-1">Suivez vos demandes d'intervention</p>
      </div>
      <a href="#/requests/new" class="text-sm bg-brand-navy text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition hidden sm:inline-flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
        Nouvelle demande
      </a>
    </div>

    <div class="flex gap-2 mb-6 overflow-x-auto pb-1" id="filters">${filterBtns}</div>

    <div id="requests-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    <div id="requests-empty" class="hidden text-center py-12">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <p class="text-gray-500 font-medium">Aucune demande</p>
      <p class="text-sm text-gray-400 mt-1">Créez votre première demande d'intervention</p>
      <a href="#/requests/new" class="inline-block mt-4 bg-brand-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">Nouvelle demande</a>
    </div>
    <div id="requests-list" class="hidden space-y-3"></div>

    <!-- Mobile FAB -->
    <a href="#/requests/new" class="sm:hidden fixed bottom-20 right-4 w-12 h-12 bg-brand-gold text-white rounded-full shadow-lg flex items-center justify-center z-30 hover:bg-amber-700 transition">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
    </a>`;

  return renderLayout(content);
}

let allRequests = [];

async function bind() {
  bindLayoutEvents();

  try {
    const data = await apiFetch('/api/requests');
    allRequests = data.requests || [];
    renderList('');
  } catch (err) {
    console.error('Requests load error:', err);
    document.getElementById('requests-loading').innerHTML = '<p class="text-red-600 text-sm">Erreur de chargement</p>';
  }

  // Filter buttons
  document.getElementById('filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const status = btn.dataset.status;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.className = b.className.replace('bg-brand-navy text-white', 'bg-white text-gray-600 border border-gray-200 hover:border-brand-gold');
    });
    btn.className = btn.className.replace('bg-white text-gray-600 border border-gray-200 hover:border-brand-gold', 'bg-brand-navy text-white');
    renderList(status);
  });
}

function renderList(statusFilter) {
  const filtered = statusFilter
    ? allRequests.filter(r => {
        if (statusFilter === 'in_progress') return ['assigned', 'in_progress'].includes(r.status);
        if (statusFilter === 'completed') return ['completed', 'validated', 'invoiced'].includes(r.status);
        return r.status === statusFilter;
      })
    : allRequests;

  document.getElementById('requests-loading').classList.add('hidden');

  if (filtered.length === 0) {
    document.getElementById('requests-empty').classList.remove('hidden');
    document.getElementById('requests-list').classList.add('hidden');
  } else {
    document.getElementById('requests-empty').classList.add('hidden');
    const list = document.getElementById('requests-list');
    list.innerHTML = filtered.map(renderRequestCard).join('');
    list.classList.remove('hidden');
  }
}

export { render, bind };
