import { apiFetch } from '../api.js';
import { getCachedBranch } from '../auth.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const STATUS_LABELS = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', completed: 'Terminée', validated: 'Validée', invoiced: 'Facturée', cancelled: 'Annulée' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', validated: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' };

function render() {
  const branch = getCachedBranch();
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Tableau de bord</h1>
      <p class="text-gray-500 text-sm mt-1">${branch?.name || 'Antenne'} — Vue d'ensemble</p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8" id="kpis">
      <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <p class="text-2xl font-bold text-yellow-600" id="kpi-pending">-</p>
        <p class="text-xs text-gray-500 mt-1">En attente</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <p class="text-2xl font-bold text-indigo-600" id="kpi-progress">-</p>
        <p class="text-xs text-gray-500 mt-1">En cours</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <p class="text-2xl font-bold text-green-600" id="kpi-completed">-</p>
        <p class="text-xs text-gray-500 mt-1">Terminées (7j)</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <p class="text-2xl font-bold text-brand-navy" id="kpi-agents">-</p>
        <p class="text-xs text-gray-500 mt-1">Intervenants</p>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-bold text-brand-navy">Dernières demandes en attente</h2>
        <a href="#/requests" class="text-xs text-brand-gold hover:underline">Voir tout</a>
      </div>
      <div id="recent-requests"><div class="flex justify-center py-6"><div class="spinner"></div></div></div>
    </div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  const branch = getCachedBranch();
  try {
    const [branchData, reqsData] = await Promise.all([
      branch ? apiFetch(`/api/branches/${branch.id}`) : Promise.resolve({ stats: {} }),
      apiFetch('/api/admin/requests?status=pending'),
    ]);
    const s = branchData.stats || {};
    document.getElementById('kpi-pending').textContent = s.pending ?? 0;
    document.getElementById('kpi-progress').textContent = s.in_progress ?? 0;
    document.getElementById('kpi-completed').textContent = s.completed_week ?? 0;
    document.getElementById('kpi-agents').textContent = s.active_agents ?? 0;

    const reqs = (reqsData.requests || []).slice(0, 5);
    const el = document.getElementById('recent-requests');
    if (reqs.length === 0) {
      el.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Aucune demande en attente</p>';
    } else {
      el.innerHTML = '<div class="space-y-2">' + reqs.map(r => `
        <a href="#/requests/${r.id}" class="block p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <span class="text-sm font-medium text-brand-navy">${r.title || r.type}</span>
              <span class="text-xs text-gray-400 ml-2">${r.client_first_name || ''} ${r.client_last_name || ''}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">${r.property_city || ''}</span>
              ${r.priority === 'urgent' ? '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Urgent</span>' : ''}
            </div>
          </div>
        </a>`).join('') + '</div>';
    }
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

export { render, bind };
