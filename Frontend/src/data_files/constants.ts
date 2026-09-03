import ogImageSrc from '@images/social.png';

export const SITE = {
  title: 'Changia',
  tagline: 'Bringing people together to help people in need — with money and the things that matter.',
  description:
    'Help someone. Change a life. Changia brings people together to support those facing medical emergencies, family crises, education needs, and challenges in our communities. Through mobile-money contributions, donated items, and in-kind support, every campaign turns goodwill into real help. Campaigns work through shareable links (SMS, WhatsApp, email, QR, social) or direct push payment requests from field managers to supporters who have already agreed to help. Donors never share their PIN with Changia — it is entered only in the secure gateway/mobile-money prompt. The platform is built for transparency: every campaign shows a public target, real-time progress, and an itemized service fee, and every contribution is confirmed only after a verified callback.',
  description_short:
    'Help someone. Change a life. Bringing people together to support what matters.',
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
  title: 'Changia | Help Someone. Change a Life.',
  description:
    'Help someone. Change a life. Changia brings people together to support medical emergencies, families, education, and community needs — with cash or in kind.',
  image: ogImageSrc,
};

// Mobile-money wallets Changia supports. Logo files live in
// `Frontend/public/payments/` — keep `logo` pointing at the real filename there.
export const partnersData = [
  {
    logo: '/payments/mpesa.svg',
    name: 'M-Pesa',
    href: '#',
  },
  {
    logo: '/payments/mix-by-yas.svg',
    name: 'Mixx by Yas',
    href: '#',
  },
  {
    logo: '/payments/airtel.svg',
    name: 'Airtel Money',
    href: '#',
  },
  {
    logo: '/payments/halotel.png',
    name: 'HaloPesa',
    href: '#',
  },
];