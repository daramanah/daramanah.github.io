import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const COUNTRY_LABELS = { MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie' };
const COUNTRY_ORDER = ['MA', 'DZ', 'TN'];

let allBranches = [];
let allAdmins = [];
let managerMap = new Map();
let currentDeleteId = null;
let currentManagerBranchId = null;

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function friendlyErr(err) {
  if (!err) return 'Erreur inconnue';
  switch (err.code) {
    case 'MISSING_FIELDS':         return 'Champs manquants : nom, pays et ville sont obligatoires.';
    case 'INVALID_COUNTRY':        return 'Pays invalide. Choisissez MA, DZ ou TN.';
    case 'INVALID_STATUS':         return 'Statut invalide. Doit être Actif ou Inactif.';
    case 'NOT_FOUND':              return "Cette antenne n'existe plus. La liste a été rafraîchie.";
    case 'ADMIN_COUNTRY_MISMATCH': return err.message || "Cet admin gère déjà une antenne dans un autre pays.";
    case 'INVALID_MANAGER':        return "L'admin sélectionné n'est pas valide.";
    case 'CANNOT_UPDATE_POOL':
    case 'CANNOT_DELETE_POOL':
      return 'Opération impossible sur cette antenne (entité système).';
    default: return err.message || 'Erreur';
  }
}

function renderBranchCard(b) {
  const statusClass = b.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
  const statusLabel = b.status === 'active' ? 'Actif' : 'Inactif';
  const coverage = b.coverage_cities
    ? `<p class="text-xs text-gray-500 mt-1">Couvre : ${escapeHtml(b.coverage_cities)}</p>`
    : '';
  const managerLabel = b.manager_id ? managerMap.get(b.manager_id) : null;
  const managerLine = managerLabel
    ? `<p class="text-xs text-gray-500 mt-1">Responsable : <strong>${escapeHtml(managerLabel)}</strong></p>`
    : `<p class="text-xs text-amber-600 mt-1">Aucun responsable assigné</p>`;
  return `<div class="bg-white rounded-xl border border-gray-200 p-4 card-hover">
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-brand-navy text-sm truncate">${escapeHtml(b.name)}</h3>
        <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(b.city)}</p>
        ${coverage}
        ${managerLine}
      </div>
      <span class="ml-3 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusClass}">${statusLabel}</span>
    </div>
    <div class="flex gap-2 mt-3">
      <button data-edit="${b.id}" class="org-edit-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Éditer</button>
      <button data-manager="${b.id}" class="org-manager-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Responsable</button>
      <button data-delete="${b.id}" class="org-delete-btn text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">Supprimer</button>
    </div>
  </div>`;
}

function renderCountryBlock(country, branches) {
  return `<section>
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">${COUNTRY_LABELS[country] || country}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${branches.map(renderBranchCard).join('')}</div>
  </section>`;
}

function groupAndRender() {
  document.getElementById('org-loading').classList.add('hidden');
  const listEl = document.getElementById('org-list');
  const emptyEl = document.getElementById('org-empty');
  if (allBranches.length === 0) {
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  const groups = {};
  for (const b of allBranches) {
    if (!groups[b.country]) groups[b.country] = [];
    groups[b.country].push(b);
  }
  const html = COUNTRY_ORDER
    .filter(c => groups[c])
    .map(c => renderCountryBlock(c, groups[c]))
    .join('');
  listEl.innerHTML = html;
  listEl.classList.remove('hidden');
  attachCardListeners();
}

async function loadAll() {
  document.getElementById('org-loading').classList.remove('hidden');
  document.getElementById('org-empty').classList.add('hidden');
  document.getElementById('org-list').classList.add('hidden');
  try {
    const [branchesData, adminsData] = await Promise.all([
      apiFetch('/api/admin/branches'),
      apiFetch('/api/admin/branch-admins'),
    ]);
    // Defense en profondeur : double-filtre des pools cote client.
    allBranches = (branchesData.branches || []).filter(b => !b.id.startsWith('branch_pool_'));
    allAdmins = adminsData.admins || [];
    managerMap = new Map(allAdmins.map(a => [a.id, `${a.first_name} ${a.last_name}`]));
    groupAndRender();
  } catch (err) {
    console.error(err);
    const loadingEl = document.getElementById('org-loading');
    const p = document.createElement('p');
    p.className = 'text-red-600 text-sm text-center';
    p.textContent = 'Erreur de chargement';
    loadingEl.replaceChildren(p);
  }
}

function attachCardListeners() {
  document.querySelectorAll('.org-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.edit));
  });
  document.querySelectorAll('.org-manager-btn').forEach(btn => {
    btn.addEventListener('click', () => openManagerModal(btn.dataset.manager));
  });
  document.querySelectorAll('.org-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.delete));
  });
}

