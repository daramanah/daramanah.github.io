import { login } from '../auth.js';

function render() {
  return `
  <div class="min-h-screen bg-brand-sand flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <span class="text-3xl font-serif font-bold text-brand-navy">DarAmanah</span>
        <span class="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full ml-1">Antenne</span>
        <p class="text-gray-500 mt-3 text-sm">Espace réservé aux administrateurs d'antenne</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <form id="login-form" class="space-y-5">
          <div id="login-error" class="hidden bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" id="login-email" required autocomplete="email" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="admin@daramanah.family">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input type="password" id="login-password" required autocomplete="current-password" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
          </div>
          <button type="submit" id="login-btn" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2">Se connecter</button>
        </form>
      </div>
    </div>
  </div>`;
}

function bind() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    errorEl.classList.add('hidden');
    btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    try {
      await login(document.getElementById('login-email').value.trim(), document.getElementById('login-password').value);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorEl.textContent = err.message || 'Identifiants incorrects';
      errorEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Se connecter';
    }
  });
}

export { render, bind };
