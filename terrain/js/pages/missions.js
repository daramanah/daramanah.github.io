import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';
import { escapeHtml } from '../utils.js';

const TYPE_LABELS = { visit: 'Visite', cleaning: 'Ménage', repair: 'Réparation', garden: 'Jardin', meter_reading: 'Relevé compteurs', airbnb_prep: 'Préparation Airbnb', key_handover: 'Remise de clés', other: 'Autre' };

const TABS = [
  { key: 'todo', label: 'À faire', match: m => m.status === 'assigned', empty: 'Aucune mission à faire' },
  { key: 'in_progress', label: 'En cours', match: m => m.status === 'in_progress', empty: 'Aucune mission en cours' },
  { key: 'done', label: 'Terminées', match: m => m.status === 'completed' || m.status === 'validated', empty: 'Aucune mission terminée' },
];

function scheduleInfo(scheduledDate) {
  if (!scheduledDate) return { text: 'Non planifiée', cls: 'text-gray-400' };
  const d = new Date(scheduledDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  if (day < today) return { text: `En retard — ${dateStr}`, cls: 'text-red-600 font-medium' };
  if (day.getTime() === today.getTime()) return { text: `Aujourd'hui`, cls: 'text-orange-600 font-medium' };
  return { text: `Prévu le ${dateStr}`, cls: 'text-gray-500' };
}

function sinceStarted(startedAt) {
  if (!startedAt) return '';
  const diffMin = Math.round((Date.now() - Date.parse(startedAt)) / 60000);
  if (diffMin < 1) return 'Démarrée à l\'instant';
  if (diffMin < 60) return `Démarrée il y a ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `Démarrée il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `Démarrée il y a ${j} j`;
}

function completedInfo(completedDate) {
  if (!completedDate) return '';
  return `Terminée le ${new Date(completedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

let allMissions = [];
let activeTab = 'todo';

function render() {
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Mes missions</h1>
      <p class="text-gray-500 text-sm mt-1">Vos interventions à réaliser</p>
    </div>
    <div id="tabs-bar" class="flex gap-2 mb-4"></div>
    <div id="missions-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>`;
  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();
  const listEl = document.getElementById('missions-list');
  try {
    const data = await apiFetch('/api/terrain/missions?status=assigned,in_progress,completed,validated');
    allMissions = data.missions || [];
    activeTab = 'todo';
    renderTabs();
    renderList();
  } catch (err) {
    console.error('Missions error:', err);
    listEl.innerHTML = '<p class="text-sm text-red-600 text-center py-10">Erreur de chargement des missions</p>';
  }
}

function renderTabs() {
  const bar = document.getElementById('tabs-bar');
  bar.innerHTML = TABS.map(t => {
    const count = allMissions.filter(t.match).length;
    const isActive = t.key === activeTab;
    const cls = isActive
      ? 'bg-teal-600 text-white border-teal-600'
      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50';
    return `<button data-tab="${t.key}" class="${cls} flex-1 border rounded-lg py-2 px-3 text-sm font-medium transition">${t.label} (${count})</button>`;
  }).join('');
  bar.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', e => {
      activeTab = e.currentTarget.getAttribute('data-tab');
      renderTabs();
      renderList();
    });
  });
}

function renderList() {
  const el = document.getElementById('missions-list');
  const tab = TABS.find(t => t.key === activeTab);
  const missions = allMissions.filter(tab.match);
  if (missions.length === 0) {
    el.innerHTML = `<p class="text-sm text-gray-400 text-center py-10">${tab.empty}</p>`;
    return;
  }
  el.innerHTML = '<div class="space-y-3">' + missions.map(m => renderCard(m, activeTab)).join('') + '</div>';
}

function renderCard(m, tabKey) {
  const typeLabel = TYPE_LABELS[m.type] || m.type || '';
  const client = `${escapeHtml(m.client_first_name || '')} ${escapeHtml(m.client_last_name || '')}`.trim();

  let dateBadge = '';
  if (tabKey === 'todo') {
    const info = scheduleInfo(m.scheduled_date);
    dateBadge = `<span class="text-xs ${info.cls}">${escapeHtml(info.text)}</span>`;
  } else if (tabKey === 'in_progress') {
    const text = sinceStarted(m.started_at);
    if (text) dateBadge = `<span class="text-xs text-teal-700 font-medium">${escapeHtml(text)}</span>`;
  } else if (tabKey === 'done') {
    const text = completedInfo(m.completed_date);
    if (text) dateBadge = `<span class="text-xs text-gray-500">${escapeHtml(text)}</span>`;
  }

  return `
    <a href="#/missions/${m.id}" class="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 transition">
      <div class="flex items-start justify-between mb-2">
        <span class="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">${escapeHtml(typeLabel)}</span>
        ${dateBadge}
      </div>
      <p class="font-semibold text-brand-navy text-sm">${escapeHtml(m.title || '')}</p>
      <p class="text-sm text-gray-600 mt-1">${escapeHtml(m.property_name || '')} — ${escapeHtml(m.property_city || '')}</p>
      ${client ? `<p class="text-xs text-gray-500 mt-1">Client : ${client}</p>` : ''}
    </a>`;
}

export { render, bind };
