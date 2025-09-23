import csv
import smtplib
import time
import random
import html
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.application import MIMEApplication
from pathlib import Path
from datetime import datetime

# CONFIG
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SENDER = "francois.balletpro@gmail.com"
APP_PASSWORD = "knsrpijllcqmfayd"   # ⚠️ remplace par ton mot de passe d’application Gmail
CV_IMAGE = Path("cv.jpg")
CV_PDF = Path("cv.pdf")
CSV_FILE = "contacts.csv"

# PARAMÈTRES
MIN_DELAY = 60
MAX_DELAY = 90
MAX_PER_DAY = 50

# Expressions
GENERIC_COMPANY = ["votre société", "votre organisation", "votre entreprise"]

CLOSINGS = [
    "Je vous remercie par avance pour l’attention portée à ma candidature.<br/>Bien cordialement,<br/>François Ballet<br/>Étudiant au CFA CNAM",
    "Merci pour votre temps et votre lecture.<br/>Cordialement,<br/>François Ballet<br/>Étudiant au CFA CNAM",
    "En vous remerciant pour votre attention.<br/>Bien à vous,<br/>François Ballet<br/>Étudiant au CFA CNAM"
]

def clean_company(raw_company: str) -> str:
    """ Nettoie et remplace les placeholders par une formulation générique """
    bad = ["vos rangs", "votre entreprise", "vos effectifs", ""]
    company = raw_company.strip()
    if not company or company.lower() in bad:
        return random.choice(GENERIC_COMPANY)
    return company

def build_message(to_name: str, company: str):
    safe_name = html.escape(to_name.strip())
    safe_company = html.escape(clean_company(company))
    closing = random.choice(CLOSINGS)

    # Salutation sobre et fixe
    if safe_name:
        salutation = f"Bonjour {safe_name},"
    else:
        salutation = "Bonjour,"

    intro = f"Je me permets de vous adresser ma candidature pour une opportunité au sein de {safe_company}, dans le cadre d’une alternance (ou éventuellement d’un CDI)."

    body_text = f"""{salutation}

{intro}

Le CFA CNAM, dont je suis étudiant, a déjà eu plusieurs élèves intégrés en alternance dans des structures partenaires. 
Cela m’a encouragé à vous transmettre ma candidature directement par mail.

Vous trouverez en pièce jointe mon CV (format image et PDF).

{closing.replace('<br/>', '\n')}
"""

    body_html = f"""
    <html>
      <body>
        <p>{salutation}</p>
        <p>{intro}</p>
        <p>Compte tenu des difficultés actuelles pour trouver un contrat d’apprentissage, 
        j’ai choisi de vous contacter directement afin de maximiser mes chances et d’obtenir un retour concret.</p>
        <p>Le CFA CNAM, dont je suis étudiant, a déjà eu plusieurs élèves intégrés en alternance dans des structures partenaires. 
        Cela m’a encouragé à vous transmettre ma candidature directement par mail.</p>
        <p>Vous trouverez en pièce jointe mon CV (image et PDF).</p>
        <p>{closing}</p>
      </body>
    </html>
    """
    return body_text, body_html

def send_mail(to_email, to_name, company):
    subject = "Candidature – Contrat Apprentissage/Alternance — François Ballet"
    body_text, body_html = build_message(to_name, company)

    msg = MIMEMultipart()
    msg["From"] = SENDER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Reply-To"] = SENDER

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(body_text, "plain"))
    alt.attach(MIMEText(body_html, "html"))
    msg.attach(alt)

    if CV_IMAGE.exists():
        with open(CV_IMAGE, "rb") as f:
            img = MIMEImage(f.read(), name=CV_IMAGE.name)
            msg.attach(img)

    if CV_PDF.exists():
        with open(CV_PDF, "rb") as f:
            pdf = MIMEApplication(f.read(), _subtype="pdf")
            pdf.add_header("Content-Disposition", "attachment", filename=CV_PDF.name)
            msg.attach(pdf)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER, APP_PASSWORD)
        server.send_message(msg)

# --- Exécution ---
count = 0
with open(CSV_FILE, newline="", encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        if count >= MAX_PER_DAY:
            print("⏸️ Limite journalière atteinte. Arrêt de l'envoi.")
            break

        try:
            to_email = row["email"].strip()
            name = row.get("nom", "").strip()
            company = row.get("entreprise", "").strip()
            send_mail(to_email, name, company)
            print(f"✅ {datetime.now().strftime('%H:%M:%S')} — Envoyé à {to_email}")
            count += 1
        except Exception as e:
            print(f"❌ Erreur pour {to_email}: {e}")

        delay = random.uniform(MIN_DELAY, MAX_DELAY)
        print(f"⏳ Pause de {int(delay)}s avant le prochain envoi...")
        time.sleep(delay)
