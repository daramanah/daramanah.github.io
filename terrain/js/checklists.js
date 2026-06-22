export const CHECKLISTS = {
  visit: [
    "Aucune trace d'effraction (porte, fenêtres, serrures)",
    "Pas de dégât des eaux / fuite / traces d'humidité",
    "Électricité fonctionnelle (test interrupteurs)",
    "Volets et fenêtres en bon état",
    "Aucune odeur anormale (gaz, moisissure)",
    "Boîte aux lettres relevée",
    "Aération effectuée",
    "Compteurs photographiés",
  ],
  cleaning: [
    "Sols lavés (toutes pièces)",
    "Sanitaires et salle de bain nettoyés",
    "Cuisine dégraissée (plan de travail, évier, électroménager)",
    "Poubelles vidées",
    "Poussière faite (surfaces, meubles)",
    "Vitres / miroirs nettoyés",
    "Lit(s) fait(s) / linge changé si demandé",
    "Aération des pièces",
  ],
  groceries: [
    "Liste de courses respectée",
    "Produits frais vérifiés (dates, état)",
    "Rangement effectué (frigo, placards)",
    "Ticket de caisse photographié",
    "Reste à rembourser / monnaie noté",
  ],
  meter_reading: [
    "Compteur électricité relevé + photo",
    "Compteur eau relevé + photo",
    "Compteur gaz relevé + photo (si applicable)",
    "Aucune anomalie sur les compteurs",
  ],
  repair: [
    "Problème constaté documenté (photo avant)",
    "Intervention réalisée",
    "Test de bon fonctionnement après réparation",
    "Photo après",
    "Pièces / matériel utilisés notés",
  ],
  garden: [
    "Arrosage effectué",
    "Tonte / taille réalisée",
    "Terrasse / extérieur nettoyé",
    "État du mobilier extérieur vérifié",
    "Système d'arrosage automatique testé (si présent)",
  ],
};

export function getChecklist(type) {
  if (type === 'airbnb_prep') return CHECKLISTS.cleaning;
  return CHECKLISTS[type] || [];
}
