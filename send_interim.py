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
APP_PASSWORD = "knsrpijllcqmfayd"   # ⚠️ Mets ici ton mot de passe d’application Gmail
CV_IMAGE = Path("cv2.jpg")
CV_PDF = Path("cv2.png")
CSV_FILE = "contacts_interim.csv"   # Fichier CSV spécifique pour les agences d’intérim

# PARAMÈTRES
MIN_DELAY = 60
MAX_DELAY = 90
MAX_PER_DAY = 50

# Phrases génériques
GENERIC_COMPANY = ["votre agence", "votre société d'intérim", "votre organisation"]

CLOSINGS = [
    "Je vous remercie par avance pour l’attention portée à ma candidature.<br/>Bien cordialement,<br/>François Ballet",
    "Merci pour votre temps et votre lecture.<br/>Cordialement,<br/>François Ballet",
    "En vous remerciant pour votre attention.<br/>Bien à vous,<br/>François Ballet"
]

def clean_company(raw_company: str) -> str:
    bad = ["vos rangs", "votre entreprise", "vos effectifs", ""]
    company = raw_company.strip()
    if not company or company.lower() in bad:
        return random.choice(GENERIC_COMPANY)
    return company

def build_message_interim(to_name: str, company: str):
    safe_name = html.escape(to_name.strip())
    safe_company = html.escape(clean_company(company))
    closing = random.choice(CLOSINGS)

    # Salutation
    if safe_name:
        salutation = f"Bonjour {safe_name},"
    else:
        salutation = "Bonjour,"

    intro = (
        f"Je me permets de vous contacter afin de vous transmettre ma candidature pour des missions intérim "
        f"que {safe_company} pourrait me proposer, en lien avec mon expérience professionnelle ou mon parcours scolaire."
    )

    disponibilite = (
        "Mes disponibilités sont les suivantes :\n"
        "- Toute la semaine du 06/10/2025 au 11/10/2025 (donc actuellement),\n"
        "- Puis de nouveau disponible à partir du 27/10/2025,\n"
        "- Ce rythme se poursuivant jusqu’à décembre 2025.\n"
    )

    body_text = f"""{salutation}

{intro}

{disponibilite}

Je reste ouvert à tout type de mission qui correspondrait à mon profil, dans l’attente de vos propositions. 
Vous trouverez mon CV en pièce jointe (format image et PDF).

{closing.replace('<br/>', '\n')}
"""

    body_html = f"""
    <html>
      <body>
        <p>{salutation}</p>
        <p>{intro}</p>
        <p><strong>Disponibilités :</strong><br/>
        – Semaine du 06/10/2025 au 11/10/2025,<br/>
        – Puis de nouveau à partir du 27/10/2025,<br/>
        – Ce rythme se poursuivant jusqu’à décembre 2025.</p>
        <p>Je reste ouvert à tout type de mission correspondant à mon profil, et reste à l’écoute de vos propositions.</p>
        <p>Vous trouverez mon CV en pièce jointe (image et PDF).</p>
        <p>{closing}</p>
      </body>
    </html>
    """
    return body_text, body_html

def send_mail_interim(to_email, to_name, company):
    subject = "Candidature – Missions Intérim — François Ballet"
    body_text, body_html = build_message_interim(to_name, company)

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
            send_mail_interim(to_email, name, company)
            print(f"✅ {datetime.now().strftime('%H:%M:%S')} — Envoyé à {to_email}")
            count += 1
        except Exception as e:
            print(f"❌ Erreur pour {to_email}: {e}")

        delay = random.uniform(MIN_DELAY, MAX_DELAY)
        print(f"⏳ Pause de {int(delay)}s avant le prochain envoi...")
        time.sleep(delay)
