// DarAmanah — Reset password page

import { resetPassword } from '../auth.js';

function renderHeader() {
  return `
    <div class="text-center mb-8">
      <a href="/" class="text-3xl font-serif font-bold text-brand-navy">DarAmanah</a>
      <span class="text-xs bg-brand-gold text-white px-2 py-1 rounded-full ml-1">Family</span>
      <p class="text-gray-500 mt-3 text-sm">Nouveau mot de passe</p>
    </div>`;
}

function render({ token } = {}) {
  if (!token) {
    return `
    <div class="min-h-screen bg-brand-sand flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        ${renderHeader()}
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div class="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg p-4">
            Lien invalide ou incomplet.
          </div>
          <a href="#/forgot-password" class="inline-block text-brand-gold text-sm font-medium hover:underline">Demander un nouveau lien</a>
        </div>
      </div>
    </div>`;
  }

  return `
  <div class="min-h-screen bg-brand-sand flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      ${renderHeader()}
      <div id="rp-card" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <form id="rp-form" class="space-y-5">
          <div id="rp-error" class="hidden bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
            <input type="password" id="rp-password" required minlength="8" autocomplete="new-password"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="8 caractères minimum">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Confirmer</label>
            <input type="password" id="rp-confirm" required minlength="8" autocomplete="new-password"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="Retapez le mot de passe">
          </div>
          <button type="submit" id="rp-btn"
            class="w-full bg-brand-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2">
            Réinitialiser
          </button>
        </form>
      </div>
      <p class="text-center text-sm text-gray-500 mt-6">
        <a href="#/login" class="text-brand-gold font-medium hover:underline">← Connexion</a>
      </p>
    </div>
  </div>`;
}

function bind({ token } = {}) {
  if (!token) return; // pas de formulaire a cabler, render a montre le message d'erreur

  const form = document.getElementById('rp-form');
  const errorEl = document.getElementById('rp-error');
  const btn = document.getElementById('rp-btn');
  const card = document.getElementById('rp-card');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const newPassword = document.getElementById('rp-password').value;
    const confirm = document.getElementById('rp-confirm').value;

    if (newPassword.length < 8) {
      errorEl.textContent = 'Le mot de passe doit faire au moins 8 caractères.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (newPassword !== confirm) {
      errorEl.textContent = 'Les mots de passe ne correspondent pas.';
      errorEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
      await resetPassword(token, newPassword);
      card.innerHTML = `
        <div class="text-center space-y-4">
          <div class="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-4">
            ✓ Mot de passe réinitialisé.
          </div>
          <a href="#/login" class="inline-block w-full bg-brand-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition">Se connecter</a>
        </div>`;
    } catch (err) {
      switch (err.code) {
        case 'PASSWORD_TOO_SHORT':
          errorEl.textContent = 'Le mot de passe doit faire au moins 8 caractères.';
          break;
        case 'INVALID_TOKEN':
          // innerHTML avec litteral fixe (pas d'input user) — safe.
          errorEl.innerHTML = `Ce lien n'est plus valide. Si vous avez fait plusieurs demandes, seule la dernière fonctionne — <a href="#/forgot-password" class="underline font-medium">refaites une demande</a>.`;
          break;
        case 'TOKEN_EXPIRED':
          errorEl.innerHTML = `Ce lien a expiré (valable 1h). <a href="#/forgot-password" class="underline font-medium">Refaites une demande</a>.`;
          break;
        default:
          errorEl.textContent = err.message || 'Erreur. Réessayez.';
      }
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Réinitialiser';
    }
  });
}

export { render, bind };
