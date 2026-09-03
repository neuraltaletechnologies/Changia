import type { Metadata } from 'next';
import PrimaryCTA from '@components/ui/buttons/PrimaryCTA';
import PublicCampaignCard from '@components/ui/cards/PublicCampaignCard';
import FeaturesStatsAlt from '@components/sections/features/FeaturesStatsAlt';
import TestimonialsSectionAlt from '@components/sections/testimonials/TestimonialsSectionAlt';
import { getPublicCampaigns, getPublicTestimonials } from '@/lib/public-campaigns';

export const metadata: Metadata = {
  title: 'Kampeni',
  description:
    'Vinjari kampeni hai za Changia na uchangie moja kwa moja — ada za matibabu, karo za shule, miradi ya jamii na zaidi.',
  openGraph: {
    title: 'Kampeni | Changia',
    description:
      'Vinjari kampeni hai za Changia na uchangie moja kwa moja — ada za matibabu, karo za shule, miradi ya jamii na zaidi.',
  },
};

const title = 'Kampeni';
const subTitle =
  'Kila kampeni hapa chini iko hai na inasimamiwa na shirika lililothibitishwa na Changia. Fungua moja kusoma hadithi yake, ona jinsi lengo linavyogawanyika, na uchangie kwa mibofyo michache.';

export default async function SwahiliCampaignsIndexPage() {
  const [campaigns, testimonialRows] = await Promise.all([
    getPublicCampaigns(5, 'sw'),
    getPublicTestimonials('sw'),
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
          <PrimaryCTA title="Historia za kampeni" url="#testimonials" noArrow />
        </div>

        {campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
            <p className="text-neutral-600 dark:text-neutral-400">
              Hakuna kampeni za umma zinazoendelea kwa sasa — rudi hivi karibuni.
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
                  locale="sw"
                />
              );
            })}
          </section>
        )}
      </div>

      <FeaturesStatsAlt
        title="Kwa nini uchague Changia?"
        subTitle="Changia imeundwa tangu mwanzo kwa mtiririko wa kazi wa pesa za simu wa Tanzania. Ukiwa unazindua kampeni yako ya kwanza au kuendesha wito wa kitaifa, jukwaa limeundwa kubadilisha nia ya kusaidia kuwa malipo yaliyofanyika."
        benefits={[
          'Msingi salama wa mobile-first, unaofaa kwa mitandao yenye mawimbi dhaifu.',
          'Usimamizi wa wafadhili unaoheshimu ridhaa kwa vidhibiti vya kujiondoa.',
          'Callbacks zilizothibitishwa na rekodi zilizoandaliwa kwa ukaguzi ambazo wafadhili wako wanaweza kuziamini.',
        ]}
      />

      <TestimonialsSectionAlt
        title="Wamiliki wa kampeni wanasema nini"
        testimonials={testimonials}
      />
    </>
  );
}
