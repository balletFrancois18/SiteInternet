/* ============================================
   SCRIPT GLOBAL — portfolio François Ballet
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Burger menu mobile ---- */
  const burger   = document.getElementById('navBurger');
  const navLinks = document.getElementById('navLinks');

  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      burger.textContent = open ? '✕' : '☰';
    });

    // Ferme le menu si on clique sur un lien
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        burger.textContent = '☰';
      });
    });
  }

  /* ---- Dossier projets (index.html) ---- */
  const toggleBtn  = document.getElementById('toggleProjets');
  const projetsList = document.getElementById('projetsList');

  if (toggleBtn && projetsList) {
    toggleBtn.addEventListener('click', () => {
      const open = projetsList.classList.toggle('active');
      toggleBtn.innerHTML = open
        ? '<i class="fa-solid fa-folder-open"></i> Fermer les projets'
        : '<i class="fa-solid fa-folder"></i> Projets';
    });
  }

  /* ---- Détails de chaque projet ---- */
  document.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const details = btn.parentElement.nextElementSibling; // .proj-details
      const open = details.classList.toggle('active');
      btn.textContent = open ? 'Fermer' : 'Voir les détails';
    });
  });

});
