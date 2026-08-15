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
    'Changia ni shirika la kitanzania la ukusanyaji misaada. Kusanya fedha na ukusanye vitu vinavyohitajika kwa ajili ya kampeni zinazojalisha — michango ya mobile money ikiwa ni njia mojawapo ya kusaidia.',
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
        title="Tunapanga misaada kwa Tanzania — fedha na vitu kwa ajili ya jamii."
      />

      <HeroSection
        title='Ukusanyaji misaada unaokusanya <span class="text-yellow-500 dark:text-yellow-400">zaidi ya fedha</span>'
        subTitle="Changia ni shirika la kitanzania la ukusanyaji misaada. Wamiliki wa kampeni huunda ukurasa wazi, hushiriki kiungo, na kubadilisha nia ya jamii ya kusaidia kuwa msaada halisi — iwe mchango wa fedha au kitu kilichotolewa."
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
        title="Jukwaa moja kwa fedha na vitu"
        subTitle="Wafadhili hutoa kupitia pochi za mobile money wanazoziamini — na waandaaji wa kampeni huweza kuratibu vitu vilivyotolewa na msaada wa aina nyingine mahali pamoja."
        partners={partnersData}
      />

      <FeaturesGeneral
        title="Zaidi ya Fedha"
        subTitle="Ukusanyaji wa misaada mara nyingi hupoteza wafadhili kati ya nia na hatua. Changia hupunguza usumbufu huo kwa kurasa wazi za kampeni, viungo vinavyoweza kushirikiwa, ombi la malipo la moja kwa moja — na zana za kukusanya vitu vilivyotolewa na msaada wa aina nyingine pia."
        src={featureImage}
        alt="Dashibodi ya Changia kwenye kompyuta ya mkononi"
        features={features}
      />

      <FeaturesNavs
        title={'Moduli za <span class="text-yellow-500 dark:text-yellow-400">Changia</span> hupeleka kampeni kutoka wazo hadi athari halisi.'}
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
        title="Kubadilisha nia ya kusaidia kuwa msaada halisi"
        subTitle="Kutoka redio, SMS na WhatsApp kwa kiwango kikubwa hadi ukusanyaji wa mbugani unaoendeshwa na maafisa, Changia huunganisha nia na mchango — wa fedha na wa vitu."
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
        title="Tukusanye pamoja"
        subTitle="Changia ni shirika la kitanzania la ukusanyaji misaada: muhimu kwa mshirika wetu wa kwanza leo, na linaloweza kubadilika kesho kwa hospitali, makanisa, shule, NGO, vikundi vya jamii na watu binafsi — kukusanya fedha na vitu vinavyohitajika na jamii."
      />
    </>
  );
}
