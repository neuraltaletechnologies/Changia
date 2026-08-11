const navBarLinks = [
  { name: 'Mwanzo', url: '/sw' },
  { name: 'Kampani', url: '/sw/products' },
  { name: 'Inavyofanya Kazi', url: '/sw/services' },
  { name: 'Blogu', url: '/sw/blog' },
  { name: 'Wasiliana nasi', url: '/sw/contact' },
];

const footerLinks = [
  {
    section: 'Jukwaa',
    links: [
      { name: 'Kampani', url: '/sw/products' },
      { name: 'Inavyofanya Kazi', url: '/sw/services' },
      { name: 'Blogu', url: '/sw/blog' },
    ],
  },
  {
    section: 'Kampuni',
    links: [
      { name: 'Kuhusu Sisi', url: '#' },
      { name: 'Wasiliana nasi', url: '/sw/contact' },
      { name: 'Sera ya Faragha', url: '#' },
      { name: 'Masharti ya Huduma', url: '#' },
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
