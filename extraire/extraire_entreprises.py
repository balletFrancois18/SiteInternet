"""
extraire_entreprises.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extrait les entreprises actives d'un export SIRENE et génère
un CSV prêt à compléter avec les emails pour une campagne de
candidature.

COLONNES DU CSV DE SORTIE :
  entreprise | adresse | code_postal | ville | secteur | code_naf | email

USAGE :
  python extraire_entreprises.py
  (le fichier SIRENE doit s'appeler  sirene.csv  dans le même dossier)
  (ou modifie la variable FICHIER_SIRENE ci-dessous)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import pandas as pd
from pathlib import Path

# ══════════════════════════════════════════════════════════════
#  CONFIG  — adapte ces deux lignes si besoin
# ══════════════════════════════════════════════════════════════
FICHIER_SIRENE = "sirene.csv"        # ton fichier source
FICHIER_SORTIE = "entreprises_extraites.csv"   # résultat propre

# ══════════════════════════════════════════════════════════════
#  TRADUCTION CODES NAF → SECTEUR LISIBLE
#  (basé sur la nomenclature NAFRev2 de l'INSEE)
# ══════════════════════════════════════════════════════════════
NAF_SECTEURS = {
    # Agriculture
    "01": "Agriculture / Élevage",
    "02": "Sylviculture / Exploitation forestière",
    "03": "Pêche / Aquaculture",
    # Industries extractives
    "05": "Extraction de charbon",
    "06": "Extraction d'hydrocarbures",
    "07": "Extraction de minerais",
    "08": "Autres industries extractives",
    "09": "Services liés à l'extraction",
    # Industrie manufacturière
    "10": "Industrie alimentaire",
    "11": "Fabrication de boissons",
    "12": "Fabrication de produits à base de tabac",
    "13": "Fabrication de textiles",
    "14": "Industrie de l'habillement",
    "15": "Industrie du cuir / chaussure",
    "16": "Travail du bois",
    "17": "Industrie papier / carton",
    "18": "Imprimerie / reproduction",
    "19": "Cokéfaction / raffinage",
    "20": "Industrie chimique",
    "21": "Industrie pharmaceutique",
    "22": "Fabrication plastique / caoutchouc",
    "23": "Fabrication minéraux non métalliques",
    "24": "Métallurgie",
    "25": "Fabrication produits métalliques",
    "26": "Fabrication produits électroniques / optiques",
    "27": "Fabrication équipements électriques",
    "28": "Fabrication de machines",
    "29": "Industrie automobile",
    "30": "Fabrication autres matériels de transport",
    "31": "Fabrication de meubles",
    "32": "Autres industries manufacturières",
    "33": "Réparation / installation de machines",
    # Énergie / eau
    "35": "Production / distribution d'énergie",
    "36": "Captage / traitement / distribution d'eau",
    "37": "Collecte et traitement des eaux usées",
    "38": "Collecte / traitement des déchets",
    "39": "Dépollution / gestion des déchets",
    # Construction
    "41": "Construction de bâtiments",
    "42": "Génie civil",
    "43": "Travaux de construction spécialisés",
    # Commerce
    "45": "Commerce / réparation automobiles et motos",
    "46": "Commerce de gros",
    "47": "Commerce de détail",
    # Transport / logistique
    "49": "Transports terrestres / transport par conduites",
    "50": "Transports par eau",
    "51": "Transports aériens",
    "52": "Entreposage / services auxiliaires des transports",
    "53": "Activités de poste et de courrier",
    # Hôtellerie / restauration
    "55": "Hébergement (hôtels, campings...)",
    "56": "Restauration",
    # Information / communication
    "58": "Édition",
    "59": "Production cinéma / vidéo / TV",
    "60": "Programmation et diffusion",
    "61": "Télécommunications",
    "62": "Programmation / conseil informatique",
    "63": "Services d'information",
    # Finance / assurance
    "64": "Activités financières et d'assurance",
    "65": "Assurance / réassurance",
    "66": "Activités auxiliaires des services financiers",
    # Immobilier
    "68": "Activités immobilières",
    # Services aux entreprises
    "69": "Activités juridiques et comptables",
    "70": "Activités des sièges sociaux / conseil de gestion",
    "71": "Architecture / ingénierie / contrôle",
    "72": "Recherche-développement scientifique",
    "73": "Publicité et études de marché",
    "74": "Autres activités spécialisées, scientifiques",
    "75": "Activités vétérinaires",
    # Activités de soutien aux entreprises
    "77": "Activités de location et de crédit-bail",
    "78": "Activités liées à l'emploi",
    "79": "Agences de voyage / tours opérateurs",
    "80": "Enquêtes et sécurité",
    "81": "Services relatifs aux bâtiments / paysage",
    "82": "Activités administratives et de soutien",
    # Administration publique
    "84": "Administration publique",
    # Enseignement
    "85": "Enseignement / formation",
    # Santé / social
    "86": "Activités pour la santé humaine",
    "87": "Hébergement médico-social et social",
    "88": "Action sociale sans hébergement",
    # Arts / loisirs / sport
    "90": "Arts du spectacle / activités artistiques",
    "91": "Bibliothèques / musées / activités culturelles",
    "92": "Organisation de jeux de hasard et d'argent",
    "93": "Activités sportives / récréatives / loisirs",
    # Autres services
    "94": "Activités des organisations associatives",
    "95": "Réparation ordinateurs / articles personnels",
    "96": "Autres services personnels",
    "97": "Activités des ménages en tant qu'employeurs",
    "98": "Activités indifférenciées des ménages",
    "99": "Activités des organisations extraterritoriales",
}


def naf_vers_secteur(code_naf: str) -> str:
    """Traduit un code NAF (ex: '56.10A') en libellé de secteur."""
    if not isinstance(code_naf, str) or not code_naf.strip():
        return "Secteur inconnu"
    # On prend les 2 premiers chiffres (ex: "56" depuis "56.10A")
    division = code_naf.strip().replace(".", "")[:2]
    return NAF_SECTEURS.get(division, f"Autre ({code_naf.strip()})")


def nom_entreprise(row) -> str:
    """
    Retourne le meilleur nom disponible pour l'établissement :
    enseigne > dénomination usuelle > dénomination légale > prénom + nom (personne physique).
    """
    for champ in ["enseigne1Etablissement", "denominationUsuelleEtablissement",
                  "denominationUniteLegale"]:
        val = str(row.get(champ, "") or "").strip()
        if val and val.upper() not in ("NAN", "NONE", ""):
            return val

    # Cas personne physique (artisan, auto-entrepreneur...)
    prenom = str(row.get("prenomUsuelUniteLegale", "") or "").strip()
    nom    = str(row.get("nomUniteLegale", "")         or "").strip()
    if prenom or nom:
        return f"{prenom} {nom}".strip()

    return "Nom inconnu"


def construire_adresse(row) -> str:
    """Assemble l'adresse complète depuis les champs SIRENE."""
    parties = []
    for champ in ["complementAdresseEtablissement",
                  "numeroVoieEtablissement",
                  "indiceRepetitionEtablissement",
                  "typeVoieEtablissement",
                  "libelleVoieEtablissement"]:
        val = str(row.get(champ, "") or "").strip()
        if val and val.upper() not in ("NAN", "NONE", ""):
            parties.append(val)
    return " ".join(parties)


