/* ============================================================
   ANIMATIONS.JS — GSAP ScrollTrigger, SplitText, Reveals
   ============================================================ */

(function () {
  'use strict';

  const animMM = gsap.matchMedia();

  animMM.add(
    {
      isDesktop: '(min-width: 1024px)',
      isMobile: '(max-width: 1023px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { isDesktop, isMobile, reduceMotion } = context.conditions;

      // Set global defaults
      gsap.defaults({
        duration: reduceMotion ? 0 : 0.8,
        ease: 'power2.out',
      });

      /* -------------------------------------------------------
         HERO — Entry Timeline
         ------------------------------------------------------- */
      const heroTl = gsap.timeline({ delay: 0.3 });

      // SplitText on hero title
      const heroTitle = document.querySelector('.hero-title');
      if (heroTitle && !reduceMotion) {
        const splitTitle = SplitText.create(heroTitle, {
          type: 'chars, words',
          charsClass: 'hero-char',
        });

        // Ensure chars are visible before animating
        gsap.set(splitTitle.chars, { autoAlpha: 0, y: 50 });

        heroTl
          .to(splitTitle.chars, {
            autoAlpha: 1,
            y: 0,
            stagger: 0.03,
            duration: reduceMotion ? 0 : 0.6,
            ease: 'power3.out',
          })
          .from(
            '.hero-badge',
            {
              autoAlpha: 0,
              y: -20,
              duration: reduceMotion ? 0 : 0.5,
            },
            '<0.2'
          )
          .from(
            '.hero-subtitle',
            {
              autoAlpha: 0,
              y: 20,
              duration: reduceMotion ? 0 : 0.6,
            },
            '<0.3'
          )
          .from(
            '.hero-cta',
            {
              autoAlpha: 0,
              y: 20,
              duration: reduceMotion ? 0 : 0.5,
            },
            '<0.2'
          )
          .from(
            '.scroll-indicator',
            {
              autoAlpha: 0,
              duration: reduceMotion ? 0 : 0.5,
            },
            '<0.3'
          );
      } else if (heroTitle) {
        // Reduced motion: just show everything
        gsap.set('.hero-badge, .hero-subtitle, .hero-cta, .scroll-indicator', { autoAlpha: 1 });
      }

      /* -------------------------------------------------------
         HERO — Parallax background
         ------------------------------------------------------- */
      if (isDesktop && !reduceMotion) {
        gsap.to('.parallax-bg', {
          y: '20%',
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      /* -------------------------------------------------------
         SCROLL REVEALS — Batch all .reveal elements
         ------------------------------------------------------- */
      const revealElements = gsap.utils.toArray('.reveal');

      if (revealElements.length > 0 && !reduceMotion) {
        ScrollTrigger.batch(revealElements, {
          onEnter: (elements) => {
            gsap.to(elements, {
              autoAlpha: 1,
              y: 0,
              stagger: 0.12,
              duration: 0.7,
              ease: 'power2.out',
              overwrite: true,
            });
          },
          start: 'top 88%',
          once: true,
        });

        // Set initial state for all reveal elements
        gsap.set(revealElements, { autoAlpha: 0, y: isDesktop ? 50 : 30 });
      } else {
        // Reduced motion: just show everything
        gsap.set(revealElements, { autoAlpha: 1, y: 0 });
      }

      /* -------------------------------------------------------
         SKILL TAGS — Stagger entrance
         ------------------------------------------------------- */
      if (!reduceMotion) {
        const skillCategories = gsap.utils.toArray('.skill-category');
        skillCategories.forEach((cat) => {
          const tags = cat.querySelectorAll('.tag');
          if (tags.length > 0) {
            gsap.from(tags, {
              autoAlpha: 0,
              scale: 0.8,
              stagger: 0.05,
              duration: 0.4,
              ease: 'back.out(1.7)',
              scrollTrigger: {
                trigger: cat,
                start: 'top 85%',
                once: true,
              },
            });
          }
        });
      }

      /* -------------------------------------------------------
         TIMELINE DOTS — Glow pulse on enter
         ------------------------------------------------------- */
      if (!reduceMotion) {
        gsap.utils.toArray('.timeline-dot').forEach((dot) => {
          gsap.from(dot, {
            scale: 0,
            duration: 0.5,
            ease: 'back.out(2)',
            scrollTrigger: {
              trigger: dot,
              start: 'top 90%',
              once: true,
            },
          });
        });
      }

      /* -------------------------------------------------------
         PROJECT CARDS — Hover glow effect (desktop)
         ------------------------------------------------------- */
      if (isDesktop && !reduceMotion) {
        document.querySelectorAll('.project-card, .vitrine-card').forEach((card) => {
          card.addEventListener('mouseenter', () => {
            gsap.to(card, {
              boxShadow: '0 8px 40px rgba(108, 92, 231, 0.15)',
              duration: 0.3,
            });
          });
          card.addEventListener('mouseleave', () => {
            gsap.to(card, {
              boxShadow: 'none',
              duration: 0.3,
            });
          });
        });
      }

      /* -------------------------------------------------------
         ABOUT IMAGE — Float effect (desktop)
         ------------------------------------------------------- */
      if (isDesktop && !reduceMotion) {
        const aboutImg = document.querySelector('.about-image');
        if (aboutImg) {
          gsap.to(aboutImg, {
            y: -10,
            duration: 3,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });
        }
      }

      /* -------------------------------------------------------
         STATS COUNTER — Animate numbers
         ------------------------------------------------------- */
      if (!reduceMotion) {
        gsap.utils.toArray('.stat-number').forEach((stat) => {
          const endValue = stat.textContent;
          const numericPart = parseInt(endValue);
          const suffix = endValue.replace(/[0-9]/g, '');

          if (!isNaN(numericPart)) {
            const obj = { val: 0 };
            gsap.to(obj, {
              val: numericPart,
              duration: 1.5,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: stat,
                start: 'top 90%',
                once: true,
              },
              onUpdate: () => {
                stat.textContent = Math.round(obj.val) + suffix;
              },
            });
          }
        });
      }

      /* -------------------------------------------------------
         NAVBAR HIDE ON SCROLL DOWN (mobile)
         ------------------------------------------------------- */
      if (isMobile && !reduceMotion) {
        let lastScrollY = 0;
        const navbar = document.getElementById('navbar');
        
        ScrollTrigger.create({
          trigger: document.body,
          start: 'top top',
          end: 'max',
          onUpdate: (self) => {
            const currentScrollY = self.scroll();
            if (currentScrollY > lastScrollY && currentScrollY > 200) {
              gsap.to(navbar, { y: -80, duration: 0.3 });
            } else {
              gsap.to(navbar, { y: 0, duration: 0.3 });
            }
            lastScrollY = currentScrollY;
          },
        });
      }
    }
  );
})();
