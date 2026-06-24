import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';
import { showOneShotSecret } from '../utils/oneShotSecret.js';

const COUNTRY_LABELS = { MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie' };
const COUNTRY_ORDER = ['MA', 'DZ', 'TN'];
const SPECIALTY_LABELS = {
  visit: 'Visite',
  cleaning: 'Ménage',
  groceries: 'Courses',
  meter_reading: 'Relevé compteurs',
  repair: 'Réparation',
  garden: 'Jardin',
};
const SPECIALTY_ORDER = ['visit', 'cleaning', 'groceries', 'meter_reading', 'repair', 'garden'];

let allAgents = [];
let allBranches = [];
let pendingForcePromote = null;

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function friendlyErr(err) {
  if (!err) return 'Erreur inconnue';
  switch (err.code) {
    case 'USER_EXISTS_AS_ADMIN':       return 'Cet email correspond à un admin, impossible de le réutiliser comme agent.';
    case 'USER_EXISTS_AS_CLIENT':      return "Cet email est un compte client existant. Cochez « Promouvoir » pour le convertir.";
    case 'MISSING_FIELDS':             return 'Tous les champs sont obligatoires (au moins 1 spécialité).';
    case 'INVALID_EMAIL':              return "Format d'email invalide.";
    case 'INVALID_SPECIALTIES':        return 'Une ou plusieurs spécialités sélectionnées sont invalides.';
    case 'MISSING_SPECIALTIES_OTHER':  return 'Précisez la spécialité « Autre » dans le champ texte.';
    case 'ALREADY_MEMBER':             return 'Cet agent est déjà affecté à cette antenne.';
    case 'BRANCH_NOT_FOUND':           return "L'antenne sélectionnée n'existe plus.";
    case 'BRANCH_WRONG_COUNTRY':       return "Vous ne pouvez créer un agent que dans votre pays.";
    case 'INVALID_BODY':               return 'Données invalides.';
    default:                           return err.message || 'Erreur';
  }
}

function agentCountry(a) {
  if (a.memberships && a.memberships.length > 0) return a.memberships[0].branch_country;
  return null;
}

function agentIsPoolOnly(a) {
  return (a.memberships || []).length > 0
    && (a.memberships || []).every(m => m.branch_id && m.branch_id.startsWith('branch_pool_'));
}

function agentSpecialties(a) {
  // Union dédupliquée des specialties.list de toutes les memberships + le premier "other".
  const set = new Set();
  let other = null;
  for (const m of (a.memberships || [])) {
    const list = m.specialties?.list || [];
    for (const s of list) set.add(s);
    if (m.specialties?.other && !other) other = m.specialties.other;
  }
  return { list: Array.from(set), other };
}

function renderAgentCard(a) {
  const phone = a.phone ? ` · ${escapeHtml(a.phone)}` : '';
  const specs = agentSpecialties(a);
  const isPool = agentIsPoolOnly(a);
  const realBranches = (a.memberships || []).filter(m => m.branch_id && !m.branch_id.startsWith('branch_pool_'));

  const specBadges = specs.list.length > 0
    ? specs.list.map(s => `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium mr-1 mb-1">${escapeHtml(SPECIALTY_LABELS[s] || s)}</span>`).join('')
    : '';
  const otherBadge = specs.other
    ? `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium mr-1 mb-1">Autre : ${escapeHtml(specs.other)}</span>`
    : '';
  const specBlock = (specs.list.length === 0 && !specs.other)
    ? '<span class="text-xs text-gray-400">— Aucune</span>'
    : specBadges + otherBadge;

  let affectationBlock;
  if (isPool) {
    const anyActive = a.memberships.some(m => m.active);
    affectationBlock = anyActive
      ? `<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Au pool — non affecté</span>`
      : `<span class="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-medium">Inactif (au pool, détaché)</span>`;
  } else {
    affectationBlock = realBranches.map(m => `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 font-medium mr-1 mb-1 border border-amber-200">${escapeHtml(m.branch_name)}</span>`).join('');
  }

  return `<div class="bg-white rounded-xl border border-gray-200 p-4 card-hover">
    <h3 class="font-semibold text-brand-navy text-sm">${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)}</h3>
    <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(a.email)}${phone}</p>
    <div class="mt-3">
      <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Spécialités</p>
      <div class="flex flex-wrap">${specBlock}</div>
    </div>
    <div class="mt-3">
      <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Affectation</p>
      <div class="flex flex-wrap">${affectationBlock}</div>
    </div>
  </div>`;
}

function renderCountryBlock(country, agents) {
  const poolAgents = agents.filter(agentIsPoolOnly);
  const affectedAgents = agents.filter(a => !agentIsPoolOnly(a));

  const sections = [];
  if (poolAgents.length > 0) {
    sections.push(`<div>
      <p class="text-[11px] text-gray-400 uppercase tracking-wide mb-2">Pool (non affectés)</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${poolAgents.map(renderAgentCard).join('')}</div>
    </div>`);
  }
  if (affectedAgents.length > 0) {
    sections.push(`<div>
      <p class="text-[11px] text-gray-400 uppercase tracking-wide mb-2">Affectés</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${affectedAgents.map(renderAgentCard).join('')}</div>
    </div>`);
  }

  return `<section>
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">${escapeHtml(COUNTRY_LABELS[country] || country)}</h2>
    <div class="space-y-4">${sections.join('')}</div>
  </section>`;
}

function groupAndRender() {
  document.getElementById('agt-loading').classList.add('hidden');
  const listEl = document.getElementById('agt-list');
  const emptyEl = document.getElementById('agt-empty');
  if (allAgents.length === 0) {
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  const groups = { MA: [], DZ: [], TN: [], _unknown: [] };
  for (const a of allAgents) {
    const c = agentCountry(a);
    if (c && groups[c]) groups[c].push(a);
    else groups._unknown.push(a);
  }

  const blocks = COUNTRY_ORDER
    .filter(c => groups[c].length > 0)
    .map(c => renderCountryBlock(c, groups[c]));
  if (groups._unknown.length > 0) {
    blocks.push(renderCountryBlock('— Inconnu', groups._unknown));
  }
  listEl.innerHTML = blocks.join('');
  listEl.classList.remove('hidden');
}

async function loadAll() {
  document.getElementById('agt-loading').classList.remove('hidden');
  document.getElementById('agt-empty').classList.add('hidden');
  document.getElementById('agt-list').classList.add('hidden');
  try {
    const [agentsData, branchesData] = await Promise.all([
      apiFetch('/api/admin/team-members'),
      apiFetch('/api/admin/branches'),
    ]);
    allAgents = agentsData.agents || [];
    // allBranches : utilise pour le select antenne (vraies antennes uniquement, sans pools).
    allBranches = (branchesData.branches || []).filter(b => !b.id.startsWith('branch_pool_'));
    groupAndRender();
  } catch (err) {
    console.error(err);
    const loadingEl = document.getElementById('agt-loading');
    const p = document.createElement('p');
    p.className = 'text-red-600 text-sm text-center';
    p.textContent = 'Erreur de chargement';
    loadingEl.replaceChildren(p);
  }
}

// --- Create modal ---

function openCreateModal() {
  document.getElementById('agt-create-modal').classList.remove('hidden');
}

function resetCreateModalState() {
  document.getElementById('agt-create-modal').classList.add('hidden');
  document.getElementById('agt-create-form').classList.remove('hidden');
  document.getElementById('agt-create-result').classList.add('hidden');
  document.getElementById('agt-create-secret-container').innerHTML = '';
  document.getElementById('agt-create-firstname').value = '';
  document.getElementById('agt-create-lastname').value = '';
  document.getElementById('agt-create-email').value = '';
  document.getElementById('agt-create-phone').value = '';
  document.getElementById('agt-create-country').value = '';
  document.getElementById('agt-create-spec-other').value = '';
  document.getElementById('agt-create-spec-other').classList.add('hidden');
  document.getElementById('agt-create-spec-other-cb').checked = false;
  document.querySelectorAll('.agt-spec-cb').forEach(cb => cb.checked = false);
  document.getElementById('agt-create-force-zone').classList.add('hidden');
  repopulateBranchSelect('');
  pendingForcePromote = null;
  document.getElementById('agt-create-title').textContent = 'Nouvel agent';
}

function cancelCreate() {
  resetCreateModalState();
}

async function finishCreate() {
  resetCreateModalState();
  await loadAll();
}

function repopulateBranchSelect(country) {
  const sel = document.getElementById('agt-create-branch');
  sel.innerHTML = '<option value="">— Laisser au pool (affecter plus tard) —</option>';
  if (!country) return;
  const branches = allBranches.filter(b => b.country === country);
  for (const b of branches) {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.name} (${b.city})`;
    sel.appendChild(opt);
  }
}

function buildCreateBody() {
  const first_name = document.getElementById('agt-create-firstname').value.trim();
  const last_name = document.getElementById('agt-create-lastname').value.trim();
  const email = document.getElementById('agt-create-email').value.trim();
  const phone = document.getElementById('agt-create-phone').value.trim();
  const country = document.getElementById('agt-create-country').value;
  const branchSelected = document.getElementById('agt-create-branch').value;
  const otherCb = document.getElementById('agt-create-spec-other-cb');
  const specialties_other = document.getElementById('agt-create-spec-other').value.trim();
  const specialties = Array.from(document.querySelectorAll('.agt-spec-cb:checked')).map(cb => cb.value);
  if (otherCb.checked) specialties.push('other');

  if (!first_name || !last_name || !email || !phone || !country || specialties.length === 0) {
    return { error: 'Tous les champs sont obligatoires (au moins 1 spécialité).' };
  }
  if (otherCb.checked && !specialties_other) {
    return { error: 'Précisez la spécialité « Autre ».' };
  }
  const branch_id = branchSelected || ('branch_pool_' + country.toLowerCase());
  const body = { first_name, last_name, email, phone, specialties, branch_id };
  if (otherCb.checked) body.specialties_other = specialties_other;
  return { body };
}

async function performCreate(body, forcePromoteFlag) {
  const submitBtn = document.getElementById('agt-create-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = forcePromoteFlag ? 'Promotion…' : 'Création…';
  try {
    const finalBody = forcePromoteFlag ? { ...body, force_promote: true } : body;
    const data = await apiFetch('/api/admin/team-members', { method: 'POST', body: JSON.stringify(finalBody) });

    document.getElementById('agt-create-form').classList.add('hidden');
    document.getElementById('agt-create-result').classList.remove('hidden');
    document.getElementById('agt-create-title').textContent = `Agent créé : ${data.user.first_name} ${data.user.last_name}`;
    const container = document.getElementById('agt-create-secret-container');
    if (data.initial_password) {
      showOneShotSecret(container, data.initial_password, 'Mot de passe temporaire');
    } else {
      const msg = data.user_action === 'promoted'
        ? "Compte client promu en agent terrain. Il utilise ses identifiants existants."
        : "Cet agent existait déjà ; affectation ajoutée. Mot de passe inchangé.";
      container.innerHTML = `<p class="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">${escapeHtml(msg)}</p>`;
    }
  } catch (err) {
    if (err.code === 'USER_EXISTS_AS_CLIENT' && !forcePromoteFlag) {
      document.getElementById('agt-create-force-zone').classList.remove('hidden');
      pendingForcePromote = body;
    } else {
      alert(friendlyErr(err));
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Créer';
  }
}

async function submitCreate(e) {
  e.preventDefault();
  const built = buildCreateBody();
  if (built.error) {
    alert(built.error);
    return;
  }
  await performCreate(built.body, false);
}

async function clickForcePromote() {
  if (!pendingForcePromote) return;
  await performCreate(pendingForcePromote, true);
  document.getElementById('agt-create-force-zone').classList.add('hidden');
}

function render() {
  const specCheckboxes = SPECIALTY_ORDER.map(s =>
    `<label class="flex items-center gap-2 text-sm"><input type="checkbox" class="agt-spec-cb" value="${s}"> ${SPECIALTY_LABELS[s]}</label>`
  ).join('');

  const content = `
    <div class="mb-6 flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-serif font-bold text-brand-navy">Agents</h1>
        <p class="text-gray-500 text-sm mt-1">Agents terrain (field_agent), groupés par pays.</p>
      </div>
      <button id="agt-create-btn" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">+ Créer un agent</button>
    </div>

    <div id="agt-loading" class="flex justify-center py-8"><div class="spinner"></div></div>
    <div id="agt-empty" class="hidden text-center py-10 text-gray-500 text-sm">Aucun agent. Cliquez sur « + Créer un agent » pour commencer.</div>
    <div id="agt-list" class="hidden space-y-8"></div>

    <!-- Modal Create -->
    <div id="agt-create-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 id="agt-create-title" class="text-base font-bold text-brand-navy mb-3">Nouvel agent</h3>

        <form id="agt-create-form" class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Prénom <span class="text-red-500">*</span></label>
            <input id="agt-create-firstname" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Nom <span class="text-red-500">*</span></label>
            <input id="agt-create-lastname" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Email <span class="text-red-500">*</span></label>
            <input id="agt-create-email" type="email" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Téléphone <span class="text-red-500">*</span></label>
            <input id="agt-create-phone" type="tel" required placeholder="+212 6XX XXX XXX" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Spécialités <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-2 gap-2">
              ${specCheckboxes}
              <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="agt-create-spec-other-cb"> Autre…</label>
            </div>
            <input id="agt-create-spec-other" type="text" placeholder="Précisez la spécialité…" class="hidden mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Pays <span class="text-red-500">*</span></label>
            <select id="agt-create-country" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">— Sélectionner —</option>
              <option value="MA">Maroc</option>
              <option value="DZ">Algérie</option>
              <option value="TN">Tunisie</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Antenne</label>
            <select id="agt-create-branch" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">— Laisser au pool (affecter plus tard) —</option>
            </select>
            <p class="text-[10px] text-gray-400 mt-1">Optionnel — sinon l'agent va au pool de son pays.</p>
          </div>

          <div id="agt-create-force-zone" class="hidden bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
            <p class="text-sm text-orange-800 mb-2">Cet email correspond à un compte client existant. Le promouvoir en agent terrain ?</p>
            <button type="button" id="agt-create-force-btn" class="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-700">Promouvoir en agent</button>
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <button type="button" id="agt-create-cancel" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button type="submit" id="agt-create-submit" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Créer</button>
          </div>
        </form>

        <div id="agt-create-result" class="hidden">
          <p class="text-sm text-green-700 mb-2">✓ Agent créé avec succès.</p>
          <p class="text-xs text-gray-600 mb-3">Communiquez ces informations à l'agent (canal au choix : WhatsApp, oral…).</p>
          <div id="agt-create-secret-container"></div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" id="agt-create-close" class="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Fermer</button>
          </div>
        </div>
      </div>
    </div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  document.getElementById('agt-create-btn').addEventListener('click', openCreateModal);
  document.getElementById('agt-create-cancel').addEventListener('click', cancelCreate);
  document.getElementById('agt-create-form').addEventListener('submit', submitCreate);
  document.getElementById('agt-create-close').addEventListener('click', finishCreate);
  document.getElementById('agt-create-force-btn').addEventListener('click', clickForcePromote);
  document.getElementById('agt-create-country').addEventListener('change', (e) => {
    repopulateBranchSelect(e.target.value);
  });
  document.getElementById('agt-create-spec-other-cb').addEventListener('change', (e) => {
    const input = document.getElementById('agt-create-spec-other');
    if (e.target.checked) {
      input.classList.remove('hidden');
    } else {
      input.classList.add('hidden');
      input.value = '';
    }
  });
  await loadAll();
}

export { render, bind };
