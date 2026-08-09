'use client';

import { usePathname } from 'next/navigation';
import FooterSocialLink from '@/components/ui/links/FooterSocialLink';
import EmailFooterInput from '@/components/ui/forms/input/EmailFooterInput';
import Icon from '@/components/ui/icons/Icon';
import BrandLogo from '@/components/BrandLogo';
import enStrings from '@/utils/navigation';
import frStrings from '@/utils/fr/navigation';
import { SITE } from '@/data_files/constants';

export default function FooterSection() {
  const pathname = usePathname();
  const isFr = pathname?.startsWith('/fr');
  const strings = isFr ? frStrings : enStrings;

  const sectionThreeTitle = isFr ? 'Rester à jour' : 'Stay up to date';
  const sectionThreeContent = isFr
    ? 'Restez informé des derniers outils et des offres exclusives.'
    : 'Stay updated with the latest tools and exclusive deals.';
  const crafted = isFr ? 'Fabriqué par' : 'Crafted by';
  const hiring = isFr ? "Nous recrutons !" : "We're hiring!";

  return (
    <footer className="w-full bg-neutral-300 dark:bg-neutral-900">
      <div className="mx-auto w-full max-w-[85rem] px-4 py-10 sm:px-6 lg:px-16 lg:pt-20 2xl:max-w-(--breakpoint-2xl)">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-full lg:col-span-1">
            <BrandLogo className="h-auto w-32" />
          </div>

          {strings.footerLinks.map((section) => (
            <div key={section.section} className="col-span-1">
              <h3 className="font-bold text-neutral-800 dark:text-neutral-200">
                {section.section}
              </h3>
              <ul className="mt-3 grid space-y-3">
                {section.links.map((link, index) => (
                  <li key={link.url + link.name}>
                    <a
                      href={link.url}
                      className="inline-flex gap-x-2 rounded-lg text-neutral-600 ring-zinc-500 outline-hidden transition duration-300 hover:text-neutral-500 focus-visible:ring-3 dark:text-neutral-400 dark:ring-zinc-200 dark:hover:text-neutral-300 dark:focus:outline-hidden"
                    >
                      {link.name}
                    </a>
                    {section.section === 'Company' && index === 2 ? (
                      <span className="ms-1 inline rounded-lg bg-orange-500 px-2 py-1 text-xs font-bold text-neutral-50">
                        {hiring}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2">
            <h3 className="font-bold text-neutral-800 dark:text-neutral-200">
              {sectionThreeTitle}
            </h3>
            <form onSubmit={(e) => e.preventDefault()}>
              <EmailFooterInput />
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                {sectionThreeContent}
              </p>
            </form>
          </div>
        </div>

        <div className="mt-9 grid gap-y-2 sm:mt-12 sm:flex sm:items-center sm:justify-between sm:gap-y-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              © {new Date().getFullYear()} {SITE.title}. {crafted}{' '}
              <a
                className="rounded-lg font-medium underline underline-offset-2 ring-zinc-500 outline-hidden transition duration-300 hover:text-neutral-700 hover:decoration-dashed focus:outline-hidden focus-visible:ring-3 dark:ring-zinc-200 dark:hover:text-neutral-300"
                href="https://github.com/mearashadowfax"
                rel="noopener noreferrer"
              >
                Gulamov
              </a>{' '}
              • Distributed by{' '}
              <a
                className="rounded-lg font-medium ring-zinc-500 outline-hidden transition duration-300 hover:text-neutral-700 hover:decoration-dashed focus:outline-hidden focus-visible:ring-3 dark:ring-zinc-200 dark:hover:text-neutral-300 underline"
                href="https://themewagon.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                ThemeWagon
              </a>
              .
            </p>
          </div>

          <div>
            <FooterSocialLink url={strings.socialLinks.facebook}>
              <Icon name="facebookFooter" />
            </FooterSocialLink>
            <FooterSocialLink url={strings.socialLinks.x}>
              <Icon name="xFooter" />
            </FooterSocialLink>
            <FooterSocialLink url={strings.socialLinks.github}>
              <Icon name="githubFooter" />
            </FooterSocialLink>
            <FooterSocialLink url={strings.socialLinks.google}>
              <Icon name="googleFooter" />
            </FooterSocialLink>
            <FooterSocialLink url={strings.socialLinks.slack}>
              <Icon name="slackFooter" />
            </FooterSocialLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
