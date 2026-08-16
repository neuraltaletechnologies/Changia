import HeroSection from '@components/sections/landing/HeroSection';
import HeroSectionAlt from '@components/sections/landing/HeroSectionAlt';
import ClientsSection from '@components/sections/landing/ClientsSection';
import FeaturesGeneral from '@components/sections/features/FeaturesGeneral';
import FeaturesNavs from '@components/sections/features/FeaturesNavs';
import TestimonialsSection from '@components/sections/testimonials/TestimonialsSection';
import PricingSection from '@components/sections/pricing/PricingSection';
import FAQ from '@components/sections/misc/FAQ';
import AnnouncementBanner from '@components/ui/banners/AnnouncementBanner';
import heroImage from '@images/hero-image.avif';
import faqs from '@data/sw/faqs.json';
import features from '@data/sw/features.json';
import pricing from '@data/sw/pricing.json';
import featureImage from '@images/features-image.avif';
import construction from '@images/construction-image.avif';
import tools from '@images/automated-tools.avif';
import dashboard from '@images/dashboard-image.avif';
import { partnersData } from '@/data_files/constants';

export const metadata = {
  title: 'Changia',
  description:
    'Kuna mtu anahitaji msaada leo. Unaweza kuwa sehemu ya jibu. Changia inaleta watu pamoja — kuwaunganisha wanaohitaji msaada na wale walio tayari kusaidia, kwa fedha au kwa vitu.',
};

const avatarSrcs: string[] = [
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1531927557220-a9e23c1e4794?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&&auto=format&fit=facearea&facepad=3&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
];

