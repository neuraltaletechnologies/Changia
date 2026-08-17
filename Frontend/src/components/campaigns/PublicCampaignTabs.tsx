'use client';

import { useState } from 'react';
import DonateWidget from './DonateWidget';
import { formatTZS, type Locale, type PublicCampaignDetail } from '@/lib/public-campaigns';

type PublicCampaignTabsProps = {
  campaign: PublicCampaignDetail;
  locale?: Locale;
};

const STRINGS = {
  en: {
    tabs: ['Description', 'Scope', 'Acceptance'],
    aboutTitle: 'About this campaign',
    noStory: 'This organization has not added a longer story yet.',
    organizedBy: 'Organized by',
    verifiedOrg: 'A verified Changia organization',
    category: 'Category',
    generalCategory: 'General',
    goal: 'Goal',
    goalText: (goal: string, pct: number, fee: string, target: string) =>
      `${goal} purpose amount, plus a ${pct}% Changia service fee (${fee}) — a ${target} public target in total.`,
    timeline: 'Timeline',
    ongoing: 'Ongoing',
    minContribution: 'Minimum contribution',
    minContributionText: (min: string) => `${min} per contribution.`,
    progress: 'Progress so far',
    progressText: (raised: string, donors: number, pct: number) =>
      `${raised} raised from ${donors} donor${donors === 1 ? '' : 's'} — ${pct}% funded.`,
    remaining: 'Remaining to reach target',
    status: 'Status',
    activeStatus: 'Accepting contributions now.',
    completedStatus: 'Campaign completed.',
    acceptanceTitle: 'How a contribution is accepted',
    acceptancePoints: [
      "Changia never stores or asks for your mobile-money PIN — you approve every payment at your operator's own prompt.",
      'A contribution is only confirmed after a verified gateway callback, so it is counted exactly once.',
      'Every confirmed contribution is credited at full face value with a receipt.',
    ],
    recentSupporters: 'Recent supporters',
    beFirst: 'Be the first to contribute to this campaign.',
    anonymous: 'Anonymous',
  },
  sw: {
    tabs: ['Maelezo', 'Wigo', 'Ukubalifu'],
    aboutTitle: 'Kuhusu kampeni hii',
    noStory: 'Shirika hili bado halijaongeza hadithi ndefu zaidi.',
    organizedBy: 'Imeandaliwa na',
    verifiedOrg: 'Shirika lililothibitishwa la Changia',
    category: 'Jamii',
    generalCategory: 'Jumla',
    goal: 'Lengo',
    goalText: (goal: string, pct: number, fee: string, target: string) =>
      `${goal} kiasi cha lengo, pamoja na ada ya huduma ya Changia ya ${pct}% (${fee}) — jumla ya lengo la umma la ${target}.`,
    timeline: 'Muda',
    ongoing: 'Inaendelea',
    minContribution: 'Mchango wa chini',
    minContributionText: (min: string) => `${min} kwa kila mchango.`,
    progress: 'Maendeleo hadi sasa',
    progressText: (raised: string, donors: number, pct: number) =>
      `${raised} zimekusanywa kutoka kwa wafadhili ${donors} — ${pct}% limefikiwa.`,
    remaining: 'Kilichobaki kufikia lengo',
    status: 'Hali',
    activeStatus: 'Inapokea michango sasa.',
    completedStatus: 'Kampeni imekamilika.',
    acceptanceTitle: 'Jinsi mchango unavyokubaliwa',
    acceptancePoints: [
      'Changia haihifadhi wala haiombi PIN yako ya pesa za simu — unathibitisha kila malipo kwenye ombi la mtoa huduma wako mwenyewe.',
      'Mchango unathibitishwa tu baada ya uthibitisho wa mlango uliohakikiwa, hivyo unahesabiwa mara moja tu.',
      'Kila mchango uliothibitishwa unahesabiwa kwa thamani yake kamili na risiti.',
    ],
    recentSupporters: 'Wafadhili wa hivi karibuni',
    beFirst: 'Kuwa wa kwanza kuchangia kampeni hii.',
    anonymous: 'Bila jina',
  },
} as const;

