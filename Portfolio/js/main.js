/* ============================================================
   MAIN.JS — Initialization, TypeShuffle, GSAP Animations
   Responsible for bootstrapping all portfolio sections.
   ============================================================ */

(function () {
  'use strict';

  // Register GSAP plugins
  gsap.registerPlugin(ScrollTrigger);

  /* -------------------------------------------------------
     ASCII PORTRAIT
     ------------------------------------------------------- */
  const asciiEl = document.getElementById('ascii-portrait');
  if (asciiEl && typeof ASCII_PORTRAIT !== 'undefined') {
    asciiEl.textContent = ASCII_PORTRAIT;
  }

  /* -------------------------------------------------------
     TYPE SHUFFLE — Hero content
     ------------------------------------------------------- */
  const contentElements = document.querySelectorAll('.content');
  const typeshuffles = [];

  contentElements.forEach(el => {
    const ts = new TypeShuffle(el);
    typeshuffles.push(ts);
  });

  // Auto-trigger on page load (fx6 for dramatic entrance)
  setTimeout(() => {
    typeshuffles.forEach(ts => ts.trigger('fx6'));
  }, 300);

  // Effect buttons
  document.querySelectorAll('.effect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const effect = btn.getAttribute('data-effect');
      // Update active state
      document.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Trigger on all content elements
      typeshuffles.forEach(ts => ts.trigger(effect));
    });
  });

  /* -------------------------------------------------------
     NAVIGATION — Smooth scroll + active state
     ------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        const offset = 70;
        const y = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // Nav scroll effect
  const navbar = document.getElementById('navbar');
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top -80',
    onEnter: () => navbar && navbar.classList.add('scrolled'),
    onLeaveBack: () => navbar && navbar.classList.remove('scrolled'),
  });

  // Active nav link on scroll
  const navLinks = document.querySelectorAll('.nav-link');
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
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
    });
  }

  /* -------------------------------------------------------
     GSAP — Responsive + Reduced Motion wrapper
     ------------------------------------------------------- */
  const mm = gsap.matchMedia();

  mm.add(
    {
      isDesktop: '(min-width: 1024px)',
      isMobile: '(max-width: 1023px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { isDesktop, isMobile, reduceMotion } = context.conditions;

      if (reduceMotion) {
        // Show everything immediately
        gsap.set('.section-header, .project-card, .experience-item, .skill-slide', {
          autoAlpha: 1, y: 0
        });
        return;
      }

      /* -------------------------------------------------------
         PROJECTS — Render cards from data + animate
         ------------------------------------------------------- */
      renderProjects();
      
      ScrollTrigger.batch('.project-card', {
        onEnter: (elements) => {
          gsap.to(elements, {
            autoAlpha: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.6,
            ease: 'power2.out',
            overwrite: true,
          });
        },
        start: 'top 88%',
        once: true,
      });

      gsap.set('.project-card', { autoAlpha: 0, y: isDesktop ? 50 : 30 });

      /* -------------------------------------------------------
         SKILLS — Horizontal pinned scroll (desktop only)
         ------------------------------------------------------- */
      if (isDesktop) {
        const track = document.getElementById('skills-track');
        if (track) {
          const slides = gsap.utils.toArray('.skill-slide');
          const totalWidth = slides.length * 100; // vw

          gsap.to(track, {
            xPercent: -(totalWidth - 100),
            ease: 'none',
            scrollTrigger: {
              trigger: '#skills',
              pin: true,
              scrub: 1,
              start: 'top top',
              end: () => '+=' + (track.scrollWidth - window.innerWidth),
              invalidateOnRefresh: true,
            },
          });
        }
      }

      /* -------------------------------------------------------
         EXPERIENCE — Render from data + reveal
         ------------------------------------------------------- */
      renderExperience();
      
      ScrollTrigger.batch('.experience-item', {
        onEnter: (elements) => {
          gsap.to(elements, {
            autoAlpha: 1,
            x: 0,
            stagger: 0.08,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: true,
          });
        },
        start: 'top 90%',
        once: true,
      });

      gsap.set('.experience-item', { autoAlpha: 0, x: isDesktop ? -30 : -20 });

      /* -------------------------------------------------------
         SECTION HEADERS — Reveal animation
         ------------------------------------------------------- */
      gsap.utils.toArray('.section-header').forEach(header => {
        gsap.from(header, {
          autoAlpha: 0,
          y: 40,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: header,
            start: 'top 85%',
            once: true,
          },
        });
      });

      /* -------------------------------------------------------
         SCROLL CUE — Fade out on scroll
         ------------------------------------------------------- */
      const scrollCue = document.querySelector('.scroll-cue');
      if (scrollCue) {
        gsap.to(scrollCue, {
          autoAlpha: 0,
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: '+=200',
            scrub: true,
          },
        });
      }
    }
  );

  /* -------------------------------------------------------
     RENDER: Projects from data
     ------------------------------------------------------- */
  function renderProjects() {
    const grid = document.getElementById('projects-grid');
    if (!grid || typeof PROJECTS === 'undefined') return;

    grid.innerHTML = PROJECTS.map(project => `
      <div class="project-card glass-card" id="project-${project.id}">
        <div class="project-card-header">
          <div class="project-icon"><i class="fas ${project.icon}"></i></div>
          <div class="project-status ${project.status === 'En cours' ? 'status--active' : ''}">${project.status || 'Terminé'}</div>
        </div>
        <h3 class="project-title">${project.title}</h3>
        <p class="project-subtitle">${project.subtitle}</p>
        <p class="project-desc">${project.description}</p>
        <div class="project-tags">
          ${project.tags.map(t => `<span class="terminal-tag">${t}</span>`).join('')}
        </div>
        ${project.links && project.links.live ? `<a href="${project.links.live}" target="_blank" rel="noopener noreferrer" class="project-link"><i class="fas fa-external-link-alt"></i> VOIR LE SITE</a>` : ''}
        ${project.links && project.links.github ? `<a href="${project.links.github}" target="_blank" rel="noopener noreferrer" class="project-link"><i class="fab fa-github"></i> GITHUB</a>` : ''}
      </div>
    `).join('');
  }

  /* -------------------------------------------------------
     RENDER: Experience from data
     ------------------------------------------------------- */
  function renderExperience() {
    const grid = document.getElementById('experience-grid');
    if (!grid || typeof EXPERIENCE === 'undefined') return;

    grid.innerHTML = EXPERIENCE.map(item => `
      <div class="experience-item ${item.type === 'formation' ? 'exp--formation' : 'exp--work'}">
        <div class="exp-dot"></div>
        <div class="exp-year">${item.year}</div>
        <div class="exp-content">
          <h4 class="exp-title">${item.title}</h4>
          ${item.place ? `<span class="exp-place">${item.place}</span>` : ''}
          ${item.status ? `<span class="exp-status">${item.status}</span>` : ''}
          ${item.description ? `<p class="exp-desc">${item.description}</p>` : ''}
        </div>
      </div>
    `).join('');
  }

  /* -------------------------------------------------------
     CONTACT FORM — Fallback submission handler
     ------------------------------------------------------- */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = '[ ✓ MESSAGE ENVOYÉ ]';
        btn.style.pointerEvents = 'none';
        setTimeout(() => {
          btn.textContent = original;
          btn.style.pointerEvents = '';
          contactForm.reset();
        }, 3000);
      }
    });
  }
})();
