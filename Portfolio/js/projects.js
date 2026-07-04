/* ============================================================
   PROJECTS.JS — Modal Preview System for Vitrines / Projects
   ============================================================ */

(function () {
  'use strict';

  const modal = document.getElementById('project-modal');
  const modalBody = document.getElementById('modal-body');
  const modalUrl = document.getElementById('modal-url');
  const modalClose = document.getElementById('modal-close');
  const modalVisitLink = document.getElementById('modal-visit-link');

  let modalTimeline = null;
  let previousFocusedElement = null;

  /* --- Open Modal --- */
  window.openProjectModal = function (cardElement) {
    const title = cardElement.getAttribute('data-modal-title') || 'Aperçu';
    const url = cardElement.getAttribute('data-modal-url') || '';
    const description = cardElement.getAttribute('data-modal-description') || '';
    const screenshot = cardElement.getAttribute('data-modal-screenshot') || '';
    const iframeUrl = cardElement.getAttribute('data-modal-iframe') || '';

    // Store focus for accessibility
    previousFocusedElement = document.activeElement;

    // Populate modal content
    modalUrl.textContent = url || 'aperçu du projet';

    let bodyContent = '';
    if (iframeUrl) {
      bodyContent = `<iframe src="${iframeUrl}" title="${title}" loading="lazy"></iframe>`;
    } else if (screenshot) {
      bodyContent = `<img src="${screenshot}" alt="${title}" loading="lazy">`;
    } else {
      // Default placeholder with project info
      bodyContent = `
        <div style="padding: var(--space-xl); text-align: center; min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="width: 80px; height: 80px; border-radius: var(--radius-full); background: rgba(108, 92, 231, 0.15); display: flex; align-items: center; justify-content: center; margin-bottom: var(--space-md);">
            <i class="fas fa-globe" style="font-size: 2rem; color: var(--accent-glow);"></i>
          </div>
          <h3 style="margin-bottom: var(--space-sm);">${title}</h3>
          <p style="color: var(--text-secondary); max-width: 400px; line-height: 1.7;">${description}</p>
        </div>
      `;
    }
    modalBody.innerHTML = bodyContent;

    // Visit link
    if (url && url !== 'aperçu du projet') {
      modalVisitLink.href = url.startsWith('http') ? url : `https://${url}`;
      modalVisitLink.style.display = 'inline-flex';
    } else {
      modalVisitLink.style.display = 'none';
    }

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Animate in with GSAP timeline
    modalTimeline = gsap.timeline();
    modalTimeline
      .fromTo(
        modal,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }
      )
      .fromTo(
        '.modal-content',
        { scale: 0.85, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(1.4)' },
        '<0.1'
      );

    // Focus trap
    modal.classList.add('active');
    setTimeout(() => modalClose.focus(), 400);
  };

  /* --- Close Modal --- */
  window.closeProjectModal = function () {
    if (modalTimeline) {
      const closeTl = gsap.timeline({
        onComplete: () => {
          modal.style.display = 'none';
          modal.classList.remove('active');
          document.body.style.overflow = '';
          modalBody.innerHTML = '';

          // Restore focus
          if (previousFocusedElement) {
            previousFocusedElement.focus();
            previousFocusedElement = null;
          }
        },
      });

      closeTl
        .to('.modal-content', {
          scale: 0.9,
          autoAlpha: 0,
          duration: 0.25,
          ease: 'power2.in',
        })
        .to(
          modal,
          { autoAlpha: 0, duration: 0.2, ease: 'power2.in' },
          '<0.05'
        );
    }
  };

  /* --- Event Listeners --- */
  if (modalClose) {
    modalClose.addEventListener('click', closeProjectModal);
  }

  if (modal) {
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeProjectModal();
      }
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeProjectModal();
    }
  });

  // Focus trap inside modal
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !modal || !modal.classList.contains('active')) return;

    const focusableEls = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        lastEl.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastEl) {
        firstEl.focus();
        e.preventDefault();
      }
    }
  });
})();
