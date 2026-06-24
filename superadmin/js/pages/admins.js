import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';
import { showOneShotSecret } from '../utils/oneShotSecret.js';

const COUNTRY_LABELS = { MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie' };
const COUNTRY_ORDER = ['MA', 'DZ', 'TN'];

let allAdmins = [];
let allBranches = [];
let currentManagerAdminId = null;
let currentManageBranchesCountry = null;

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function friendlyErr(err) {
  if (!err) return 'Erreur inconnue';
  switch (err.code) {
    case 'USER_EXISTS_AS_ADMIN':   return 'Un admin existe déjà avec cet email.';
    case 'USER_EXISTS_AS_CLIENT':  return "Cet email est déjà un compte client. Pas de promotion automatique vers admin.";
    case 'USER_EXISTS':            return 'Cet email est déjà utilisé.';
    case 'MISSING_FIELDS':         return 'Prénom, nom et email sont obligatoires.';
    case 'INVALID_EMAIL':          return "Format d'email invalide.";
    case 'INVALID_BODY':           return 'Données invalides.';
    case 'ADMIN_COUNTRY_MISMATCH': return err.message || "Cet admin gère déjà une antenne dans un autre pays.";
    case 'CANNOT_UPDATE_POOL':     return 'Opération impossible sur cette antenne (entité système).';
    case 'INVALID_MANAGER':        return "L'admin sélectionné n'est pas valide.";
    case 'NOT_FOUND':              return "Cette antenne n'existe plus. La liste a été rafraîchie.";
    default:                       return err.message || 'Erreur';
  }
}

function adminCountry(a) {
  // Le pays d'un admin = celui de sa premiere antenne (cross-pays interdit cote backend).
  if (a.branches && a.branches.length > 0) return a.branches[0].country;
  return null;
}

function renderAdminCard(a) {
  const phone = a.phone ? ` · ${escapeHtml(a.phone)}` : '';
  const branchBadges = (a.branches || []).length > 0
    ? a.branches.map(b => `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium mr-1 mb-1">${escapeHtml(b.name)} (${escapeHtml(b.country)})</span>`).join('')
    : `<span class="text-xs text-amber-600">Aucune antenne assignée</span>`;
  return `<div class="bg-white rounded-xl border border-gray-200 p-4 card-hover">
    <h3 class="font-semibold text-brand-navy text-sm">${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)}</h3>
    <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(a.email)}${phone}</p>
    <div class="mt-2 flex flex-wrap">${branchBadges}</div>
    <div class="mt-3 flex gap-2">
      <button data-manage="${a.id}" class="adm-manage-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Gérer les antennes</button>
    </div>
  </div>`;
}

function renderCountryBlock(label, admins) {
  return `<section>
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">${escapeHtml(label)}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${admins.map(renderAdminCard).join('')}</div>
  </section>`;
}

function attachCardListeners() {
  document.querySelectorAll('.adm-manage-btn').forEach(btn => {
    btn.addEventListener('click', () => openManageBranchesModal(btn.dataset.manage));
  });
}

function groupAndRender() {
  document.getElementById('adm-loading').classList.add('hidden');
  const listEl = document.getElementById('adm-list');
  const emptyEl = document.getElementById('adm-empty');
  if (allAdmins.length === 0) {
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  const groups = { _unaffected: [], MA: [], DZ: [], TN: [] };
  for (const a of allAdmins) {
    const c = adminCountry(a);
    if (c) groups[c].push(a);
    else groups._unaffected.push(a);
  }

  const blocks = [];
  if (groups._unaffected.length > 0) {
    blocks.push(renderCountryBlock('Non affectés', groups._unaffected));
  }
  for (const c of COUNTRY_ORDER) {
    if (groups[c].length > 0) {
      blocks.push(renderCountryBlock(COUNTRY_LABELS[c], groups[c]));
    }
  }
  listEl.innerHTML = blocks.join('');
  listEl.classList.remove('hidden');
  attachCardListeners();
}

async function loadAll() {
  document.getElementById('adm-loading').classList.remove('hidden');
  document.getElementById('adm-empty').classList.add('hidden');
  document.getElementById('adm-list').classList.add('hidden');
  try {
    const [adminsData, branchesData] = await Promise.all([
      apiFetch('/api/admin/branch-admins'),
      apiFetch('/api/admin/branches'),
    ]);
    allAdmins = adminsData.admins || [];
    allBranches = (branchesData.branches || []).filter(b => !b.id.startsWith('branch_pool_'));
    groupAndRender();
  } catch (err) {
    console.error(err);
    const loadingEl = document.getElementById('adm-loading');
    const p = document.createElement('p');
    p.className = 'text-red-600 text-sm text-center';
    p.textContent = 'Erreur de chargement';
    loadingEl.replaceChildren(p);
  }
}

function openCreateModal() {
  document.getElementById('adm-create-modal').classList.remove('hidden');
}

function resetCreateModalState() {
  document.getElementById('adm-create-modal').classList.add('hidden');
  document.getElementById('adm-create-form').classList.remove('hidden');
  document.getElementById('adm-create-result').classList.add('hidden');
  document.getElementById('adm-create-secret-container').innerHTML = '';
  document.getElementById('adm-create-firstname').value = '';
  document.getElementById('adm-create-lastname').value = '';
  document.getElementById('adm-create-email').value = '';
  document.getElementById('adm-create-phone').value = '';
  document.getElementById('adm-create-title').textContent = 'Nouvel admin';
}

function cancelCreate() {
  resetCreateModalState();
}

async function finishCreate() {
  resetCreateModalState();
  await loadAll();
}

async function submitCreate(e) {
  e.preventDefault();
  const first_name = document.getElementById('adm-create-firstname').value.trim();
  const last_name = document.getElementById('adm-create-lastname').value.trim();
  const email = document.getElementById('adm-create-email').value.trim();
  const phone = document.getElementById('adm-create-phone').value.trim();
  if (!first_name || !last_name || !email) {
    alert('Prénom, nom et email sont obligatoires.');
    return;
  }
  const submitBtn = document.getElementById('adm-create-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Création…';
  try {
    const body = { first_name, last_name, email };
    if (phone) body.phone = phone;
    const data = await apiFetch('/api/admin/branch-admins', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('adm-create-form').classList.add('hidden');
    document.getElementById('adm-create-result').classList.remove('hidden');
    document.getElementById('adm-create-title').textContent = `Admin créé : ${data.user.first_name} ${data.user.last_name}`;
    showOneShotSecret(
      document.getElementById('adm-create-secret-container'),
      data.initial_password,
      'Mot de passe temporaire'
    );
  } catch (err) {
    alert(friendlyErr(err));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Créer';
  }
}

// --- Manage branches modal ---

function openManageBranchesModal(adminId) {
  const admin = allAdmins.find(a => a.id === adminId);
  if (!admin) return;
  currentManagerAdminId = adminId;
  document.getElementById('adm-manage-title').textContent = `Gérer les antennes — ${admin.first_name} ${admin.last_name}`;

  const country = adminCountry(admin);
  const wrap = document.getElementById('adm-manage-country-wrap');
  const select = document.getElementById('adm-manage-country');
  if (country) {
    wrap.classList.add('hidden');
    currentManageBranchesCountry = country;
  } else {
    wrap.classList.remove('hidden');
    select.value = '';
    currentManageBranchesCountry = null;
  }

  renderManageBranchesList();
  document.getElementById('adm-manage-modal').classList.remove('hidden');
}

function closeManageBranchesModal() {
  document.getElementById('adm-manage-modal').classList.add('hidden');
  currentManagerAdminId = null;
  currentManageBranchesCountry = null;
}

function renderManageBranchRow(b) {
  const isManagedByCurrent = b.manager_id === currentManagerAdminId;
  const otherManager = b.manager_id && b.manager_id !== currentManagerAdminId
    ? allAdmins.find(a => a.id === b.manager_id)
    : null;
  const otherManagerName = otherManager ? `${otherManager.first_name} ${otherManager.last_name}` : null;

  let actionBtn;
  if (isManagedByCurrent) {
    actionBtn = `<button data-branch="${b.id}" class="adm-unassign-btn text-xs px-3 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 whitespace-nowrap">Retirer</button>`;
  } else if (otherManagerName) {
    actionBtn = `<button data-branch="${b.id}" class="adm-assign-btn text-xs px-3 py-1 rounded-lg bg-brand-gold text-white hover:opacity-90 whitespace-nowrap" title="Actuellement gérée par ${escapeHtml(otherManagerName)} — l'assigner ici la transférera.">Assigner (transfert)</button>`;
  } else {
    actionBtn = `<button data-branch="${b.id}" class="adm-assign-btn text-xs px-3 py-1 rounded-lg bg-brand-gold text-white hover:opacity-90 whitespace-nowrap">Assigner</button>`;
  }

  const managerInfo = isManagedByCurrent
    ? '<span class="text-xs text-green-700">Gérée par cet admin</span>'
    : otherManagerName
      ? `<span class="text-xs text-amber-600">Gérée par ${escapeHtml(otherManagerName)}</span>`
      : '<span class="text-xs text-gray-500">Aucun responsable</span>';

  return `<div class="flex items-center justify-between gap-2 p-3 border border-gray-200 rounded-lg">
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-brand-navy truncate">${escapeHtml(b.name)}</p>
      <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(b.city)} · ${managerInfo}</p>
    </div>
    ${actionBtn}
  </div>`;
}

function renderManageBranchesList() {
  const listEl = document.getElementById('adm-manage-list');
  const emptyEl = document.getElementById('adm-manage-empty');
  if (!currentManageBranchesCountry) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  const branchesInCountry = allBranches.filter(b => b.country === currentManageBranchesCountry);
  if (branchesInCountry.length === 0) {
    listEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Aucune antenne dans ce pays.</p>';
    return;
  }
  listEl.innerHTML = branchesInCountry.map(renderManageBranchRow).join('');

  listEl.querySelectorAll('.adm-assign-btn').forEach(btn => {
    btn.addEventListener('click', () => assignBranch(btn.dataset.branch, currentManagerAdminId));
  });
  listEl.querySelectorAll('.adm-unassign-btn').forEach(btn => {
    btn.addEventListener('click', () => assignBranch(btn.dataset.branch, null));
  });
}

async function assignBranch(branchId, managerId) {
  // Confirm transfert si l'antenne a deja un autre manager.
  if (managerId) {
    const b = allBranches.find(x => x.id === branchId);
    if (b && b.manager_id && b.manager_id !== managerId) {
      const other = allAdmins.find(a => a.id === b.manager_id);
      const otherName = other ? `${other.first_name} ${other.last_name}` : 'un autre admin';
      if (!confirm(`Cette antenne est actuellement gérée par ${otherName}. Transférer à cet admin ?`)) return;
    }
  }

  try {
    await apiFetch(`/api/admin/branches/${branchId}/manager`, {
      method: 'PUT',
      body: JSON.stringify({ manager_id: managerId }),
    });
    const [adminsData, branchesData] = await Promise.all([
      apiFetch('/api/admin/branch-admins'),
      apiFetch('/api/admin/branches'),
    ]);
    allAdmins = adminsData.admins || [];
    allBranches = (branchesData.branches || []).filter(b => !b.id.startsWith('branch_pool_'));
    // Si l'admin avait 0 antenne et vient d'en recevoir une, son pays est defini :
    // recalculer currentManageBranchesCountry et masquer le select pays.
    const admin = allAdmins.find(a => a.id === currentManagerAdminId);
    if (admin) {
      const newCountry = adminCountry(admin);
      if (newCountry) {
        currentManageBranchesCountry = newCountry;
        document.getElementById('adm-manage-country-wrap').classList.add('hidden');
      }
    }
    groupAndRender();
    renderManageBranchesList();
  } catch (err) {
    alert(friendlyErr(err));
  }
}

function render() {
  const content = `
    <div class="mb-6 flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-serif font-bold text-brand-navy">Admins</h1>
        <p class="text-gray-500 text-sm mt-1">Administrateurs d'antennes (branch_admin), groupés par pays.</p>
      </div>
      <button id="adm-create-btn" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">+ Créer un admin</button>
    </div>

    <div id="adm-loading" class="flex justify-center py-8"><div class="spinner"></div></div>
    <div id="adm-empty" class="hidden text-center py-10 text-gray-500 text-sm">Aucun admin. Cliquez sur « + Créer un admin » pour commencer.</div>
    <div id="adm-list" class="hidden space-y-8"></div>

    <!-- Modal Create (2 modes : formulaire → résultat) -->
    <div id="adm-create-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 id="adm-create-title" class="text-base font-bold text-brand-navy mb-3">Nouvel admin</h3>

        <form id="adm-create-form" class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Prénom <span class="text-red-500">*</span></label>
            <input id="adm-create-firstname" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Nom <span class="text-red-500">*</span></label>
            <input id="adm-create-lastname" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Email <span class="text-red-500">*</span></label>
            <input id="adm-create-email" type="email" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Téléphone</label>
            <input id="adm-create-phone" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" id="adm-create-cancel" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button type="submit" id="adm-create-submit" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Créer</button>
          </div>
        </form>

        <div id="adm-create-result" class="hidden">
          <p class="text-sm text-green-700 mb-2">✓ Admin créé avec succès.</p>
          <p class="text-xs text-gray-600 mb-3">Communiquez ce mot de passe à l'admin par un canal de votre choix (WhatsApp, oral…). Il ne sera plus visible après fermeture.</p>
          <div id="adm-create-secret-container"></div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" id="adm-create-close" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Fermer</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Manage branches -->
    <div id="adm-manage-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 id="adm-manage-title" class="text-base font-bold text-brand-navy mb-3">Gérer les antennes</h3>

        <div id="adm-manage-country-wrap" class="hidden mb-3">
          <label class="block text-xs text-gray-600 mb-1">Pays</label>
          <select id="adm-manage-country" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">— Sélectionner un pays —</option>
            <option value="MA">Maroc</option>
            <option value="DZ">Algérie</option>
            <option value="TN">Tunisie</option>
          </select>
          <p class="text-[10px] text-gray-400 mt-1">Cet admin n'a aucune antenne — choisir un pays pour voir les antennes disponibles.</p>
        </div>

        <div id="adm-manage-list" class="space-y-2"></div>
        <div id="adm-manage-empty" class="hidden text-center py-6 text-gray-500 text-sm">Sélectionnez un pays pour voir ses antennes.</div>

        <div class="flex justify-end gap-2 mt-4">
          <button type="button" id="adm-manage-close" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Fermer</button>
        </div>
      </div>
    </div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  document.getElementById('adm-create-btn').addEventListener('click', openCreateModal);
  document.getElementById('adm-create-cancel').addEventListener('click', cancelCreate);
  document.getElementById('adm-create-form').addEventListener('submit', submitCreate);
  document.getElementById('adm-create-close').addEventListener('click', finishCreate);
  document.getElementById('adm-manage-close').addEventListener('click', closeManageBranchesModal);
  document.getElementById('adm-manage-country').addEventListener('change', (e) => {
    currentManageBranchesCountry = e.target.value || null;
    renderManageBranchesList();
  });
  await loadAll();
}

export { render, bind };
