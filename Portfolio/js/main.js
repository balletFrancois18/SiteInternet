/* ============================================================
   MAIN.JS — Initialization, TypeShuffle, GSAP Animations
   Responsible for bootstrapping all portfolio sections.
   ============================================================ */

(function () {
  'use strict';

  // Register GSAP plugins
  gsap.registerPlugin(ScrollTrigger);

  /* (ASCII Portrait removed, replaced by GTA Avatar) */

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
     3D AVATAR (Three.js) & PARALLAX TILT CARD
     ------------------------------------------------------- */
  const tiltCard = document.getElementById('tilt-card');
  const avatarContainer = document.querySelector('.gta-avatar-container');
  const glare = document.getElementById('card-glare');
  const canvasContainer = document.getElementById('avatar-3d-canvas');
  const loader = document.getElementById('avatar-loader');

  let avatarModel = null;
  let mixer = null;
  let targetRotationX = 0;
  let targetRotationY = 0;

  if (canvasContainer && typeof THREE !== 'undefined') {
    // 1. Scene Setup
    const scene = new THREE.Scene();
    
    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3); // Positioned to see the upper body / full body

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    canvasContainer.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 5, 5);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.5);
    fillLight.position.set(-2, 2, 2);
    scene.add(fillLight);

    // 5. Load GLB Model
    const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load(
      'Images/model.glb',
      (gltf) => {
        avatarModel = gltf.scene;
        
        // Auto-center and scale the model
        const box = new THREE.Box3().setFromObject(avatarModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center the model at origin
        avatarModel.position.x = -center.x;
        avatarModel.position.y = -center.y;
        avatarModel.position.z = -center.z;
        
        // Move camera back enough to see the entire model (size.y is the height)
        camera.position.set(0, 0, size.y * 1.2);
        
        scene.add(avatarModel);

        // Hide loader
        if (loader) loader.style.display = 'none';

        // Play Animation
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(avatarModel);
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
        }
      },
      (xhr) => {
        // Progress
        if (loader) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          if(percent) loader.innerText = `CHARGEMENT... ${percent}%`;
        }
      },
      (error) => {
        console.error('Erreur chargement modèle 3D:', error);
        if (loader) loader.innerText = "ERREUR DE CHARGEMENT";
      }
    );

    // Easter Egg: Load Alternate Models (Boxe & Musculation)
    const btnLoadBoxe = document.getElementById('btn-load-boxe');
    const btnLoadTrain = document.getElementById('btn-load-train');

    const loadAlternateModel = (filename, loadingText) => {
      if (loader) {
        loader.style.display = 'block';
        loader.innerText = loadingText;
      }
      
      // Remove old model
      if (avatarModel) {
        scene.remove(avatarModel);
        avatarModel = null;
      }

      // Load new model
      gltfLoader.load(
        `Images/${filename}`,
        (gltf) => {
          avatarModel = gltf.scene;
          
          // Adjust position and scale
          const box = new THREE.Box3().setFromObject(avatarModel);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          avatarModel.position.x += (avatarModel.position.x - center.x);
          avatarModel.position.y += (avatarModel.position.y - center.y);
          avatarModel.position.z += (avatarModel.position.z - center.z);
          camera.position.set(0, 0, size.y * 1.2);
          
          scene.add(avatarModel);
          if (loader) loader.style.display = 'none';

          // Play Animation
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(avatarModel);
            const action = mixer.clipAction(gltf.animations[0]);
            
            // Speed up pushup animation specifically
            if (filename === 'train.glb') {
              action.timeScale = 2.5; // 2.5x faster
            }
            
            action.play();
          }
        },
        undefined,
        (error) => {
          console.error(`Erreur ${filename}:`, error);
          if (loader) loader.innerText = `${filename} INTROUVABLE`;
        }
      );
    };

    if (btnLoadBoxe) {
      btnLoadBoxe.addEventListener('click', () => loadAlternateModel('boxe.glb', 'CHARGEMENT BOXE...'));
    }
    if (btnLoadTrain) {
      btnLoadTrain.addEventListener('click', () => loadAlternateModel('train.glb', 'CHARGEMENT ENTRAINEMENT...'));
    }


    // 6. Resize Handler
    window.addEventListener('resize', () => {
      if (!canvasContainer) return;
      camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    });

    // 7. Render Loop
    const clock = new THREE.Clock();
    const animate = function () {
      requestAnimationFrame(animate);

      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);

      // Smoothly rotate the avatar to look at mouse
      if (avatarModel) {
        avatarModel.rotation.y += (targetRotationY - avatarModel.rotation.y) * 0.1;
        avatarModel.rotation.x += (targetRotationX - avatarModel.rotation.x) * 0.1;
      }

      renderer.render(scene, camera);
    };
    animate();
  }

  // Mouse Tracking for Tilt Card + Avatar Rotation
  if (avatarContainer && glare) {
    avatarContainer.addEventListener('mousemove', (e) => {
      const rect = avatarContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Card Tilt (-15 to 15 deg)
      const rotateX = ((y - centerY) / centerY) * -15; 
      const rotateY = ((x - centerX) / centerX) * 15;

      // Avatar Head/Body Rotation target
      targetRotationY = ((x - centerX) / centerX) * 0.5; // radians
      targetRotationX = ((y - centerY) / centerY) * 0.2;

      // Glare Position
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;

      gsap.to(avatarContainer, {
        rotateX: rotateX,
        rotateY: rotateY,
        duration: 0.5,
        ease: 'power2.out'
      });

      gsap.to(glare, {
        opacity: 1,
        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
        duration: 0.2
      });
    });

    avatarContainer.addEventListener('mouseleave', () => {
      // Reset card
      gsap.to(avatarContainer, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.5)'
      });
      // Reset glare
      gsap.to(glare, {
        opacity: 0,
        duration: 0.5
      });
      // Reset avatar rotation
      targetRotationY = 0;
      targetRotationX = 0;
    });
  }

  // RPG Connected Side Panel Logic
  const btnShowStats = document.getElementById('btn-show-stats');
  const btnCloseStats = document.getElementById('btn-close-stats');
  const statsSidePanel = document.getElementById('stats-side-panel');
  const statsConnector = document.getElementById('stats-connector');
  const statFills = document.querySelectorAll('.stat-fill');

  const openStatsModal = () => {
    if (statsSidePanel) statsSidePanel.classList.add('is-active');
    if (statsConnector) statsConnector.style.width = '50px';
    
    // Animate stat bars after a small delay
    setTimeout(() => {
      statFills.forEach(fill => {
        const width = fill.getAttribute('data-width');
        fill.style.width = width + '%';
      });
    }, 200);
  };

  const closeStatsModal = () => {
    if (statsSidePanel) statsSidePanel.classList.remove('is-active');
    if (statsConnector) statsConnector.style.width = '0';
    
    // Reset stat bars
    setTimeout(() => {
      statFills.forEach(fill => {
        fill.style.width = '0%';
      });
    }, 400); // Wait for panel to slide out
  };

  if (btnShowStats && btnCloseStats && statsSidePanel) {
    btnShowStats.addEventListener('click', openStatsModal);
    btnCloseStats.addEventListener('click', closeStatsModal);
  }

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
        gsap.set('.section-header, .project-card, .experience-item, .skill-card', {
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
         SKILLS — Render grid cards + animate
         ------------------------------------------------------- */
      ScrollTrigger.batch('.skill-card', {
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
        start: 'top 85%',
        once: true,
      });

      gsap.set('.skill-card', { autoAlpha: 0, y: 30 });

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
