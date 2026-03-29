// DarAmanah — Payment Cancel page
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

function render() {
  const content = `
    <div class="flex items-center justify-center py-16">
      <div class="text-center max-w-md">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
        <h1 class="text-2xl font-serif font-bold text-brand-navy mb-3">Paiement annul\u00e9</h1>
        <p class="text-gray-500 mb-8">Le paiement a \u00e9t\u00e9 annul\u00e9. Vous pouvez r\u00e9essayer quand vous le souhaitez.</p>
        <a href="#/payments" class="inline-block bg-brand-navy text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">Retour aux paiements</a>
      </div>
    </div>`;
  return renderLayout(content);
}

function bind() { bindLayoutEvents(); }

export { render, bind };
