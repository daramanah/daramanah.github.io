import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

function render() {
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Tableau de bord</h1>
      <p class="text-gray-500 text-sm mt-1">Vue globale — tous pays, toutes antennes.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <a href="#/requests" class="bg-white rounded-xl border border-gray-200 p-5 card-hover">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Total demandes</p>
        <p class="text-3xl font-bold text-brand-navy" id="kpi-total">-</p>
      </a>
      <a href="#/requests?tab=stale" class="bg-white rounded-xl border border-amber-200 p-5 card-hover">
        <p class="text-xs text-amber-700 uppercase tracking-wide mb-1">Non prises &gt;24h</p>
        <p class="text-3xl font-bold text-amber-700" id="kpi-stale">-</p>
      </a>
      <a href="#/releases" class="bg-white rounded-xl border border-orange-200 p-5 card-hover">
        <p class="text-xs text-orange-700 uppercase tracking-wide mb-1">Releases à arbitrer</p>
        <p class="text-3xl font-bold text-orange-700" id="kpi-releases">-</p>
      </a>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <h2 class="text-sm font-bold text-brand-navy mb-4">Demandes par statut et par pays</h2>
      <div id="stats-table" class="overflow-x-auto">
        <div class="flex justify-center py-6"><div class="spinner"></div></div>
      </div>
    </div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  try {
    const [reqs, stale, releases] = await Promise.all([
      apiFetch('/api/admin/requests'),
      apiFetch('/api/admin/stale-requests'),
      apiFetch('/api/admin/pending-releases'),
    ]);
    const allRequests = reqs.requests || [];
    document.getElementById('kpi-total').textContent = allRequests.length;
    document.getElementById('kpi-stale').textContent = (stale.requests || []).length;
    document.getElementById('kpi-releases').textContent = (releases.requests || []).length;

    const statuses = ['pending', 'assigned', 'in_progress', 'completed', 'validated', 'invoiced', 'cancelled'];
    const countries = Array.from(new Set(allRequests.map(r => r.property_country || r.country || '—'))).sort();
    const byCountryStatus = {};
    for (const c of countries) { byCountryStatus[c] = {}; for (const s of statuses) byCountryStatus[c][s] = 0; }
    for (const r of allRequests) {
      const c = r.property_country || r.country || '—';
      const s = r.status;
      if (byCountryStatus[c] && byCountryStatus[c][s] !== undefined) byCountryStatus[c][s]++;
    }
    const headRow = '<tr><th class="text-left py-2 px-3 text-xs text-gray-500">Pays</th>' + statuses.map(s => `<th class="text-right py-2 px-3 text-xs text-gray-500">${s}</th>`).join('') + '</tr>';
    const bodyRows = countries.map(c => {
      const cells = statuses.map(s => `<td class="py-2 px-3 text-sm text-right">${byCountryStatus[c][s]}</td>`).join('');
      return `<tr class="border-t border-gray-100"><td class="py-2 px-3 text-sm font-medium">${c}</td>${cells}</tr>`;
    }).join('');
    document.getElementById('stats-table').innerHTML = `<table class="w-full">${headRow}${bodyRows}</table>`;
  } catch (err) {
    console.error(err);
    const t = document.getElementById('stats-table');
    const p = document.createElement('p');
    p.className = 'text-red-600 text-sm';
    p.textContent = 'Erreur de chargement';
    t.replaceChildren(p);
  }
}

export { render, bind };