function openCreateModal() {
  document.getElementById('org-form-title').textContent = 'Nouvelle antenne';
  document.getElementById('org-form-id').value = '';
  document.getElementById('org-form-name').value = '';
  document.getElementById('org-form-country').value = '';
  document.getElementById('org-form-country').disabled = false;
  document.getElementById('org-form-city').value = '';
  document.getElementById('org-form-phone').value = '';
  document.getElementById('org-form-email').value = '';
  document.getElementById('org-form-whatsapp').value = '';
  document.getElementById('org-form-coverage').value = '';
  document.getElementById('org-form-currency').value = 'EUR';
  document.getElementById('org-form-status-wrap').classList.add('hidden');
  document.getElementById('org-form-modal').classList.remove('hidden');
}

function openEditModal(id) {
  const b = allBranches.find(x => x.id === id);
  if (!b) return;
  document.getElementById('org-form-title').textContent = `Éditer « ${b.name} »`;
  document.getElementById('org-form-id').value = b.id;
  document.getElementById('org-form-name').value = b.name || '';
  document.getElementById('org-form-country').value = b.country || '';
  document.getElementById('org-form-country').disabled = true;
  document.getElementById('org-form-city').value = b.city || '';
  document.getElementById('org-form-phone').value = b.phone || '';
  document.getElementById('org-form-email').value = b.email || '';
  document.getElementById('org-form-whatsapp').value = b.whatsapp_number || '';
  document.getElementById('org-form-coverage').value = b.coverage_cities || '';
  document.getElementById('org-form-currency').value = b.currency || 'EUR';
  document.getElementById('org-form-status').value = b.status || 'active';
  document.getElementById('org-form-status-wrap').classList.remove('hidden');
  document.getElementById('org-form-modal').classList.remove('hidden');
}

function closeFormModal() {
  document.getElementById('org-form-modal').classList.add('hidden');
}

