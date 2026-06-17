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
#  ⚠️  Ne jamais coller ton mot de passe en dur dans le code.
#  Lance le script comme ça dans ton terminal :
#      GMAIL_APP_PASSWORD="tonmotdepasse" python mailCV_alternance.py
# ══════════════════════════════════════════════════════════════
SMTP_HOST    = "smtp.gmail.com"
SMTP_PORT    = 587
SENDER       = "francois.balletpro@gmail.com"
APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "nzulavffrcjvduji")

CV_PDF   = Path("Francois_Ballet_CVA.pdf")
CSV_FILE = "contacts_alternance.csv"   # colonnes : email, entreprise (+ secteur/code_naf ignorés)

# ══════════════════════════════════════════════════════════════
#  PARAMÈTRES D'ENVOI  (anti-spam)
# ════════════════════════════════════════════════
MIN_DELAY   = 60
MAX_DELAY   = 140
MAX_PER_DAY = 40

# ══════════════════════════════════════════════════════════════
#  VARIATIONS DE CONTENU
# ══════════════════════════════════════════════════════════════

GENERIC_COMPANY = [
    "votre société",
    "votre structure",
    "votre entreprise",
    "votre organisation",
]

SUBJECTS = [
    "Candidature alternance Master – Chef de Projet Informatique – François Ballet",
    "Recherche contrat d'apprentissage – Master Informatique – François Ballet",
    "Candidature spontanée – Alternance Master Chef de Projet – F. Ballet",
    "François Ballet – Candidature alternance Master en Informatique",
    "Candidature alternance – Étudiant Licence Pro Informatique – François Ballet",
    "Recherche alternance Master – Chef de Projet / Informatique – François Ballet",
]

# Phrases d'accroche
INTROS = [
    "Je me permets de vous adresser ma candidature spontanée pour un contrat d'alternance "
    "au sein de {company}, dans le cadre de mon entrée en Master Chef de Projet / Informatique "
    "à la rentrée prochaine.",

    "Actuellement en fin de Licence Professionnelle Chef de Projet / Informatique au CFA CNAM, "
    "que je suis en train de valider, je vous contacte afin de vous soumettre ma candidature "
    "pour une alternance au sein de {company} pour préparer mon Master.",

    "Dans le cadre de ma poursuite d'études en Master Chef de Projet / Informatique, "
    "je suis activement à la recherche d'un contrat d'apprentissage et me permets "
    "de vous adresser ma candidature spontanée pour rejoindre {company}.",

    "En cours de validation de ma Licence Professionnelle Chef de Projet / Informatique "
    "au CFA CNAM, je vous contacte directement afin de proposer ma candidature "
    "pour un contrat d'alternance au sein de {company} dans le cadre de mon Master.",

    "Je souhaite vous soumettre ma candidature pour intégrer {company} en alternance, "
    "en vue de préparer mon Master Chef de Projet / Informatique à la rentrée prochaine. "
    "Je suis actuellement en fin de cursus de Licence Professionnelle au CFA CNAM.",
]

