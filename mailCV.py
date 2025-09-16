import csv
import smtplib
import time
import random
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from pathlib import Path

# CONFIG
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SENDER = "francois.balletpro@gmail.com"
APP_PASSWORD = "Ballet255!"   # ⚠️ à remplacer par un mot de passe d'application Gmail
CV_IMAGE = Path("cv.jpg")     # Ton CV au format image (jpg ou png)
CSV_FILE = "contacts.csv"

# Paramètres d'envoi
MIN_DELAY = 10    # secondes
MAX_DELAY = 30   # secondes

# Fonction d'envoi
def send_mail(to_email, to_name, company):
    subject = f"Candidature — {to_name} / {company} — François Ballet"

    # Corps texte (plain)
    body_text = f"""Bonjour {to_name},

Je me permets de vous envoyer ma candidature pour une opportunité chez {company} (Alternance/CDI).
Veuillez trouver mon CV en pièce jointe (format image).

Merci pour votre temps,
François Ballet
Étudiant CFA CNAM
"""

    # Corps HTML
    body_html = f"""
    <html>
      <body>
        <p>Bonjour {to_name},</p>
        <p>Je me permets de vous envoyer ma candidature pour une opportunité chez 
        <strong>{company}</strong> (Alternance/CDI).</p>
        <p>Veuillez trouver mon CV en pièce jointe (format image).</p>
        <p>Merci pour votre temps,<br/>François Ballet<br/>Étudiant CFA CNAM</p>
      </body>
    </html>
    """

    # Création du mail
    msg = MIMEMultipart()
    msg["From"] = SENDER
    msg["To"] = to_email
    msg["Subject"] = subject

    # Alternative plain + HTML
    alt = MIMEMultipart('alternative')
    alt.attach(MIMEText(body_text, "plain"))
    alt.attach(MIMEText(body_html, "html"))
    msg.attach(alt)

    # Pièce jointe (CV image)
    if CV_IMAGE.exists():
        with open(CV_IMAGE, "rb") as f:
            img = MIMEImage(f.read(), name=CV_IMAGE.name)
            msg.attach(img)

    # Envoi
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER, APP_PASSWORD)
        server.send_message(msg)

# Lecture CSV et envoi progressif
with open(CSV_FILE, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        try:
            to_email = row['email'].strip()
            name = row.get('nom', 'Bonjour')
            company = row.get('entreprise', 'votre entreprise')
            send_mail(to_email, name, company)
            print(f"✅ Envoyé à {to_email}")
        except Exception as e:
            print(f"❌ Erreur pour {to_email}: {e}")

        # délai aléatoire entre envois pour éviter les blocages
        delay = random.uniform(MIN_DELAY, MAX_DELAY)
        time.sleep(delay)
