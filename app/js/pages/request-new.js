// DarAmanah — New Request form

import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const TYPES = [
  { value: 'visit', label: 'Visite de contrôle' },
  { value: 'cleaning_apartment', label: 'Ménage Appartement' },
  { value: 'cleaning_villa', label: 'Ménage Villa' },
  { value: 'groceries', label: 'Courses de base' },
  { value: 'meter_reading', label: 'Relevé compteurs' },
  { value: 'arrival_pack', label: 'Pack Arrivée' },
  { value: 'other', label: 'Autre' },
];

let preselectedProperty = null;

function render(params) {
  preselectedProperty = params?.property || '';

  const typeOptions = TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`
  ).join('');

  const content = `
    <div class="mb-6">
      <a href="${preselectedProperty ? '#/properties/' + preselectedProperty : '#/requests'}" class="text-sm text-brand-gold hover:underline inline-flex items-center gap-1 mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Retour
      </a>
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Nouvelle demande</h1>
      <p class="text-gray-500 text-sm mt-1">Décrivez votre besoin et nous nous en occupons</p>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <form id="request-form" class="space-y-5">
        <div id="req-error" class="hidden bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Bien concerné</label>
          <select id="req-property" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">Chargement...</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Type d'intervention</label>
          <select id="req-type" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
            ${typeOptions}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Titre</label>
          <input type="text" id="req-title" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Ex: Visite de contrôle mensuelle">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Description <span class="text-gray-400">(optionnel)</span></label>
          <textarea id="req-desc" rows="3" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Précisez vos besoins, instructions particulières..."></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Urgence</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:border-brand-gold transition text-sm flex-1">
              <input type="radio" name="priority" value="normal" checked class="text-brand-gold">
              Normal
            </label>
            <label class="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:border-red-400 transition text-sm flex-1">
              <input type="radio" name="priority" value="urgent" class="text-red-500">
              Urgent
            </label>
          </div>
        </div>

        <button type="submit" id="req-submit"
          class="w-full bg-brand-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2">
          Envoyer la demande
        </button>
      </form>
    </div>`;

  return renderLayout(content);
}

async function bind(params) {
  bindLayoutEvents();
  preselectedProperty = params?.property || '';

  let allProps = [];
  let activeSubs = [];

  // Load properties and subscriptions in parallel
  try {
    const [propsData, subsData] = await Promise.all([
      apiFetch('/api/properties'),
      apiFetch('/api/payments/subscriptions'),
    ]);
    allProps = propsData.properties || [];
    activeSubs = (subsData.subscriptions || []).filter(s => s.status === 'active');
    const select = document.getElementById('req-property');
    select.innerHTML = allProps.length === 0
      ? '<option value="">Aucun bien enregistr\u00e9</option>'
      : allProps.map(p => `<option value="${p.id}" ${p.id === preselectedProperty ? 'selected' : ''}>${p.name} \u2014 ${p.city || ''}</option>`).join('');
  } catch (err) {
    document.getElementById('req-property').innerHTML = '<option value="">Erreur de chargement</option>';
  }

  // Show subscription info when property changes
  function checkSubForProperty() {
    const propId = document.getElementById('req-property').value;
    const prop = allProps.find(p => p.id === propId);
    let existing = document.getElementById('sub-info');
    if (existing) existing.remove();
    if (!prop) return;
    const hasSub = activeSubs.some(s => s.service_area_id === prop.service_area_id);
    if (!hasSub) {
      const city = prop.service_area_city || prop.city || '';
      const info = document.createElement('div');
      info.id = 'sub-info';
      info.className = 'bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-2 text-sm text-amber-800';
      info.innerHTML = `Vous n\u2019avez pas d\u2019abonnement pour ${city}. Cette demande sera factur\u00e9e \u00e0 l\u2019intervention. <a href="#/payments" class="text-brand-gold font-medium hover:underline">Souscrire un abonnement</a>`;
      document.getElementById('req-property').parentNode.appendChild(info);
    }
  }
  document.getElementById('req-property').addEventListener('change', checkSubForProperty);
  checkSubForProperty();

  // Auto-fill title based on type
  document.getElementById('req-type').addEventListener('change', (e) => {
    const titleInput = document.getElementById('req-title');
    if (!titleInput.value || TYPES.some(t => t.label === titleInput.value)) {
      const selected = TYPES.find(t => t.value === e.target.value);
      if (selected) titleInput.value = selected.label;
    }
  });
  // Set initial title
  const initialType = TYPES.find(t => t.value === document.getElementById('req-type').value);
  if (initialType && !document.getElementById('req-title').value) {
    document.getElementById('req-title').value = initialType.label;
  }

  // Form submit
  const form = document.getElementById('request-form');
  const errorEl = document.getElementById('req-error');
  const btn = document.getElementById('req-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const body = {
      property_id: document.getElementById('req-property').value,
      type: document.getElementById('req-type').value,
      title: document.getElementById('req-title').value.trim(),
      description: document.getElementById('req-desc').value.trim() || null,
      priority: document.querySelector('input[name="priority"]:checked').value,
    };

    if (!body.property_id) {
      errorEl.textContent = 'Veuillez sélectionner un bien';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Envoyer la demande';
      return;
    }

    try {
      const data = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      window.location.hash = `#/requests/${data.request.id}`;
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur lors de la création';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Envoyer la demande';
    }
  });
}

export { render, bind };