# Corps du message
BODIES = [
    # Variation 1 — accent sur le profil technique + gestion de projet
    (
        "Mon parcours en Licence Professionnelle m'a permis de développer des compétences "
        "solides en développement web (front-end et back-end), gestion de projet informatique, "
        "réseaux et systèmes. J'ai notamment travaillé sur des projets concrets en équipe, "
        "ce qui m'a appris à allier rigueur technique et coordination."
        "<br/><br/>"
        "Parallèlement à mes études, j'ai accumulé plusieurs expériences professionnelles "
        "qui m'ont forgé un sens des responsabilités, une capacité d'adaptation rapide "
        "et une vraie aisance dans les environnements exigeants."
        "<br/><br/>"
        "Une alternance au sein de votre structure serait pour moi l'opportunité idéale "
        "de mettre ces compétences en pratique tout en continuant à progresser."
    ),

    # Variation 2 — angle motivation + apport concret
    (
        "La Licence Professionnelle Chef de Projet / Informatique que je finalise au CFA CNAM "
        "m'a permis d'acquérir une double compétence : technique (développement, systèmes, réseaux) "
        "et méthodologique (gestion de projet, travail en équipe, livrables clients)."
        "<br/><br/>"
        "Je suis quelqu'un de sérieux, investi et capable de monter rapidement en compétences "
        "sur de nouveaux outils ou environnements. Mon expérience terrain, acquise en parallèle "
        "de mes études, m'a appris à rester efficace et fiable même sous pression."
        "<br/><br/>"
        "Je serais heureux de pouvoir apporter ma motivation et mes compétences à votre équipe "
        "dans le cadre d'un contrat d'apprentissage."
    ),

    # Variation 3 — ton direct, profil polyvalent
    (
        "À l'issue de ma Licence Professionnelle au CFA CNAM — que je suis en train de valider — "
        "je souhaite poursuivre en Master Chef de Projet / Informatique en alternance afin "
        "d'ancrer ma formation dans un contexte professionnel concret."
        "<br/><br/>"
        "Mon profil combine des compétences en développement web, gestion de projet et systèmes, "
        "ainsi qu'une vraie capacité à m'intégrer rapidement dans une équipe. "
        "Je suis curieux, autonome et habitué à jongler entre responsabilités académiques "
        "et exigences professionnelles."
    ),

    # Variation 4 — insistance sur le projet de continuité
    (
        "Mon objectif est clair : valider mon Master en alternance pour compléter ma formation "
        "par une expérience professionnelle structurante. La Licence Pro que je termine au CFA CNAM "
        "m'a donné des bases solides en développement, architecture web, gestion de projet "
        "et travail en équipe sur des projets réels."
        "<br/><br/>"
        "Je suis convaincu qu'une alternance au sein de votre structure me permettrait "
        "d'apporter une contribution concrète dès les premières semaines, "
        "tout en continuant à me former dans un environnement professionnel stimulant."
        "<br/><br/>"
        "Mon sérieux et mon investissement dans mes études précédentes témoignent "
        "de ma capacité à m'engager pleinement dans ce type de contrat."
    ),

    # Variation 5 — angle humain + parcours atypique
    (
        "Étudiant en informatique avec un parcours qui mêle technique et terrain, "
        "je finalise actuellement ma Licence Professionnelle Chef de Projet / Informatique "
        "au CFA CNAM et cherche à poursuivre en Master dans le cadre d'une alternance."
        "<br/><br/>"
        "Au-delà de mes compétences techniques en développement et gestion de projet, "
        "mes différentes expériences professionnelles m'ont appris à être rigoureux, "
        "ponctuel et à m'adapter facilement à tout type d'environnement de travail. "
        "Je pense que c'est un atout réel pour un profil en alternance."
    ),
]

# Formules de clôture
CLOSINGS = [
    (
        "Je reste disponible pour tout échange ou entretien selon vos disponibilités. "
        "Vous trouverez mon CV en pièce jointe."
        "<br/><br/>Dans l'attente de votre retour, je vous adresse mes sincères salutations."
        "<br/><br/><strong>François Ballet</strong><br/>"
        "Étudiant – Licence Pro Chef de Projet / Informatique | CFA CNAM<br/>"
        "📞 06 27 66 78 65 &nbsp;|&nbsp; ✉️ francois.balletpro@gmail.com"
    ),
    (
        "Mon CV est joint à ce message. N'hésitez pas à me contacter "
        "pour tout renseignement ou pour convenir d'un entretien."
        "<br/><br/>Bien cordialement,"
        "<br/><br/><strong>François Ballet</strong><br/>"
        "Étudiant – Licence Pro Chef de Projet / Informatique | CFA CNAM<br/>"
        "📞 06 27 66 78 65 &nbsp;|&nbsp; ✉️ francois.balletpro@gmail.com"
    ),
    (
        "Je serais ravi d'échanger avec vous sur mon profil et ma motivation "
        "lors d'un entretien à votre convenance. Mon CV est joint à ce message."
        "<br/><br/>Cordialement,"
        "<br/><br/><strong>François Ballet</strong><br/>"
        "Étudiant – Licence Pro Chef de Projet / Informatique | CFA CNAM<br/>"
        "📞 06 27 66 78 65 &nbsp;|&nbsp; ✉️ francois.balletpro@gmail.com"
    ),
    (
        "Je tiens à vous remercier par avance pour l'attention portée à ma candidature "
        "et reste joignable à tout moment pour un échange téléphonique ou un entretien."
        "<br/><br/>En vous souhaitant bonne réception,"
        "<br/><br/><strong>François Ballet</strong><br/>"
        "Étudiant – Licence Pro Chef de Projet / Informatique | CFA CNAM<br/>"
        "📞 06 27 66 78 65 &nbsp;|&nbsp; ✉️ francois.balletpro@gmail.com"
    ),
]

