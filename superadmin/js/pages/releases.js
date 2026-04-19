import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

function render() {
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Releases en attente</h1>
      <p class="text-gray-500 text-sm mt-1">Demandes que les admins souhaitent rendre au pool — à arbitrer.</p>
    </div>

    <div id="rel-loading" class="flex justify-center py-8"><div class="spinner"></div></div>
    <div id="rel-empty" class="hidden text-center py-10 text-gray-500 text-sm">Aucune release en attente.</div>
    <div id="rel-list" class="hidden space-y-3"></div>`;
  return renderLayout(content);
}

function renderCard(r) {
  const reason = String(r.release_reason || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div class="bg-white rounded-xl border border-orange-200 p-5">
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-brand-navy text-sm">${r.title || r.type}</h3>
        <p class="text-xs text-gray-500 mt-0.5">${r.property_name || ''} (${r.property_city || '—'}, ${r.property_country || '—'})</p>
      </div>
      <span class="ml-3 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-800">Release demandé</span>
    </div>
    <p class="text-xs text-gray-500 mb-2">Demandé par <strong>${r.claimed_by_first_name || ''} ${r.claimed_by_last_name || ''}</strong> (${r.claimed_by_email || '—'}) le ${new Date(r.release_requested_at || r.created_at).toLocaleDateString('fr-FR')}</p>
    <div class="bg-gray-50 border-l-4 border-brand-gold p-3 mb-3">
      <p class="text-sm text-gray-700">${reason || '<em>Aucune raison fournie</em>'}</p>
    </div>
    <div class="flex gap-2">
      <button data-approve="${r.id}" class="approve-btn px-4 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700">Approuver (retour au pool)</button>
      <button data-deny="${r.id}" class="deny-btn px-4 py-1.5 rounded-lg text-xs bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">Refuser</button>
      <a href="#/history/${r.id}" class="px-4 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-700 hover:bg-gray-50">Historique</a>
    </div>
  </div>`;
}

async function bind() {
  bindLayoutEvents();
  try {
    const data = await apiFetch('/api/admin/pending-releases');
    const items = data.requests || [];
    document.getElementById('rel-loading').classList.add('hidden');
    const list = document.getElementById('rel-list');
    if (items.length === 0) {
      document.getElementById('rel-empty').classList.remove('hidden');
    } else {
      list.innerHTML = items.map(renderCard).join('');
      list.classList.remove('hidden');

      list.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Approuver le release ? La demande retourne au pool.')) return;
          btn.disabled = true; btn.textContent = 'Envoi…';
          try {
            await apiFetch(`/api/admin/requests/${btn.dataset.approve}/approve-release`, { method: 'POST' });
            window.location.reload();
          } catch (err) { btn.disabled = false; btn.textContent = 'Approuver'; alert(err.message || 'Erreur'); }
        });
      });
      list.querySelectorAll('.deny-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Refuser le release ? La demande reste chez admin.')) return;
          btn.disabled = true; btn.textContent = 'Envoi…';
          try {
            await apiFetch(`/api/admin/requests/${btn.dataset.deny}/deny-release`, { method: 'POST' });
            window.location.reload();
          } catch (err) { btn.disabled = false; btn.textContent = 'Refuser'; alert(err.message || 'Erreur'); }
        });
      });
    }
  } catch (err) {
    console.error(err);
    const loadingEl = document.getElementById('rel-loading');
    const p = document.createElement('p');
    p.className = 'text-red-600 text-sm text-center';
    p.textContent = 'Erreur de chargement';
    loadingEl.replaceChildren(p);
  }
}

export { render, bind };
