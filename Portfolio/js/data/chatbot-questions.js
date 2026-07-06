/**
 * ============================================================
 * CHATBOT CADRAGE — Arbre de questions & Sections
 * ============================================================
 * 
 * Ce fichier contient UNIQUEMENT les données : questions, options,
 * logique de branchement et définition des sections.
 * 
 * Pour ajouter une question :
 * 1. Ajouter un objet dans CHATBOT_QUESTIONS avec un id unique
 * 2. Mettre à jour la fonction next() de la question précédente
 * 3. Si nouvelle section, l'ajouter dans CHATBOT_SECTIONS
 * 
 * Pour modifier une question :
 * - Modifier le texte dans 'question' et/ou les 'options'
 * - Si les options changent, mettre à jour la whitelist
 *   dans generate_recap.php (côté serveur)
 * 
 * Types supportés : 'single_choice', 'multi_choice', 'text'
 * ============================================================
 */

/* ------------------------------------------------------------
   SECTIONS — Catégories du stepper de progression
   ------------------------------------------------------------ */
const CHATBOT_SECTIONS = [
  { id: 'A', label: 'PROJET',      icon: 'fa-folder'        },
  { id: 'B', label: 'E-COMMERCE',  icon: 'fa-shopping-cart'  },
  { id: 'C', label: 'TRAFIC',      icon: 'fa-chart-line'    },
  { id: 'D', label: 'CONTENU',     icon: 'fa-file-alt'      },
  { id: 'E', label: 'CRM',         icon: 'fa-users'         },
  { id: 'F', label: 'PAIEMENT',    icon: 'fa-credit-card'   },
  { id: 'G', label: 'BUDGET',      icon: 'fa-euro-sign'     },
  { id: 'H', label: 'TECHNIQUE',   icon: 'fa-cogs'          },
  { id: 'I', label: 'COORDONNÉES', icon: 'fa-address-card'  },
];

/**
 * Retourne les sections applicables selon les réponses données.
 * Les sections B (E-commerce) et F (Paiement) ne s'affichent
 * que si le type de projet est "Boutique en ligne (e-commerce)".
 */
function getApplicableSections(answers) {
  const isBoutique = answers.project_type === 'Boutique en ligne (e-commerce)';
  return CHATBOT_SECTIONS.filter(s => {
    if (s.id === 'B' && !isBoutique) return false;
    if (s.id === 'F' && !isBoutique) return false;
    return true;
  });
}

/* ------------------------------------------------------------
   QUESTIONS — Arbre complet avec branchement conditionnel
   ------------------------------------------------------------ */
