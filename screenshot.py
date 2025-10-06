from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time

# Config navigateur sans interface
options = Options()
options.add_argument("--headless")  # Pas d'affichage
options.add_argument("--window-size=1200,1600")  # Taille du screenshot

service = Service("/usr/bin/chromedriver")  # chemin vers chromedriver
driver = webdriver.Chrome(service=service, options=options)

# Ouvre ton fichier HTML
driver.get("file:///workspaces/SiteInternet/cv.html")

time.sleep(2)  # petit délai pour bien charger le CSS

# Sauvegarde screenshot
driver.save_screenshot("cv_screenshot.png")
print("✅ Screenshot enregistré : cv_screenshot.png")

driver.quit()
