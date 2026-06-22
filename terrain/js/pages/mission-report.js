import { apiFetch, getTokens } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';
import { escapeHtml, renderReportPhotos } from '../utils.js';
import { getChecklist } from '../checklists.js';

const API_BASE = 'https://api.daramanah.family';
const ROOM_SUGGESTIONS = ['Cuisine', 'Salon', 'Chambre', 'Salle de bain', 'Entrée', 'Extérieur'];

function getPositionSilently(timeoutMs = 5000) {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ location_lat: pos.coords.latitude, location_lng: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

const draftKey = (id) => `da_terrain_draft_${id}`;
function loadDraft(id) {
  try { return JSON.parse(localStorage.getItem(draftKey(id))) || {}; } catch { return {}; }
}
function saveDraft(id, partial) {
  const cur = loadDraft(id);
  const next = { ...cur, ...partial };
  try { localStorage.setItem(draftKey(id), JSON.stringify(next)); } catch {}
}
function clearDraft(id) {
  try { localStorage.removeItem(draftKey(id)); } catch {}
}

// Upload multipart direct : apiFetch hardcode Content-Type: application/json,
// incompatible avec FormData (le navigateur doit générer le boundary).
// Pas de refresh-token sur 401 ici — risque très faible pour un upload court.
async function uploadPhotoMultipart(id, formData) {
  const { access } = getTokens();
  const res = await fetch(`${API_BASE}/api/terrain/missions/${id}/report/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

let missionId = null;
let mission = null;
let uploadedPhotos = [];
let checkedItems = new Set();
let observations = '';
let startedAt = null;
let observationsDebounce = null;

function render(params) {
  missionId = params?.id;
  const content = `
    <a href="#/missions/${missionId}" class="text-sm text-teal-700 hover:underline inline-flex items-center gap-1 mb-3">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Retour à la mission
    </a>
    <div id="rep-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    <div id="rep-content" class="hidden"></div>
    <div id="rep-error" class="hidden text-center py-12">
      <p class="text-red-600 font-medium">Mission introuvable</p>
      <a href="#/missions" class="text-sm text-teal-700 mt-2 inline-block hover:underline">Retour aux missions</a>
    </div>`;
  return renderLayout(content);
}

async function bind(params) {
  bindLayoutEvents();
  missionId = params?.id;
  if (!missionId) { document.getElementById('rep-error').classList.remove('hidden'); document.getElementById('rep-loading').classList.add('hidden'); return; }

  uploadedPhotos = [];
  checkedItems = new Set();
  observations = '';
  startedAt = null;

  try {
    const data = await apiFetch('/api/terrain/missions?status=assigned,in_progress,completed,validated');
    mission = (data.missions || []).find(m => m.id === missionId);
    if (!mission) {
      document.getElementById('rep-loading').classList.add('hidden');
      document.getElementById('rep-error').classList.remove('hidden');
      return;
    }

    if (mission.status === 'assigned') {
      window.location.hash = `#/missions/${missionId}`;
      return;
    }

    if (mission.status === 'completed' || mission.status === 'validated') {
      renderReadOnly();
      return;
    }

    const draft = loadDraft(missionId);
    uploadedPhotos = Array.isArray(draft.uploadedPhotos) ? draft.uploadedPhotos : [];
    checkedItems = new Set(Array.isArray(draft.checklist) ? draft.checklist : []);
    observations = draft.observations || '';
    startedAt = draft.startedAt || new Date().toISOString();
    if (!draft.startedAt) saveDraft(missionId, { startedAt });

    renderEditMode();
  } catch (err) {
    console.error('Mission report error:', err);
    document.getElementById('rep-loading').classList.add('hidden');
    document.getElementById('rep-error').classList.remove('hidden');
  }
}

function renderReadOnly() {
  document.getElementById('rep-content').innerHTML = `
    <div class="mb-4">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">${escapeHtml(mission.title || 'Mission')}</h1>
    </div>
    <div class="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
      <p class="text-base font-semibold text-green-700 mb-2">Rapport déjà soumis</p>
      <p class="text-sm text-gray-600">Le détail du rapport est consultable côté admin antenne ou client.</p>
    </div>
    <div class="mt-4">
      <a href="#/missions" class="block w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl text-center text-sm font-medium hover:bg-gray-50 transition">Retour aux missions</a>
    </div>`;
  document.getElementById('rep-loading').classList.add('hidden');
  document.getElementById('rep-content').classList.remove('hidden');
}

