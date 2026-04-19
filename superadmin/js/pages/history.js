import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const ACTION_LABELS = {
  claim: { label: 'Claim', color: 'bg-blue-100 text-blue-800', icon: '🟢' },
  release_requested: { label: 'Release demandé', color: 'bg-orange-100 text-orange-800', icon: '📤' },
  release_approved: { label: 'Release approuvé', color: 'bg-green-100 text-green-800', icon: '✅' },
  release_denied: { label: 'Release refusé', color: 'bg-gray-100 text-gray-800', icon: '❌' },
  reassigned: { label: 'Réassignation', color: 'bg-purple-100 text-purple-800', icon: '🔄' },
};

let currentRequestId = null;

function render(params) {
  currentRequestId = params?.id;
  const content = `
    <a href="#/requests" class="text-sm text-brand-gold hover:underline inline-flex items-center gap-1 mb-4">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>Retour
    </a>
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Historique de la demande</h1>
      <p class="text-gray-500 text-sm mt-1 font-mono">#${(currentRequestId || '').slice(0, 16)}</p>
    </div>
    <div id="hist-loading" class="flex justify-center py-8"><div class="spinner"></div></div>
    <div id="hist-empty" class="hidden text-center py-10 text-gray-500 text-sm">Aucun événement dans historique (demande jamais claimed).</div>
    <div id="hist-list" class="hidden"></div>`;
  return renderLayout(content);
}

function renderEntry(h) {
  const meta = ACTION_LABELS[h.action] || { label: h.action, color: 'bg-gray-100 text-gray-800', icon: '•' };
  const actor = `${h.actor_first_name || ''} ${h.actor_last_name || ''}`.trim() || h.actor_email || h.actor_user_id.slice(0, 8);
  const from = h.from_user_id ? (`${h.from_first_name || ''} ${h.from_last_name || ''}`.trim() || h.from_user_id.slice(0, 8)) : null;
  const to = h.to_user_id ? (`${h.to_first_name || ''} ${h.to_last_name || ''}`.trim() || h.to_user_id.slice(0, 8)) : null;
  const reason = h.reason ? `<div class="text-xs text-gray-600 mt-1 italic">Raison : ${String(h.reason).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : '';
  const transfer = (from || to) ? `<div class="text-xs text-gray-500 mt-1">${from ? `De : ${from}` : ''} ${to ? `→ Vers : ${to}` : ''}</div>` : '';

  return `<div class="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-transparent">
    <div class="absolute -left-3 top-0 w-6 h-6 rounded-full bg-white border-2 border-brand-gold flex items-center justify-center text-xs">${meta.icon}</div>
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <div class="flex items-start justify-between mb-1">
        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}">${meta.label}</span>
        <span class="text-xs text-gray-400">${new Date(h.created_at).toLocaleString('fr-FR')}</span>
      </div>
      <p class="text-sm text-gray-700">Par <strong>${actor}</strong></p>
      ${transfer}
      ${reason}
    </div>
  </div>`;
}

async function bind(params) {
  bindLayoutEvents();
  currentRequestId = params?.id;
  if (!currentRequestId) return;
  try {
    const data = await apiFetch(`/api/admin/claim-history/${currentRequestId}`);
    const history = data.history || [];
    document.getElementById('hist-loading').classList.add('hidden');
    const list = document.getElementById('hist-list');
    if (history.length === 0) {
      document.getElementById('hist-empty').classList.remove('hidden');
    } else {
      list.innerHTML = history.map(renderEntry).join('');
      list.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
    const loadingEl = document.getElementById('hist-loading');
    const p = document.createElement('p');
    p.className = 'text-red-600 text-sm text-center';
    p.textContent = 'Erreur de chargement';
    loadingEl.replaceChildren(p);
  }
}

export { render, bind };
