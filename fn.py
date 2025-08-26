import pdfkit

def html_to_pdf(input_html, output_pdf):
    """
    Convertit un fichier HTML en PDF en conservant le design CSS.
    Nécessite wkhtmltopdf installé sur la machine.
    """
    try:
        pdfkit.from_file(input_html, output_pdf)
        print(f"✅ Conversion réussie : {output_pdf}")
    except Exception as e:
        print(f"❌ Erreur pendant la conversion : {e}")


if __name__ == "__main__":
    # Nom de ton fichier HTML et nom du PDF généré
    input_file = "cv.html"               # <-- ton fichier HTML
    output_file = "cv_francois_ballet.pdf"  # <-- PDF final

    html_to_pdf(input_file, output_file)
