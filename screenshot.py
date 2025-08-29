import pdfkit

def html_to_pdf(input_html, output_pdf, css_file=None):
    """
    Convertit un fichier HTML en PDF en conservant le design CSS.
    Nécessite wkhtmltopdf installé sur la machine.
    """
    try:
        if css_file:
            pdfkit.from_file(input_html, output_pdf, css=css_file)
        else:
            pdfkit.from_file(input_html, output_pdf)
        print(f"✅ Conversion réussie avec CSS : {output_pdf}")
    except Exception as e:
        print(f"❌ Erreur pendant la conversion : {e}")


if __name__ == "__main__":
    # Nom de ton fichier HTML, CSS et PDF généré
    input_file = "cv.html"                  # ton fichier HTML
    css_file = "style.css"                  # ton fichier CSS (même dossier)
    output_file = "cv_francois_ballet.pdf"  # PDF final

    html_to_pdf(input_file, output_file, css_file)
