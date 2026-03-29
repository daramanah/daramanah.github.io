// DarAmanah — Payment Success page
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

function render() {
  const content = `
    <div class="flex items-center justify-center py-16">
      <div class="text-center max-w-md">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h1 class="text-2xl font-serif font-bold text-brand-navy mb-3">Abonnement activ\u00e9 !</h1>
        <p class="text-gray-500 mb-8">Votre abonnement a \u00e9t\u00e9 activ\u00e9 avec succ\u00e8s. Vous pouvez maintenant planifier des visites pour vos biens.</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#/payments" class="bg-brand-navy text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">Voir mes abonnements</a>
          <a href="#/requests/new" class="border border-brand-gold text-brand-gold px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-gold hover:text-white transition">Faire une demande</a>
        </div>
      </div>
    </div>`;
  return renderLayout(content);
}

function bind() { bindLayoutEvents(); }

export { render, bind };
