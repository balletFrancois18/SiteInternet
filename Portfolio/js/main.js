/* ============================================================
   MAIN.JS — Initialization, Navigation, Cursor Follower
   ============================================================ */

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, SplitText);

/* --- Mobile Navigation --- */
const hamburger = document.getElementById('nav-hamburger');
const mobileNav = document.getElementById('nav-mobile');

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.contains('open');
    mobileNav.classList.toggle('open');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  // Close mobile nav on link click
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* --- Navbar scroll effect --- */
ScrollTrigger.create({
  trigger: document.body,
  start: 'top -80',
  onEnter: () => document.getElementById('navbar').classList.add('scrolled'),
  onLeaveBack: () => document.getElementById('navbar').classList.remove('scrolled'),
});

/* --- Active nav link on scroll --- */
const navLinksDesktop = document.querySelectorAll('.nav-links a:not(.btn-primary)');
const sections = document.querySelectorAll('section[id]');

sections.forEach(section => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top center',
    end: 'bottom center',
    onEnter: () => setActiveNav(section.id),
    onEnterBack: () => setActiveNav(section.id),
  });
});

function setActiveNav(sectionId) {
  navLinksDesktop.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
  });
}

/* --- Smooth scroll for anchor links --- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      const offset = window.innerWidth <= 1024 ? 60 : 80;
      const y = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
});

/* --- Cursor Follower (Desktop only, respects reduced motion) --- */
const mm = gsap.matchMedia();

mm.add(
  {
    isDesktop: '(min-width: 1024px)',
    reduceMotion: '(prefers-reduced-motion: reduce)',
  },
  (context) => {
    const { isDesktop, reduceMotion } = context.conditions;

    if (isDesktop && !reduceMotion) {
      const follower = document.querySelector('.cursor-follower');
      if (follower) {
        follower.style.display = 'block';
        const xTo = gsap.quickTo(follower, 'x', { duration: 0.5, ease: 'power3' });
        const yTo = gsap.quickTo(follower, 'y', { duration: 0.5, ease: 'power3' });

        document.addEventListener('mousemove', (e) => {
          xTo(e.clientX);
          yTo(e.clientY);
        });

        // Enlarge on hovering interactive elements
        document.querySelectorAll('a, button, .vitrine-card, .project-card').forEach(el => {
          el.addEventListener('mouseenter', () => {
            gsap.to(follower, { scale: 2.5, opacity: 0.6, duration: 0.3 });
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(follower, { scale: 1, opacity: 1, duration: 0.3 });
          });
        });
      }
    }
  }
);

/* --- Contact Form (front-end only, placeholder) --- */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const btn = contactForm.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-check"></i> Message envoyé !';
    btn.style.pointerEvents = 'none';
    
    gsap.fromTo(btn, 
      { scale: 0.95 }, 
      { scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
    );
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.pointerEvents = '';
      contactForm.reset();
    }, 3000);
  });
}