function renderEditMode() {
  const items = getChecklist(mission.type);
  const checklistHtml = items.length > 0 ? `
    <div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h2 class="text-sm font-bold text-brand-navy mb-3">Checklist</h2>
      <div class="space-y-2">
        ${items.map(it => `
          <label class="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" data-check-item="${escapeHtml(it)}" ${checkedItems.has(it) ? 'checked' : ''} class="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500">
            <span class="text-sm text-gray-700">${escapeHtml(it)}</span>
          </label>`).join('')}
      </div>
    </div>` : `
    <div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <p class="text-xs text-gray-500">Pas de checklist pour ce type d'intervention.</p>
    </div>`;

  const photosHtml = `
    <div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h2 class="text-sm font-bold text-brand-navy mb-3">Photos</h2>
      <button id="btn-add-photo" type="button" class="w-full bg-teal-50 text-teal-700 border border-dashed border-teal-300 py-3 rounded-lg text-sm font-medium hover:bg-teal-100 transition mb-3">+ Ajouter une photo</button>
      <div id="photo-form" class="hidden bg-gray-50 rounded-lg p-3 mb-3">
        <div id="photo-form-error" class="hidden mb-2 text-xs text-red-600"></div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Pièce</label>
        <input id="photo-room" type="text" placeholder="ex: Cuisine" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2">
        <div class="flex flex-wrap gap-1 mb-2" id="room-suggestions">
          ${ROOM_SUGGESTIONS.map(r => `<button type="button" data-room="${escapeHtml(r)}" class="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100">${escapeHtml(r)}</button>`).join('')}
        </div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Moment</label>
        <div class="flex gap-2 mb-2">
          <button type="button" data-moment="before" class="moment-btn flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">Avant</button>
          <button type="button" data-moment="after" class="moment-btn flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">Après</button>
        </div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
        <input id="photo-caption" type="text" maxlength="280" placeholder="ex: fuite sous l'évier" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2">
        <label class="block text-xs font-medium text-gray-700 mb-1">Photo</label>
        <input id="photo-file" type="file" accept="image/*" capture="environment" class="w-full text-sm mb-3">
        <div class="flex gap-2">
          <button id="btn-cancel-photo" type="button" class="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">Annuler</button>
          <button id="btn-send-photo" type="button" class="flex-1 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">Envoyer la photo</button>
        </div>
      </div>
      <div id="photos-grid">${renderPhotosArea()}</div>
    </div>`;

  const observationsHtml = `
    <div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h2 class="text-sm font-bold text-brand-navy mb-3">Observations</h2>
      <textarea id="observations" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Commentaires, anomalies, points à signaler...">${escapeHtml(observations)}</textarea>
    </div>`;

  const submitHtml = `
    <div class="mt-6">
      <div id="submit-error" class="hidden mb-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>
      <button id="btn-submit" class="w-full bg-teal-600 text-white py-3 rounded-xl text-base font-semibold hover:bg-teal-700 transition">Terminer la mission</button>
    </div>`;

  document.getElementById('rep-content').innerHTML = `
    <div class="mb-4">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">${escapeHtml(mission.title || 'Rapport')}</h1>
      <p class="text-gray-500 text-sm mt-1">${escapeHtml(mission.property_name || '')}</p>
    </div>
    ${checklistHtml}
    ${photosHtml}
    ${observationsHtml}
    ${submitHtml}`;
  document.getElementById('rep-loading').classList.add('hidden');
  document.getElementById('rep-content').classList.remove('hidden');

  attachEditHandlers();
}

function renderPhotosArea() {
  if (uploadedPhotos.length === 0) {
    return '<p class="text-xs text-gray-400 text-center py-3">Aucune photo</p>';
  }
  const hasUrls = uploadedPhotos.every(p => !!p.url);
  if (hasUrls) return renderReportPhotos(uploadedPhotos);
  const momentLabel = { before: 'avant', after: 'après' };
  return '<div class="space-y-1">' + uploadedPhotos.map(p => {
    const label = `${escapeHtml(p.room || '')}${p.moment ? ' · ' + (momentLabel[p.moment] || escapeHtml(p.moment)) : ''}`;
    const cap = p.caption ? ` — <span class="italic text-gray-400">${escapeHtml(p.caption)}</span>` : '';
    return `<p class="text-xs text-gray-600">✓ ${label}${cap}</p>`;
  }).join('') + '</div>';
}

