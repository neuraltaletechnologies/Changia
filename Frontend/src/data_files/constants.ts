import ogImageSrc from '@images/social.png';

export const SITE = {
  title: 'Changia',
  tagline: 'Bringing people together to help people in need — with money and the things that matter.',
  description:
    'Changia brings people together. We connect those who need help — whether it\'s a medical emergency, education, a family crisis, or a community need — with people who are willing to give. Through mobile-money contributions, donated items, and in-kind support, every Campaign turns goodwill into real help. Campaigns work through shareable links (SMS, WhatsApp, email, QR, social) or direct push payment requests from field managers to supporters who have already agreed to help. Donors never share their PIN with Changia — it is entered only in the secure gateway/mobile-money prompt. The platform is built for transparency: every Campaign shows a public target, real-time progress, and an itemized service fee, and every donation is confirmed only after a verified callback.',
  description_short:
    'Bringing people together to help people in need. Someone needs help today — you can be part of the answer.',
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
  title: 'Changia | Bringing people together to help people in need',
  description:
    'Someone needs help today. You can be part of the answer. Changia connects people who need help — medical, education, family, community — with people who are willing to give, in cash or in kind.',
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