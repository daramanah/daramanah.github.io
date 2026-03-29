// DarAmanah — Payments page (subscriptions + checkout + invoices)

import { apiFetch } from '../api.js';
import { renderLayout, bindLayoutEvents } from '../components/layout.js';

const PLAN_LABELS = { veille: 'Veille', confort: 'Confort', premium: 'Premium' };
const COUNTRY_FLAGS = { MA: '\u{1F1F2}\u{1F1E6}', DZ: '\u{1F1E9}\u{1F1FF}', TN: '\u{1F1F9}\u{1F1F3}' };
const INVOICE_STATUS = { pending: 'En attente', paid: 'Pay\u00e9e', failed: '\u00c9chou\u00e9e', refunded: 'Rembours\u00e9e' };
const INVOICE_COLORS = { pending: 'bg-yellow-100 text-yellow-800', paid: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800', refunded: 'bg-gray-100 text-gray-800' };

const ONE_OFF_SERVICES = [
  { id: 'visit', name: 'Visite de contr\u00f4le', desc: 'Inspection + rapport photo', price: 3500 },
  { id: 'cleaning_apartment', name: 'M\u00e9nage Appartement', desc: 'Nettoyage complet', price: 5500 },
  { id: 'cleaning_villa', name: 'M\u00e9nage Villa', desc: 'Nettoyage complet', price: 7500 },
  { id: 'groceries', name: 'Courses de base', desc: 'Approvisionnement', price: 2500 },
  { id: 'meter_reading', name: 'Relev\u00e9 compteurs', desc: 'Eau, \u00e9lectricit\u00e9, gaz', price: 2000 },
  { id: 'arrival_pack', name: 'Pack Arriv\u00e9e', desc: 'M\u00e9nage + courses + check-in', price: 8900 },
];

const PLAN_DETAILS = {
  veille: {
    name: 'Veille', price: 45, color: 'border-gray-200',
    features: ['1 visite / mois', 'V\u00e9rification \u00e9tat g\u00e9n\u00e9ral', 'A\u00e9ration du bien', 'Relev\u00e9 compteurs', 'Rapport photo d\u00e9taill\u00e9'],
  },
  confort: {
    name: 'Confort', price: 89, color: 'border-brand-gold', badge: 'Populaire',
    features: ['2 visites / mois', 'Tout Veille inclus', 'M\u00e9nage avant arriv\u00e9e', 'Courses de base', 'Coordination artisans'],
  },
  premium: {
    name: 'Premium', price: 179, color: 'border-brand-navy',
    features: ['Tout Confort inclus', 'Petites r\u00e9parations', 'Gestion courrier', 'Entretien jardin', 'Interlocuteur d\u00e9di\u00e9'],
  },
};

function render() {
  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-serif font-bold text-brand-navy">Paiements</h1>
      <p class="text-gray-500 text-sm mt-1">G\u00e9rez votre abonnement et consultez vos factures</p>
    </div>

    <div id="pay-loading" class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    <div id="pay-content" class="hidden space-y-6"></div>`;

  return renderLayout(content);
}

async function bind() {
  bindLayoutEvents();

  try {
    const [subsData, invData, propsData] = await Promise.all([
      apiFetch('/api/payments/subscriptions'),
      apiFetch('/api/payments/invoices'),
      apiFetch('/api/properties'),
    ]);

    const subs = subsData.subscriptions || [];
    const invoices = invData.invoices || [];
    const properties = propsData.properties || [];
    const activeSubs = subs.filter(s => s.status === 'active');

    // Find cities where client has properties but no active subscription
    const subscribedAreaIds = new Set(activeSubs.map(s => s.service_area_id));
    const propAreas = new Map();
    properties.forEach(p => {
      if (p.service_area_id && !subscribedAreaIds.has(p.service_area_id)) {
        propAreas.set(p.service_area_id, { id: p.service_area_id, city: p.service_area_city || p.city, country: p.country });
      }
    });
    const uncoveredAreas = [...propAreas.values()];

    // --- Subscriptions section ---
    let subHtml;
    if (activeSubs.length > 0) {
      subHtml = `<div class="space-y-4">
        <h2 class="text-lg font-bold text-brand-navy">Mes abonnements</h2>
        ${activeSubs.map(sub => {
          const flag = COUNTRY_FLAGS[sub.service_area_country] || '';
          const city = sub.service_area_city || '-';
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
            <p class="text-xs text-gray-400 mt-4">Pour changer de formule ou r\u00e9silier : <a href="mailto:contact@daramanah.family" class="text-brand-gold hover:underline">contact@daramanah.family</a></p>
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
      </div>`;
    }

    // --- Subscribe CTA ---
    let subscribeCta = '';
    if (uncoveredAreas.length > 0) {
      const areaOptions = uncoveredAreas.map(a => `<option value="${a.id}">${a.city} ${COUNTRY_FLAGS[a.country] || ''}</option>`).join('');

      subscribeCta = `
      <div class="bg-white rounded-xl border-2 border-dashed border-brand-gold p-6" id="subscribe-section">
        <h2 class="text-lg font-bold text-brand-navy mb-1">Souscrire un abonnement</h2>
        <p class="text-sm text-gray-500 mb-5">Choisissez une ville et une formule pour prot\u00e9ger vos biens</p>

        <!-- Step 1: City -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Ville</label>
          <select id="checkout-city" class="w-full sm:w-64 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
            ${uncoveredAreas.length === 1 ? '' : '<option value="">S\u00e9lectionnez une ville</option>'}
            ${areaOptions}
          </select>
        </div>

        <!-- Step 2: Plans -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" id="plan-cards">
          ${Object.entries(PLAN_DETAILS).map(([key, p]) => `
          <div class="relative bg-white rounded-xl border-2 ${p.color} p-5 cursor-pointer plan-card transition hover:shadow-md" data-plan="${key}">
            ${p.badge ? `<span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gold text-white text-xs font-semibold px-3 py-1 rounded-full">${p.badge}</span>` : ''}
            <h3 class="text-lg font-bold text-brand-navy mb-1">${p.name}</h3>
            <p class="text-3xl font-bold text-brand-navy mb-4">${p.price}\u20AC<span class="text-sm text-gray-500 font-normal">/mois</span></p>
            <ul class="space-y-2 mb-5">
              ${p.features.map(f => `<li class="flex items-start gap-2 text-sm text-gray-600"><svg class="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>${f}</li>`).join('')}
            </ul>
            <button class="checkout-btn w-full bg-brand-gold text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-700 transition" data-plan="${key}">
              Souscrire \u2014 ${p.price}\u20AC/mois
            </button>
          </div>`).join('')}
        </div>
      </div>`;
    } else if (properties.length > 0 && activeSubs.length > 0) {
      subscribeCta = `
      <div class="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
        <p class="text-sm text-green-700 font-medium">Vous \u00eates abonn\u00e9 dans toutes vos villes</p>
      </div>`;
    }

    // --- One-off services section ---
    const propOptions = properties.map(p => `<option value="${p.id}">${p.name} \u2014 ${p.service_area_city || p.city || ''}</option>`).join('');

    const oneOffHtml = `
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-bold text-brand-navy mb-1">Interventions \u00e0 la carte</h2>
        <p class="text-sm text-gray-500 mb-5">Pas besoin d\u2019abonnement. Commandez une intervention quand vous en avez besoin.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="oneoff-cards">
          ${ONE_OFF_SERVICES.map(s => `
          <div class="border border-gray-200 rounded-xl p-5 flex flex-col">
            <h3 class="font-bold text-brand-navy mb-1">${s.name}</h3>
            <p class="text-xs text-gray-500 mb-3">${s.desc}</p>
            <p class="text-2xl font-bold text-brand-navy mb-4">${(s.price / 100).toFixed(0)}\u20AC</p>
            <button class="oneoff-btn mt-auto w-full bg-brand-gold text-white py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition" data-service="${s.id}" data-price="${s.price}" data-name="${s.name}">Commander</button>
          </div>`).join('')}
        </div>

        <!-- One-off order form (hidden by default) -->
        <div id="oneoff-form" class="hidden mt-6 border-t border-gray-200 pt-5">
          <h3 class="text-sm font-bold text-brand-navy mb-3" id="oneoff-form-title"></h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Bien concern\u00e9</label>
              <select id="oneoff-property" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                ${properties.length > 0 ? '<option value="">S\u00e9lectionnez un bien</option>' + propOptions : '<option value="">Aucun bien enregistr\u00e9</option>'}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Pr\u00e9cisions <span class="text-gray-400">(optionnel)</span></label>
              <input type="text" id="oneoff-notes" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Instructions particuli\u00e8res...">
            </div>
            <div class="flex gap-3">
              <button id="oneoff-pay" class="bg-brand-gold text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-700 transition"></button>
              <button id="oneoff-cancel" class="text-sm text-gray-500 hover:text-gray-700 transition">Annuler</button>
            </div>
          </div>
        </div>
      </div>`;

    // --- Invoices section ---
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
                  ${inv.status === 'paid' ? `<a href="https://api.daramanah.family/api/payments/invoices/${inv.id}/pdf" target="_blank" class="text-brand-gold hover:underline text-xs font-medium">T\u00e9l\u00e9charger</a>` : ''}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : `
      <div class="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p class="text-sm text-gray-400">Aucune facture</p>
      </div>`;

    document.getElementById('pay-content').innerHTML = subHtml + subscribeCta + oneOffHtml + invoicesHtml;
    document.getElementById('pay-loading').classList.add('hidden');
    document.getElementById('pay-content').classList.remove('hidden');

    // --- Checkout click handlers ---
    document.querySelectorAll('.checkout-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const plan = e.target.dataset.plan;
        const citySelect = document.getElementById('checkout-city');
        const serviceAreaId = citySelect?.value;

        if (!serviceAreaId) {
          citySelect?.focus();
          citySelect?.classList.add('border-red-400');
          return;
        }
        citySelect?.classList.remove('border-red-400');

        // Disable all buttons
        document.querySelectorAll('.checkout-btn').forEach(b => { b.disabled = true; b.textContent = '...'; });
        e.target.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin:0 auto"></div>';

        try {
          const data = await apiFetch('/api/payments/checkout', {
            method: 'POST',
            body: JSON.stringify({ plan, service_area_id: serviceAreaId }),
          });
          if (data.checkout_url) {
            window.location.href = data.checkout_url;
          }
        } catch (err) {
          alert(err.message || 'Erreur lors de la cr\u00e9ation du paiement');
          document.querySelectorAll('.checkout-btn').forEach(b => {
            b.disabled = false;
            const p = b.dataset.plan;
            b.textContent = `Souscrire \u2014 ${PLAN_DETAILS[p].price}\u20AC/mois`;
          });
        }
      });
    });

    // --- One-off click handlers ---
    let selectedService = null;
    const oneoffForm = document.getElementById('oneoff-form');
    const oneoffTitle = document.getElementById('oneoff-form-title');
    const oneoffPayBtn = document.getElementById('oneoff-pay');

    document.querySelectorAll('.oneoff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const svc = ONE_OFF_SERVICES.find(s => s.id === btn.dataset.service);
        if (!svc) return;
        selectedService = svc;
        oneoffTitle.textContent = svc.name;
        oneoffPayBtn.textContent = `Payer \u2014 ${(svc.price / 100).toFixed(0)}\u20AC`;
        oneoffForm.classList.remove('hidden');
        oneoffForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    document.getElementById('oneoff-cancel')?.addEventListener('click', () => {
      oneoffForm.classList.add('hidden');
      selectedService = null;
    });

    oneoffPayBtn?.addEventListener('click', async () => {
      if (!selectedService) return;
      const propertyId = document.getElementById('oneoff-property').value;
      if (!propertyId) {
        document.getElementById('oneoff-property').focus();
        document.getElementById('oneoff-property').classList.add('border-red-400');
        return;
      }
      document.getElementById('oneoff-property').classList.remove('border-red-400');

      oneoffPayBtn.disabled = true;
      oneoffPayBtn.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin:0 auto"></div>';

      const notes = document.getElementById('oneoff-notes').value.trim();
      const desc = notes ? `${selectedService.name} \u2014 ${notes}` : selectedService.name;

      try {
        const data = await apiFetch('/api/payments/one-off', {
          method: 'POST',
          body: JSON.stringify({ amount: selectedService.price, description: desc, property_id: propertyId }),
        });
        if (data.checkout_url) window.location.href = data.checkout_url;
      } catch (err) {
        alert(err.message || 'Erreur lors de la cr\u00e9ation du paiement');
        oneoffPayBtn.disabled = false;
        oneoffPayBtn.textContent = `Payer \u2014 ${(selectedService.price / 100).toFixed(0)}\u20AC`;
      }
    });

  } catch (err) {
    console.error('Payments load error:', err);
    document.getElementById('pay-loading').innerHTML = '<p class="text-red-600 text-sm">Erreur de chargement</p>';
  }
}

export { render, bind };
