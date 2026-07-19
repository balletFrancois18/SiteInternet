<?php
/**
 * ============================================================
 * CHATBOT CADRAGE — Backend de traitement
 * ============================================================
 *
 * Reçoit les réponses du chatbot en JSON (POST), valide,
 * génère un récapitulatif, l'envoie par email et le sauvegarde.
 *
 * CONFIGURATION :
 * - Modifier $DEST_EMAIL ci-dessous avec votre adresse email
 * - Le dossier /recaps/ doit exister et être accessible en écriture
 *
 * SÉCURITÉ :
 * - Validation whitelist de toutes les réponses single_choice
 * - Sanitization des champs texte libres
 * - Honeypot anti-spam
 * - Rate limiting par IP (5 soumissions/heure)
 *
 * NOTE PRODUCTION :
 * - En production, remplacer mail() par PHPMailer + SMTP
 *   authentifié pour garantir la délivrabilité des emails.
 *   Voir : https://github.com/PHPMailer/PHPMailer
 *
 * ============================================================
 */

// ============================================================
// CONFIGURATION
// ============================================================

// Adresse email de destination (À MODIFIER)
$DEST_EMAIL = 'francois.balletpro@gmail.com';

// Dossier de stockage des récapitulatifs
$RECAPS_DIR = __DIR__ . '/../recaps';

// Rate limiting : nombre max de soumissions par heure par IP
$RATE_LIMIT_MAX = 5;
$RATE_LIMIT_FILE = __DIR__ . '/rate_limits.json';

// ============================================================
// HEADERS CORS + JSON
// ============================================================
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Autoriser uniquement les requêtes POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée.']);
    exit;
}

// ============================================================
// LECTURE DU BODY JSON
// ============================================================
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data || !isset($data['answers'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Données invalides.']);
    exit;
}

$answers = $data['answers'];
$honeypot = isset($data['honeypot']) ? $data['honeypot'] : '';

// ============================================================
// VÉRIFICATION HONEYPOT
// Si le champ honeypot est rempli, c'est un bot
// ============================================================
if (!empty($honeypot)) {
    // On retourne un faux succès pour ne pas informer le bot
    echo json_encode(['success' => true]);
    exit;
}

// ============================================================
// RATE LIMITING PAR IP
// ============================================================
$clientIP = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

if (file_exists($RATE_LIMIT_FILE)) {
    $rateLimits = json_decode(file_get_contents($RATE_LIMIT_FILE), true) ?: [];
} else {
    $rateLimits = [];
}

$now = time();
$oneHourAgo = $now - 3600;

// Nettoyer les entrées expirées
foreach ($rateLimits as $ip => $timestamps) {
    $rateLimits[$ip] = array_filter($timestamps, function ($t) use ($oneHourAgo) {
        return $t > $oneHourAgo;
    });
    if (empty($rateLimits[$ip])) {
        unset($rateLimits[$ip]);
    }
}

// Vérifier la limite pour cette IP
$ipEntries = isset($rateLimits[$clientIP]) ? $rateLimits[$clientIP] : [];
if (count($ipEntries) >= $RATE_LIMIT_MAX) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Trop de soumissions. Réessayez dans une heure.']);
    exit;
}

// Enregistrer cette soumission
$rateLimits[$clientIP][] = $now;
file_put_contents($RATE_LIMIT_FILE, json_encode($rateLimits), LOCK_EX);

