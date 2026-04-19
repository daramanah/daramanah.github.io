import { login } from '../auth.js';

function render() {
  return `
    <div class="min-h-screen flex items-center justify-center bg-brand-sand px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-serif font-bold text-brand-navy">DarAmanah <span class="text-sm bg-brand-gold text-white px-2 py-0.5 rounded-full align-middle ml-1">Super admin</span></h1>
          <p class="text-gray-500 text-sm mt-1">Accès réservé au super_admin</p>
        </div>
        <form id="login-form" class="bg-white rounded-xl p-6 border border-gray-200">
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" id="email" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold" />
          </div>
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1">Mot de passe</label>
            <input type="password" id="password" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold" />
          </div>
          <p id="login-error" class="hidden text-red-600 text-sm mb-3"></p>
          <button type="submit" id="submit-btn" class="w-full bg-brand-gold text-white py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition">Se connecter</button>
        </form>
      </div>
    </div>`;
}

async function bind() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('submit-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connexion…';
    try {
      await login(document.getElementById('email').value.trim(), document.getElementById('password').value);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorEl.textContent = err.message || 'Identifiants invalides';
      errorEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Se connecter';
    }
  });
}

export { render, bind };
