import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';
import { showOneShotSecret } from '../utils/oneShotSecret.js';

const COUNTRY_LABELS = { MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie' };
const COUNTRY_ORDER = ['MA', 'DZ', 'TN'];

let allAdmins = [];

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
    case 'INVALID_EMAIL':          return 'Format d\'email invalide.';
    case 'INVALID_BODY':           return 'Données de formulaire invalides.';
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
  </div>`;
}

function renderCountryBlock(label, admins, hint) {
  const hintHtml = hint ? `<p class="text-xs text-amber-600 mb-3">${escapeHtml(hint)}</p>` : '';
  return `<section>
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">${escapeHtml(label)}</h2>
    ${hintHtml}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${admins.map(renderAdminCard).join('')}</div>
  </section>`;
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
    blocks.push(renderCountryBlock(
      'Non affectés',
      groups._unaffected,
      'Pour assigner une antenne à un admin, voir la page Organisation.'
    ));
  }
  for (const c of COUNTRY_ORDER) {
    if (groups[c].length > 0) {
      blocks.push(renderCountryBlock(COUNTRY_LABELS[c], groups[c], null));
    }
  }
  listEl.innerHTML = blocks.join('');
  listEl.classList.remove('hidden');
}

async function loadAdmins() {
  document.getElementById('adm-loading').classList.remove('hidden');
  document.getElementById('adm-empty').classList.add('hidden');
  document.getElementById('adm-list').classList.add('hidden');
  try {
    const data = await apiFetch('/api/admin/branch-admins');
    allAdmins = data.admins || [];
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
  await loadAdmins();
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
    // Switch to result mode
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
    </div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  document.getElementById('adm-create-btn').addEventListener('click', openCreateModal);
  document.getElementById('adm-create-cancel').addEventListener('click', cancelCreate);
  document.getElementById('adm-create-form').addEventListener('submit', submitCreate);
  document.getElementById('adm-create-close').addEventListener('click', finishCreate);
  await loadAdmins();
}

export { render, bind };
