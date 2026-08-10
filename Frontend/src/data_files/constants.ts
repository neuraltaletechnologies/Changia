import ogImageSrc from '@images/social.png';

export const SITE = {
  title: 'Changia',
  tagline: 'Tanzania-first Mobile-Money Fundraising',
  description:
    'Changia is a Tanzania-first, mobile-money-first digital fundraising platform that helps people and organizations collect small contributions with less friction — with verified callbacks, transparent fees and audit-ready records.',
  description_short:
    'Tanzania-first, mobile-money-first digital fundraising platform for simple, transparent, auditable contributions.',
  url: 'https://changia.co',
  author: 'Changia Development Team',
};

export const SEO = {
  title: SITE.title,
  description: SITE.description,
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    inLanguage: 'en-US',
    '@id': 'https://changia.co',
    url: 'https://changia.co',
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
  url: 'https://changia.co',
  title: 'Changia | Digital Fundraising & Mobile Money Contribution Platform',
  description:
    'A Tanzania-first, mobile-money-first platform for simple, transparent, auditable fundraising. Create a campaign, share a link, and collect small contributions with less friction.',
  image: ogImageSrc,
};

export const partnersData = [
 
  {
    icon: `<span class="mx-auto block rounded-xl border border-neutral-300 bg-white px-4 py-3 text-center text-lg font-bold text-neutral-600 sm:mx-0 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">Mobile Money</span>`,
    name: 'Mobile Money',
    href: '#',
  },
  {
    icon: `<span class="mx-auto block rounded-xl border border-neutral-300 bg-white px-4 py-3 text-center text-lg font-bold text-neutral-600 sm:mx-0 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">Bank</span>`,
    name: 'Bank',
    href: '#',
  },{
    icon: `<span class="mx-auto block rounded-xl border border-neutral-300 bg-white px-4 py-3 text-center text-lg font-bold text-neutral-600 sm:mx-0 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">AzamPay</span>`,
    name: 'AzamPay',
    href: '#',
  },
];