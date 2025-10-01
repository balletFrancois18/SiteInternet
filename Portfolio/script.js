// === SLIDER AU SURVOL ===
document.querySelectorAll(".card").forEach(card => {
  const images = card.querySelectorAll(".slider img");
  let index = 0;
  let interval;

  card.addEventListener("mouseenter", () => {
    if (images.length > 1) {
      interval = setInterval(() => {
        images[index].classList.remove("active");
        index = (index + 1) % images.length;
        images[index].classList.add("active");
      }, 3000); // toutes les 3 secondes
    }
  });

  card.addEventListener("mouseleave", () => {
    clearInterval(interval);
    images.forEach(img => img.classList.remove("active"));
    if (images.length > 0) images[0].classList.add("active");
    index = 0;
  });
});
