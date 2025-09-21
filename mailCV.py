import csv
import smtplib
import time
import random
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
APP_PASSWORD = "knsrpijllcqmfayd"   # ⚠️ Remplace par ton mot de passe d'application Gmail
CV_IMAGE = Path("cv.jpg")           # CV au format image
CV_PDF = Path("cv.pdf")             # CV au format PDF
CSV_FILE = "contacts.csv"

# Paramètres d'envoi
MIN_DELAY = 30     # délai minimum entre mails (secondes)
MAX_DELAY = 90     # délai maximum entre mails (secondes)
MAX_PER_DAY = 50   # nombre max d'emails envoyés par jour

# Fonction d'envoi
def send_mail(to_email, to_name, company):
    subject = f"Candidature recherche Contrat Apprentissage/Alternance — François Ballet"

    # Corps texte (plain)
    body_text = f"""Bonjour {to_name},

Je me permets de vous envoyer ma candidature pour une opportunité chez {company} (Alternance/CDI).
Veuillez trouver mon CV en pièce jointe (image et PDF).

Merci pour votre temps,
François Ballet
Étudiant CFA CNAM
"""

    # Corps HTML
    body_html = f"""
    <html>
      <body>
        <p>Bonjour/Bonsoir M(me) {to_name} </p>

        <p>Je me permets de vous adresser ma candidature pour une opportunité au sein de 
        <strong>{company}</strong>, dans le cadre d’une alternance ou éventuellement d’un CDI si cela est envisageable.</p>
        <p>Compte tenu des difficultés actuelles pour trouver un contrat d’apprentissage, j’ai choisi de vous contacter directement afin de maximiser mes chances et d’obtenir un retour concret.</p>

        <p>Le CFA CNAM, dont je suis étudiant, a déjà eu plusieurs élèves intégrés en alternance au sein de votre organisme. 
        Cela m’a naturellement encouragé à vous transmettre ma candidature par mail.</p>

        <p>Vous trouverez en pièce jointe mon CV et toutes les informations complementaires (format image et PDF).</p>

        <p>Je vous remercie par avance pour l’attention portée à ma candidature.<br/>
        Bien cordialement,<br/>
        François Ballet<br/>
        Étudiant au CFA CNAM</p>
      </body>
    </html>
    """

    # Création du mail
    msg = MIMEMultipart()
    msg["From"] = SENDER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Reply-To"] = SENDER   # ➝ utile pour montrer que tu attends une réponse

    # Alternative plain + HTML
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(body_text, "plain"))
    alt.attach(MIMEText(body_html, "html"))
    msg.attach(alt)

    # Pièce jointe image (CV)
    if CV_IMAGE.exists():
        with open(CV_IMAGE, "rb") as f:
            img = MIMEImage(f.read(), name=CV_IMAGE.name)
            msg.attach(img)

    # Pièce jointe PDF (CV)
    if CV_PDF.exists():
        with open(CV_PDF, "rb") as f:
            pdf = MIMEApplication(f.read(), _subtype="pdf")
            pdf.add_header("Content-Disposition", "attachment", filename=CV_PDF.name)
            msg.attach(pdf)

    # Envoi
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER, APP_PASSWORD)
        server.send_message(msg)


# Lecture CSV et envoi progressif
count = 0
with open(CSV_FILE, newline="", encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        if count >= MAX_PER_DAY:
            print("⏸️ Limite journalière atteinte. Arrêt de l'envoi.")
            break

        try:
            to_email = row["email"].strip()
            name = row.get("nom", "Bonjour")
            company = row.get("entreprise", "votre entreprise")
            send_mail(to_email, name, company)
            print(f"✅ {datetime.now().strftime('%H:%M:%S')} — Envoyé à {to_email}")
            count += 1
        except Exception as e:
            print(f"❌ Erreur pour {to_email}: {e}")

        # délai aléatoire entre envois pour éviter d'être détecté comme "bot"
        delay = random.uniform(MIN_DELAY, MAX_DELAY)
        print(f"⏳ Pause de {int(delay)}s avant le prochain envoi...")
        time.sleep(delay)
