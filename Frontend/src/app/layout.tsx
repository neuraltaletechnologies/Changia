import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/assets/styles/global.css';
import { SITE } from '@/data_files/constants';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://changia.org.tz'),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.title}`,
  },
  description: SITE.description,
  authors: [{ name: SITE.author }],
  creator: SITE.author,
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: `${SITE.title}: Help Someone. Change a Life.`,
    description: SITE.description,
    siteName: SITE.title,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.title}: Help Someone. Change a Life.`,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#facc15',
};

const themeInitScript = `
(function () {
  if (
    localStorage.getItem('hs_theme') === 'dark' ||
    (!('hs_theme' in localStorage) &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  document.documentElement.classList.add('scrollbar-hide', 'lenis', 'lenis-smooth', 'scroll-pt-16');
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} scrollbar-hide lenis lenis-smooth scroll-pt-16`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