const CHATBOT_QUESTIONS = [

  /* ========================
     SECTION A — Introduction
     ======================== */
  {
    id: 'project_type',
    section: 'A',
    type: 'single_choice',
    question: 'QUEL TYPE DE SITE RECHERCHEZ-VOUS ?',
    options: [
      'Site vitrine',
      'Boutique en ligne (e-commerce)',
      'Site vitrine + blog',
      'Autre / je ne sais pas encore'
    ],
    required: true,
    next: function () { return 'existing_site'; }
  },
  {
    id: 'existing_site',
    section: 'A',
    type: 'single_choice',
    question: 'AVEZ-VOUS DÉJÀ UN SITE EXISTANT ?',
    options: [
      'Oui, je veux une refonte',
      'Non, c\'est une création complète'
    ],
    required: true,
    next: function () { return 'sector'; }
  },
  {
    id: 'sector',
    section: 'A',
    type: 'text',
    question: 'QUEL EST VOTRE SECTEUR D\'ACTIVITÉ ?',
    placeholder: 'EX: RESTAURATION, IMMOBILIER, ARTISANAT...',
    required: true,
    next: function (answer, allAnswers) {
      // Si boutique en ligne → section B (e-commerce)
      if (allAnswers.project_type === 'Boutique en ligne (e-commerce)') {
        return 'product_count';
      }
      // Sinon → section C (trafic)
      return 'existing_audience';
    }
  },

  /* ========================
     SECTION B — E-commerce
     (uniquement si Q1 = boutique)
     ======================== */
  {
    id: 'product_count',
    section: 'B',
    type: 'single_choice',
    question: 'COMBIEN DE PRODUITS COMPTEZ-VOUS VENDRE ?',
    options: [
      'Moins de 20 produits',
      'Entre 20 et 200 produits',
      'Plus de 200 produits'
    ],
    required: true,
    next: function () { return 'order_volume'; }
  },
  {
    id: 'order_volume',
    section: 'B',
    type: 'single_choice',
    question: 'QUEL VOLUME DE COMMANDES ESTIMEZ-VOUS PAR MOIS ?',
    options: [
      'Moins de 20 commandes/mois',
      'Entre 20 et 100/mois',
      'Plus de 100/mois',
      'Je ne sais pas encore'
    ],
    required: true,
    next: function () { return 'catalog_autonomy'; }
  },
  {
    id: 'catalog_autonomy',
    section: 'B',
    type: 'single_choice',
    question: 'SOUHAITEZ-VOUS GÉRER VOTRE CATALOGUE PRODUITS VOUS-MÊME ?',
    options: [
      'Oui, en autonomie',
      'Non, je préfère déléguer'
    ],
    required: true,
    next: function () { return 'pos_system'; }
  },
  {
    id: 'pos_system',
    section: 'B',
    type: 'single_choice',
    question: 'AVEZ-VOUS DÉJÀ UN SYSTÈME DE CAISSE OU DE VENTE PHYSIQUE ?',
    options: [
      'Oui, j\'ai déjà un système de caisse/vente physique',
      'Non'
    ],
    required: true,
    next: function () { return 'existing_audience'; }
  },

  /* ========================
     SECTION C — Trafic
     ======================== */
  {
    id: 'existing_audience',
    section: 'C',
    type: 'single_choice',
    question: 'AVEZ-VOUS DÉJÀ UNE AUDIENCE EN LIGNE (RÉSEAUX SOCIAUX, NEWSLETTER) ?',
    options: [
      'Oui, une audience importante',
      'Oui, une petite audience',
      'Non, tout est à construire'
    ],
    required: true,
    next: function () { return 'ads_planned'; }
  },
  {
    id: 'ads_planned',
    section: 'C',
    type: 'single_choice',
    question: 'PRÉVOYEZ-VOUS DE FAIRE DE LA PUBLICITÉ EN LIGNE ?',
    options: [
      'Oui, dès le lancement',
      'Oui, plus tard',
      'Non, pas prévu'
    ],
    required: true,
    next: function () { return 'traffic_target'; }
  },
  {
    id: 'traffic_target',
    section: 'C',
    type: 'single_choice',
    question: 'QUEL TRAFIC CIBLE VISEZ-VOUS SUR VOTRE SITE ?',
    options: [
      'Moins de 500 visiteurs/mois',
      'Entre 500 et 5000/mois',
      'Plus de 5000/mois',
      'Je ne sais pas, aidez-moi à estimer'
    ],
    required: true,
    next: function () { return 'content_ownership'; }
  },

  /* ========================
     SECTION D — Contenu
     ======================== */
  {
    id: 'content_ownership',
    section: 'D',
    type: 'single_choice',
    question: 'QUI VA GÉRER LE CONTENU DU SITE AU QUOTIDIEN ?',
    options: [
      'Moi-même, en autonomie',
      'Vous (le prestataire), à la demande',
      'Une autre personne de mon équipe'
    ],
    required: true,
    next: function () { return 'content_frequency'; }
  },
  {
    id: 'content_frequency',
    section: 'D',
    type: 'single_choice',
    question: 'PRÉVOYEZ-VOUS DE METTRE À JOUR LE CONTENU RÉGULIÈREMENT ?',
    options: [
      'Oui, très régulièrement',
      'Occasionnellement',
      'Non, site statique'
    ],
    required: true,
    next: function () { return 'crm_need'; }
  },

  /* ========================
     SECTION E — CRM
     ======================== */
  {
    id: 'crm_need',
    section: 'E',
    type: 'single_choice',
    question: 'AVEZ-VOUS BESOIN D\'UN OUTIL DE SUIVI CLIENT (CRM) ?',
    options: [
      'Oui, c\'est un besoin important',
      'Peut-être, à voir',
      'Non, pas besoin'
    ],
    required: true,
    next: function () { return 'existing_crm_tool'; }
  },
  {
    id: 'existing_crm_tool',
    section: 'E',
    type: 'text',
    question: 'UTILISEZ-VOUS DÉJÀ UN OUTIL DE GESTION CLIENT ?',
    placeholder: 'EX: HUBSPOT, EXCEL, RIEN...',
    required: false,
    next: function (answer, allAnswers) {
      // Si boutique en ligne → section F (paiement)
      if (allAnswers.project_type === 'Boutique en ligne (e-commerce)') {
        return 'payment_methods';
      }
      // Sinon → section G (budget)
      return 'budget';
    }
  },

  /* ========================
     SECTION F — Paiement
     (uniquement si boutique)
     ======================== */
  {
    id: 'payment_methods',
    section: 'F',
    type: 'single_choice',
    question: 'QUELS MOYENS DE PAIEMENT SOUHAITEZ-VOUS PROPOSER ?',
    options: [
      'Carte bancaire uniquement',
      'Carte bancaire + PayPal',
      'Carte bancaire + paiement en plusieurs fois',
      'Je ne sais pas, à me conseiller'
    ],
    required: true,
    next: function () { return 'delivery_type'; }
  },
  {
    id: 'delivery_type',
    section: 'F',
    type: 'single_choice',
    question: 'QUEL TYPE DE LIVRAISON PROPOSEZ-VOUS ?',
    options: [
      'Livraison physique',
      'Service / produit numérique',
      'Retrait en magasin'
    ],
    required: true,
    next: function () { return 'budget'; }
  },

  /* ========================
     SECTION G — Budget & Délai
     ======================== */
  {
    id: 'budget',
    section: 'G',
    type: 'single_choice',
    question: 'QUEL EST VOTRE BUDGET APPROXIMATIF ?',
    options: [
      'Moins de 500€',
      'Entre 500€ et 1500€',
      'Entre 1500€ et 5000€',
      'Plus de 5000€',
      'Je ne sais pas, à me conseiller'
    ],
    required: true,
    next: function () { return 'deadline'; }
  },
  {
    id: 'deadline',
    section: 'G',
    type: 'single_choice',
    question: 'QUEL EST VOTRE DÉLAI SOUHAITÉ ?',
    options: [
      'Urgent (moins d\'un mois)',
      '1 à 3 mois',
      'Pas de contrainte de temps'
    ],
    required: true,
    next: function () { return 'maintenance_budget'; }
  },
  {
    id: 'maintenance_budget',
    section: 'G',
    type: 'single_choice',
    question: 'ÊTES-VOUS INTÉRESSÉ PAR UN FORFAIT DE MAINTENANCE MENSUEL ?',
    options: [
      'Oui',
      'Non, au cas par cas',
      'Je ne sais pas ce que ça implique'
    ],
    required: true,
    next: function () { return 'hosting_domain'; }
  },

  /* ========================
     SECTION H — Technique
     ======================== */
  {
    id: 'hosting_domain',
    section: 'H',
    type: 'single_choice',
    question: 'AVEZ-VOUS DÉJÀ UN NOM DE DOMAINE ET UN HÉBERGEMENT ?',
    options: [
      'Oui, les deux',
      'Nom de domaine seulement',
      'Rien pour l\'instant'
    ],
    required: true,
    next: function () { return 'brand_assets'; }
  },
  {
    id: 'brand_assets',
    section: 'H',
    type: 'single_choice',
    question: 'DISPOSEZ-VOUS D\'UNE IDENTITÉ VISUELLE (LOGO, CHARTE GRAPHIQUE) ?',
    options: [
      'Oui, complète',
      'Partielle (juste un logo)',
      'Non, à créer'
    ],
    required: true,
    next: function () { return 'multilingual'; }
  },
  {
    id: 'multilingual',
    section: 'H',
    type: 'single_choice',
    question: 'VOTRE SITE DOIT-IL ÊTRE MULTILINGUE ?',
    options: [
      'Non, français uniquement',
      'Oui'
    ],
    required: true,
    next: function (answer) {
      // Si multilingue, demander les langues
      if (answer === 'Oui') return 'multilingual_languages';
      return 'contact_name';
    }
  },
  {
    id: 'multilingual_languages',
    section: 'H',
    type: 'text',
    question: 'QUELLES LANGUES EN PLUS DU FRANÇAIS ?',
    placeholder: 'EX: ANGLAIS, ESPAGNOL...',
    required: true,
    next: function () { return 'contact_name'; }
  },

  /* ========================
     SECTION I — Coordonnées
     ======================== */
  {
    id: 'contact_name',
    section: 'I',
    type: 'text',
    question: 'QUEL EST VOTRE NOM COMPLET ?',
    placeholder: 'PRÉNOM NOM',
    required: true,
    next: function () { return 'contact_email'; }
  },
  {
    id: 'contact_email',
    section: 'I',
    type: 'text',
    question: 'VOTRE ADRESSE EMAIL POUR VOUS RECONTACTER ?',
    placeholder: 'VOTRE@EMAIL.COM',
    inputType: 'email',
    required: true,
    next: function () { return 'contact_phone'; }
  },
  {
    id: 'contact_phone',
    section: 'I',
    type: 'text',
    question: 'VOTRE NUMÉRO DE TÉLÉPHONE ? (OPTIONNEL)',
    placeholder: '06 XX XX XX XX',
    inputType: 'tel',
    required: false,
    next: function () { return null; } // Fin du parcours → récapitulatif
  },
];

