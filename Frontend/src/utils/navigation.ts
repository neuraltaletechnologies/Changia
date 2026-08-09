// An array of links for navigation bar
const navBarLinks = [
  { name: 'Home', url: '/' },
  { name: 'Modules', url: '/products' },
  { name: 'How It Works', url: '/services' },
  { name: 'Blog', url: '/blog' },
  { name: 'Contact', url: '/contact' },
];
// An array of links for footer
const footerLinks = [
  {
    section: 'Platform',
    links: [
      { name: 'Modules', url: '/products' },
      { name: 'How It Works', url: '/services' },
      { name: 'Blog', url: '/blog' },
    ],
  },
  {
    section: 'Company',
    links: [
      { name: 'About Us', url: '#' },
      { name: 'Contact', url: '/contact' },
      { name: 'Privacy Policy', url: '#' },
      { name: 'Terms of Service', url: '#' },
    ],
  },
];
// An object of links for social icons
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