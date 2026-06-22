import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';
import { escapeHtml } from '../utils.js';

const STATUS_LABELS = { assigned: 'À faire', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée' };
const STATUS_COLORS = { assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-teal-100 text-teal-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800' };
const TYPE_LABELS = { visit: 'Visite', cleaning: 'Ménage', repair: 'Réparation', garden: 'Jardin', meter_reading: 'Relevé compteurs', airbnb_prep: 'Préparation Airbnb', key_handover: 'Remise de clés', other: 'Autre' };

function render() {
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Mes missions</h1>
      <p class="text-gray-500 text-sm mt-1">Vos interventions à réaliser</p>
    </div>
    <div id="missions-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  const el = document.getElementById('missions-list');
  try {
    const data = await apiFetch('/api/terrain/missions');
    const missions = data.missions || [];
    if (missions.length === 0) {
      el.innerHTML = '<p class="text-sm text-gray-400 text-center py-10">Aucune mission assignée</p>';
      return;
    }
    el.innerHTML = '<div class="space-y-3">' + missions.map(m => {
      const statusLabel = STATUS_LABELS[m.status] || m.status;
      const statusColor = STATUS_COLORS[m.status] || 'bg-gray-100 text-gray-700';
      const typeLabel = TYPE_LABELS[m.type] || m.type || '';
      const client = `${escapeHtml(m.client_first_name || '')} ${escapeHtml(m.client_last_name || '')}`.trim();
      const date = m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
      return `
        <a href="#/missions/${m.id}" class="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 transition">
          <div class="flex items-start justify-between mb-2">
            <span class="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">${escapeHtml(typeLabel)}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${statusColor}">${escapeHtml(statusLabel)}</span>
          </div>
          <p class="font-semibold text-brand-navy text-sm">${escapeHtml(m.title || '')}</p>
          <p class="text-sm text-gray-600 mt-1">${escapeHtml(m.property_name || '')} — ${escapeHtml(m.property_city || '')}</p>
          ${client ? `<p class="text-xs text-gray-500 mt-1">Client : ${client}</p>` : ''}
          ${date ? `<p class="text-xs text-gray-400 mt-1">Prévu le ${date}</p>` : ''}
        </a>`;
    }).join('') + '</div>';
  } catch (err) {
    console.error('Missions error:', err);
    el.innerHTML = '<p class="text-sm text-red-600 text-center py-10">Erreur de chargement des missions</p>';
  }
}

export { render, bind };