/* ------------------------------------------------------------
   LABELS LISIBLES — Pour le récapitulatif (pas les id techniques)
   ------------------------------------------------------------ */
const CHATBOT_LABELS = {
  project_type:        'Type de site',
  existing_site:       'Site existant',
  sector:              'Secteur d\'activité',
  product_count:       'Nombre de produits',
  order_volume:        'Volume de commandes',
  catalog_autonomy:    'Gestion du catalogue',
  pos_system:          'Système de caisse',
  existing_audience:   'Audience existante',
  ads_planned:         'Publicité prévue',
  traffic_target:      'Trafic cible',
  content_ownership:   'Gestion du contenu',
  content_frequency:   'Fréquence de mise à jour',
  crm_need:            'Besoin CRM',
  existing_crm_tool:   'Outil CRM actuel',
  payment_methods:     'Moyens de paiement',
  delivery_type:       'Type de livraison',
  budget:              'Budget',
  deadline:            'Délai',
  maintenance_budget:  'Maintenance',
  hosting_domain:      'Hébergement / domaine',
  brand_assets:        'Identité visuelle',
  multilingual:        'Multilingue',
  multilingual_languages: 'Langues',
  contact_name:        'Nom',
  contact_email:       'Email',
  contact_phone:       'Téléphone',
};
