// DarAmanah — New Property form (with service areas)
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
      <p class="text-gray-500 text-sm mt-1">Enregistrez un nouveau bien \u00e0 surveiller</p>
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
            <label class="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:border-brand-gold transition" id="label-ma">
              <input type="radio" name="country" value="MA" checked class="text-brand-gold">
              <span class="text-lg">\u{1F1F2}\u{1F1E6}</span>
              <span class="text-sm font-medium">Maroc</span>
            </label>
            <label class="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:border-brand-gold transition" id="label-dz">
              <input type="radio" name="country" value="DZ" class="text-brand-gold">
              <span class="text-lg">\u{1F1E9}\u{1F1FF}</span>
              <span class="text-sm font-medium">Alg\u00e9rie</span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
          <select id="prop-city-select" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">Chargement...</option>
          </select>
          <div id="city-request-section" class="hidden mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p class="text-sm text-amber-800 mb-2">Votre ville n'est pas dans la liste ? Demandez son ouverture :</p>
            <div class="flex gap-2">
              <input type="text" id="city-request-name" class="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm" placeholder="Nom de la ville">
              <button type="button" id="city-request-btn" class="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition">Envoyer</button>
            </div>
            <p id="city-request-msg" class="hidden text-sm mt-2"></p>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
          <input type="text" id="prop-address" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Adresse compl\u00e8te">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <select id="prop-type" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
              ${TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Surface (m\u00b2) <span class="text-gray-400">optionnel</span></label>
            <input type="number" id="prop-surface" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="80">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Description <span class="text-gray-400">optionnel</span></label>
          <textarea id="prop-desc" rows="3" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Informations compl\u00e9mentaires..."></textarea>
        </div>
        <button type="submit" id="prop-submit" class="w-full bg-brand-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2">Ajouter le bien</button>
      </form>
    </div>`;
  return renderLayout(content);
}

// Cache service areas by country
let serviceAreasCache = {};

async function loadServiceAreas(country) {
  if (serviceAreasCache[country]) return serviceAreasCache[country];
  try {
    const data = await apiFetch(`/api/service-areas?country=${country}`);
    serviceAreasCache[country] = data.service_areas || [];
    return serviceAreasCache[country];
  } catch {
    return [];
  }
}

async function updateCitySelect(country) {
  const select = document.getElementById('prop-city-select');
  select.innerHTML = '<option value="">Chargement...</option>';
  const areas = await loadServiceAreas(country);
  let options = '<option value="">-- S\u00e9lectionnez une ville --</option>';
  areas.forEach(a => {
    options += `<option value="${a.id}">${a.city}</option>`;
  });
  options += '<option value="__other__">Ma ville n\'est pas dans la liste</option>';
  select.innerHTML = options;
}

function bind() {
  bindLayoutEvents();
  const form = document.getElementById('prop-form');
  const errorEl = document.getElementById('prop-error');
  const btn = document.getElementById('prop-submit');
  const citySelect = document.getElementById('prop-city-select');
  const cityRequestSection = document.getElementById('city-request-section');

  // Load initial service areas for MA
  updateCitySelect('MA');

  // Country radio change → reload cities
  document.querySelectorAll('input[name="country"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateCitySelect(radio.value);
      cityRequestSection.classList.add('hidden');
    });
  });

  // City select → show "other" section
  citySelect.addEventListener('change', () => {
    if (citySelect.value === '__other__') {
      cityRequestSection.classList.remove('hidden');
    } else {
      cityRequestSection.classList.add('hidden');
    }
  });

  // City request button
  const cityReqBtn = document.getElementById('city-request-btn');
  const cityReqMsg = document.getElementById('city-request-msg');
  cityReqBtn.addEventListener('click', async () => {
    const cityName = document.getElementById('city-request-name').value.trim();
    if (!cityName) return;
    const country = document.querySelector('input[name="country"]:checked').value;
    cityReqBtn.disabled = true;
    cityReqBtn.textContent = '...';
    try {
      await apiFetch('/api/city-requests', {
        method: 'POST',
        body: JSON.stringify({ country, city_name: cityName }),
      });
      cityReqMsg.textContent = 'Merci, nous \u00e9tudions l\u2019ouverture de cette zone.';
      cityReqMsg.className = 'text-sm mt-2 text-green-700';
      cityReqMsg.classList.remove('hidden');
      cityReqBtn.disabled = true;
    } catch (err) {
      cityReqMsg.textContent = err.message || 'Erreur';
      cityReqMsg.className = 'text-sm mt-2 text-red-700';
      cityReqMsg.classList.remove('hidden');
      cityReqBtn.disabled = false;
      cityReqBtn.textContent = 'Envoyer';
    }
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const service_area_id = citySelect.value;
    if (!service_area_id || service_area_id === '__other__') {
      errorEl.textContent = 'Veuillez s\u00e9lectionner une ville couverte.';
      errorEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const body = {
      name: document.getElementById('prop-name').value.trim(),
      country: document.querySelector('input[name="country"]:checked').value,
      address_text: document.getElementById('prop-address').value.trim(),
      type: document.getElementById('prop-type').value,
      surface_m2: document.getElementById('prop-surface').value ? Number(document.getElementById('prop-surface').value) : null,
      description: document.getElementById('prop-desc').value.trim() || null,
      service_area_id,
    };

    try {
      const data = await apiFetch('/api/properties', { method: 'POST', body: JSON.stringify(body) });
      window.location.hash = `#/properties/${data.property.id}`;
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur lors de la cr\u00e9ation';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Ajouter le bien';
    }
  });
}

export { render, bind };
