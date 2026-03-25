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
APP_PASSWORD = "knsrpijllcqmfayd"  
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
    "Je vous remercie par avance pour l’attention portée à ma candidature et reste à votre entière disposition pour un échange immédiat.<br/>Bien cordialement,<br/>François Ballet<br/>Étudiant au CFA CNAM",
    "Dans l'attente d'un retour de votre part, je vous prie d'agréer mes sincères salutations.<br/>Cordialement,<br/>François Ballet<br/>Étudiant au CFA CNAM",
    "Merci pour l'intérêt que vous porterez à ma demande urgente.<br/>Bien à vous,<br/>François Ballet<br/>Étudiant au CFA CNAM"
]

def clean_company(raw_company: str) -> str:
    company = raw_company.strip()
    if not company or company.lower() in ["vos rangs", "votre entreprise", "vos effectifs", ""]:
        return random.choice(GENERIC_COMPANY)
    return company

def build_message(to_name: str, company: str):
    safe_name = html.escape(to_name.strip())
    safe_company = html.escape(clean_company(company))
    closing = random.choice(CLOSINGS)

    if safe_name:
        salutation = f"Bonjour {safe_name},"
    else:
        salutation = "Bonjour,"

    # Texte adapté pour le stage de 2 mois urgent
    intro = f"Je vous contacte de toute urgence afin de vous proposer ma candidature pour un **stage de 2 mois** au sein de {safe_company}."

    body_text = f"""{salutation}

{intro}

Actuellement étudiant au CFA CNAM, ce stage est impératif pour la validation de mon année universitaire. Je suis disponible immédiatement et, compte tenu de l'urgence de ma situation, j'accepte toute proposition de stage, qu'il soit rémunéré ou non.

Le CFA CNAM a déjà collaboré avec de nombreuses structures et je serais honoré de pouvoir mettre mes compétences au service de votre équipe pour ces deux mois.

Vous trouverez mon CV en pièce jointe.

{closing.replace('<br/>', '\n')}
"""

    body_html = f"""
    <html>
      <body>
        <p>{salutation}</p>
        <p>{intro}</p>
        <p>Actuellement étudiant au CFA CNAM, ce stage est <strong>impératif pour la validation de mon année universitaire</strong>.</p>
        <p>Je suis disponible immédiatement et, compte tenu de l'urgence de ma situation, <strong>je suis ouvert à toute proposition, que le stage soit rémunéré ou non</strong>.</p>
        <p>Le CFA CNAM a déjà collaboré avec de nombreuses structures et je serais honoré de pouvoir mettre mes compétences au service de vos projets.</p>
        <p>Vous trouverez mon CV en pièce jointe.</p>
        <p>{closing}</p>
      </body>
    </html>
    """
    return body_text, body_html

def send_mail(to_email, to_name, company):
    # Objet du mail modifié pour attirer l'attention
    subject = "CANDIDATURE URGENTE : Stage de 2 mois (Validation d'année) — François Ballet"
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
try:
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
except FileNotFoundError:
    print(f"❌ Erreur : Le fichier {CSV_FILE} est introuvable.")