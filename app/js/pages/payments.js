// DarAmanah — Payments page (subscription + invoices)

import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const PLAN_LABELS = { veille: 'Veille', confort: 'Confort', premium: 'Premium' };
const COUNTRY_FLAGS = { MA: '\u{1F1F2}\u{1F1E6}', DZ: '\u{1F1E9}\u{1F1FF}', TN: '\u{1F1F9}\u{1F1F3}' };
const INVOICE_STATUS = { pending: 'En attente', paid: 'Pay\u00e9e', failed: '\u00c9chou\u00e9e', refunded: 'Rembours\u00e9e' };
const INVOICE_COLORS = { pending: 'bg-yellow-100 text-yellow-800', paid: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800', refunded: 'bg-gray-100 text-gray-800' };

function render() {
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Paiements</h1>
      <p class="text-gray-500 text-sm mt-1">Gérez votre abonnement et consultez vos factures</p>
    </div>

    <div id="pay-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    <div id="pay-content" class="hidden space-y-6"></div>`;

  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();

  try {
    const [subsData, invData] = await Promise.all([
      apiFetch('/api/payments/subscriptions'),
      apiFetch('/api/payments/invoices'),
    ]);

    const subs = subsData.subscriptions || [];
    const invoices = invData.invoices || [];
    const activeSubs = subs.filter(s => s.status === 'active');

    // Subscription cards — one per city
    let subHtml;
    if (activeSubs.length > 0) {
      subHtml = `<div class="space-y-4">
        <h2 class="text-lg font-bold text-brand-navy">Mes abonnements</h2>
        ${activeSubs.map(sub => {
          const flag = COUNTRY_FLAGS[sub.service_area_country] || '';
          const city = sub.service_area_city || sub.property_name || '-';
          return `
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="font-bold text-brand-navy">Abo ${PLAN_LABELS[sub.plan] || sub.plan} \u2014 ${city} ${flag}</h3>
              </div>
              <span class="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">Actif</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p class="text-xs text-gray-500 mb-1">Formule</p>
                <p class="text-lg font-bold text-brand-navy">${PLAN_LABELS[sub.plan] || sub.plan}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Montant</p>
                <p class="text-lg font-bold text-brand-navy">${(sub.price_monthly / 100).toFixed(0)}\u20AC<span class="text-sm text-gray-500 font-normal">/mois</span></p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Depuis</p>
                <p class="text-sm font-medium text-gray-700">${new Date(sub.current_period_start || sub.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    } else {
      subHtml = `
      <div class="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div class="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
        </div>
        <h2 class="text-lg font-bold text-brand-navy mb-1">Aucun abonnement</h2>
        <p class="text-sm text-gray-500 mb-4">Souscrivez \u00e0 un abonnement pour b\u00e9n\u00e9ficier de nos services</p>
        <a href="https://daramanah.family/tarifs/" target="_blank" class="inline-block bg-brand-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">Voir les tarifs</a>
      </div>`;
    }

    // Invoices table
    const invoicesHtml = invoices.length > 0 ? `
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-bold text-brand-navy mb-4">Historique des factures</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-500 border-b border-gray-200">
                <th class="pb-3 font-medium">N\u00B0</th>
                <th class="pb-3 font-medium">Date</th>
                <th class="pb-3 font-medium">Description</th>
                <th class="pb-3 font-medium text-right">Montant</th>
                <th class="pb-3 font-medium text-center">Statut</th>
                <th class="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${invoices.map(inv => `
              <tr>
                <td class="py-3 font-medium text-brand-navy">${inv.invoice_number}</td>
                <td class="py-3 text-gray-600">${new Date(inv.created_at).toLocaleDateString('fr-FR')}</td>
                <td class="py-3 text-gray-600 max-w-[200px] truncate">${inv.description || inv.type || '-'}</td>
                <td class="py-3 text-right font-medium">${(inv.amount_ttc / 100).toFixed(2)}\u20AC</td>
                <td class="py-3 text-center">
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}">${INVOICE_STATUS[inv.status] || inv.status}</span>
                </td>
                <td class="py-3 text-right">
                  ${inv.status === 'paid' ? `<a href="https://api.daramanah.family/api/payments/invoices/${inv.id}/pdf" target="_blank" class="text-brand-gold hover:underline text-xs font-medium">Télécharger</a>` : ''}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : `
      <div class="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p class="text-sm text-gray-400">Aucune facture</p>
      </div>`;

    document.getElementById('pay-content').innerHTML = subHtml + invoicesHtml;
    document.getElementById('pay-loading').classList.add('hidden');
    document.getElementById('pay-content').classList.remove('hidden');
  } catch (err) {
    console.error('Payments load error:', err);
    document.getElementById('pay-loading').innerHTML = '<p class="text-red-600 text-sm">Erreur de chargement</p>';
  }
}

export { render, bind };
