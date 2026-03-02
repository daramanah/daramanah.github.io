import { apiFetch } from '../api.js';
import { getCachedBranch } from '../auth.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const FLAGS = { MA: '\u{1F1F2}\u{1F1E6}', DZ: '\u{1F1E9}\u{1F1FF}', TN: '\u{1F1F9}\u{1F1F3}' };
const COUNTRY_NAMES = { MA: 'Maroc', DZ: 'Alg\u00E9rie', TN: 'Tunisie' };

function render() {
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Mon Antenne</h1>
      <p class="text-gray-500 text-sm mt-1">Informations et statistiques</p>
    </div>
    <div id="branch-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    <div id="branch-content" class="hidden space-y-6"></div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  const branch = getCachedBranch();
  if (!branch) return;

  try {
    const data = await apiFetch(`/api/branches/${branch.id}`);
    const b = data.branch;
    const s = data.stats || {};
    const flag = FLAGS[b.country] || '';
    const countryName = COUNTRY_NAMES[b.country] || b.country;

    document.getElementById('branch-content').innerHTML = `
      <!-- Branch Info -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-2xl">${flag}</div>
          <div>
            <h2 class="text-xl font-bold text-brand-navy">${b.name}</h2>
            <p class="text-sm text-gray-500">${countryName} — ${b.city}</p>
          </div>
          <span class="ml-auto text-xs px-3 py-1 rounded-full font-medium ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">${b.status === 'active' ? 'Active' : 'Inactive'}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div class="flex justify-between"><span class="text-gray-500">Email</span><span class="font-medium">${b.email || '-'}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">T\u00E9l\u00E9phone</span><span class="font-medium">${b.phone || '-'}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">WhatsApp</span><span class="font-medium">${b.whatsapp_number || 'Non renseign\u00E9'}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Devise</span><span class="font-medium">${b.currency || 'EUR'}</span></div>
          ${b.coverage_cities ? `<div class="col-span-2 flex justify-between"><span class="text-gray-500">Villes couvertes</span><span class="font-medium">${b.coverage_cities}</span></div>` : ''}
        </div>
      </div>

      <!-- Stats -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-bold text-brand-navy mb-4">Statistiques</h2>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div class="text-center p-3 rounded-lg bg-yellow-50">
            <p class="text-2xl font-bold text-yellow-600">${s.pending ?? 0}</p>
            <p class="text-xs text-gray-500 mt-1">En attente</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-indigo-50">
            <p class="text-2xl font-bold text-indigo-600">${s.in_progress ?? 0}</p>
            <p class="text-xs text-gray-500 mt-1">En cours</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-green-50">
            <p class="text-2xl font-bold text-green-600">${s.completed_week ?? 0}</p>
            <p class="text-xs text-gray-500 mt-1">Termin\u00E9es (7j)</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-blue-50">
            <p class="text-2xl font-bold text-blue-600">${s.active_agents ?? 0}</p>
            <p class="text-xs text-gray-500 mt-1">Intervenants</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-gray-50">
            <p class="text-2xl font-bold text-brand-navy">${s.total_properties ?? 0}</p>
            <p class="text-xs text-gray-500 mt-1">Biens</p>
          </div>
        </div>
      </div>`;

    document.getElementById('branch-loading').classList.add('hidden');
    document.getElementById('branch-content').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    document.getElementById('branch-loading').innerHTML = '<p class="text-red-600 text-sm">Erreur de chargement</p>';
  }
}

export { render, bind };
