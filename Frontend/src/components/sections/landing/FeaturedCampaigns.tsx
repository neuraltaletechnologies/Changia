'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/icons/Icon';
import { formatTZS, type Locale, type PublicCampaign } from '@/lib/public-campaigns';

type FeaturedCampaignsProps = {
  title?: string;
  campaigns: PublicCampaign[];
  locale?: Locale;
};

const ROTATE_MS = 3000;
const NAV_ICONS = ['house', 'community', 'shield'];

const NAV_BUTTON_CLASS =
  'dark:hover:bg-neutral-700 rounded-xl p-4 text-start outline-hidden ring-zinc-500 transition duration-300 hover:bg-neutral-200 focus-visible:ring-3 dark:ring-zinc-200 dark:focus:outline-hidden md:p-5';

const STRINGS = {
  en: {
    fallback: 'Help this campaign reach its target — every contribution is credited in full.',
    raisedOf: 'raised of',
    funded: 'funded',
    viewLabel: 'View the',
    campaign: 'campaign',
  },
  sw: {
    fallback: 'Msaidie kampeni hii kufikia lengo lake — kila mchango unahesabiwa kwa ukamilifu.',
    raisedOf: 'zimekusanywa kati ya lengo la',
    funded: 'limefikiwa',
    viewLabel: 'Angalia kampeni ya',
    campaign: '',
  },
} as const;

function excerpt(story: string | null, fallback: string, max = 140): string {
  if (!story) return fallback;
  const clean = story.trim().replace(/\s+/g, ' ');
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export default function FeaturedCampaigns({ title, campaigns, locale = 'en' }: FeaturedCampaignsProps) {
  const t = STRINGS[locale];
  const campaignHref = (slug: string) => (locale === 'sw' ? `/sw/campaigns/${slug}` : `/campaigns/${slug}`);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (campaigns.length < 2) return;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      setActive((prev) => (prev + 1) % campaigns.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [campaigns.length]);

  if (campaigns.length === 0) return null;

  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
      <div
        className="relative p-6 md:p-16"
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
      >
        <div className="relative z-10 lg:grid lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="mb-10 lg:order-2 lg:col-span-6 lg:col-start-8 lg:mb-0">
            <h2
              className="text-2xl font-bold text-neutral-800 sm:text-3xl dark:text-neutral-200"
              dangerouslySetInnerHTML={{ __html: title || '' }}
            />
            <nav className="mt-5 grid gap-4 md:mt-10" aria-label="Featured campaigns" role="tablist">
              {campaigns.map((campaign, index) => {
                const isActive = index === active;
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActive(index)}
                    className={`${NAV_BUTTON_CLASS} ${
                      isActive ? 'bg-neutral-50 shadow-md hover:border-transparent dark:bg-neutral-700/60' : ''
                    }`}
                  >
                    <span className="flex">
                      <Icon name={NAV_ICONS[index % NAV_ICONS.length]} />
                      <span className="ms-6 grow">
                        <span
                          className={`block text-lg font-bold ${
                            isActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {campaign.name}
                        </span>
                        <span
                          className={`mt-1 block ${
                            isActive
                              ? 'text-neutral-600 dark:text-neutral-200'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {excerpt(campaign.story, t.fallback)} {formatTZS(campaign.raisedAmount)}{' '}
                          {t.raisedOf} {formatTZS(campaign.publicTarget)} ({campaign.progressPercent}%{' '}
                          {t.funded}).
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="lg:col-span-6">
            <div className="relative">
              <div>
                {campaigns.map((campaign, index) => (
                  <Link
                    key={campaign.id}
                    href={campaignHref(campaign.slug)}
                    className={index === active ? 'block' : 'hidden'}
                    aria-label={`${t.viewLabel} ${campaign.name} ${t.campaign}`.trim()}
                  >
                    {campaign.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={campaign.imageUrl}
                        alt={campaign.name}
                        className="aspect-video w-full rounded-xl object-cover shadow-xl shadow-neutral-200 lg:aspect-square dark:shadow-neutral-900/[.2]"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-linear-to-br from-emerald-100 to-blue-100 shadow-xl shadow-neutral-200 lg:aspect-square dark:from-emerald-900/40 dark:to-blue-900/40 dark:shadow-neutral-900/[.2]">
                        <Icon
                          name={NAV_ICONS[index % NAV_ICONS.length]}
                          className="h-16 w-16 text-emerald-600/60 dark:text-emerald-400/60"
                        />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 grid h-full w-full grid-cols-12">
          <div className="col-span-full h-5/6 w-full rounded-xl bg-neutral-100 sm:h-3/4 lg:col-span-7 lg:col-start-6 lg:h-full dark:bg-white/[.075]" />
        </div>
      </div>
    </section>
  );
}
