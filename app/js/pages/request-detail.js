// DarAmanah — Request Detail page

import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const STATUS_LABELS = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée', invoiced: 'Facturée', cancelled: 'Annulée' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' };

const WORKFLOW = ['pending', 'assigned', 'in_progress', 'completed', 'validated', 'invoiced'];

function renderTimeline(status) {
  const idx = WORKFLOW.indexOf(status);
  return WORKFLOW.map((step, i) => {
    const done = i <= idx && status !== 'cancelled';
    const current = i === idx;
    return `
    <div class="flex items-center gap-3 ${i > 0 ? 'mt-1' : ''}">
      <div class="flex flex-col items-center">
        <div class="w-3 h-3 rounded-full border-2 ${done ? 'bg-green-500 border-green-500' : current ? 'bg-brand-gold border-brand-gold' : 'bg-white border-gray-300'}"></div>
        ${i < WORKFLOW.length - 1 ? `<div class="w-0.5 h-6 ${done && i < idx ? 'bg-green-500' : 'bg-gray-200'}"></div>` : ''}
      </div>
      <span class="text-xs ${done ? 'text-gray-700 font-medium' : 'text-gray-400'}">${STATUS_LABELS[step]}</span>
    </div>`;
  }).join('');
}

let requestId = null;

function render(params) {
  requestId = params?.id;
  const content = `
    <div class="mb-6">
      <a href="#/requests" class="text-sm text-brand-gold hover:underline inline-flex items-center gap-1 mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Retour aux demandes
      </a>
      <div id="req-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
      <div id="req-content" class="hidden"></div>
      <div id="req-error" class="hidden text-center py-12">
        <p class="text-red-600 font-medium">Demande introuvable</p>
        <a href="#/requests" class="text-sm text-brand-gold mt-2 inline-block hover:underline">Retour aux demandes</a>
      </div>
    </div>`;
  return renderLayout(content);
}

async function bind(params) {
  bindLayoutEvents();
  requestId = params?.id;
  if (!requestId) { document.getElementById('req-error').classList.remove('hidden'); return; }

  try {
    const data = await apiFetch(`/api/requests/${requestId}`);
    const r = data.request;
    const reports = data.reports || [];

    const reportsHtml = reports.length > 0 ? reports.map(rep => `
      <div class="border border-gray-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-brand-navy">Rapport de ${rep.agent_first_name || 'Agent'} ${rep.agent_last_name || ''}</span>
          <span class="text-xs text-gray-400">${new Date(rep.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        ${rep.notes ? `<p class="text-sm text-gray-600 mb-3">${rep.notes}</p>` : ''}
        ${rep.checklist ? `
          <div class="mb-3">
            <p class="text-xs font-semibold text-gray-500 mb-1">Checklist :</p>
            <p class="text-sm text-gray-600">${rep.checklist}</p>
          </div>` : ''}
        ${rep.media_keys ? `
          <div>
            <p class="text-xs font-semibold text-gray-500 mb-2">Photos :</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              ${rep.media_keys.split(',').map(k => `<div class="aspect-video bg-gray-100 rounded-lg overflow-hidden"><img src="${k.trim()}" alt="Photo rapport" class="w-full h-full object-cover" loading="lazy"></div>`).join('')}
            </div>
          </div>` : ''}
      </div>`).join('') : '<p class="text-sm text-gray-400 text-center py-4">Aucun rapport disponible</p>';

    document.getElementById('req-content').innerHTML = `
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-serif font-bold text-brand-navy">${r.title || r.type || 'Demande'}</h1>
          <p class="text-gray-500 text-sm mt-1">${r.property_name || ''} — ${r.property_address || ''}</p>
        </div>
        <span class="text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABELS[r.status] || r.status}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <!-- Info -->
        <div class="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 class="text-sm font-bold text-brand-navy mb-3">Détails</h2>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Type</span><span class="font-medium">${r.type || '-'}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Priorité</span><span class="font-medium ${r.priority === 'urgent' ? 'text-red-600' : ''}">${r.priority === 'urgent' ? 'Urgent' : 'Normal'}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Créée le</span><span class="font-medium">${new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            ${r.scheduled_date ? `<div class="flex justify-between"><span class="text-gray-500">Date prévue</span><span class="font-medium">${new Date(r.scheduled_date).toLocaleDateString('fr-FR')}</span></div>` : ''}
            ${r.agent_first_name ? `<div class="flex justify-between"><span class="text-gray-500">Agent</span><span class="font-medium">${r.agent_first_name} ${r.agent_last_name || ''}</span></div>` : ''}
          </div>
          ${r.description ? `<div class="mt-4 pt-3 border-t border-gray-100"><p class="text-sm text-gray-600">${r.description}</p></div>` : ''}
        </div>

        <!-- Timeline -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h2 class="text-sm font-bold text-brand-navy mb-3">Progression</h2>
          ${r.status === 'cancelled'
            ? '<p class="text-sm text-red-500 font-medium">Annulée</p>'
            : renderTimeline(r.status)}
        </div>
      </div>

      <!-- Reports -->
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h2 class="text-sm font-bold text-brand-navy mb-4">Rapports terrain (${reports.length})</h2>
        <div class="space-y-4">${reportsHtml}</div>
      </div>

      ${['pending', 'assigned'].includes(r.status) ? `
      <div class="mt-4">
        <button id="cancel-btn" class="text-sm text-red-600 hover:text-red-800 font-medium transition">Annuler cette demande</button>
      </div>` : ''}`;

    document.getElementById('req-loading').classList.add('hidden');
    document.getElementById('req-content').classList.remove('hidden');

    // Cancel button
    document.getElementById('cancel-btn')?.addEventListener('click', async () => {
      if (!confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) return;
      try {
        await apiFetch(`/api/requests/${requestId}/cancel`, { method: 'PUT' });
        window.location.hash = '#/requests';
      } catch (err) {
        alert(err.message || 'Erreur lors de l\'annulation');
      }
    });
  } catch (err) {
    console.error('Request detail error:', err);
    document.getElementById('req-loading').classList.add('hidden');
    document.getElementById('req-error').classList.remove('hidden');
  }
}

export { render, bind };
