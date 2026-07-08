/**
 * ============================================================
 * CHATBOT CADRAGE — Moteur principal
 * ============================================================
 *
 * Gère les 4 écrans (intro / chat / récap / confirmation),
 * les animations GSAP, le localStorage et l'envoi au backend.
 *
 * Dépendances :
 * - js/data/chatbot-questions.js (CHATBOT_QUESTIONS, CHATBOT_SECTIONS, etc.)
 * - GSAP (gsap + ScrollTrigger déjà chargés)
 * - Font Awesome (icônes)
 *
 * ============================================================
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     CONSTANTES
     ------------------------------------------------------------ */
  const STORAGE_KEY = 'chatbot_cadrage_progress';
  const BACKEND_URL = 'php/generate_recap.php';

  /* ------------------------------------------------------------
     UTILITAIRES
     ------------------------------------------------------------ */

  /** Échappe le HTML pour éviter les injections XSS dans le DOM */
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /** Retourne la question par son id */
  function getQuestionById(id) {
    return CHATBOT_QUESTIONS.find(function (q) { return q.id === id; });
  }

  /** Vérifie le format email (validation basique côté client) */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Vérifie si les animations sont réduites */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Durée d'animation (0 si reduced-motion) */
  function animDuration(d) {
    return prefersReducedMotion() ? 0 : d;
  }

  /* ============================================================
     MOTEUR DE RECOMMANDATION
     ============================================================
     Croise les réponses pour générer une suggestion technique.
     Résultat envoyé UNIQUEMENT dans l'email au prestataire,
     jamais affiché au client.

     Chaque règle est documentée pour faciliter l'évolution.
     ============================================================ */
  function computeRecommendation(answers) {
    var reco = [];

    /* -------------------------------------------------------
       RÈGLE 1 — Plateforme recommandée
       Croise : type de projet + nombre de produits + volume + budget
       ------------------------------------------------------- */
    var type = answers.project_type || '';
    var products = answers.product_count || '';
    var volume = answers.order_volume || '';
    var budget = answers.budget || '';

    if (type === 'Boutique en ligne (e-commerce)') {
      // Gros catalogue ou gros volume → WooCommerce ou sur-mesure
      if (products === 'Plus de 200 produits' || volume === 'Plus de 100/mois') {
        if (budget === 'Plus de 5000€') {
          reco.push('PLATEFORME : Développement e-commerce sur-mesure recommandé (gros catalogue + volume élevé + budget conséquent).');
        } else {
          reco.push('PLATEFORME : WordPress/WooCommerce recommandé (gros catalogue, budget modéré). Shopify envisageable si le client préfère du SaaS.');
        }
      }
      // Petit catalogue → Shopify ou WooCommerce
      else if (products === 'Moins de 20 produits') {
        reco.push('PLATEFORME : Shopify recommandé (petit catalogue, mise en route rapide). Alternative : WooCommerce si besoin de personnalisation poussée.');
      }
      // Catalogue moyen
      else {
        reco.push('PLATEFORME : WordPress/WooCommerce recommandé (bon compromis flexibilité/coût). Shopify si le client veut du clé-en-main.');
      }
    } else {
      // Site vitrine / blog / autre
      var contentFreq = answers.content_frequency || '';
      var contentOwner = answers.content_ownership || '';

      if (contentFreq === 'Non, site statique' && contentOwner !== 'Moi-même, en autonomie') {
        reco.push('PLATEFORME : Site codé sans CMS (HTML/CSS/JS), plus léger et plus rapide. Pas de back-office nécessaire.');
      } else {
        reco.push('PLATEFORME : WordPress recommandé (mises à jour fréquentes + gestion autonome par le client).');
      }
    }

    /* -------------------------------------------------------
       RÈGLE 2 — Hébergement
       Croise : trafic cible + publicité prévue
       ------------------------------------------------------- */
    var traffic = answers.traffic_target || '';
    var ads = answers.ads_planned || '';

    if (traffic === 'Plus de 5000/mois' || ads === 'Oui, dès le lancement') {
      reco.push('HÉBERGEMENT : VPS recommandé (trafic élevé / pics pub). Cloudflare en CDN conseillé.');
    } else {
      reco.push('HÉBERGEMENT : Mutualisé suffisant pour ce volume de trafic.');
    }

    /* -------------------------------------------------------
       RÈGLE 3 — Module CRM
       Croise : besoin CRM + outil existant
       ------------------------------------------------------- */
    var crm = answers.crm_need || '';
    var crmTool = answers.existing_crm_tool || '';

    if (crm === 'Oui, c\'est un besoin important') {
      if (crmTool && crmTool !== '(non renseigné)') {
        reco.push('CRM : Intégration avec ' + crmTool + ' à prévoir. Vérifier la disponibilité d\'une API.');
      } else {
        reco.push('CRM : Proposer un module CRM intégré (plugin WordPress ou solution légère type Brevo/HubSpot free).');
      }
    } else if (crm === 'Peut-être, à voir') {
      reco.push('CRM : Prévoir la possibilité d\'ajout ultérieur, ne pas verrouiller l\'architecture.');
    }

    /* -------------------------------------------------------
       RÈGLE 4 — Besoin CMS
       Croise : gestion contenu + fréquence
       ------------------------------------------------------- */
    var owner = answers.content_ownership || '';
    var freq = answers.content_frequency || '';

    if (owner === 'Moi-même, en autonomie' && freq !== 'Non, site statique') {
      reco.push('CMS : Indispensable — le client veut gérer son contenu en autonomie.');
    }

    /* -------------------------------------------------------
       RÈGLE 5 — Filtre de cohérence budget/délai/complexité
       Signale les incohérences pour recadrage humain
       ------------------------------------------------------- */
    var deadline = answers.deadline || '';

    if (budget === 'Moins de 500€' && deadline === 'Urgent (moins d\'un mois)') {
      if (type === 'Boutique en ligne (e-commerce)') {
        reco.push('⚠️ INCOHÉRENCE : Budget < 500€ + délai urgent + e-commerce. Projet probablement irréaliste dans ces conditions. Recadrer les attentes avec le client.');
      } else {
        reco.push('⚠️ ATTENTION : Budget < 500€ + délai urgent. Possible uniquement pour un site vitrine très simple (1-3 pages). À discuter.');
      }
    }

    if (budget === 'Moins de 500€' && products === 'Plus de 200 produits') {
      reco.push('⚠️ INCOHÉRENCE : Budget < 500€ pour 200+ produits. Intégration catalogue très chronophage, budget insuffisant.');
    }

    /* -------------------------------------------------------
       RÈGLE 6 — Identité visuelle
       ------------------------------------------------------- */
    var brand = answers.brand_assets || '';
    if (brand === 'Non, à créer') {
      reco.push('DESIGN : Création d\'identité visuelle à ajouter au devis (logo + palette + typographies).');
    }

    /* -------------------------------------------------------
       RÈGLE 7 — Multilingue
       ------------------------------------------------------- */
    var multi = answers.multilingual || '';
    if (multi === 'Oui') {
      reco.push('MULTILINGUE : Plugin de traduction nécessaire (WPML, Polylang, ou structure i18n manuelle). Surcoût à prévoir.');
    }

    return reco;
  }

  /* ============================================================
     CLASSE PRINCIPALE — CadrageBot
     ============================================================ */
  function CadrageBot(containerEl) {
    this.container = containerEl;
    this.answers = {};
    this.history = [];        // pile des questionId pour le retour arrière
    this.currentQuestionId = null;
    this.screen = 'intro';    // 'intro' | 'chat' | 'recap' | 'success'
    this.mode = 'client';     // 'client' | 'recruiter'

    this.init();
  }

  /* -------------------------------------------------------
     MODE HELPERS
     ------------------------------------------------------- */
  CadrageBot.prototype.getQuestions = function () {
    return this.mode === 'recruiter' ? RECRUITER_QUESTIONS : CHATBOT_QUESTIONS;
  };

  CadrageBot.prototype.getLabels = function () {
    return this.mode === 'recruiter' ? RECRUITER_LABELS : CHATBOT_LABELS;
  };

  CadrageBot.prototype.getSections = function () {
    if (this.mode === 'recruiter') return getRecruiterSections();
    return getApplicableSections(this.answers);
  };

  CadrageBot.prototype.getQuestionById = function (id) {
    return this.getQuestions().find(function (q) { return q.id === id; });
  };

  CadrageBot.prototype.getBackendUrl = function () {
    return this.mode === 'recruiter' ? 'php/submit_recruiter.php' : BACKEND_URL;
  };

  /* -------------------------------------------------------
     INITIALISATION
     ------------------------------------------------------- */
  CadrageBot.prototype.init = function () {
    this.buildShell();
    this.showIntro();
  };

  /** Construit la structure HTML principale */
  CadrageBot.prototype.buildShell = function () {
    var self = this;
    this.container.innerHTML =
      '<div class="cadrage-window">' +
        '<div class="cadrage-header">' +
          '<div class="cadrage-tabs">' +
            '<button class="cadrage-tab cadrage-tab--active" data-mode="client">' +
              '<i class="fas fa-terminal"></i> CADRAGE_PROJET.EXE' +
            '</button>' +
            '<button class="cadrage-tab" data-mode="recruiter">' +
              '<i class="fas fa-user-tie"></i> ACCUEIL_RECRUTEUR.EXE' +
            '</button>' +
          '</div>' +
          '<span class="cadrage-status">[ ONLINE ]</span>' +
        '</div>' +
        '<div class="cadrage-body" id="cadrage-body"></div>' +
      '</div>';

    this.body = this.container.querySelector('#cadrage-body');

    // Attach tab events
    var tabs = this.container.querySelectorAll('.cadrage-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var newMode = tab.getAttribute('data-mode');
        if (newMode === self.mode) return;

        // Switch active tab
        tabs.forEach(function (t) { t.classList.remove('cadrage-tab--active'); });
        tab.classList.add('cadrage-tab--active');

        // Reset and switch mode
        self.mode = newMode;
        self.answers = {};
        self.history = [];
        self.currentQuestionId = null;
        self.clearProgress();
        self.showIntro();
      });
    });
  };

  /* -------------------------------------------------------
     ÉCRAN 1 — INTRO
     ------------------------------------------------------- */
  CadrageBot.prototype.showIntro = function () {
    this.screen = 'intro';
    var saved = this.loadProgress();
    var hasProgress = saved && Object.keys(saved.answers).length > 0 && saved.mode === this.mode;

    var isRecruiter = this.mode === 'recruiter';
    var icon = isRecruiter ? 'fa-user-tie' : 'fa-project-diagram';
    var title = isRecruiter ? 'BIENVENUE, RECRUTEUR' : 'CADRONS VOTRE PROJET ENSEMBLE';
    var desc = isRecruiter
      ? 'Vous cherchez un alternant en Master Informatique ? ' +
        'Remplissez ce court formulaire et François vous recontactera rapidement.'
      : 'Répondez à quelques questions ciblées pour que je comprenne ' +
        'précisément votre besoin. À la fin, vous recevrez un récapitulatif ' +
        'structuré de votre demande.';
    var time = isRecruiter ? '2 À 3 MINUTES' : '5 À 10 MINUTES SELON VOTRE PROJET';
    var btnText = isRecruiter ? '> DÉMARRER LE CONTACT' : '> COMMENCER LE CADRAGE';

    var html =
      '<div class="cadrage-intro">' +
        '<div class="cadrage-intro-icon">' +
          '<i class="fas ' + icon + '"></i>' +
        '</div>' +
        '<h3 class="cadrage-intro-title">' + title + '</h3>' +
        '<p class="cadrage-intro-desc">' + desc + '</p>' +
        '<p class="cadrage-intro-time">' +
          '<i class="far fa-clock"></i> ' + time +
        '</p>' +
        '<div class="cadrage-intro-actions">' +
          '<button class="terminal-btn cadrage-start-btn" id="cadrage-start">' +
            btnText +
          '</button>';

    if (hasProgress) {
      html +=
          '<button class="terminal-btn terminal-btn--outline cadrage-resume-btn" id="cadrage-resume">' +
            '> REPRENDRE LÀ OÙ J\'EN ÉTAIS' +
          '</button>';
    }

    html +=
        '</div>' +
      '</div>';

    this.body.innerHTML = html;

    // Animations d'entrée
    var self = this;
    var introEl = this.body.querySelector('.cadrage-intro');
    gsap.fromTo(introEl.children, 
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, stagger: 0.08, duration: animDuration(0.5), ease: 'power2.out' }
    );

    // Événements
    document.getElementById('cadrage-start').addEventListener('click', function () {
      self.clearProgress();
      self.answers = {};
      self.history = [];
      self.startChat(self.getQuestions()[0].id);
    });

    var resumeBtn = document.getElementById('cadrage-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', function () {
        self.answers = saved.answers;
        self.history = saved.history || [];
        self.startChat(saved.currentQuestionId);
      });
    }
  };

  /* -------------------------------------------------------
     ÉCRAN 2 — CHAT (une question à la fois)
     ------------------------------------------------------- */
  CadrageBot.prototype.startChat = function (questionId) {
    this.screen = 'chat';
    this.showQuestion(questionId);
  };

  CadrageBot.prototype.showQuestion = function (questionId) {
    if (!questionId) {
      // Fin du parcours → récapitulatif
      this.showRecap();
      return;
    }

    var q = this.getQuestionById(questionId);
    if (!q) {
      this.showRecap();
      return;
    }

    this.currentQuestionId = questionId;
    this.saveProgress();

    var self = this;
    var sections = this.getSections();
    var currentSectionIndex = sections.findIndex(function (s) { return s.id === q.section; });

    // Construction du HTML
    var html = '';

    // Stepper de progression
    html += '<div class="cadrage-stepper">';
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var stepClass = 'cadrage-step';
      if (i < currentSectionIndex) stepClass += ' cadrage-step--done';
      else if (i === currentSectionIndex) stepClass += ' cadrage-step--active';

      html +=
        '<div class="' + stepClass + '" title="' + escapeHTML(s.label) + '">' +
          '<span class="cadrage-step-dot"></span>' +
          '<span class="cadrage-step-label">' + escapeHTML(s.label) + '</span>' +
        '</div>';

      if (i < sections.length - 1) {
        var lineClass = 'cadrage-step-line';
        if (i < currentSectionIndex) lineClass += ' cadrage-step-line--done';
        html += '<div class="' + lineClass + '"></div>';
      }
    }
    html += '</div>';

    // Zone de chat
    html += '<div class="cadrage-chat-area">';

    // Message du bot
    html +=
      '<div class="chatbot-msg chatbot-msg--bot">' +
        '<span class="cadrage-msg-prefix">&gt; </span>' +
        escapeHTML(q.question) +
      '</div>';

    // Zone de réponse
    html += '<div class="cadrage-answer-area" id="cadrage-answer-area">';

    if (q.type === 'single_choice' || q.type === 'multi_choice') {
      html += '<div class="cadrage-options">';
      for (var j = 0; j < q.options.length; j++) {
        var opt = q.options[j];
        var isSelected = false;
        if (q.type === 'multi_choice' && this.answers[q.id]) {
          isSelected = this.answers[q.id].split(', ').indexOf(opt) !== -1;
        } else {
          isSelected = (this.answers[q.id] === opt);
        }
        var selectedClass = isSelected ? ' cadrage-option--selected' : '';
        html +=
          '<button class="chatbot-option-btn cadrage-option' + selectedClass + '" ' +
            'data-value="' + escapeHTML(opt) + '">' +
            '[ ' + escapeHTML(opt) + ' ]' +
          '</button>';
      }
      html += '</div>';
      
      if (q.type === 'multi_choice') {
        html += '<div style="margin-top: 1rem; text-align: right;">' +
                  '<button class="chatbot-submit-btn" id="multi-choice-submit">' +
                    (q.required ? '[ VALIDER ]' : '[ VALIDER / PASSER ]') +
                  '</button>' +
                '</div>';
      }
    } else if (q.type === 'text') {
      var inputType = q.inputType || 'text';
      var prevValue = this.answers[q.id] || '';
      if (prevValue === '(non renseigné)') prevValue = '';

      html +=
        '<form class="cadrage-text-form" id="cadrage-text-form">' +
          '<input class="terminal-input cadrage-text-input" ' +
            'type="' + inputType + '" ' +
            'placeholder="' + escapeHTML(q.placeholder || '') + '" ' +
            'value="' + escapeHTML(prevValue) + '" ' +
            (q.required ? 'required ' : '') +
            'autocomplete="' + (inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : 'off') + '">' +
          '<button type="submit" class="chatbot-submit-btn">' +
            (q.required ? '[ VALIDER ]' : '[ VALIDER / PASSER ]') +
          '</button>' +
        '</form>';
    }

    html += '</div>'; // fin cadrage-answer-area

    // Honeypot (invisible, uniquement sur la section coordonnées)
    if (q.section === 'I' && q.id === 'contact_name') {
      html +=
        '<div style="position:absolute;left:-9999px;top:-9999px;" aria-hidden="true">' +
          '<input type="text" name="website_url" id="cadrage-honeypot" tabindex="-1" autocomplete="off">' +
        '</div>';
    }

    html += '</div>'; // fin cadrage-chat-area

    // Boutons navigation
    html += '<div class="cadrage-nav">';
    if (this.history.length > 0) {
      html +=
        '<button class="terminal-btn terminal-btn--outline cadrage-back-btn" id="cadrage-back">' +
          '<i class="fas fa-chevron-left"></i> RETOUR' +
        '</button>';
    } else {
      html += '<div></div>'; // placeholder pour flex justify
    }
    // Compteur de question
    var totalQ = this.countTotalQuestions();
    var currentIndex = this.history.length + 1;
    html +=
      '<span class="cadrage-counter">' + currentIndex + ' / ~' + totalQ + '</span>';
    html += '</div>';

    // Injection dans le DOM
    this.body.innerHTML = html;

    // Animations d'entrée
    var msgEl = this.body.querySelector('.chatbot-msg--bot');
    var answerArea = this.body.querySelector('#cadrage-answer-area');
    var stepper = this.body.querySelector('.cadrage-stepper');

    if (stepper) {
      gsap.fromTo(stepper, 
        { autoAlpha: 0, y: -10 },
        { autoAlpha: 1, y: 0, duration: animDuration(0.3), ease: 'power2.out' }
      );
    }

    if (msgEl) {
      gsap.fromTo(msgEl, 
        { autoAlpha: 0, y: 15 },
        { autoAlpha: 1, y: 0, duration: animDuration(0.4), ease: 'power2.out' }
      );
    }

    var answerChildren = answerArea ? answerArea.querySelectorAll('.cadrage-option, .cadrage-text-form') : [];

    if (answerChildren.length > 0) {
      gsap.fromTo(answerChildren, 
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, stagger: 0.06, duration: animDuration(0.4), ease: 'back.out(1.7)', delay: 0.15 }
      );
    }

    // Événements
    this.bindQuestionEvents(q);
  };

  /** Attache les événements à la question affichée */
  CadrageBot.prototype.bindQuestionEvents = function (q) {
    var self = this;

    // Bouton retour
    var backBtn = document.getElementById('cadrage-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        self.goBack();
      });
    }

    if (q.type === 'single_choice') {
      var options = this.body.querySelectorAll('.cadrage-option');
      options.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var value = btn.getAttribute('data-value');
          self.answers[q.id] = value;

          // Animation de sélection
          options.forEach(function (b) { b.classList.remove('cadrage-option--selected'); });
          btn.classList.add('cadrage-option--selected');

          // Transition vers la question suivante
          setTimeout(function () {
            self.advanceToNext(q, value);
          }, 200);
        });
      });
    } else if (q.type === 'multi_choice') {
      var options = this.body.querySelectorAll('.cadrage-option');
      options.forEach(function (btn) {
        btn.addEventListener('click', function () {
          btn.classList.toggle('cadrage-option--selected');
        });
      });

      var submitBtn = document.getElementById('multi-choice-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', function () {
          var selected = [];
          self.body.querySelectorAll('.cadrage-option--selected').forEach(function (b) {
            selected.push(b.getAttribute('data-value'));
          });

          if (q.required && selected.length === 0) {
            submitBtn.classList.add('cadrage-input-error');
            gsap.from(submitBtn, { x: -8, duration: 0.08, repeat: 5, yoyo: true, ease: 'power2.inOut' });
            return;
          }

          var val = selected.join(', ');
          self.answers[q.id] = val;
          self.advanceToNext(q, val);
        });
      }
    } else if (q.type === 'text') {
      var form = document.getElementById('cadrage-text-form');
      var input = form.querySelector('.cadrage-text-input');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var val = input.value.trim();

        // Validation email
        if (q.inputType === 'email' && val && !isValidEmail(val)) {
          input.classList.add('cadrage-input-error');
          gsap.from(input, { x: -8, duration: 0.08, repeat: 5, yoyo: true, ease: 'power2.inOut' });
          return;
        }

        if (!val && q.required) {
          input.classList.add('cadrage-input-error');
          gsap.from(input, { x: -8, duration: 0.08, repeat: 5, yoyo: true, ease: 'power2.inOut' });
          return;
        }

        self.answers[q.id] = val || '(non renseigné)';
        self.advanceToNext(q, val);
      });

      // Focus automatique sur l'input
      setTimeout(function () { input.focus(); }, 100);
    }
  };

  /** Avance à la question suivante (avec animation de sortie) */
  CadrageBot.prototype.advanceToNext = function (currentQ, answer) {
    var self = this;
    this.history.push(currentQ.id);
    this.saveProgress();

    // Calcul de la prochaine question
    var nextId = currentQ.next(answer, this.answers);

    // Animation de sortie
    var chatArea = this.body.querySelector('.cadrage-chat-area');
    gsap.to(chatArea, {
      autoAlpha: 0,
      y: -15,
      duration: animDuration(0.25),
      ease: 'power2.in',
      onComplete: function () {
        self.showQuestion(nextId);
      }
    });
  };

  /** Retour à la question précédente */
  CadrageBot.prototype.goBack = function () {
    if (this.history.length === 0) return;
    var prevId = this.history.pop();
    this.saveProgress();
    this.showQuestion(prevId);
  };

  /** Estime le nombre total de questions pour le compteur */
  CadrageBot.prototype.countTotalQuestions = function () {
    var isBoutique = this.answers.project_type === 'Boutique en ligne (e-commerce)';
    // Section B : 4 questions, Section F : 2 questions
    var base = CHATBOT_QUESTIONS.length; // 25 total
    if (!isBoutique) {
      base -= 6; // retire B (4) + F (2)
    }
    // Retire multilingual_languages si pas multilingue
    if (this.answers.multilingual !== 'Oui') {
      base -= 1;
    }
    return base;
  };

  /* -------------------------------------------------------
     ÉCRAN 3 — RÉCAPITULATIF
     ------------------------------------------------------- */
  CadrageBot.prototype.showRecap = function () {
    this.screen = 'recap';
    var self = this;

    var html = '';
    html += '<div class="cadrage-recap">';
    html += '<h3 class="cadrage-recap-title">';
    html += '<i class="fas fa-clipboard-list"></i> RÉCAPITULATIF DE VOTRE DEMANDE';
    html += '</h3>';

    // Tableau des réponses par section
    var sections = this.getSections();
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var sectionQuestions = this.getQuestions().filter(function (q) {
        return q.section === sec.id && self.answers.hasOwnProperty(q.id);
      });

      if (sectionQuestions.length === 0) continue;

      html += '<div class="cadrage-recap-section">';
      html += '<h4 class="cadrage-recap-section-title">';
      html += '<i class="fas ' + escapeHTML(sec.icon) + '"></i> ' + escapeHTML(sec.label);
      html += '</h4>';

      for (var j = 0; j < sectionQuestions.length; j++) {
        var sq = sectionQuestions[j];
        var label = this.getLabels()[sq.id] || sq.id;
        var value = this.answers[sq.id] || '(non renseigné)';

        html +=
          '<div class="cadrage-recap-row">' +
            '<span class="cadrage-recap-label">' + escapeHTML(label) + '</span>' +
            '<span class="cadrage-recap-value">' + escapeHTML(value) + '</span>' +
            '<button class="cadrage-recap-edit" data-question="' + sq.id + '" ' +
              'title="Modifier cette réponse">' +
              '<i class="fas fa-pen"></i>' +
            '</button>' +
          '</div>';
      }

      html += '</div>';
    }

    // Actions
    html += '<div class="cadrage-recap-actions">';
    html +=
      '<button class="terminal-btn cadrage-send-btn" id="cadrage-send">' +
        '<i class="fas fa-paper-plane"></i> ENVOYER MA DEMANDE' +
      '</button>';
    html +=
      '<button class="terminal-btn terminal-btn--outline" id="cadrage-download-recap">' +
        '<i class="fas fa-download"></i> TÉLÉCHARGER LE RÉCAP' +
      '</button>';
    html += '</div>';

    html += '</div>'; // fin cadrage-recap

    this.body.innerHTML = html;

    // Animation d'entrée
    var recapEl = this.body.querySelector('.cadrage-recap');
    gsap.fromTo(recapEl, 
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: animDuration(0.5), ease: 'power2.out' }
    );

    var rows = this.body.querySelectorAll('.cadrage-recap-row');
    if (rows.length > 0) {
      gsap.fromTo(rows, 
        { autoAlpha: 0, x: -15 },
        { autoAlpha: 1, x: 0, stagger: 0.04, duration: animDuration(0.4), ease: 'power2.out', delay: 0.2 }
      );
    }

    // Événements : boutons modifier
    this.body.querySelectorAll('.cadrage-recap-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qId = btn.getAttribute('data-question');
        // Reconstruire l'historique jusqu'à cette question
        self.rebuildHistoryUpTo(qId);
        self.showQuestion(qId);
      });
    });

    // Événement : envoyer
    document.getElementById('cadrage-send').addEventListener('click', function () {
      self.submitToBackend();
    });

    // Événement : télécharger
    document.getElementById('cadrage-download-recap').addEventListener('click', function () {
      self.downloadRecap();
    });
  };

  /** Reconstruit la pile history jusqu'à la question ciblée (excluant celle-ci) */
  CadrageBot.prototype.rebuildHistoryUpTo = function (targetId) {
    var newHistory = [];
    var qId = this.getQuestions()[0].id;

    while (qId && qId !== targetId) {
      var q = this.getQuestionById(qId);
      if (!q) break;
      newHistory.push(qId);
      var answer = this.answers[q.id];
      qId = q.next(answer, this.answers);
    }

    this.history = newHistory;
  };

  /* -------------------------------------------------------
     ENVOI AU BACKEND
     ------------------------------------------------------- */
  CadrageBot.prototype.submitToBackend = function () {
    var self = this;
    var sendBtn = document.getElementById('cadrage-send');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ENVOI EN COURS...';

    // Récupération du honeypot
    var honeypot = document.getElementById('cadrage-honeypot');
    var honeypotValue = honeypot ? honeypot.value : '';

    var payload = {
      answers: this.answers,
      honeypot: honeypotValue,
      timestamp: new Date().toISOString(),
    };

    fetch(this.getBackendUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.success) {
        self.clearProgress();
        self.showSuccess();
      } else {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> ENVOYER MA DEMANDE';
        self.showError(data.error || 'Erreur inconnue. Veuillez réessayer.');
      }
    })
    .catch(function () {
      // En cas d'erreur réseau (pas de backend PHP disponible),
      // on propose quand même le téléchargement
      self.clearProgress();
      self.showSuccess(true);
    });
  };

  /** Affiche un message d'erreur temporaire */
  CadrageBot.prototype.showError = function (message) {
    var existing = this.body.querySelector('.cadrage-error');
    if (existing) existing.remove();

    var errorEl = document.createElement('div');
    errorEl.className = 'cadrage-error';
    errorEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + escapeHTML(message);

    var actions = this.body.querySelector('.cadrage-recap-actions');
    if (actions) {
      actions.parentNode.insertBefore(errorEl, actions);
    }

    gsap.fromTo(errorEl, 
      { autoAlpha: 0, y: -10 },
      { autoAlpha: 1, y: 0, duration: animDuration(0.3), ease: 'power2.out' }
    );
  };

  /* -------------------------------------------------------
     ÉCRAN 4 — CONFIRMATION
     ------------------------------------------------------- */
  CadrageBot.prototype.showSuccess = function (offline) {
    this.screen = 'success';
    var self = this;

    var html =
      '<div class="cadrage-success">' +
        '<div class="cadrage-success-icon">' +
          '<i class="fas fa-check-circle"></i>' +
        '</div>' +
        '<h3 class="cadrage-success-title">DEMANDE ' + (offline ? 'PRÊTE' : 'ENVOYÉE') + ' !</h3>' +
        '<p class="cadrage-success-desc">';

    if (offline) {
      html +=
          'Le serveur n\'est pas disponible pour le moment, mais vous pouvez ' +
          'télécharger votre récapitulatif et me l\'envoyer directement par email.';
    } else {
      html +=
          'Votre demande de cadrage a bien été enregistrée. ' +
          'Je reviendrai vers vous sous 24 à 48h avec une première analyse.';
    }

    html +=
        '</p>' +
        '<div class="cadrage-success-actions">' +
          '<button class="terminal-btn" id="cadrage-download-final">' +
            '<i class="fas fa-download"></i> TÉLÉCHARGER MON RÉCAPITULATIF' +
          '</button>' +
          '<button class="terminal-btn terminal-btn--outline" id="cadrage-restart">' +
            '<i class="fas fa-redo"></i> NOUVEAU CADRAGE' +
          '</button>' +
        '</div>' +
      '</div>';

    this.body.innerHTML = html;

    // Animation d'entrée
    var successEl = this.body.querySelector('.cadrage-success');
    var icon = successEl.querySelector('.cadrage-success-icon');

    gsap.fromTo(icon, 
      { scale: 0 },
      { scale: 1, duration: animDuration(0.5), ease: 'back.out(2)' }
    );

    var successTexts = successEl.querySelectorAll('h3, p');
    if (successTexts.length > 0) {
      gsap.fromTo(successTexts, 
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, stagger: 0.1, duration: animDuration(0.5), ease: 'power2.out', delay: 0.2 }
      );
    }

    // Événements
    document.getElementById('cadrage-download-final').addEventListener('click', function () {
      self.downloadRecap();
    });

    document.getElementById('cadrage-restart').addEventListener('click', function () {
      self.answers = {};
      self.history = [];
      self.clearProgress();
      self.showIntro();
    });
  };

  /* -------------------------------------------------------
     GÉNÉRATION DU RÉCAPITULATIF TEXTE
     ------------------------------------------------------- */
  CadrageBot.prototype.buildRecapText = function () {
    var self = this;
    var lines = [];
    lines.push('========================================');
    lines.push('  RÉCAPITULATIF — DEMANDE DE PROJET');
    lines.push('  Date : ' + new Date().toLocaleString('fr-FR'));
    lines.push('========================================');
    lines.push('');

    var sections = getApplicableSections(this.answers);
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var sectionQuestions = CHATBOT_QUESTIONS.filter(function (q) {
        return q.section === sec.id && self.answers.hasOwnProperty(q.id);
      });

      if (sectionQuestions.length === 0) continue;

      lines.push('--- ' + sec.label + ' ---');
      for (var j = 0; j < sectionQuestions.length; j++) {
        var sq = sectionQuestions[j];
        var label = CHATBOT_LABELS[sq.id] || sq.id;
        var value = this.answers[sq.id] || '(non renseigné)';
        lines.push('  ' + label + ' : ' + value);
      }
      lines.push('');
    }

    lines.push('========================================');
    lines.push('  Généré par le chatbot de cadrage');
    lines.push('  Portfolio François Ballet');
    lines.push('========================================');

    return lines.join('\n');
  };

  /** Télécharge le récapitulatif en fichier .txt */
  CadrageBot.prototype.downloadRecap = function () {
    var text = this.buildRecapText();
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var name = (this.answers.contact_name || 'prospect').replace(/\s+/g, '_');
    a.download = 'recap_projet_' + name + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* -------------------------------------------------------
     LOCALSTORAGE — Sauvegarde / Restauration
     ------------------------------------------------------- */
  CadrageBot.prototype.saveProgress = function () {
    try {
      var data = {
        answers: this.answers,
        history: this.history,
        currentQuestionId: this.currentQuestionId,
        mode: this.mode,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage indisponible (navigation privée, etc.)
    }
  };

  CadrageBot.prototype.loadProgress = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);

      // Expire après 24h
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        this.clearProgress();
        return null;
      }

      return data;
    } catch (e) {
      return null;
    }
  };

  CadrageBot.prototype.clearProgress = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // silencieux
    }
  };

  /* -------------------------------------------------------
     INITIALISATION AU CHARGEMENT
     ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('chatbot-container');
    if (el) {
      window.cadrageBot = new CadrageBot(el);
    }
  });

})();
