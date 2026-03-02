// DarAmanah — Login page

import { login } from '../auth.js';

function render() {
  return `
  <div class="min-h-screen bg-brand-sand flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <a href="/" class="text-3xl font-serif font-bold text-brand-navy">DarAmanah</a>
        <span class="text-xs bg-brand-gold text-white px-2 py-1 rounded-full ml-1">Family</span>
        <p class="text-gray-500 mt-3 text-sm">Connectez-vous à votre espace client</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <form id="login-form" class="space-y-5">
          <div id="login-error" class="hidden bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" id="login-email" required autocomplete="email"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="votre@email.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input type="password" id="login-password" required autocomplete="current-password"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="Votre mot de passe">
          </div>
          <button type="submit" id="login-btn"
            class="w-full bg-brand-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2">
            Se connecter
          </button>
        </form>
        <p class="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ? <a href="#/register" class="text-brand-gold font-medium hover:underline">Créer un compte</a>
        </p>
      </div>
      <p class="text-center text-xs text-gray-400 mt-6">
        <a href="/" class="hover:text-gray-600 transition">Retour au site</a>
      </p>
    </div>
  </div>`;
}

function bind() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      await login(email, password);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorEl.textContent = err.message || 'Identifiants incorrects';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  });
}

export { render, bind };