// ============================================================
// WHITELIST DES VALEURS POSSIBLES (single_choice)
// Chaque clé correspond à un id de question.
// Les valeurs doivent correspondre EXACTEMENT aux options
// définies dans chatbot-questions.js.
// ============================================================
$whitelist = [
    'project_type' => [
        'Site vitrine',
        'Boutique en ligne (e-commerce)',
        'Site vitrine + blog',
        'Autre / je ne sais pas encore',
    ],
    'existing_site' => [
        'Oui, je veux une refonte',
        'Non, c\'est une création complète',
    ],
    'product_count' => [
        'Moins de 20 produits',
        'Entre 20 et 200 produits',
        'Plus de 200 produits',
    ],
    'order_volume' => [
        'Moins de 20 commandes/mois',
        'Entre 20 et 100/mois',
        'Plus de 100/mois',
        'Je ne sais pas encore',
    ],
    'catalog_autonomy' => [
        'Oui, en autonomie',
        'Non, je préfère déléguer',
    ],
    'pos_system' => [
        'Oui, j\'ai déjà un système de caisse/vente physique',
        'Non',
    ],
    'existing_audience' => [
        'Oui, une audience importante',
        'Oui, une petite audience',
        'Non, tout est à construire',
    ],
    'ads_planned' => [
        'Oui, dès le lancement',
        'Oui, plus tard',
        'Non, pas prévu',
    ],
    'traffic_target' => [
        'Moins de 500 visiteurs/mois',
        'Entre 500 et 5000/mois',
        'Plus de 5000/mois',
        'Je ne sais pas, aidez-moi à estimer',
    ],
    'content_ownership' => [
        'Moi-même, en autonomie',
        'Vous (le prestataire), à la demande',
        'Une autre personne de mon équipe',
    ],
    'content_frequency' => [
        'Oui, très régulièrement',
        'Occasionnellement',
        'Non, site statique',
    ],
    'crm_need' => [
        'Oui, c\'est un besoin important',
        'Peut-être, à voir',
        'Non, pas besoin',
    ],
    'payment_methods' => [
        'Carte bancaire uniquement',
        'Carte bancaire + PayPal',
        'Carte bancaire + paiement en plusieurs fois',
        'Je ne sais pas, à me conseiller',
    ],
    'delivery_type' => [
        'Livraison physique',
        'Service / produit numérique',
        'Retrait en magasin',
    ],
    'budget' => [
        'Moins de 500€',
        'Entre 500€ et 1500€',
        'Entre 1500€ et 5000€',
        'Plus de 5000€',
        'Je ne sais pas, à me conseiller',
    ],
    'deadline' => [
        'Urgent (moins d\'un mois)',
        '1 à 3 mois',
        'Pas de contrainte de temps',
    ],
    'maintenance_budget' => [
        'Oui',
        'Non, au cas par cas',
        'Je ne sais pas ce que ça implique',
    ],
    'hosting_domain' => [
        'Oui, les deux',
        'Nom de domaine seulement',
        'Rien pour l\'instant',
    ],
    'brand_assets' => [
        'Oui, complète',
        'Partielle (juste un logo)',
        'Non, à créer',
    ],
    'multilingual' => [
        'Non, français uniquement',
        'Oui',
    ],
];

// Champs texte libres autorisés
$textFields = [
    'sector',
    'existing_crm_tool',
    'multilingual_languages',
    'contact_name',
    'contact_email',
    'contact_phone',
];

// ============================================================
// VALIDATION & SANITIZATION
// ============================================================
$clean = [];

// Valider les champs single_choice
foreach ($whitelist as $key => $allowedValues) {
    if (isset($answers[$key])) {
        if (in_array($answers[$key], $allowedValues, true)) {
            $clean[$key] = $answers[$key];
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Valeur invalide pour le champ : ' . htmlspecialchars($key),
            ]);
            exit;
        }
    }
}

// Valider et sanitizer les champs texte
foreach ($textFields as $field) {
    if (isset($answers[$field])) {
        $val = trim($answers[$field]);
        // Suppression des tags HTML
        $val = strip_tags($val);
        // Échappement des caractères spéciaux HTML
        $val = htmlspecialchars($val, ENT_QUOTES, 'UTF-8');
        // Limiter la longueur (anti-abus)
        $val = mb_substr($val, 0, 500);
        $clean[$field] = $val;
    }
}

// Vérifier que les champs obligatoires sont présents
if (empty($clean['contact_name']) || empty($clean['contact_email'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Le nom et l\'email sont obligatoires.',
    ]);
    exit;
}

// Vérifier le format email
if (!filter_var($clean['contact_email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Format d\'email invalide.',
    ]);
    exit;
}

// ============================================================
// MOTEUR DE RECOMMANDATION (recalculé côté serveur)
// Même logique que côté client, mais on ne fait pas confiance
// au JS pour la version envoyée par email.
// ============================================================
$reco = [];

// Règle 1 : Plateforme
$type = $clean['project_type'] ?? '';
$products = $clean['product_count'] ?? '';
$volume = $clean['order_volume'] ?? '';
$budgetVal = $clean['budget'] ?? '';

if ($type === 'Boutique en ligne (e-commerce)') {
    if ($products === 'Plus de 200 produits' || $volume === 'Plus de 100/mois') {
        if ($budgetVal === 'Plus de 5000€') {
            $reco[] = 'PLATEFORME : Dev e-commerce sur-mesure (gros catalogue + budget conséquent).';
        } else {
            $reco[] = 'PLATEFORME : WordPress/WooCommerce (gros catalogue, budget modéré).';
        }
    } elseif ($products === 'Moins de 20 produits') {
        $reco[] = 'PLATEFORME : Shopify recommandé (petit catalogue, démarrage rapide).';
    } else {
        $reco[] = 'PLATEFORME : WordPress/WooCommerce (bon compromis).';
    }
} else {
    $freq = $clean['content_frequency'] ?? '';
    $owner = $clean['content_ownership'] ?? '';
    if ($freq === 'Non, site statique' && $owner !== 'Moi-même, en autonomie') {
        $reco[] = 'PLATEFORME : Site codé sans CMS (HTML/CSS/JS pur).';
    } else {
        $reco[] = 'PLATEFORME : WordPress recommandé.';
    }
}