function formatDate(value: string | null, locale: Locale, ongoing: string): string {
  if (!value) return ongoing;
  return new Date(value).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-TZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PublicCampaignTabs({ campaign, locale = 'en' }: PublicCampaignTabsProps) {
  const [active, setActive] = useState(0);
  const t = STRINGS[locale];

  return (
    <div className="mx-auto max-w-[85rem] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <nav
        className="mx-auto grid max-w-6xl gap-y-px sm:flex sm:gap-x-4 sm:gap-y-0"
        aria-label="Tabs"
        role="tablist"
      >
        {t.tabs.map((title, index) => {
          const isActive = index === active;
          return (
            <button
              key={title}
              type="button"
              onClick={() => setActive(index)}
              role="tab"
              aria-selected={isActive}
              className={`flex w-full justify-center rounded-xl border border-transparent p-3 outline-hidden ring-zinc-500 transition duration-300 hover:bg-neutral-100 focus-visible:ring-3 dark:ring-zinc-200 dark:hover:bg-neutral-700 dark:focus:outline-hidden md:p-5 ${
                isActive ? 'bg-neutral-100 hover:border-transparent dark:bg-white/[.05]' : ''
              }`}
            >
              <span
                className={`block text-center font-bold ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-800 dark:text-neutral-200'
                }`}
              >
                {title}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mx-auto max-w-[85rem] px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-14 md:mt-4">
        {active === 0 && (
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                {t.aboutTitle}
              </h2>
              <p className="mt-4 text-lg text-pretty text-neutral-700 dark:text-neutral-300">
                {campaign.story || t.noStory}
              </p>
              <div className="mt-6">
                <DonateWidget
                  campaignSlug={campaign.slug}
                  minimumAmount={campaign.minimumAmount}
                  remaining={campaign.remaining}
                  locale={locale}
                />
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                  {t.organizedBy}
                </h3>
                <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                  {campaign.organizationName || t.verifiedOrg}
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                  {t.category}
                </h3>
                <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                  {campaign.category || t.generalCategory}
                </p>
              </div>
            </div>
          </div>
        )}

        {active === 1 && (
          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">{t.goal}</h3>
                <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                  {t.goalText(
                    formatTZS(campaign.goalAmount),
                    campaign.serviceFeePercent,
                    formatTZS(campaign.serviceFeeAmount),
                    formatTZS(campaign.publicTarget)
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                  {t.timeline}
                </h3>
                <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                  {formatDate(campaign.startDate, locale, t.ongoing)} →{' '}
                  {formatDate(campaign.endDate, locale, t.ongoing)}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                  {t.minContribution}
                </h3>
                <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                  {t.minContributionText(formatTZS(campaign.minimumAmount))}
                </p>
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                  {t.progress}
                </h3>
                <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                  {t.progressText(
                    formatTZS(campaign.raisedAmount),
                    campaign.donorCount,
                    campaign.progressPercent
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                  {t.remaining}
                </h3>
                <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                  {formatTZS(campaign.remaining)}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">{t.status}</h3>
                <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                  {campaign.status === 'ACTIVE' ? t.activeStatus : t.completedStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        {active === 2 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl bg-neutral-50 p-6 dark:bg-white/[.05]">
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                {t.acceptanceTitle}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-pretty text-neutral-600 dark:text-neutral-400">
                {t.acceptancePoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-neutral-50 p-6 dark:bg-white/[.05]">
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                {t.recentSupporters}
              </h3>
              {campaign.recentDonations.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{t.beFirst}</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {campaign.recentDonations.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between border-b border-neutral-200 pb-2 text-sm last:border-0 dark:border-neutral-700"
                    >
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {d.donorName || t.anonymous}
                      </span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {formatTZS(d.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
