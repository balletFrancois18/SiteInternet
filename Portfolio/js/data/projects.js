/**
 * Projects data — edit this array to add/modify/remove projects.
 * Each project will be rendered as a card in the Projects section.
 */
const PROJECTS = [
  {
    id: 'coloc-manager',
    title: 'CoLoc Manager',
    subtitle: 'App de réservation entre colocataires',
    description: 'Application collaborative de gestion de colocation : réservation d\'espaces communs, suivi des dépenses partagées et planning entre colocataires. Développement collaboratif sur GitHub.',
    tags: ['JavaScript', 'Collaboration GitHub', 'UX/UI'],
    icon: 'fa-house-user',
    status: 'Terminé',
    links: {}
  },
  {
    id: 'morpion-manga',
    title: 'Morpion Manga Ultimate',
    subtitle: 'Tic-Tac-Toe / Puissance 4 thème manga',
    description: 'Jeu interactif multijoueur avec univers manga : système Tic-Tac-Toe et Puissance 4, animations dynamiques, thèmes visuels et système de score.',
    tags: ['PHP', 'MySQL', 'JavaScript', 'Game Design'],
    icon: 'fa-gamepad',
    status: 'Terminé',
    links: {}
  },
  {
    id: 'grappling-france',
    title: 'Refonte Complète Grappling France',
    subtitle: 'Fédération Française de Grappling',
    description: 'Redesign complet de l\'interface front-end pour la Fédération Française de Grappling. Modernisation du design, responsive et optimisation des parcours utilisateurs.',
    tags: ['HTML/CSS', 'JavaScript', 'Responsive', 'UI/UX'],
    icon: 'fa-globe',
    status: 'En cours',
    links: { preview: 'Images/loginmma.png' }
  },
  {
    id: 'file-organizer',
    title: 'Organiseur de Fichiers CLI',
    subtitle: 'Outil Python avec GUI Tkinter & watchdog',
    description: 'Organiseur automatique de fichiers avec détection de doublons par hachage MD5, surveillance en temps réel (watchdog), et double interface : GUI Tkinter et CLI.',
    tags: ['Python', 'Tkinter', 'watchdog', 'MD5', 'CLI'],
    icon: 'fa-folder-tree',
    status: 'Terminé',
    links: {}
  },
  {
    id: 'email-campaign',
    title: 'Campagne Email Automatisée',
    subtitle: 'Système de candidatures automatisé',
    description: 'Système d\'envoi automatisé d\'emails de candidature avec gestion anti-spam, templates personnalisables, suivi des envois et rotation d\'adresses.',
    tags: ['Python', 'SMTP', 'Anti-spam', 'Automation'],
    icon: 'fa-envelope-circle-check',
    status: 'Terminé',
    links: {}
  },
  {
    id: 'site-vtt',
    title: 'Site VTT Course & Boutique',
    subtitle: 'Redesign e-commerce VTT',
    description: 'Redesign d\'un site de VTT avec espace boutique e-commerce, section course/événements et système de réservation.',
    tags: ['HTML/CSS', 'JavaScript', 'E-commerce'],
    icon: 'fa-bicycle',
    status: 'Terminé',
    links: {}
  }
];
