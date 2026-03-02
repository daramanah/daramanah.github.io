// DarAmanah — Profile page

import { fetchUser, updateProfile, getCachedUser } from '../auth.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

function render() {
  const user = getCachedUser();

  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Mon Profil</h1>
      <p class="text-gray-500 text-sm mt-1">Gérez vos informations personnelles</p>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <div class="w-14 h-14 bg-brand-navy text-white rounded-full flex items-center justify-center text-lg font-bold">
          ${(user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')}
        </div>
        <div>
          <p class="font-bold text-brand-navy text-lg">${user?.first_name || ''} ${user?.last_name || ''}</p>
          <p class="text-sm text-gray-500">${user?.email || ''}</p>
        </div>
      </div>

      <form id="profile-form" class="space-y-5">
        <div id="profile-success" class="hidden bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-200">
          Profil mis à jour avec succès
        </div>
        <div id="profile-error" class="hidden bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
            <input type="text" id="prof-first" value="${user?.first_name || ''}"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
            <input type="text" id="prof-last" value="${user?.last_name || ''}"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
          <input type="tel" id="prof-phone" value="${user?.phone || ''}"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input type="email" value="${user?.email || ''}" disabled
            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500">
          <p class="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
          <input type="text" value="${user?.country || ''}" disabled
            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500">
        </div>

        <div class="pt-2">
          <button type="submit" id="profile-btn"
            class="bg-brand-navy text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center gap-2">
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>

    <!-- Account Info -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="text-lg font-bold text-brand-navy mb-4">Informations du compte</h2>
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Rôle</span>
          <span class="font-medium text-gray-700">${user?.role === 'client' ? 'Client' : user?.role || '-'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Compte créé le</span>
          <span class="font-medium text-gray-700">${user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '-'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Email vérifié</span>
          <span class="font-medium ${user?.email_verified ? 'text-green-600' : 'text-amber-600'}">${user?.email_verified ? 'Oui' : 'Non'}</span>
        </div>
      </div>
    </div>`;

  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();

  // Refresh user data from API
  try {
    const user = await fetchUser();
    document.getElementById('prof-first').value = user.first_name || '';
    document.getElementById('prof-last').value = user.last_name || '';
    document.getElementById('prof-phone').value = user.phone || '';
  } catch (err) {
    console.error('Profile load error:', err);
  }

  // Form submit
  const form = document.getElementById('profile-form');
  const successEl = document.getElementById('profile-success');
  const errorEl = document.getElementById('profile-error');
  const btn = document.getElementById('profile-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Enregistrement...';

    try {
      await updateProfile({
        first_name: document.getElementById('prof-first').value.trim(),
        last_name: document.getElementById('prof-last').value.trim(),
        phone: document.getElementById('prof-phone').value.trim(),
      });
      successEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Enregistrer les modifications';
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur lors de la mise à jour';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Enregistrer les modifications';
    }
  });
}

export { render, bind };
