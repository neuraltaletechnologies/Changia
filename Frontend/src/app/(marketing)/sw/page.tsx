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
    'Changia ni jukwaa la kitanzania la ukusanyaji fedha wa kidijitali, linaloongozwa na mobile money. Unda kampeni, shiriki kiungo na kusanya michango ya mobile money kwa usumbufu mdogo.',
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
        url="/sw/products"
        title="Tunajenga jukwaa la kitanzania la ukusanyaji fedha, mobile money kwanza."
      />

      <HeroSection
        title='Kusanya michango midogo ya mobile money kwa <span class="text-yellow-500 dark:text-yellow-400">usumbufu mdogo</span>'
        subTitle="Changia ni jukwaa la kitanzania la ukusanyaji fedha, mobile money kwanza. Wamiliki wa kampeni huunda ukurasa wazi, hushiriki kiungo, na kubadilisha nia ya mfadhili ya kusaidia kuwa malipo yaliyofanyika."
        primaryBtn="Anzisha kampeni"
        primaryBtnURL="/sw/contact"
        secondaryBtn="Chunguza moduli"
        secondaryBtnURL="/sw/products"
        withReview
        avatars={avatarSrcs}
        rating='<span class="font-bold">TZS 1 000</span>'
        starCount={4}
        reviews="mchango wa chini zaidi kwenye kila kampeni ya Changia"
        src={heroImage}
        alt="Ukurasa wa kampeni ya Changia unaoonekana kwenye simu"
      />

      <ClientsSection
        title="Inafanya kazi na mobile money ambayo wafadhili wako tayari wanaitumia"
        subTitle="Wafadhili hutoa kutoka simu yoyote ya mkononi na kuthibitisha kwa PIN yao wenyewe kwenye ombi la lango wanaloliamini."
        partners={partnersData}
      />

      <FeaturesGeneral
        title="Njia rahisi ya kutoa"
        subTitle="Ukusanyaji wa fedha mara nyingi hupoteza wafadhili kati ya nia na malipo. Changia hupunguza usumbufu huo kwa kurasa wazi za kampeni, viungo vinavyoweza kushirikiwa na ombi la malipo la moja kwa moja."
        src={featureImage}
        alt="Dashibodi ya Changia kwenye kompyuta ya mkononi"
        features={features}
      />

      <FeaturesNavs
        title={'Moduli tatu za MVP za <span class="text-yellow-500 dark:text-yellow-400">Changia</span> hupeleka kampeni kutoka wazo hadi malipo yaliyofanyika.'}
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
              "Unda kampeni, weka kiasi kinachohitajika, tengeneza kiungo kifupi na msimbo wa QR, kisha sambaza SMS, WhatsApp au barua pepe zilizoidhinishwa kwa wafadhili au njia za umma.",
            svg: 'dashboard',
            src: dashboard,
            alt: 'Ukurasa wa kampeni ya Changia wenye upau wa maendeleo na chaguo za mchango',
            second: true,
          },
          {
            heading: 'Mchango wa kusukuma wa papo hapo',
            content:
              "Afisa wa kampeni aliyeidhinishwa na mfadhili hutuma ombi la malipo la moja kwa moja. Mfadhili huthibitisha kwa PIN yake na callback iliyothibitishwa inasasisha kampeni mara moja tu.",
            svg: 'house',
            src: construction,
            alt: 'Mkusanyaji wa mbugani akithibitisha ombi la mchango kwenye simu',
          },
        ]}
      />

      <TestimonialsSection
        title="Kubadilisha nia ya kusaidia kuwa malipo yaliyofanyika"
        subTitle="Kutoka redio, SMS na WhatsApp kwa kiwango kikubwa hadi ukusanyaji wa mbugani unaoendeshwa na maafisa, Changia huunganisha nia na mchango."
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
            count: 'TZS 1 000',
            description: 'mchango wa chini zaidi kwenye kila kampeni ya Changia',
          },
          {
            count: '5 %',
            description: 'ada ya huduma inayoweza kusanidiwa kwenye kiwango cha kampeni',
          },
          {
            count: '3',
            description: 'moduli za MVP, zinazotolewa na kulipwa kwa kujitegemea',
          },
          {
            count: 'TZS 200 000',
            description: 'ada ya maendeleo kwa kila moduli iliyoidhinishwa',
          },
        ]}
      />

      <PricingSection pricing={pricing} />

      <FAQ title="Maswali yanayoulizwa<br />mara kwa mara" faqs={faqs} />

      <HeroSectionAlt
        title="Tukusanye pamoja"
        subTitle="Changia imeundwa kwa Tanzania: muhimu kwa shirika letu la kwanza leo, na inayoweza kubadilika kesho kwa hospitali, makanisa, shule, NGO, vikundi vya jamii na watu binafsi."
      />
    </>
  );
}
