// Échappement HTML — à utiliser pour TOUT texte libre injecté via innerHTML.
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Rendu lisible d'une checklist stockée en JSON (tableau de chaînes).
// Tolérant : si parse impossible ou format inattendu, affiche le texte échappé.
export function renderChecklist(raw) {
  if (!raw) return '';
  let items = null;
  try { const p = JSON.parse(raw); if (Array.isArray(p)) items = p; } catch {}
  if (items) {
    return '<ul class="list-disc list-inside text-sm text-gray-600">' +
      items.map(it => `<li>${escapeHtml(it)}</li>`).join('') + '</ul>';
  }
  return `<p class="text-sm text-gray-600">${escapeHtml(raw)}</p>`;
}

// Rendu d'une grille de photos { key, room, moment, url }.
// Grille simple, chaque photo étiquetée "Pièce · avant/après".
export function renderReportPhotos(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return '';
  const momentLabel = { before: 'avant', after: 'après' };
  const cells = photos.map(p => {
    const label = `${escapeHtml(p.room || '')}${p.moment ? ' · ' + (momentLabel[p.moment] || escapeHtml(p.moment)) : ''}`;
    const caption = p.caption ? `<div class="px-2 pb-1.5 text-xs text-gray-400 italic">${escapeHtml(p.caption)}</div>` : '';
    return `<div class="rounded-lg overflow-hidden bg-gray-100">
      <div class="aspect-video overflow-hidden"><img src="${escapeHtml(p.url)}" alt="${label}" class="w-full h-full object-cover" loading="lazy"></div>
      <div class="px-2 pt-1 text-xs text-gray-500">${label}</div>
      ${caption}
    </div>`;
  }).join('');
  return `<div>
    <p class="text-xs font-semibold text-gray-500 mb-2">Photos :</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${cells}</div>
  </div>`;
}
