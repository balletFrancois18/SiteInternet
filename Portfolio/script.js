// SLIDER AUTO
document.querySelectorAll(".slider").forEach(slider => {
  const track = slider.querySelector(".slider-track");
  const slides = slider.querySelectorAll("img");
  let index = 0;

  setInterval(() => {
    index = (index + 1) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
  }, 3000); // toutes les 3 sec
});