async function submitForm(e) {
  e.preventDefault();
  const id = document.getElementById('org-form-id').value;
  const name = document.getElementById('org-form-name').value.trim();
  const country = document.getElementById('org-form-country').value;
  const city = document.getElementById('org-form-city').value.trim();
  if (!name || !country || !city) {
    alert('Nom, pays et ville sont obligatoires.');
    return;
  }
  const submitBtn = document.getElementById('org-form-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Envoi…';
  try {
    if (id) {
      const body = {
        name,
        city,
        phone: document.getElementById('org-form-phone').value.trim() || null,
        email: document.getElementById('org-form-email').value.trim() || null,
        whatsapp_number: document.getElementById('org-form-whatsapp').value.trim() || null,
        coverage_cities: document.getElementById('org-form-coverage').value.trim() || null,
        currency: document.getElementById('org-form-currency').value.trim() || 'EUR',
        status: document.getElementById('org-form-status').value,
      };
      await apiFetch(`/api/admin/branches/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      const body = { name, country, city };
      const phone = document.getElementById('org-form-phone').value.trim();
      const email = document.getElementById('org-form-email').value.trim();
      const wa = document.getElementById('org-form-whatsapp').value.trim();
      const cov = document.getElementById('org-form-coverage').value.trim();
      const curr = document.getElementById('org-form-currency').value.trim();
      if (phone) body.phone = phone;
      if (email) body.email = email;
      if (wa) body.whatsapp_number = wa;
      if (cov) body.coverage_cities = cov;
      if (curr) body.currency = curr;
      await apiFetch('/api/admin/branches', { method: 'POST', body: JSON.stringify(body) });
    }
    closeFormModal();
    await loadAll();
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      closeFormModal();
      await loadAll();
    }
    alert(friendlyErr(err));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enregistrer';
  }
}

async function openDeleteModal(id) {
  const b = allBranches.find(x => x.id === id);
  if (!b) return;
  currentDeleteId = id;
  document.getElementById('org-delete-msg').textContent = 'Chargement…';
  document.getElementById('org-delete-modal').classList.remove('hidden');
  try {
    const usage = await apiFetch(`/api/admin/branches/${id}/usage`);
    const msg = `Supprimer l'antenne « ${b.name} » ? Elle a actuellement `
      + `${usage.team_members_count} agent(s), `
      + `${usage.properties_count} bien(s), `
      + `${usage.requests_count} demande(s) rattachés. `
      + `Les agents seront détachés vers le pool des non-affectés (et désactivés). `
      + `Les biens et demandes seront conservés.`;
    document.getElementById('org-delete-msg').textContent = msg;
  } catch (err) {
    document.getElementById('org-delete-msg').textContent =
      'Erreur de chargement des usages. Suppression possible mais sans détail.';
  }
}

function closeDeleteModal() {
  document.getElementById('org-delete-modal').classList.add('hidden');
  currentDeleteId = null;
}

async function confirmDelete() {
  if (!currentDeleteId) return;
  const btn = document.getElementById('org-delete-confirm');
  btn.disabled = true;
  btn.textContent = 'Suppression…';
  try {
    await apiFetch(`/api/admin/branches/${currentDeleteId}`, { method: 'DELETE' });
    closeDeleteModal();
    await loadAll();
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      closeDeleteModal();
      await loadAll();
    } else {
      btn.disabled = false;
      btn.textContent = 'Confirmer la suppression';
    }
    alert(friendlyErr(err));
  }
}

// --- Manager assignment modal ---

function openManagerModal(branchId) {
  const b = allBranches.find(x => x.id === branchId);
  if (!b) return;
  currentManagerBranchId = branchId;
  document.getElementById('org-manager-title').textContent = `Responsable — ${b.name}`;
  document.getElementById('org-manager-subtitle').textContent = `Pays : ${COUNTRY_LABELS[b.country] || b.country}`;

  // Peupler le select : admins du meme pays + admins non-affectes (sans pays defini).
  const select = document.getElementById('org-manager-select');
  while (select.options.length > 1) select.remove(1);

  const eligible = allAdmins.filter(a => {
    const c = a.branches && a.branches.length > 0 ? a.branches[0].country : null;
    return c === null || c === b.country;
  });
  for (const a of eligible) {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.first_name} ${a.last_name} (${a.email})`;
    if (a.id === b.manager_id) opt.selected = true;
    select.appendChild(opt);
  }

  document.getElementById('org-manager-modal').classList.remove('hidden');
}

function closeManagerModal() {
  document.getElementById('org-manager-modal').classList.add('hidden');
  currentManagerBranchId = null;
}

async function saveManager() {
  if (!currentManagerBranchId) return;
  const select = document.getElementById('org-manager-select');
  const managerId = select.value || null;

  // Confirmation transfert si l'antenne a deja un autre manager.
  const b = allBranches.find(x => x.id === currentManagerBranchId);
  if (managerId && b && b.manager_id && b.manager_id !== managerId) {
    const otherName = managerMap.get(b.manager_id) || 'un autre admin';
    if (!confirm(`Cette antenne est actuellement gérée par ${otherName}. Transférer ?`)) return;
  }

  const btn = document.getElementById('org-manager-save');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  try {
    await apiFetch(`/api/admin/branches/${currentManagerBranchId}/manager`, {
      method: 'PUT',
      body: JSON.stringify({ manager_id: managerId }),
    });
    closeManagerModal();
    await loadAll();
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      closeManagerModal();
      await loadAll();
    }
    alert(friendlyErr(err));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

function render() {
  const content = `
    <div class="mb-6 flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-serif font-bold text-brand-navy">Organisation</h1>
        <p class="text-gray-500 text-sm mt-1">Gestion des antennes par pays.</p>
      </div>
      <button id="org-create-btn" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">+ Créer une antenne</button>
    </div>

    <div id="org-loading" class="flex justify-center py-8"><div class="spinner"></div></div>
    <div id="org-empty" class="hidden text-center py-10 text-gray-500 text-sm">Aucune antenne. Cliquez sur « + Créer une antenne » pour commencer.</div>
    <div id="org-list" class="hidden space-y-8"></div>

    <!-- Modal Create/Edit -->
    <div id="org-form-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 id="org-form-title" class="text-base font-bold text-brand-navy mb-3">Nouvelle antenne</h3>
        <form id="org-form" class="space-y-3">
          <input type="hidden" id="org-form-id">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Nom <span class="text-red-500">*</span></label>
            <input id="org-form-name" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Pays <span class="text-red-500">*</span></label>
            <select id="org-form-country" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">— Sélectionner —</option>
              <option value="MA">Maroc</option>
              <option value="DZ">Algérie</option>
              <option value="TN">Tunisie</option>
            </select>
            <p class="text-[10px] text-gray-400 mt-1">Le pays n'est pas modifiable après création.</p>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Ville <span class="text-red-500">*</span></label>
            <input id="org-form-city" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Téléphone</label>
            <input id="org-form-phone" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Email</label>
            <input id="org-form-email" type="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">WhatsApp</label>
            <input id="org-form-whatsapp" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Villes couvertes (séparées par des virgules)</label>
            <input id="org-form-coverage" type="text" placeholder="Ex : Casablanca, Rabat, Mohammedia" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Devise</label>
            <input id="org-form-currency" type="text" value="EUR" maxlength="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div id="org-form-status-wrap" class="hidden">
            <label class="block text-xs text-gray-600 mb-1">Statut</label>
            <select id="org-form-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" id="org-form-cancel" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button type="submit" id="org-form-submit" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Delete with usage -->
    <div id="org-delete-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-5 max-w-md w-full">
        <h3 class="text-base font-bold text-brand-navy mb-2">Supprimer l'antenne ?</h3>
        <p id="org-delete-msg" class="text-sm text-gray-600 mb-3">Chargement…</p>
        <p class="text-xs text-red-600 mb-4 font-medium">Cette action est irréversible.</p>
        <div class="flex justify-end gap-2">
          <button id="org-delete-cancel" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button id="org-delete-confirm" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Confirmer la suppression</button>
        </div>
      </div>
    </div>

    <!-- Modal Manager assignment -->
    <div id="org-manager-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 id="org-manager-title" class="text-base font-bold text-brand-navy mb-2">Responsable de l'antenne</h3>
        <p id="org-manager-subtitle" class="text-xs text-gray-500 mb-3"></p>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Admin du même pays</label>
          <select id="org-manager-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">— Aucun (retirer le responsable) —</option>
          </select>
          <p class="text-[10px] text-gray-400 mt-1">Les admins non affectés et ceux du pays de cette antenne sont éligibles.</p>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" id="org-manager-cancel" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button type="button" id="org-manager-save" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Enregistrer</button>
        </div>
      </div>
    </div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  document.getElementById('org-create-btn').addEventListener('click', openCreateModal);
  document.getElementById('org-form-cancel').addEventListener('click', closeFormModal);
  document.getElementById('org-form').addEventListener('submit', submitForm);
  document.getElementById('org-delete-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('org-delete-confirm').addEventListener('click', confirmDelete);
  document.getElementById('org-manager-cancel').addEventListener('click', closeManagerModal);
  document.getElementById('org-manager-save').addEventListener('click', saveManager);
  await loadAll();
}

export { render, bind };
