import type { Metadata } from 'next';
import PrimaryCTA from '@components/ui/buttons/PrimaryCTA';
import CardSmall from '@components/ui/cards/CardSmall';
import CardWide from '@components/ui/cards/CardWide';
import FeaturesStatsAlt from '@components/sections/features/FeaturesStatsAlt';
import TestimonialsSectionAlt from '@components/sections/testimonials/TestimonialsSectionAlt';
import { getProductEntries } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Kampani',
  description:
    'Gundua kampani tatu za Campaign za Changia: jukwaa la msingi na hifadhidata ya wafadhili, usambazaji wa viungo vya kampeni na mchango wa kusukuma wa papo hapo.',
  openGraph: {
    title: 'Kampani za Campaign za Changia | Changia',
    description:
      'Gundua kampani tatu za Campaign za Changia: jukwaa la msingi na hifadhidata ya wafadhili, usambazaji wa viungo vya kampeni na mchango wa kusukuma wa papo hapo.',
  },
};

const title = 'Kampani';
const subTitle =
  "Gundua kampani tatu huru na za kulipwa za Campaign ya Changia. Kila kampani inatoa matokeo muhimu — kutoka jukwaa salama la msingi na hifadhidata ya wafadhili hadi usambazaji wa viungo vya kampeni na michango inayoendeshwa na maafisa.";

const testimonials = [
  {
    content:
      "Kama mshirika wa uzinduzi, tuliweza kuanzisha dashibodi salama, kusimamia watumiaji kwa majukumu na kuweka hifadhidata ya wafadhili iliyoandaliwa kwa ukaguzi tangu siku ya kwanza. Kampani 1 ilitupa msingi wa kuendesha kampeni za kuaminika.",
    author: 'Dr Msuya',
    role: 'Msimamizi wa shirika | Mshirika wa awali wa uzinduzi',
    avatarSrc:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Maelezo ya picha',
  },
  {
    content:
      "Kwa kampani ya usambazaji wa viungo, tunawageuza wasikilizaji wa redio na WhatsApp kuwa wafadhili. Kiungo kifupi, msimbo wa QR na ukurasa wa kampeni wa simu — tangu TZS 100 — na kila mchango uliothibitishwa husasisha upau wa maendeleo.",
    author: 'Amadi Kimaro',
    role: 'Afisa wa kampeni | Mfuko wa afya wa jamii',
    avatarSrc:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1376&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Maelezo ya picha',
  },
  {
    content:
      "Mchango wa kusukuma wa papo hapo ni uvumbuzi tuliokuwa tukiusubiri. Baada ya mazungumzo ana kwa ana na makubaliano, mfadhili anapokea ombi la malipo la moja kwa moja na kuthibitisha kwa PIN yake mwenyewe. Callbacks zilizothibitishwa zinahakikisha jumla sahihi daima.",
    author: 'Neema Mushi',
    role: 'Msimamizi wa ukusanyaji wa mbugani',
    avatarSrc:
      'https://images.unsplash.com/photo-1474176857210-7287d38d27c6?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Maelezo ya picha',
  },
];

export default function SwahiliProductsIndexPage() {
  const product = getProductEntries('sw').sort(
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
          <PrimaryCTA title="Historia za kampeni" url="#testimonials" noArrow />
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 xl:gap-8">
          {product.map((p, index) => {
            const position = index % 4;
            if (position === 0 || position === 3) {
              return <CardSmall key={p.id} product={p} productLocale="sw" />;
            }
            return <CardWide key={p.id} product={p} productLocale="sw" />;
          })}
        </section>
      </div>

      <FeaturesStatsAlt
        title="Kwa nini uchague Changia?"
        subTitle="Changia imeundwa tangu mwanzo kwa mtiririko wa kazi wa All money transfer wa Tanzania. Ukiwa unazindua kampeni yako ya kwanza au kuendesha wito wa kitaifa, jukwaa limeundwa kubadilisha nia ya kusaidia kuwa malipo yaliyofanyika."
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
