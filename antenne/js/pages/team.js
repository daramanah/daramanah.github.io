import { apiFetch } from '../api.js';
import { getCachedBranch } from '../auth.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const AVAILABILITY = { available: { label: 'Disponible', color: 'bg-green-100 text-green-700' }, busy: { label: 'Occupé', color: 'bg-amber-100 text-amber-700' }, off: { label: 'Indisponible', color: 'bg-gray-100 text-gray-500' } };

function render() {
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">\u00C9quipe</h1>
      <p class="text-gray-500 text-sm mt-1">Intervenants de votre antenne</p>
    </div>
    <div id="team-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    <div id="team-empty" class="hidden text-center py-12">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </div>
      <p class="text-gray-500 font-medium">Aucun intervenant</p>
      <p class="text-sm text-gray-400 mt-1">Les intervenants seront ajoutés prochainement</p>
    </div>
    <div id="team-list" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4"></div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  const branch = getCachedBranch();
  if (!branch) { document.getElementById('team-loading').classList.add('hidden'); document.getElementById('team-empty').classList.remove('hidden'); return; }

  try {
    const data = await apiFetch(`/api/branches/${branch.id}/team`);
    const team = data.team || [];
    document.getElementById('team-loading').classList.add('hidden');

    if (team.length === 0) {
      document.getElementById('team-empty').classList.remove('hidden');
    } else {
      const list = document.getElementById('team-list');
      list.innerHTML = team.map(t => {
        const avail = AVAILABILITY[t.availability] || AVAILABILITY.off;
        const initials = (t.first_name?.[0] || '') + (t.last_name?.[0] || '');
        return `
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <div class="flex items-center gap-4 mb-3">
            <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">${initials}</div>
            <div class="flex-1">
              <h3 class="font-semibold text-brand-navy">${t.first_name} ${t.last_name}</h3>
              <p class="text-xs text-gray-500">${t.email}</p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium ${avail.color}">${avail.label}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-500">
            ${t.phone ? `<span>${t.phone}</span>` : ''}
            <span>${t.active_missions || 0} mission(s) en cours</span>
            <span>${t.total_missions || 0} total</span>
          </div>
          ${t.specialties ? `<p class="text-xs text-gray-400 mt-2">Spécialités : ${t.specialties}</p>` : ''}
        </div>`;
      }).join('');
      list.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
    document.getElementById('team-loading').innerHTML = '<p class="text-red-600 text-sm">Erreur</p>';
  }
}

export { render, bind };