// Règle 2 : Hébergement
$traffic = $clean['traffic_target'] ?? '';
$ads = $clean['ads_planned'] ?? '';
if ($traffic === 'Plus de 5000/mois' || $ads === 'Oui, dès le lancement') {
    $reco[] = 'HÉBERGEMENT : VPS + Cloudflare (trafic élevé).';
} else {
    $reco[] = 'HÉBERGEMENT : Mutualisé suffisant.';
}

// Règle 3 : CRM
$crm = $clean['crm_need'] ?? '';
$crmTool = $clean['existing_crm_tool'] ?? '';
if ($crm === 'Oui, c\'est un besoin important') {
    if (!empty($crmTool) && $crmTool !== '(non renseigné)') {
        $reco[] = 'CRM : Intégration avec ' . $crmTool . ' à prévoir.';
    } else {
        $reco[] = 'CRM : Proposer module CRM intégré.';
    }
}

// Règle 4 : Cohérence budget/délai
$deadline = $clean['deadline'] ?? '';
if ($budgetVal === 'Moins de 500€' && $deadline === 'Urgent (moins d\'un mois)') {
    $reco[] = '⚠️ INCOHÉRENCE : Budget < 500€ + délai urgent. À recadrer.';
}

// Règle 5 : Identité visuelle
$brand = $clean['brand_assets'] ?? '';
if ($brand === 'Non, à créer') {
    $reco[] = 'DESIGN : Création identité visuelle à ajouter au devis.';
}

// Règle 6 : Multilingue
$multi = $clean['multilingual'] ?? '';
if ($multi === 'Oui') {
    $reco[] = 'MULTILINGUE : Plugin traduction nécessaire, surcoût à prévoir.';
}

// ============================================================
// LABELS LISIBLES
// ============================================================
$labels = [
    'project_type'        => 'Type de site',
    'existing_site'       => 'Site existant',
    'sector'              => 'Secteur d\'activité',
    'product_count'       => 'Nombre de produits',
    'order_volume'        => 'Volume de commandes',
    'catalog_autonomy'    => 'Gestion du catalogue',
    'pos_system'          => 'Système de caisse',
    'existing_audience'   => 'Audience existante',
    'ads_planned'         => 'Publicité prévue',
    'traffic_target'      => 'Trafic cible',
    'content_ownership'   => 'Gestion du contenu',
    'content_frequency'   => 'Fréquence de mise à jour',
    'crm_need'            => 'Besoin CRM',
    'existing_crm_tool'   => 'Outil CRM actuel',
    'payment_methods'     => 'Moyens de paiement',
    'delivery_type'       => 'Type de livraison',
    'budget'              => 'Budget',
    'deadline'            => 'Délai',
    'maintenance_budget'  => 'Maintenance',
    'hosting_domain'      => 'Hébergement / domaine',
    'brand_assets'        => 'Identité visuelle',
    'multilingual'        => 'Multilingue',
    'multilingual_languages' => 'Langues',
    'contact_name'        => 'Nom',
    'contact_email'       => 'Email',
    'contact_phone'       => 'Téléphone',
];

// ============================================================
// GÉNÉRATION DU RÉCAPITULATIF HTML
// ============================================================
$timestamp = date('Y-m-d H:i:s');
$contactName = $clean['contact_name'] ?? 'Prospect';
$contactEmail = $clean['contact_email'] ?? '';

$htmlRecap = '<!DOCTYPE html><html lang="fr"><head>';
$htmlRecap .= '<meta charset="UTF-8">';
$htmlRecap .= '<title>Récapitulatif — ' . htmlspecialchars($contactName) . '</title>';
$htmlRecap .= '<style>';
$htmlRecap .= 'body{font-family:monospace;background:#0a0a0f;color:#e0e0e0;padding:2rem;max-width:700px;margin:auto;}';
$htmlRecap .= 'h1{color:#00ffcc;font-size:1.3rem;border-bottom:1px solid #222;padding-bottom:0.5rem;}';
$htmlRecap .= 'h2{color:#aaa;font-size:0.9rem;margin-top:1.5rem;border-bottom:1px solid #222;padding-bottom:0.3rem;}';
$htmlRecap .= 'table{width:100%;border-collapse:collapse;margin:0.5rem 0;}';
$htmlRecap .= 'td{padding:0.3rem 0.5rem;font-size:0.85rem;border-bottom:1px solid #111;}';
$htmlRecap .= 'td:first-child{color:#888;width:40%;text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em;}';
$htmlRecap .= '.reco{background:#111;border:1px solid #222;padding:1rem;margin-top:1.5rem;}';
$htmlRecap .= '.reco h3{color:#00ffcc;font-size:0.9rem;margin-bottom:0.5rem;}';
$htmlRecap .= '.reco li{font-size:0.82rem;margin-bottom:0.3rem;color:#ccc;}';
$htmlRecap .= '.warn{color:#ff8800;}';
$htmlRecap .= '</style></head><body>';

