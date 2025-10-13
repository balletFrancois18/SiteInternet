// SLIDER AUTO - Version améliorée
document.addEventListener('DOMContentLoaded', () => {  // Attend que le DOM soit chargé
  document.querySelectorAll(".slider").forEach(slider => {
    const track = slider.querySelector(".slider-track");
    const slides = slider.querySelectorAll("img");
    let index = 0;
    const totalSlides = slides.length;

    if (totalSlides === 0) return; // Évite les erreurs si pas d'images

    // Ajuste la largeur du track dynamiquement (ex. : 100% * nombre d'images)
    track.style.width = `${totalSlides * 100}%`;

    // Position initiale (première image)
    track.style.transform = `translateX(0%)`;

    // Auto-défilement
    setInterval(() => {
      index = (index + 1) % totalSlides;
      track.style.transform = `translateX(-${index * 100}%)`;
    }, 3000); // Toutes les 3 secondes
  });
});
