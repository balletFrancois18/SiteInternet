/**
 * Chatbot section — Conversational contact form
 * Qualifies visitors (recruiter vs client) and collects relevant info.
 * Pure front-end; data export will be handled later with a backend.
 */
(function () {
  'use strict';

  // Decision tree
  const TREE = {
    start: {
      message: '> BONJOUR ! JE SUIS LE TERMINAL DE CONTACT DE FRANÇOIS. QUI ÊTES-VOUS ?',
      options: [
        { label: 'JE SUIS RECRUTEUR', next: 'recruiter_type' },
        { label: 'JE SUIS UN CLIENT POTENTIEL', next: 'client_type' },
        { label: 'JUSTE CURIEUX / AUTRE', next: 'curious' }
      ]
    },
    recruiter_type: {
      message: '> TRÈS BIEN ! QUEL TYPE DE POSTE PROPOSEZ-VOUS ?',
      options: [
        { label: 'ALTERNANCE MASTER', next: 'recruiter_company' },
        { label: 'CDI / CDD', next: 'recruiter_company' },
        { label: 'STAGE', next: 'recruiter_company' }
      ]
    },
    recruiter_company: {
      message: '> SUPER ! POUR QUELLE ENTREPRISE ?',
      inputField: { placeholder: 'NOM DE L\'ENTREPRISE', key: 'company' },
      next: 'recruiter_email'
    },
    recruiter_email: {
      message: '> PARFAIT. VOTRE ADRESSE EMAIL POUR VOUS RECONTACTER ?',
      inputField: { placeholder: 'VOTRE@EMAIL.COM', key: 'email', type: 'email' },
      next: 'recruiter_message'
    },
    recruiter_message: {
      message: '> UN MESSAGE SUPPLÉMENTAIRE ? (OPTIONNEL)',
      inputField: { placeholder: 'VOTRE MESSAGE...', key: 'message', optional: true },
      next: 'summary'
    },
    client_type: {
      message: '> QUEL TYPE DE PROJET AVEZ-VOUS EN TÊTE ?',
      options: [
        { label: 'SITE VITRINE', next: 'client_budget' },
        { label: 'REFONTE SITE EXISTANT', next: 'client_budget' },
        { label: 'APPLICATION WEB', next: 'client_budget' },
        { label: 'AUTRE PROJET', next: 'client_budget' }
      ]
    },
    client_budget: {
      message: '> AVEZ-VOUS UN BUDGET APPROXIMATIF ?',
      options: [
        { label: '< 500€', next: 'client_email' },
        { label: '500€ – 1500€', next: 'client_email' },
        { label: '1500€ – 5000€', next: 'client_email' },
        { label: 'À DISCUTER', next: 'client_email' }
      ]
    },
    client_email: {
      message: '> VOTRE EMAIL POUR QUE FRANÇOIS VOUS RECONTACTE ?',
      inputField: { placeholder: 'VOTRE@EMAIL.COM', key: 'email', type: 'email' },
      next: 'client_message'
    },
    client_message: {
      message: '> DÉCRIVEZ BRIÈVEMENT VOTRE PROJET (OPTIONNEL)',
      inputField: { placeholder: 'DESCRIPTION DU PROJET...', key: 'message', optional: true },
      next: 'summary'
    },
    curious: {
      message: '> MERCI DE VOTRE VISITE ! VOICI MES LIENS :',
      links: [
        { label: 'GITHUB', url: 'https://github.com/balletFrancois18', icon: 'fa-brands fa-github' },
        { label: 'LINKEDIN', url: 'https://www.linkedin.com/in/fran%C3%A7ois-ballet-5b2a83342/', icon: 'fa-brands fa-linkedin' }
      ],
      final: true
    },
    summary: {
      message: '> MERCI ! VOICI LE RÉCAPITULATIF :',
      final: true,
      showSummary: true
    }
  };

  class TerminalChatbot {
    constructor(containerEl) {
      this.container = containerEl;
      this.responses = {};
      this.currentStep = 'start';
      this.messageLog = [];

      this.buildDOM();
      this.showStep('start');
    }

    buildDOM() {
      this.container.innerHTML = `
        <div class="chatbot-window">
          <div class="chatbot-header">
            <span class="chatbot-title">> TERMINAL_CONTACT.EXE</span>
            <span class="chatbot-status">[ ONLINE ]</span>
          </div>
          <div class="chatbot-messages" id="chatbot-messages"></div>
          <div class="chatbot-input-area" id="chatbot-input-area"></div>
        </div>
      `;
      this.messagesEl = this.container.querySelector('#chatbot-messages');
      this.inputArea = this.container.querySelector('#chatbot-input-area');
    }

    addMessage(text, type = 'bot') {
      const msgEl = document.createElement('div');
      msgEl.className = `chatbot-msg chatbot-msg--${type}`;
      msgEl.textContent = text;
      this.messagesEl.appendChild(msgEl);

      // Animate text reveal (typewriter style)
      msgEl.style.opacity = '0';
      requestAnimationFrame(() => {
        msgEl.style.opacity = '1';
      });

      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      this.messageLog.push({ type, text });
    }

    addUserChoice(text) {
      this.addMessage(text, 'user');
    }

    showStep(stepId) {
      const step = TREE[stepId];
      if (!step) return;
      this.currentStep = stepId;

      // Show bot message
      this.addMessage(step.message, 'bot');
      this.inputArea.innerHTML = '';

      if (step.options) {
        // Button choices
        const btnWrap = document.createElement('div');
        btnWrap.className = 'chatbot-options';

        step.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'chatbot-option-btn';
          btn.textContent = `[ ${opt.label} ]`;
          btn.addEventListener('click', () => {
            this.responses[stepId] = opt.label;
            this.addUserChoice(opt.label);
            this.showStep(opt.next);
          });
          btnWrap.appendChild(btn);
        });

        this.inputArea.appendChild(btnWrap);
      } else if (step.inputField) {
        // Text input
        const form = document.createElement('form');
        form.className = 'chatbot-form';

        const input = document.createElement('input');
        input.className = 'terminal-input';
        input.type = step.inputField.type || 'text';
        input.placeholder = step.inputField.placeholder;
        input.required = !step.inputField.optional;
        input.autocomplete = step.inputField.type === 'email' ? 'email' : 'off';

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'chatbot-submit-btn';
        submitBtn.textContent = step.inputField.optional ? '[ ENVOYER / PASSER ]' : '[ ENVOYER ]';

        form.appendChild(input);
        form.appendChild(submitBtn);

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const val = input.value.trim();
          if (!val && !step.inputField.optional) return;

          this.responses[step.inputField.key] = val || '(non renseigné)';
          this.addUserChoice(val || '(passé)');
          this.showStep(step.next);
        });

        this.inputArea.appendChild(form);
        input.focus();
      } else if (step.links) {
        // Show links
        const linkWrap = document.createElement('div');
        linkWrap.className = 'chatbot-links';

        step.links.forEach(link => {
          const a = document.createElement('a');
          a.className = 'chatbot-link';
          a.href = link.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.innerHTML = `<i class="${link.icon}"></i> ${link.label}`;
          linkWrap.appendChild(a);
        });

        this.inputArea.appendChild(linkWrap);
      }

      if (step.showSummary) {
        this.showSummary();
      }

      if (step.final && !step.showSummary) {
        // Final step with no summary
      }
    }

    showSummary() {
      const summaryEl = document.createElement('div');
      summaryEl.className = 'chatbot-summary';

      let summaryText = '┌─────────────────────────────────┐\n';
      summaryText += '│       RÉCAPITULATIF CONTACT      │\n';
      summaryText += '├─────────────────────────────────┤\n';

      for (const [key, val] of Object.entries(this.responses)) {
        const label = key.toUpperCase().padEnd(12);
        summaryText += `│ ${label}: ${val}\n`;
      }

      summaryText += '└─────────────────────────────────┘';

      const pre = document.createElement('pre');
      pre.className = 'chatbot-summary-text';
      pre.textContent = summaryText;
      summaryEl.appendChild(pre);

      // Action buttons
      const actions = document.createElement('div');
      actions.className = 'chatbot-actions';

      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'chatbot-option-btn';
      copyBtn.textContent = '[ COPIER LE RÉCAPITULATIF ]';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(summaryText).then(() => {
          copyBtn.textContent = '[ ✓ COPIÉ ! ]';
          setTimeout(() => { copyBtn.textContent = '[ COPIER LE RÉCAPITULATIF ]'; }, 2000);
        });
      });

      // Mailto button
      const mailBtn = document.createElement('a');
      mailBtn.className = 'chatbot-option-btn';
      mailBtn.style.display = 'inline-block';
      const email = this.responses.email || '';
      const subject = encodeURIComponent('Contact Portfolio — François Ballet');
      const body = encodeURIComponent(summaryText);
      mailBtn.href = `mailto:?subject=${subject}&body=${body}`;
      mailBtn.textContent = '[ ENVOYER PAR EMAIL ]';

      // Restart
      const restartBtn = document.createElement('button');
      restartBtn.className = 'chatbot-option-btn';
      restartBtn.textContent = '[ RECOMMENCER ]';
      restartBtn.addEventListener('click', () => {
        this.responses = {};
        this.messageLog = [];
        this.messagesEl.innerHTML = '';
        this.showStep('start');
      });

      actions.appendChild(copyBtn);
      actions.appendChild(mailBtn);
      actions.appendChild(restartBtn);
      summaryEl.appendChild(actions);

      this.messagesEl.appendChild(summaryEl);
      this.inputArea.innerHTML = '';
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('chatbot-container');
    if (el) {
      window.chatbot = new TerminalChatbot(el);
    }
  });
})();
