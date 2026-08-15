import ogImageSrc from '@images/social.png';

export const SITE = {
  title: 'Changia',
  tagline: 'Tanzania-first fundraising. Money and things. Built for everyday giving.',
  description:
    'Changia is a Tanzania-first fundraising organization. It helps organizations and campaign owners collect the support they need — mobile-money contributions, donated items and in-kind help — with minimal friction, either by sharing a Campaign link (SMS, WhatsApp, email, QR, social) or by having a field manager send a direct push payment request to a supporter who has already agreed to give. Donors never share their PIN with Changia — it is entered only in the secure gateway/mobile-money prompt. The platform is built for transparency: every Campaign shows a public target, real-time progress, and an itemized service fee, and every donation is confirmed only after a verified callback.',
  description_short:
    'Tanzania-first fundraising organization for simple, transparent giving — in cash and in kind.',
  url: 'https://changia.org.tz',
  author: 'Changia Development Team',
};

export const SEO = {
  title: SITE.title,
  description: SITE.description,
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    inLanguage: 'en-US',
    '@id': 'https://changia.org.tz',
    url: 'https://changia.org.tz',
    name: 'Changia',
    description: SITE.description,
    isPartOf: {
      '@type': 'WebSite',
      url: SITE.url,
      name: SITE.title,
      description: SITE.description,
    },
  },
};

export const OG = {
  locale: 'en_US',
  type: 'website',
  url: 'https://changia.org.tz',
  title: 'Changia | Fundraising that collects money and what communities need',
  description:
    'Changia is a Tanzania-first fundraising organization. Share a link, send a request, and collect cash and donated items for your Campaign in real time.',
  image: ogImageSrc,
};

export const partnersData = [
  {
    icon: `<svg class="mx-auto block h-8 w-auto text-neutral-600 dark:text-neutral-300" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="currentColor">M-Pesa</text></svg>`,
    name: 'M-Pesa',
    href: '#',
  },
  {
    icon: `<svg class="mx-auto block h-8 w-auto text-neutral-600 dark:text-neutral-300" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="currentColor">Tigo Pesa</text></svg>`,
    name: 'Tigo Pesa',
    href: '#',
  },
  {
    icon: `<svg class="mx-auto block h-8 w-auto text-neutral-600 dark:text-neutral-300" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="currentColor">Airtel Money</text></svg>`,
    name: 'Airtel Money',
    href: '#',
  },
  {
    icon: `<svg class="mx-auto block h-8 w-auto text-neutral-600 dark:text-neutral-300" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="currentColor">HaloPesa</text></svg>`,
    name: 'HaloPesa',
    href: '#',
  },
];