# ══════════════════════════════════════════════════════════════
#  TRAITEMENT PRINCIPAL
# ══════════════════════════════════════════════════════════════
def main():
    source = Path(FICHIER_SIRENE)
    if not source.exists():
        print(f"❌  Fichier introuvable : {FICHIER_SIRENE}")
        print("    Place ton export SIRENE dans le même dossier que ce script")
        print("    et renomme-le  sirene.csv  (ou modifie FICHIER_SIRENE en haut du script).")
        return

    print(f"📂  Lecture de {FICHIER_SIRENE}...")
    df = pd.read_csv(
        source,
        dtype=str,          # tout en string pour éviter les surprises
        low_memory=False,
        encoding="utf-8",
    )
    total_brut = len(df)
    print(f"    {total_brut:,} lignes chargées.")

    # ── Filtres : on garde uniquement les établissements actifs ──
    print("🔍  Filtrage des établissements actifs...")

    # Établissement actif (A = Actif)
    if "etatAdministratifEtablissement" in df.columns:
        df = df[df["etatAdministratifEtablissement"].str.upper() == "A"]

    # Unité légale active
    if "etatAdministratifUniteLegale" in df.columns:
        df = df[df["etatAdministratifUniteLegale"].str.upper() == "A"]

    # Diffusion autorisée (O = Oui)
    if "statutDiffusionEtablissement" in df.columns:
        df = df[df["statutDiffusionEtablissement"].str.upper() == "O"]

    print(f"    {len(df):,} établissements actifs conservés (sur {total_brut:,}).")

    # ── Construction du CSV de sortie ──
    print("⚙️   Construction du fichier de sortie...")

    lignes = []
    for _, row in df.iterrows():
        code_naf = str(row.get("activitePrincipaleEtablissement", "") or "").strip()
        lignes.append({
            "entreprise": nom_entreprise(row),
            "secteur":    naf_vers_secteur(code_naf),
            "code_naf":   code_naf,
            "email":      "",   # à remplir manuellement
        })

    sortie = pd.DataFrame(lignes)

    # Supprime les doublons exacts sur le nom d'entreprise
    avant_dedup = len(sortie)
    sortie = sortie.drop_duplicates(subset=["entreprise"])
    print(f"    {avant_dedup - len(sortie):,} doublons supprimés.")

    # Trie par secteur puis par entreprise pour faciliter la lecture
    sortie = sortie.sort_values(["secteur", "entreprise"]).reset_index(drop=True)

    sortie.to_csv(FICHIER_SORTIE, index=False, encoding="utf-8-sig")
    # utf-8-sig = UTF-8 avec BOM → s'ouvre bien dans Excel sans bug d'accent

    print()
    print("═" * 55)
    print(f"  ✅  {len(sortie):,} entreprises extraites")
    print(f"  📄  Fichier généré : {FICHIER_SORTIE}")
    print()

    # Résumé des 10 secteurs les plus représentés
    top = sortie["secteur"].value_counts().head(10)
    print("  🏆  Top 10 secteurs :")
    for secteur, nb in top.items():
        print(f"      {nb:>5}  {secteur}")
    print("═" * 55)
    print()
    print("💡  Prochaine étape :")
    print("    Ouvre entreprises_extraites.csv dans Excel / LibreOffice,")
    print("    filtre par secteur, remplis la colonne 'email',")
    print("    supprime les lignes sans email,")
    print("    puis renomme le fichier contacts_taff.csv et lance mailCV_taff.py !")


if __name__ == "__main__":
    main()