$htmlRecap .= '<h1>📋 RÉCAPITULATIF — DEMANDE DE PROJET</h1>';
$htmlRecap .= '<p style="color:#888;font-size:0.8rem;">Date : ' . $timestamp . '</p>';

// Sections ordonnées
$sections = [
    'A' => 'PROJET',
    'B' => 'E-COMMERCE',
    'C' => 'TRAFIC & VISIBILITÉ',
    'D' => 'GESTION DE CONTENU',
    'E' => 'CRM / SUIVI CLIENT',
    'F' => 'PAIEMENT EN LIGNE',
    'G' => 'BUDGET & DÉLAI',
    'H' => 'TECHNIQUE',
    'I' => 'COORDONNÉES',
];

$sectionMap = [
    'A' => ['project_type', 'existing_site', 'sector'],
    'B' => ['product_count', 'order_volume', 'catalog_autonomy', 'pos_system'],
    'C' => ['existing_audience', 'ads_planned', 'traffic_target'],
    'D' => ['content_ownership', 'content_frequency'],
    'E' => ['crm_need', 'existing_crm_tool'],
    'F' => ['payment_methods', 'delivery_type'],
    'G' => ['budget', 'deadline', 'maintenance_budget'],
    'H' => ['hosting_domain', 'brand_assets', 'multilingual', 'multilingual_languages'],
    'I' => ['contact_name', 'contact_email', 'contact_phone'],
];

foreach ($sections as $secId => $secLabel) {
    $fields = $sectionMap[$secId];
    $hasData = false;
    foreach ($fields as $f) {
        if (isset($clean[$f]) && !empty($clean[$f])) {
            $hasData = true;
            break;
        }
    }
    if (!$hasData) continue;

    $htmlRecap .= '<h2>' . htmlspecialchars($secLabel) . '</h2>';
    $htmlRecap .= '<table>';
    foreach ($fields as $f) {
        if (isset($clean[$f]) && !empty($clean[$f])) {
            $label = $labels[$f] ?? $f;
            $htmlRecap .= '<tr><td>' . htmlspecialchars($label) . '</td>';
            $htmlRecap .= '<td>' . htmlspecialchars($clean[$f]) . '</td></tr>';
        }
    }
    $htmlRecap .= '</table>';
}

// Recommandation (uniquement dans l'email prestataire, pas visible client)
if (!empty($reco)) {
    $htmlRecap .= '<div class="reco">';
    $htmlRecap .= '<h3>🤖 RECOMMANDATION AUTOMATIQUE (interne)</h3>';
    $htmlRecap .= '<ul>';
    foreach ($reco as $r) {
        $class = (strpos($r, '⚠️') !== false) ? ' class="warn"' : '';
        $htmlRecap .= '<li' . $class . '>' . htmlspecialchars($r) . '</li>';
    }
    $htmlRecap .= '</ul>';
    $htmlRecap .= '</div>';
}

$htmlRecap .= '</body></html>';

// ============================================================
// SAUVEGARDE DU RÉCAPITULATIF
// ============================================================
if (!is_dir($RECAPS_DIR)) {
    mkdir($RECAPS_DIR, 0755, true);
}

$safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $contactName);
$filename = date('Y-m-d_His') . '_' . $safeName . '.html';
$filepath = $RECAPS_DIR . '/' . $filename;

file_put_contents($filepath, $htmlRecap, LOCK_EX);

// ============================================================
// ENVOI PAR EMAIL
// ============================================================
// NOTE PRODUCTION : En production, remplacer ce bloc par PHPMailer
// avec SMTP authentifié (ex: Gmail, SendGrid, Mailgun) pour
// garantir la délivrabilité. La fonction mail() native dépend
// de la configuration du serveur et finit souvent en spam.

$subject = '=?UTF-8?B?' . base64_encode('Nouvelle demande de cadrage — ' . $contactName) . '?=';

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-type: text/html; charset=UTF-8';
$headers[] = 'From: Chatbot Cadrage <noreply@' . ($_SERVER['SERVER_NAME'] ?? 'portfolio.local') . '>';
if (!empty($contactEmail)) {
    $headers[] = 'Reply-To: ' . $contactEmail;
}

$mailSent = @mail($DEST_EMAIL, $subject, $htmlRecap, implode("\r\n", $headers));

// ============================================================
// RÉPONSE
// ============================================================
echo json_encode([
    'success' => true,
    'message' => $mailSent
        ? 'Demande envoyée et sauvegardée.'
        : 'Demande sauvegardée (email non envoyé — vérifier la config serveur).',
]);
