# Chatbot de Cadrage de Projet

## Description

Chatbot conversationnel intégré au portfolio, remplaçant le formulaire de contact classique. Il guide les prospects à travers un arbre de questions pour cadrer leur besoin (site vitrine, e-commerce, sur-mesure), génère un récapitulatif structuré envoyé par email, et propose au prospect de télécharger une copie.

## Architecture des fichiers

```
Portfolio/
├── index.html                         # Page principale (section #contact)
├── css/
│   └── type-shuffle.css               # Styles du chatbot (section "CHATBOT CADRAGE")
├── js/
│   ├── data/
│   │   └── chatbot-questions.js       # Arbre de questions (données pures)
│   └── sections/
│       └── chatbot.js                 # Moteur du chatbot (logique + UI + animations)
├── php/
│   ├── generate_recap.php             # Backend : validation, email, sauvegarde
│   ├── .htaccess                      # Protection des fichiers sensibles
│   └── rate_limits.json               # (auto-généré) Suivi du rate limiting
├── recaps/
│   ├── .htaccess                      # Accès web interdit
│   └── *.html                         # (auto-générés) Récapitulatifs sauvegardés
└── README-chatbot.md                  # Ce fichier
```

## Configuration

### 1. Adresse email de destination

Ouvrir `php/generate_recap.php` et modifier la ligne :

```php
$DEST_EMAIL = 'votre@email.com';
```

### 2. Déploiement

Le chatbot nécessite :
- **Frontend** (HTML/CSS/JS) : fonctionne sur n'importe quel hébergement statique
- **Backend** (PHP) : nécessite un hébergement avec PHP 7.4+ et la fonction `mail()` active
- **Dossier `/recaps/`** : doit être accessible en écriture par PHP (`chmod 755` ou équivalent)

> **Sans backend PHP** : le chatbot fonctionne entièrement côté client. Le prospect peut toujours télécharger son récapitulatif en `.txt`. Seul l'envoi par email nécessite le backend.

### 3. Email en production

La fonction native `mail()` de PHP est utilisée par défaut mais n'est pas fiable pour la délivrabilité. En production, remplacer par [PHPMailer](https://github.com/PHPMailer/PHPMailer) avec SMTP authentifié (Gmail, SendGrid, Mailgun, etc.).

## Modifier l'arbre de questions

Le fichier `js/data/chatbot-questions.js` contient toutes les questions séparées de la logique.

### Ajouter une question

1. Ajouter un objet dans le tableau `CHATBOT_QUESTIONS` :

```javascript
{
  id: 'ma_nouvelle_question',      // Identifiant unique
  section: 'A',                     // Section du stepper (A-I)
  type: 'single_choice',           // 'single_choice', 'multi_choice', 'text'
  question: 'MA QUESTION ?',       // Texte affiché
  options: ['Option 1', 'Option 2'], // Pour single/multi_choice
  placeholder: 'Texte...',         // Pour type 'text'
  inputType: 'email',              // Optionnel : 'email', 'tel' pour type 'text'
  required: true,                  // Champ obligatoire ?
  next: function (answer, allAnswers) {
    return 'id_question_suivante'; // Ou null pour aller au récap
  }
}
```

2. Mettre à jour la fonction `next()` de la question précédente pour pointer vers la nouvelle.

3. Ajouter le label lisible dans `CHATBOT_LABELS` :

```javascript
ma_nouvelle_question: 'Mon label lisible',
```

4. **Côté PHP** : ajouter la validation dans `generate_recap.php` :
   - Si `single_choice` : ajouter dans `$whitelist`
   - Si `text` : ajouter dans `$textFields`
   - Ajouter le label dans `$labels`
   - Ajouter dans le bon groupe de `$sectionMap`

### Ajouter une nouvelle section

1. Ajouter dans `CHATBOT_SECTIONS` :
```javascript
{ id: 'J', label: 'MA SECTION', icon: 'fa-icon-name' },
```

2. Si la section est conditionnelle, mettre à jour `getApplicableSections()`.

3. Côté PHP, ajouter dans `$sections` et `$sectionMap`.

### Branchement conditionnel

La fonction `next(answer, allAnswers)` reçoit :
- `answer` : la réponse à la question courante
- `allAnswers` : l'objet complet des réponses données jusque-là

Exemples :
```javascript
// Saut conditionnel
next: function (answer, allAnswers) {
  if (allAnswers.project_type === 'Boutique en ligne (e-commerce)') {
    return 'product_count';  // Section e-commerce
  }
  return 'existing_audience'; // Sauter la section e-commerce
}

// Fin du parcours
next: function () { return null; }
```

## Sécurité

- **Honeypot** : champ invisible rempli uniquement par les bots (rejeté silencieusement)
- **Rate limiting** : 5 soumissions max par IP par heure
- **Validation whitelist** : toutes les valeurs `single_choice` sont vérifiées côté serveur
- **Sanitization** : `strip_tags()` + `htmlspecialchars()` + limite de longueur sur les champs texte
- **Pas de secret côté client** : aucune clé API ou donnée sensible dans le JavaScript
- **Protection `/recaps/`** : `.htaccess` interdit l'accès web direct

## Moteur de recommandation

La fonction `computeRecommendation()` (JS) et son équivalent PHP croisent les réponses pour suggérer :

| Règle | Données croisées | Suggestion |
|-------|-----------------|------------|
| Plateforme | type + produits + volume + budget | Shopify vs WooCommerce vs sur-mesure |
| Hébergement | trafic + publicité | Mutualisé vs VPS + Cloudflare |
| CRM | besoin CRM + outil existant | Module intégré ou intégration API |
| CMS | gestion contenu + fréquence | WordPress ou site statique |
| Cohérence | budget + délai + complexité | Alertes incohérence |
| Design | identité visuelle | Création à ajouter au devis |
| Multilingue | multilingue | Plugin traduction + surcoût |

> La recommandation est **recalculée côté serveur** et n'est **jamais montrée au prospect** — elle est incluse uniquement dans l'email et le fichier sauvegardé.
