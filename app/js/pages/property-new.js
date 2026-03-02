// DarAmanah — New Property form
import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const TYPES = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'house', label: 'Maison' },
  { value: 'villa', label: 'Villa' },
  { value: 'riad', label: 'Riad' },
  { value: 'land', label: 'Terrain' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Autre' },
];

function render() {
  const content = `
    <div class="mb-6">
      <a href="#/properties" class="text-sm text-brand-gold hover:underline inline-flex items-center gap-1 mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Retour
      </a>
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Ajouter un bien</h1>
      <p class="text-gray-500 text-sm mt-1">Enregistrez un nouveau bien à surveiller</p>
    </div>
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <form id="prop-form" class="space-y-5">
        <div id="prop-error" class="hidden bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Nom du bien</label>
          <input type="text" id="prop-name" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Ex: Appartement Casablanca">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:border-brand-gold transition">
              <input type="radio" name="country" value="MA" checked class="text-brand-gold">
              <span class="text-lg">\u{1F1F2}\u{1F1E6}</span>
              <span class="text-sm font-medium">Maroc</span>
            </label>
            <label class="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:border-brand-gold transition">
              <input type="radio" name="country" value="DZ" class="text-brand-gold">
              <span class="text-lg">\u{1F1E9}\u{1F1FF}</span>
              <span class="text-sm font-medium">Alg\u00E9rie</span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
          <input type="text" id="prop-city" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Ex: Casablanca">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
          <input type="text" id="prop-address" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Adresse compl\u00E8te">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <select id="prop-type" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
              ${TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Surface (m\u00B2) <span class="text-gray-400">optionnel</span></label>
            <input type="number" id="prop-surface" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="80">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Description <span class="text-gray-400">optionnel</span></label>
          <textarea id="prop-desc" rows="3" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Informations compl\u00E9mentaires..."></textarea>
        </div>
        <button type="submit" id="prop-submit" class="w-full bg-brand-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2">Ajouter le bien</button>
      </form>
    </div>`;
  return renderLayout(content);
}

function bind() {
  bindLayoutEvents();
  const form = document.getElementById('prop-form');
  const errorEl = document.getElementById('prop-error');
  const btn = document.getElementById('prop-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const body = {
      name: document.getElementById('prop-name').value.trim(),
      country: document.querySelector('input[name="country"]:checked').value,
      city: document.getElementById('prop-city').value.trim(),
      address_text: document.getElementById('prop-address').value.trim(),
      type: document.getElementById('prop-type').value,
      surface_m2: document.getElementById('prop-surface').value ? Number(document.getElementById('prop-surface').value) : null,
      description: document.getElementById('prop-desc').value.trim() || null,
    };

    try {
      const data = await apiFetch('/api/properties', { method: 'POST', body: JSON.stringify(body) });
      window.location.hash = `#/properties/${data.property.id}`;
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur lors de la cr\u00E9ation';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Ajouter le bien';
    }
  });
}

export { render, bind };