# ══════════════════════════════════════════════════════════════
#  UTILITAIRES
# ══════════════════════════════════════════════════════════════

def clean_company(raw: str) -> str:
    bad = {"", "n/a", "na", "-", "vos rangs", "votre entreprise", "vos effectifs"}
    cleaned = raw.strip()
    if cleaned.lower() in bad:
        return random.choice(GENERIC_COMPANY)
    return cleaned


def strip_html(text: str) -> str:
    return (
        text.replace("<br/><br/>", "\n\n")
            .replace("<br/>", "\n")
            .replace("<br>", "\n")
            .replace("<strong>", "")
            .replace("</strong>", "")
            .replace("&nbsp;", " ")
    )


def build_message(company_raw: str):
    company      = clean_company(company_raw)
    safe_company = html.escape(company)

    intro   = random.choice(INTROS).format(company=safe_company)
    body    = random.choice(BODIES)
    closing = random.choice(CLOSINGS)

    # Version texte brut
    plain = "\n".join([
        "Bonjour,",
        "",
        strip_html(intro),
        "",
        strip_html(body),
        "",
        strip_html(closing),
    ])

    # Version HTML
    html_body = f"""<html>
  <body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.65;max-width:620px;">
    <p>Bonjour,</p>
    <p>{intro}</p>
    <p>{body}</p>
    <p>{closing}</p>
  </body>
</html>"""

    return plain, html_body


def send_mail(to_email: str, company: str):
    subject              = random.choice(SUBJECTS)
    body_text, body_html = build_message(company)

    msg = MIMEMultipart("mixed")
    msg["From"]     = f"François Ballet <{SENDER}>"
    msg["To"]       = to_email
    msg["Subject"]  = subject
    msg["Reply-To"] = SENDER

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(body_text, "plain", "utf-8"))
    alt.attach(MIMEText(body_html, "html",  "utf-8"))
    msg.attach(alt)

    if CV_PDF.exists():
        with open(CV_PDF, "rb") as f:
            pdf = MIMEApplication(f.read(), _subtype="pdf")
            pdf.add_header("Content-Disposition", "attachment",
                           filename="CV_Francois_Ballet.pdf")
            msg.attach(pdf)

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
    if APP_PASSWORD == "REMPLACE_MOI":
        print("❌ Mot de passe manquant !")
        print("   Lance : GMAIL_APP_PASSWORD='tonmotdepasse' python mailCV_alternance.py")
        return

    sent_count = 0
    errors     = 0

    print("═" * 55)
    print(f"  📬 Campagne alternance – {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"  📂 CSV source    : {CSV_FILE}")
    print(f"  🎯 Limite/jour   : {MAX_PER_DAY} mails")
    print(f"  ⏱️  Délai         : {MIN_DELAY}–{MAX_DELAY}s entre chaque envoi")
    print("═" * 55)

    try:
        csvfile = open(CSV_FILE, newline="", encoding="utf-8")
    except FileNotFoundError:
        print(f"❌ Fichier introuvable : {CSV_FILE}")
        print("   Crée contacts_alternance.csv avec les colonnes : email, entreprise")
        return

    with csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:
            if sent_count >= MAX_PER_DAY:
                print("\n⏸️  Limite journalière atteinte. Arrêt de la campagne.")
                break

            to_email = row.get("email", "").strip()

            if not to_email or "@" not in to_email or "." not in to_email.split("@")[-1]:
                print(f"⚠️  Email ignoré (invalide) : {row}")
                errors += 1
                continue

            company = row.get("entreprise", "").strip()

            try:
                send_mail(to_email, company)
                label = company if company else "—"
                print(f"✅  {datetime.now().strftime('%H:%M:%S')} → {to_email:<35} ({label})")
                sent_count += 1
            except Exception as e:
                print(f"❌  {to_email} — Erreur : {e}")
                errors += 1
                continue

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