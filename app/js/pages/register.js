// DarAmanah — Register page

import { register } from '../auth.js';

function render() {
  return `
  <div class="min-h-screen bg-brand-sand flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <a href="/" class="text-3xl font-serif font-bold text-brand-navy">DarAmanah</a>
        <span class="text-xs bg-brand-gold text-white px-2 py-1 rounded-full ml-1">Family</span>
        <p class="text-gray-500 mt-3 text-sm">Créez votre compte en quelques secondes</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <form id="register-form" class="space-y-4">
          <div id="register-error" class="hidden bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
              <input type="text" id="reg-first" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Prénom">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
              <input type="text" id="reg-last" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Nom">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" id="reg-email" required autocomplete="email" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="votre@email.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
            <input type="tel" id="reg-phone" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="+33 6 12 34 56 78">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
            <select id="reg-country" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Sélectionnez</option>
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="CA">Canada</option>
              <option value="MA">Maroc</option>
              <option value="DZ">Algérie</option>
              <option value="TN">Tunisie</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input type="password" id="reg-password" required minlength="8" autocomplete="new-password"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="Minimum 8 caractères">
          </div>
          <button type="submit" id="register-btn"
            class="w-full bg-brand-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2">
            Créer mon compte
          </button>
        </form>
        <p class="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ? <a href="#/login" class="text-brand-gold font-medium hover:underline">Se connecter</a>
        </p>
      </div>
    </div>
  </div>`;
}

function bind() {
  const form = document.getElementById('register-form');
  const errorEl = document.getElementById('register-error');
  const btn = document.getElementById('register-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const fields = {
      first_name: document.getElementById('reg-first').value.trim(),
      last_name: document.getElementById('reg-last').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      phone: document.getElementById('reg-phone').value.trim(),
      country: document.getElementById('reg-country').value,
      password: document.getElementById('reg-password').value,
    };

    try {
      await register(fields);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur lors de la création du compte';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Créer mon compte';
    }
  });
}

export { render, bind };
