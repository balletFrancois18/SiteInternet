import csv
import smtplib
import time
import random
import html
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.application import MIMEApplication
from pathlib import Path
from datetime import datetime

# ══════════════════════════════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════════════════════════════
SMTP_HOST    = "smtp.gmail.com"
SMTP_PORT    = 587
SENDER       = "francois.balletpro@gmail.com"

# Récupération sécurisée via variable d'environnement
# Pour tester en local, tu peux remplacer par ton nouveau mot de passe d'application entre guillemets
APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "REMPLACE_MOI_OU_METS_TON_PASS")

CV_IMAGE = Path("cv.jpg")   # optionnel – ignoré s'il n'existe pas
CV_PDF   = Path("cv.pdf")   # idem
CSV_FILE = "contacts_taff.csv"   

# ══════════════════════════════════════════════════════════════
#  PARAMÈTRES D'ENVOI (anti-spam)
# ══════════════════════════════════════════════════════════════
MIN_DELAY   = 80    # secondes minimales entre chaque envoi
MAX_DELAY   = 140   # secondes maximales entre chaque envoi
MAX_PER_DAY = 40    # limite journalière prudente

# ══════════════════════════════════════════════════════════════
#  VARIATIONS DE CONTENU 
# ══════════════════════════════════════════════════════════════

GENERIC_COMPANY = [
    "votre société",
    "votre structure",
    "votre établissement",
    "votre enseigne",
]

SUBJECTS = [
    "Candidature spontanée CDD d'été / Intérim – François Ballet",
    "Recherche CDD (35h) ou Intérim – Disponible du 08/06 au 07/08 – François Ballet",
    "Candidature – Job d'été ou mission intérim – François Ballet",
    "François Ballet – Candidature CDD d'été (Disponible immédiatement)",
    "Recherche contrat CDD ou Intérim – Juin à Août – François Ballet",
]

INTROS = [
    "Je me permets de vous adresser ma candidature spontanée pour rejoindre {company} "
    "dans le cadre d'un contrat CDD à temps plein (35h/semaine) ou de missions en intérim, "
    "étant disponible du 8 juin au 7 août 2026.",

    "Actuellement étudiant, je recherche activement un emploi saisonnier ou un CDD au sein de {company}. "
    "Je suis entièrement disponible à temps complet du 08/06/2026 au 07/08/2026.",

    "En vue de la période estivale, je me permets de vous proposer ma candidature pour un poste en CDD "
    "ou en intérim au sein de {company}. Je suis opérationnel du 8 juin au début août.",

    "Je souhaite mettre ma polyvalence au service de {company} dans le cadre d'un CDD d'été. "
    "Mes examens terminés, je suis disponible immédiatement à temps plein du 8 juin au 7 août 2026.",
]

# Corps du message adaptés selon le secteur d'activité
BODIES = {
    "logistique": (
        "Fort de mes expériences passées en manutention et en préparation de commandes (Movie Express, VSM Impavide), "
        "je suis habitué aux cadences soutenues, au port de charges et au travail d'équipe. "
        "Ma rigueur et ma ponctualité me permettent d'être rapidement autonome sur un poste opérationnel. "
        "Je suis disponible immédiatement à temps plein pour toute la période estivale."
    ),
    
    "restauration": (
        "Sérieux, dynamique et habitué aux rythmes intenses de la restauration rapide, "
        "je maîtrise l'accueil client, la prise de commande, l'encaissement et le respect strict des normes d'hygiène (HACCP). "
        "Je sais gérer le rush avec le sourire et m'intégrer rapidement dans une équipe."
    ),
    
    "vente": (
        "Doté d'un excellent sens du contact client grâce à mes expériences en boutique et prêt-à-porter (Momo Phone), "
        "je maîtrise l'accueil, le conseil, l'encaissement ainsi que la réception des livraisons et la mise en rayon (facing). "
        "Ma polyvalence me permet de veiller à la parfaite tenue du magasin."
    ),
    
    "generique": (
        "Mes différentes expériences professionnelles (vente, logistique, restauration, BTP) "
        "m'ont appris à être polyvalent et efficace. Dynamique et endurant, je m'adapte facilement "
        "aux horaires décalés, de nuit ou de week-end."
    )
}

CLOSINGS = [
    (
        "Je reste à votre entière disposition pour un entretien ou un échange téléphonique "
        "afin de vous détailler mon parcours.<br/>Vous trouverez mon CV en pièce jointe."
        "<br/><br/>Dans l'attente de votre retour, je vous prie d'agréer mes salutations distinguées."
        "<br/><br/><strong>François Ballet</strong><br/>"
        "Étudiant – Villepinte (93420)<br/>"
        "📞 06 27 66 78 65 &nbsp;|&nbsp; ✉️ francois.balletpro@gmail.com"
    ),
    (
        "Mon CV complet est joint à ce mail. Je suis joignable à tout moment pour échanger avec vous."
        "<br/><br/>Bien cordialement,"
        "<br/><br/><strong>François Ballet</strong><br/>"
        "Étudiant – Villepinte (93420)<br/>"
        "📞 06 27 66 78 65 &nbsp;|&nbsp; ✉️ francois.balletpro@gmail.com"
    )
]

# ══════════════════════════════════════════════════════════════
#  UTILITAIRES
# ══════════════════════════════════════════════════════════════

def clean_company(raw: str) -> str:
    """Nettoie le nom d'entreprise ou renvoie une formulation générique."""
    bad = {"", "n/a", "na", "-", "vos rangs", "votre entreprise", "vos effectifs"}
    cleaned = raw.strip()
    if cleaned.lower() in bad:
        return random.choice(GENERIC_COMPANY)
    return cleaned


