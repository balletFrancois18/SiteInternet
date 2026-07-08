<?php
/**
 * ============================================================
 * RECRUTEUR — Backend de traitement
 * ============================================================
 *
 * Reçoit les réponses du terminal recruteur en JSON (POST),
 * valide, génère un récapitulatif, l'envoie par email et le sauvegarde.
 *
 * ============================================================
 */

// ============================================================
// CONFIGURATION
// ============================================================

$DEST_EMAIL = 'votre@email.com';
$RECAPS_DIR = __DIR__ . '/../recaps/recruiters';
$RATE_LIMIT_MAX = 5;
$RATE_LIMIT_FILE = __DIR__ . '/rate_limits_recruiter.json';

// ============================================================
// HEADERS
// ============================================================
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

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
// ============================================================
if (!empty($honeypot)) {
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

foreach ($rateLimits as $ip => $timestamps) {
    $rateLimits[$ip] = array_filter($timestamps, function ($t) use ($oneHourAgo) {
        return $t > $oneHourAgo;
    });
    if (empty($rateLimits[$ip])) {
        unset($rateLimits[$ip]);
    }
}

$ipEntries = isset($rateLimits[$clientIP]) ? $rateLimits[$clientIP] : [];
if (count($ipEntries) >= $RATE_LIMIT_MAX) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Trop de soumissions. Réessayez dans une heure.']);
    exit;
}

$rateLimits[$clientIP][] = $now;
file_put_contents($RATE_LIMIT_FILE, json_encode($rateLimits), LOCK_EX);

// ============================================================
// WHITELIST & VALIDATION
// ============================================================
$whitelist = [
    'r_contract_type' => [
        'Apprentissage (Master)',
        'Contrat de professionnalisation',
        'Stage alterné',
        'Je souhaite simplement échanger',
    ],
    'r_rhythm' => [
        '3 jours entreprise / 2 jours école',
        '1 semaine entreprise / 1 semaine école',
        '3 semaines entreprise / 1 semaine école',
        'Flexible / à définir',
    ],
];

// Multi-choice whitelist
$multiChoiceWhitelist = [
    'r_profile' => [
        'Développement Fullstack',
        'DevOps / Cloud',
        'Réseaux & Cybersécurité',
        'Data / Big Data',
        'Chefferie de Projet / Agile',
    ],
];

$textFields = [
    'r_company',
    'r_sector',
    'r_start_date',
    'r_mission',
    'r_contact_name',
    'r_contact_email',
    'r_contact_phone',
];

$clean = [];

// Valider single_choice
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

// Valider multi_choice
foreach ($multiChoiceWhitelist as $key => $allowedValues) {
    if (isset($answers[$key])) {
        $val = $answers[$key];
        if (is_string($val)) {
            // Stored as comma-separated
            $selected = array_map('trim', explode(',', $val));
            foreach ($selected as $s) {
                if (!in_array($s, $allowedValues, true)) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Valeur invalide pour le champ : ' . htmlspecialchars($key),
                    ]);
                    exit;
                }
            }
            $clean[$key] = $val;
        }
    }
}

// Valider et sanitizer les champs texte
foreach ($textFields as $field) {
    if (isset($answers[$field])) {
        $val = trim($answers[$field]);
        $val = strip_tags($val);
        $val = htmlspecialchars($val, ENT_QUOTES, 'UTF-8');
        $val = mb_substr($val, 0, 500);
        $clean[$field] = $val;
    }
}

// Vérifier les champs obligatoires
if (empty($clean['r_contact_name']) || empty($clean['r_contact_email'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Le nom et l\'email sont obligatoires.',
    ]);
    exit;
}

// Vérifier le format email
if (!filter_var($clean['r_contact_email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Format d\'email invalide.',
    ]);
    exit;
}

// ============================================================
// LABELS
// ============================================================
$labels = [
    'r_company'        => 'Entreprise',
    'r_sector'         => 'Secteur d\'activité',
    'r_contract_type'  => 'Type de contrat',
    'r_rhythm'         => 'Rythme d\'alternance',
    'r_start_date'     => 'Date de début',
    'r_profile'        => 'Profil(s) recherché(s)',
    'r_mission'        => 'Description de la mission',
    'r_contact_name'   => 'Nom du contact',
    'r_contact_email'  => 'Email',
    'r_contact_phone'  => 'Téléphone',
];

// ============================================================
// GÉNÉRATION DU RÉCAPITULATIF HTML
// ============================================================
$timestamp = date('Y-m-d H:i:s');
$contactName = $clean['r_contact_name'] ?? 'Recruteur';
$contactEmail = $clean['r_contact_email'] ?? '';
$company = $clean['r_company'] ?? 'Non renseigné';

$htmlRecap = '<!DOCTYPE html><html lang="fr"><head>';
$htmlRecap .= '<meta charset="UTF-8">';
$htmlRecap .= '<title>Offre Recruteur — ' . htmlspecialchars($company) . '</title>';
$htmlRecap .= '<style>';
$htmlRecap .= 'body{font-family:monospace;background:#0a0a0f;color:#e0e0e0;padding:2rem;max-width:700px;margin:auto;}';
$htmlRecap .= 'h1{color:#00ffcc;font-size:1.3rem;border-bottom:1px solid #222;padding-bottom:0.5rem;}';
$htmlRecap .= 'table{width:100%;border-collapse:collapse;margin:0.5rem 0;}';
$htmlRecap .= 'td{padding:0.3rem 0.5rem;font-size:0.85rem;border-bottom:1px solid #111;}';
$htmlRecap .= 'td:first-child{color:#888;width:40%;text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em;}';
$htmlRecap .= '</style></head><body>';

$htmlRecap .= '<h1>🎯 OFFRE RECRUTEUR — ' . htmlspecialchars($company) . '</h1>';
$htmlRecap .= '<p style="color:#888;font-size:0.8rem;">Date : ' . $timestamp . '</p>';

$htmlRecap .= '<table>';
foreach ($clean as $key => $value) {
    $label = isset($labels[$key]) ? $labels[$key] : $key;
    $htmlRecap .= '<tr>';
    $htmlRecap .= '<td>' . htmlspecialchars($label) . '</td>';
    $htmlRecap .= '<td>' . htmlspecialchars($value ?: '(non renseigné)') . '</td>';
    $htmlRecap .= '</tr>';
}
$htmlRecap .= '</table>';

$htmlRecap .= '</body></html>';

// ============================================================
// SAUVEGARDE DU FICHIER
// ============================================================
if (!is_dir($RECAPS_DIR)) {
    mkdir($RECAPS_DIR, 0755, true);
}

$filename = 'recruiter_' . date('Y-m-d_His') . '_' . preg_replace('/[^a-z0-9]/', '', strtolower($company)) . '.html';
$filepath = $RECAPS_DIR . '/' . $filename;
file_put_contents($filepath, $htmlRecap, LOCK_EX);

// ============================================================
// ENVOI PAR EMAIL
// ============================================================
$subject = '[PORTFOLIO] Offre recruteur — ' . $company;
$headers = 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
$headers .= 'From: Portfolio François Ballet <noreply@francois-ballet.fr>' . "\r\n";
if (!empty($contactEmail)) {
    $headers .= 'Reply-To: ' . $contactEmail . "\r\n";
}

$emailSent = @mail($DEST_EMAIL, $subject, $htmlRecap, $headers);

// ============================================================
// RÉPONSE
// ============================================================
echo json_encode([
    'success' => true,
    'message' => 'Votre message a bien été envoyé à François.',
    'file' => $filename,
]);
