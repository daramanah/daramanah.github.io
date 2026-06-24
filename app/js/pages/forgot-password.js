// DarAmanah — Forgot password page

import { forgotPassword } from '../auth.js';

function render() {
  return `
  <div class="min-h-screen bg-brand-sand flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <a href="/" class="text-3xl font-serif font-bold text-brand-navy">DarAmanah</a>
        <span class="text-xs bg-brand-gold text-white px-2 py-1 rounded-full ml-1">Family</span>
        <p class="text-gray-500 mt-3 text-sm">Mot de passe oublié</p>
      </div>
      <div id="fp-card" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <form id="fp-form" class="space-y-5">
          <p class="text-sm text-gray-600">Entrez votre adresse email. Si un compte existe, vous recevrez un lien de réinitialisation.</p>
          <div id="fp-error" class="hidden bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"></div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" id="fp-email" required autocomplete="email"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="votre@email.com">
          </div>
          <button type="submit" id="fp-btn"
            class="w-full bg-brand-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2">
            Envoyer le lien
          </button>
        </form>
      </div>
      <p class="text-center text-sm text-gray-500 mt-6">
        <a href="#/login" class="text-brand-gold font-medium hover:underline">← Connexion</a>
      </p>
    </div>
  </div>`;
}

function bind() {
  const form = document.getElementById('fp-form');
  const errorEl = document.getElementById('fp-error');
  const btn = document.getElementById('fp-btn');
  const card = document.getElementById('fp-card');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const email = document.getElementById('fp-email').value.trim();

    try {
      await forgotPassword(email);
      // Anti-enumeration : message neutre, meme si l'email n'existe pas (backend renvoie 200 dans tous les cas).
      card.innerHTML = `
        <div class="text-center space-y-4">
          <div class="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-4">
            ✓ Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.
          </div>
          <p class="text-xs text-gray-500">Vérifiez votre boîte de réception (et le dossier spam). Le lien est valable 1 heure.</p>
          <a href="#/login" class="inline-block text-brand-gold text-sm font-medium hover:underline">← Retour à la connexion</a>
        </div>`;
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur réseau. Réessayez.';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Envoyer le lien';
    }
  });
}

export { render, bind };
