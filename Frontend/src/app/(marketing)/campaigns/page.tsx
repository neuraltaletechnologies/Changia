import type { Metadata } from 'next';
import PrimaryCTA from '@components/ui/buttons/PrimaryCTA';
import PublicCampaignCard from '@components/ui/cards/PublicCampaignCard';
import FeaturesStatsAlt from '@components/sections/features/FeaturesStatsAlt';
import TestimonialsSectionAlt from '@components/sections/testimonials/TestimonialsSectionAlt';
import { getPublicCampaigns, getPublicTestimonials } from '@/lib/public-campaigns';

export const metadata: Metadata = {
  title: 'Campaigns',
  description:
    'Browse active Changia campaigns and support one directly — medical bills, school fees, community projects and more.',
  openGraph: {
    title: 'Campaigns | Changia',
    description:
      'Browse active Changia campaigns and support one directly — medical bills, school fees, community projects and more.',
  },
};

const title = 'Campaigns';
const subTitle =
  "Every campaign below is live and organized by a verified Changia organization. Open one to read its story, see how the target breaks down, and contribute in a few taps.";

export default async function CampaignsIndexPage() {
  const [campaigns, testimonialRows] = await Promise.all([
    getPublicCampaigns(5),
    getPublicTestimonials('en'),
  ]);

  const testimonials = testimonialRows.map((t) => ({
    content: t.quote,
    author: t.author,
    role: t.role,
    avatarSrc: t.photoUrl,
    avatarAlt: t.author,
  }));

  return (
    <>
      <div className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
        <div className="mb-4 flex items-center justify-between gap-8 sm:mb-8 md:mb-12">
          <div className="flex items-center gap-12">
            <h1 className="text-2xl font-bold tracking-tight text-balance text-neutral-800 md:text-4xl md:leading-tight dark:text-neutral-200">
              {title}
            </h1>
            {subTitle ? (
              <p className="hidden max-w-(--breakpoint-sm) text-pretty text-neutral-600 md:block dark:text-neutral-400">
                {subTitle}
              </p>
            ) : null}
          </div>
          <PrimaryCTA title="Campaign Stories" url="#testimonials" noArrow />
        </div>

        {campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
            <p className="text-neutral-600 dark:text-neutral-400">
              No public campaigns are live right now — check back soon.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 xl:gap-8">
            {campaigns.map((campaign, index) => {
              const position = index % 4;
              return (
                <PublicCampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  wide={!(position === 0 || position === 3)}
                />
              );
            })}
          </section>
        )}
      </div>

      <FeaturesStatsAlt
        title="Why Choose Changia?"
        subTitle="Changia is built for Tanzanian mobile-money workflows from the ground up. Whether you're launching your first campaign or running a nation-wide appeal, the platform is engineered to convert willingness to help into completed payments."
        benefits={[
          'A secure, mobile-first foundation designed for low-bandwidth devices.',
          'Consent-aware donor management with opt-out controls.',
          'Verified callbacks and audit-ready records your donors can trust.',
        ]}
      />

      <TestimonialsSectionAlt title="What Campaign Owners Say" testimonials={testimonials} />
    </>
  );
}