function resetPhotoForm() {
  document.getElementById('photo-form').classList.add('hidden');
  document.getElementById('btn-add-photo').classList.remove('hidden');
  document.getElementById('photo-room').value = '';
  document.getElementById('photo-caption').value = '';
  document.getElementById('photo-file').value = '';
  document.querySelectorAll('.moment-btn').forEach(b => b.classList.remove('bg-teal-600', 'text-white', 'border-teal-600'));
  document.getElementById('photo-form-error').classList.add('hidden');
  const sendBtn = document.getElementById('btn-send-photo');
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Envoyer la photo'; }
}

function attachEditHandlers() {
  document.querySelectorAll('[data-check-item]').forEach(input => {
    input.addEventListener('change', e => {
      const item = e.target.getAttribute('data-check-item');
      if (e.target.checked) checkedItems.add(item); else checkedItems.delete(item);
      saveDraft(missionId, { checklist: Array.from(checkedItems) });
    });
  });

  document.getElementById('observations')?.addEventListener('input', e => {
    observations = e.target.value;
    clearTimeout(observationsDebounce);
    observationsDebounce = setTimeout(() => saveDraft(missionId, { observations }), 300);
  });

  document.getElementById('btn-add-photo')?.addEventListener('click', () => {
    document.getElementById('photo-form').classList.remove('hidden');
    document.getElementById('btn-add-photo').classList.add('hidden');
  });
  document.getElementById('btn-cancel-photo')?.addEventListener('click', resetPhotoForm);

  document.querySelectorAll('#room-suggestions [data-room]').forEach(btn => {
    btn.addEventListener('click', e => {
      document.getElementById('photo-room').value = e.target.getAttribute('data-room');
    });
  });

  document.querySelectorAll('.moment-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.moment-btn').forEach(b => b.classList.remove('bg-teal-600', 'text-white', 'border-teal-600'));
      e.currentTarget.classList.add('bg-teal-600', 'text-white', 'border-teal-600');
    });
  });

  document.getElementById('btn-send-photo')?.addEventListener('click', async () => {
    const errEl = document.getElementById('photo-form-error');
    errEl.classList.add('hidden');
    const room = document.getElementById('photo-room').value.trim();
    const momentBtn = document.querySelector('.moment-btn.bg-teal-600');
    const moment = momentBtn?.getAttribute('data-moment') || '';
    const caption = document.getElementById('photo-caption').value.trim();
    const file = document.getElementById('photo-file').files?.[0];

    if (!room) { errEl.textContent = 'Indiquez la pièce.'; errEl.classList.remove('hidden'); return; }
    if (!moment) { errEl.textContent = 'Choisissez Avant ou Après.'; errEl.classList.remove('hidden'); return; }
    if (!file) { errEl.textContent = 'Sélectionnez une photo.'; errEl.classList.remove('hidden'); return; }

    const btn = document.getElementById('btn-send-photo');
    btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('room', room);
      fd.append('moment', moment);
      if (caption) fd.append('caption', caption);
      const result = await uploadPhotoMultipart(missionId, fd);
      uploadedPhotos.push(result.photo);
      saveDraft(missionId, { uploadedPhotos });
      document.getElementById('photos-grid').innerHTML = renderPhotosArea();
      resetPhotoForm();
    } catch (err) {
      errEl.textContent = err?.message || "Échec de l'envoi, réessayez";
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Envoyer la photo';
    }
  });

  document.getElementById('btn-submit')?.addEventListener('click', async () => {
    if (!confirm('Terminer la mission ? Cette action est irréversible.')) return;
    const errEl = document.getElementById('submit-error');
    const btn = document.getElementById('btn-submit');
    errEl.classList.add('hidden');
    btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    try {
      const pos = await getPositionSilently();
      const body = {
        checklist: Array.from(checkedItems),
        observations,
        ...pos,
      };
      if (startedAt) {
        body.duration_minutes = Math.max(1, Math.round((Date.now() - Date.parse(startedAt)) / 60000));
      }
      await apiFetch(`/api/terrain/missions/${missionId}/report`, { method: 'POST', body: JSON.stringify(body) });
      clearDraft(missionId);
      window.location.hash = '#/missions';
    } catch (err) {
      errEl.textContent = err?.message || 'Erreur lors de la soumission, réessayez';
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Terminer la mission';
    }
  });
}

export { render, bind };
