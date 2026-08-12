import type { Metadata } from 'next';
import PrimaryCTA from '@components/ui/buttons/PrimaryCTA';
import CardSmall from '@components/ui/cards/CardSmall';
import CardWide from '@components/ui/cards/CardWide';
import FeaturesStatsAlt from '@components/sections/features/FeaturesStatsAlt';
import TestimonialsSectionAlt from '@components/sections/testimonials/TestimonialsSectionAlt';
import { getCampaignEntries } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Campaigns',
  description:
    'Explore The three Modules of the Changia Campaign: Core Platform & Donor Pool, Campaign  Link Distribution and Instant Push Donation.',
  openGraph: {
    title: 'Changia Campaign Campaigns | Changia',
    description:
      'Explore The three Modules of the Changia Campaign: Core Platform & Donor Pool, Campaign  Link Distribution and Instant Push Donation.',
  },
};

const title = 'Campaigns';
const subTitle =
  'Explore the three independent, payable Campaigns of the Changia Campaign. Each Campaign delivers a primary outcome — from a secure core platform and donor pool to Campaign  link distribution and manager-led push donations.';

const testimonials = [
  {
    content:
      'As our launch partner, we could set up a secure dashboard, manage users by role, and keep an audit-ready donor pool from day one. Campaign 1 gave us the foundation we needed to run Campaigns people can trust.',
    author: 'Dr. Msuya',
    role: 'Organization Administrator | Initial Launch Partner',
    avatarSrc:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Image Description',
  },
  {
    content:
      'With the Campaign  link Campaign, we turn radio and WhatsApp listeners into donors. A short link, a QR code and a mobile-first Campaign  page — from TZS 100 — and every verified contribution updates the progress bar.',
    author: 'Amadi Kimaro',
    role: 'Campaign  Manager | Community Health Fund',
    avatarSrc:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1376&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Image Description',
  },
  {
    content:
      "The instant push donation is the innovation we've been waiting for. After a face-to-face conversation and agreement, the donor receives a direct payment request and confirms with their own PIN. Verified callbacks mean our totals are always exact.",
    author: 'Neema Mushi',
    role: 'Field Fundraising Lead',
    avatarSrc:
      'https://images.unsplash.com/photo-1474176857210-7287d38d27c6?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Image Description',
  },
];

export default function CampaignsIndexPage() {
  const campaign = getCampaignEntries('en').sort(
    (a, b) => a.data.main.id - b.data.main.id
  );

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
          <PrimaryCTA title="Campaign  Stories" url="#testimonials" noArrow />
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 xl:gap-8">
          {campaign.map((p, index) => {
            const position = index % 4;
            if (position === 0 || position === 3) {
              return <CardSmall key={p.id} campaign={p} />;
            }
            return <CardWide key={p.id} campaign={p} />;
          })}
        </section>
      </div>

      <FeaturesStatsAlt
        title="Why Choose Changia?"
        subTitle="Changia is built for Tanzanian mobile-money workflows from the ground up. Whether you're launching your first Campaign  or running a nation-wide appeal, the platform is engineered to convert willingness to help into completed payments."
        benefits={[
          'A secure, mobile-first foundation designed for low-bandwidth devices.',
          'Consent-aware donor management with opt-out controls.',
          'Verified callbacks and audit-ready records your donors can trust.',
        ]}
      />

      <TestimonialsSectionAlt title="What Campaign  Owners Say" testimonials={testimonials} />
    </>
  );
}
