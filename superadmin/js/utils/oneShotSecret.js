// One-shot secret display helper — réutilisable pour passwords temporaires
// renvoyés par les endpoints admin (création branch_admin S2-fa,
// création field_agent S3 à venir). Le caller injecte le bloc dans un
// container après une mutation réussie ; le user copie, ferme = secret
// oublié côté client.

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Renders a one-shot secret block into containerEl (innerHTML REPLACED).
// containerEl: target DOM element.
// value: the secret to display.
// label: human label shown above the input (e.g. "Mot de passe temporaire").
export function showOneShotSecret(containerEl, value, label) {
  const inputId = 'oss-input-' + Math.random().toString(36).slice(2, 10);
  const btnId = 'oss-btn-' + Math.random().toString(36).slice(2, 10);
  containerEl.innerHTML = `
    <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
      <label class="block text-xs font-semibold text-amber-900 mb-2">${escapeHtml(label)}</label>
      <div class="flex gap-2">
        <input id="${inputId}" type="text" readonly value="${escapeHtml(value)}"
          class="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono bg-white">
        <button id="${btnId}" type="button"
          class="px-3 py-2 bg-brand-gold text-white text-xs font-medium rounded-lg hover:opacity-90 whitespace-nowrap">
          Copier
        </button>
      </div>
      <p class="text-[10px] text-amber-700 mt-2">Ce secret ne sera plus accessible après fermeture.</p>
    </div>
  `;
  const btn = containerEl.querySelector('#' + btnId);
  const input = containerEl.querySelector('#' + inputId);
  btn.addEventListener('click', async () => {
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        ok = true;
      }
    } catch { /* fallback ci-dessous */ }
    if (!ok) {
      input.select();
      input.setSelectionRange(0, 99999);
      try { ok = document.execCommand('copy'); } catch { ok = false; }
    }
    if (ok) {
      btn.textContent = 'Copié ✓';
      setTimeout(() => { btn.textContent = 'Copier'; }, 2000);
    } else {
      btn.textContent = 'Échec — sélectionnez et Ctrl+C';
      input.select();
    }
  });
}
