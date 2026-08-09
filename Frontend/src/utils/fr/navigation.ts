const navBarLinks = [
  { name: 'Accueil', url: '/fr' },
  { name: 'Modules', url: '/fr/products' },
  { name: 'Comment ça marche', url: '/fr/services' },
  { name: 'Blog', url: '/fr/blog' },
  { name: 'Contact', url: '/fr/contact' },
];

const footerLinks = [
  {
    section: 'Plateforme',
    links: [
      { name: 'Modules', url: '/fr/products' },
      { name: 'Comment ça marche', url: '/fr/services' },
      { name: 'Blog', url: '/fr/blog' },
    ],
  },
  {
    section: 'Société',
    links: [
      { name: 'À propos', url: '#' },
      { name: 'Contact', url: '/fr/contact' },
      { name: 'Politique de confidentialité', url: '#' },
      { name: "Conditions d'utilisation", url: '#' },
    ],
  },
];

const socialLinks = {
  facebook: '#',
  x: '#',
  github: '#',
  google: '#',
  slack: '#',
};

export default {
  navBarLinks,
  footerLinks,
  socialLinks,
};