export default function SwahiliHomePage() {
  return (
    <>
      <AnnouncementBanner
        btnId="dismiss-button"
        btnTitle="Chunguza jukwaa"
        url="/sw/campaigns"
        title="Kuna mtu anahitaji msaada leo. Unaweza kuwa sehemu ya jibu."
      />

      <HeroSection
        title='Tunaleta watu pamoja kusaidia watu <span class="text-blue-600 dark:text-blue-400">wanahitaji msaada</span>'
        subTitle="Changia inawaunganisha wanaohitaji msaada — iwe ni dharura ya matibabu, elimu, mgogoro wa kifamilia, au hitaji la jamii — na watu walio tayari kusaidia. Kwa fedha, kwa vitu, au zote mbili."
        primaryBtn="Anzisha kampeni ya misaada"
        primaryBtnURL="/login?redirect=%2Fdashboard%2FCampaigns%2Fnew"
        secondaryBtn="Chunguza kampani"
        secondaryBtnURL="/sw/campaigns"
        withReview
        avatars={avatarSrcs}
        rating='<span class="font-bold">TZS 100</span>'
        starCount={4}
        reviews="mchango wa chini zaidi kwenye kila kampeni ya Changia"
        src={heroImage}
        alt="Ukurasa wa kampeni ya Changia unaoonekana kwenye simu"
      />

      <ClientsSection
        title="Unganisha watu wanaohitaji msaada na watu wanaotaka kusaidia"
        subTitle="Kupitia pochi za mobile money wanazoziamini, wasaidizi hutoa wanachoweza. Waandaaji wa kampeni huratibu vitu vilivyotolewa na msaada wa aina nyingine pia — mahali pamoja, kwa sababu moja."
        partners={partnersData}
      />

      <FeaturesGeneral
        title="Kila mchango — fedha au kitu — unaleta mabadiliko"
        subTitle="Iwe ni bili ya matibabu, ada ya shule, au chakula na nguo kwa familia, Changia hurahisisha kusaidia. Waandaaji hushiriki ukurasa, wasaidizi hutoa kwa fedha au kuacha vitu vinavyohitajika — na maisha ya mtu yanabadilika."
        src={featureImage}
        alt="Dashibodi ya Changia kwenye kompyuta ya mkononi"
        features={features}
      />

      <FeaturesNavs
        title={'Moduli za <span class="text-blue-600 dark:text-blue-400">Changia</span> zinazogeuza nia njema kuwa msaada halisi.'}
        tabs={[
          {
            heading: 'Jukwaa la msingi na hifadhidata ya wafadhili',
            content:
              "Msingi salama na wenye mwitikio kwa wasimamizi, maafisa na wafadhili — kwa ufikiaji kwa majukumu, dashibodi, jarida la ukaguzi na CRM ya wafadhili inayoheshimu ridhaa.",
            svg: 'tools',
            src: tools,
            alt: "Nafasi ya kazi ya dashibodi ya usimamizi ya Changia",
            first: true,
          },
          {
            heading: 'Usambazaji wa viungo vya kampeni',
            content:
              "Unda kampeni, weka kiasi kinachohitajika au orodhesha vitu unavyohitaji, tengeneza kiungo kifupi na msimbo wa QR, kisha sambaza SMS, WhatsApp au barua pepe zilizoidhinishwa kwa wafadhili au njia za umma.",
            svg: 'dashboard',
            src: dashboard,
            alt: 'Ukurasa wa kampeni ya Changia wenye upau wa maendeleo na chaguo za mchango',
            second: true,
          },
          {
            heading: 'Mchango wa fedha na wa vitu',
            content:
              "Wafadhili wanaweza kuchangia fedha kupitia ombi la malipo la moja kwa moja wanalolithibitisha kwa PIN yao — na wasimamizi wa kampeni wanaweza kufuatilia vitu, bidhaa na msaada wa aina nyingine, huku kila mchango uliothibitishwa ukisasisha kampeni mara moja tu.",
            svg: 'house',
            src: construction,
            alt: 'Mkusanyaji wa mbugani akithibitisha ombi la mchango kwenye simu',
          },
        ]}
      />

      <TestimonialsSection
        title="Hadithi halisi za watu kusaidia watu"
        subTitle="Kutoka fedha za dharura za matibabu hadi misaada ya vifaa vya shule, Changia hugeuza nia njema kuwa msaada halisi — kuwaunganisha wanaohitaji na watu wanaojali."
        testimonials={[
          {
            content:
              "Tuliendesha Mfuko wa Upasuaji wa Watoto kwa lengo la umma la TZS 10 500 000 — kiasi kilichopangwa cha 10 000 000 pamoja na ada ya Changia ya 5%. Kila mchango hukisiwa kwa thamani yake kamili na wafadhili hupokea risiti pamoja na taarifa za moja kwa moja. Ukusanyaji unaojenga imani.",
            author: 'Dr Msuya',
            role: 'Mshirika wa awali wa uzinduzi',
            avatarSrc:
              'https://images.unsplash.com/photo-1593104547489-5cfb3839a3b5?q=80&w=1453&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
          },
        ]}
        statistics={[
          {
            count: 'TZS 100',
            description: 'mchango wa chini zaidi kwenye kila kampeni ya Changia',
          },
          {
            count: '5%',
            description: 'ada ya huduma kwenye kiwango cha kampeni',
          },
          {
            count: '99%',
            description: 'Kampeni, zinazotolewa na kulipwa kwa kujitegemea',
          },
          {
            count: '10+',
            description: 'Kampeni zilizoundwa kwa Meneja mmoja',
          },
        ]}
      />

      <PricingSection pricing={pricing} />

      <FAQ title="Maswali yanayoulizwa<br />mara kwa mara" faqs={faqs} />

      <HeroSectionAlt
        title="Kuna mtu anahitaji msaada leo. Unaweza kuwa sehemu ya jibu."
        subTitle="Iwe ni dharura ya matibabu, elimu ya mtoto, mgogoro wa kifamilia, au jamii inayohitaji — Changia inakuunganisha na watu wanaojali. Anzisha Kampeni, shiriki kiungo, na tazama nia njema ikigeuka kuwa msaada halisi. Kwa fedha, kwa vitu, au zote mbili."
      />
    </>
  );
}