def strip_html(text: str) -> str:
    """Version texte brut simplifiée (pour la partie plain/text du mail)."""
    return (
        text.replace("<br/><br/>", "\n\n")
            .replace("<br/>", "\n")
            .replace("<br>", "\n")
            .replace("<strong>", "")
            .replace("</strong>", "")
            .replace("&nbsp;", " ")
    )


def build_message(to_name: str, company_raw: str, sector_raw: str):
    """Construit le corps du mail (plain + html) adapté au secteur indiqué."""
    company = clean_company(company_raw)
    safe_name    = html.escape(to_name.strip()) if to_name.strip() else ""
    safe_company = html.escape(company)

    intro   = random.choice(INTROS).format(company=safe_company)
    closing = random.choice(CLOSINGS)

    # Sélection du corps de texte selon le secteur (fallback sur générique si absent)
    sector = sector_raw.strip().lower()
    body = BODIES.get(sector, BODIES["generique"])

    salutation = f"Bonjour {safe_name}," if safe_name else "Bonjour,"

    # ── Version texte brut ────────────────────────────────────
    plain = "\n".join([
        salutation,
        "",
        strip_html(intro),
        "",
        strip_html(body),
        "",
        strip_html(closing),
    ])

    # ── Version HTML ──────────────────────────────────────────
    body_html_lines = body.replace("\n", "<br/>")
    html_body = f"""<html>
  <body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.65;max-width:620px;">
    <p>{salutation}</p>
    <p>{intro}</p>
    <p>{body_html_lines}</p>
    <p>{closing}</p>
  </body>
</html>"""

    return plain, html_body


def send_mail(to_email: str, to_name: str, company: str, sector: str):
    """Génère l'e-mail et l'envoie via le serveur SMTP Google."""
    subject        = random.choice(SUBJECTS)
    body_text, body_html = build_message(to_name, company, sector)

    # Enveloppe principale
    msg = MIMEMultipart("mixed")
    msg["From"]     = f"François Ballet <{SENDER}>"
    msg["To"]       = to_email
    msg["Subject"]  = subject
    msg["Reply-To"] = SENDER

    # Partie texte + HTML
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(body_text, "plain",  "utf-8"))
    alt.attach(MIMEText(body_html, "html",   "utf-8"))
    msg.attach(alt)

    # Pièce jointe image (optionnelle)
    if CV_IMAGE.exists():
        with open(CV_IMAGE, "rb") as f:
            img = MIMEImage(f.read(), name=CV_IMAGE.name)
            img.add_header("Content-Disposition", "attachment",
                           filename="CV_Francois_Ballet.jpg")
            msg.attach(img)

    # Pièce jointe PDF (optionnelle)
    if CV_PDF.exists():
        with open(CV_PDF, "rb") as f:
            pdf = MIMEApplication(f.read(), _subtype="pdf")
            pdf.add_header("Content-Disposition", "attachment",
                           filename="CV_Francois_Ballet.pdf")
            msg.attach(pdf)

    # Envoi SMTP avec TLS
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SENDER, APP_PASSWORD)
        server.send_message(msg)


# ══════════════════════════════════════════════════════════════
#  EXÉCUTION
# ══════════════════════════════════════════════════════════════
def main():
    if APP_PASSWORD in ["REMPLACE_MOI", "REMPLACE_MOI_OU_METS_TON_PASS"]:
        print("❌ Mot de passe de l'application Gmail manquant ou non configuré !")
        print("   Configure la variable d'environnement GMAIL_APP_PASSWORD ou modifie la variable globale.")
        return

    sent_count = 0
    errors     = 0

    print("═" * 55)
    print(f"  📬 Campagne mail – {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"  📂 CSV source    : {CSV_FILE}")
    print(f"  🎯 Limite/jour   : {MAX_PER_DAY} mails")
    print(f"  ⏱️  Délai         : {MIN_DELAY}–{MAX_DELAY}s entre chaque envoi")
    print("═" * 55)

    try:
        csvfile = open(CSV_FILE, newline="", encoding="utf-8")
    except FileNotFoundError:
        print(f"❌ Fichier introuvable : {CSV_FILE}")
        return

    with csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:
            if sent_count >= MAX_PER_DAY:
                print("\n⏸️  Limite journalière atteinte. Arrêt de la campagne.")
                break

            to_email = row.get("email", "").strip()

            # Validation de l'adresse email
            if not to_email or "@" not in to_email or "." not in to_email.split("@")[-1]:
                print(f"⚠️  Email ignoré (invalide) : {row}")
                errors += 1
                continue

            name    = row.get("nom",        "").strip()
            company = row.get("entreprise", "").strip()
            sector  = row.get("secteur",    "").strip() # Récupération du secteur

            try:
                send_mail(to_email, name, company, sector)
                label = company if company else "—"
                sec_label = sector if sector else "générique"
                print(f"✅  {datetime.now().strftime('%H:%M:%S')} → {to_email:<35} ({label} | {sec_label})")
                sent_count += 1
            except Exception as e:
                print(f"❌  {to_email} — Erreur : {e}")
                errors += 1
                continue

            # Pause avant le prochain mail (sauf si c'est le dernier)
            if sent_count < MAX_PER_DAY:
                delay = round(random.uniform(MIN_DELAY, MAX_DELAY) * 2) / 2
                print(f"   ⏳ Pause de {delay}s...")
                time.sleep(delay)

    print("═" * 55)
    print(f"  ✅ Envoyés  : {sent_count}")
    print(f"  ❌ Erreurs  : {errors}")
    print(f"  🕐 Terminé  : {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    print("═" * 55)


if __name__ == "__main__":
    main()