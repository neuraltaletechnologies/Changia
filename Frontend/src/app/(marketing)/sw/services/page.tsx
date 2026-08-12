import type { Metadata } from 'next';
import type { StaticImageData } from 'next/image';
import MainSection from '@components/ui/blocks/MainSection';
import LeftSection from '@components/ui/blocks/LeftSection';
import RightSection from '@components/ui/blocks/RightSection';
import FeaturesStats from '@components/sections/features/FeaturesStats';
import blueprints from '@images/blueprints-image.avif';
import personWorking from '@images/person-working.avif';
import beforeAfter from '@images/before-after.avif';
import constructionWorkers from '@images/construction-workers.avif';
import aerialView from '@images/aerial-view.avif';
import usingTools from '@images/using-tools.avif';

export const metadata: Metadata = {
  title: 'Inavyofanya Kazi',
  description:
    'Jifunze jinsi Changia inavyoendesha kampeni kutoka rasimu hadi malipo yaliyofanyika — kutoka kampeni zilizoidhinishwa hadi safari za wafadhili na michango inayoendeshwa na maafisa, kwa uwazi unaoandaliwa kwa ukaguzi katika kila hatua.',
  openGraph: {
    title: 'Inavyofanya Kazi | Changia',
    description:
      'Jifunze jinsi Changia inavyoendesha kampeni kutoka rasimu hadi malipo yaliyofanyika — kutoka kampeni zilizoidhinishwa hadi safari za wafadhili na michango inayoendeshwa na maafisa, kwa uwazi unaoandaliwa kwa ukaguzi katika kila hatua.',
  },
};

interface Article {
  isRightSection: boolean;
  title: string;
  subTitle: string;
  btnExists?: boolean;
  btnTitle?: string;
  btnURL?: string;
  single?: boolean;
  img?: StaticImageData;
  imgAlt?: string;
  imgOne?: StaticImageData;
  imgOneAlt?: string;
  imgTwo?: StaticImageData;
  imgTwoAlt?: string;
}

const articles: Article[] = [
  {
    isRightSection: true,
    title: 'Kutoka rasimu hadi kampeni iliyoidhinishwa',
    subTitle:
      "Wasimamizi wa shirika huunda kampeni kwa kiasi kilichopangwa, ada ya huduma inayoweza kusanidiwa, lengo la umma, tarehe ya mwisho na hali inayoenda kutoka 'rasimu' hadi 'iliyoidhinishwa' kisha 'inayoendelea'. Maafisa wa kampeni hupewa jukumu kwa kila kampeni, hivyo kila ombi linabakia kwa mtu sahihi na sheria sahihi.",
    single: false,
    imgOne: blueprints,
    imgOneAlt: 'Karatasi ya usanidi wa kampeni na zana za kupanga za kidijitali.',
    imgTwo: personWorking,
    imgTwoAlt: 'Msimamizi wa shirika anayethibitisha kampeni',
  },
  {
    isRightSection: false,
    title: 'Safari ya mfadhili hadi malipo yaliyofanyika',
    subTitle:
      "Mfadhili anafungua kiungo kifupi kutoka SMS, WhatsApp, barua pepe au bango la QR, anachagua au kuthibitisha kiasi, kisha anaidhinisha malipo kwenye ombi la lango kwa PIN yake mwenyewe. Callback iliyothibitishwa pekee inaunda mchango — wafadhili hupokea risiti na taarifa za moja kwa moja, na jumla ya kampeni inasasishwa mara moja tu.",
    img: beforeAfter,
    imgAlt: 'Maendeleo ya kampeni kabla na baada ya michango iliyothibitishwa',
    btnExists: true,
    btnTitle: 'Chunguza kampani',
    btnURL: '/sw/campaigns',
  },
  {
    isRightSection: true,
    title: 'Ukusanyaji wa mbugani unaoendeshwa na maafisa',
    subTitle:
      "Maafisa wa kampeni hutafuta au kuongeza wafadhili walioidhinisha, wanaingiza kiasi kilichokubaliwa na kutuma ombi la mchango la kusukuma la papo hapo. Mfadhili huthibitisha kwa PIN yake, na vikwazo vya kiwango pamoja na muda wa kupumzika hulinda dhidi ya maombi ya kurudiarudia au yasiyotakikana. Maafisa hufuatilia matokeo yao bila kugusa uondoaji wa fedha.",
    single: false,
    imgOne: constructionWorkers,
    imgOneAlt: 'Msimamizi wa ukusanyaji anayekagua kampeni zilizogawiwa',
    imgTwo: aerialView,
    imgTwoAlt: 'Mtazamo wa jumla wa maendeleo na utendaji wa kampeni',
  },
  {
    isRightSection: false,
    title: 'Imani, ukaguzi na msaada unaoendelea',
    subTitle:
      "Kila ombi, jaribio na callback linaandikwa kwa ajili ya upatanisho, kwa kiasi kamili cha TZS na matukio ya ukaguzi yasiyoweza kubadilishwa. Timu yetu iko hapo baada ya uzinduzi kwa mafunzo, dhamana ya siku 30 kwenye hitilafu, na njia wazi ya kuelekea kampani inayofuata ukipo tayari.",
    img: usingTools,
    imgAlt: 'Timu inayofuatilia callbacks zilizothibitishwa na matukio ya ukaguzi',
    btnExists: true,
    btnTitle: 'Wasiliana na timu',
    btnURL: '/sw/contact',
  },
];

export default function ServicesPage() {
  return (
    <>
      <MainSection
        title="Ukusanyaji wa fedha unaojenga imani"
        subTitle="Changia inachanganya ukusanyaji wa kidijitali kwa wingi na ukusanyaji wa mbugani unaoendeshwa na maafisa. Kutoka ukurasa wazi wa kampeni hadi malipo yaliyothibitishwa ya All money transfer, kila hatua imeundwa kupunguza usumbufu na kuweka hesabu wazi."
        btnExists
        btnTitle="Anzisha kampeni"
        btnURL="/login?redirect=%2Fdashboard%2FCampaigns%2Fnew"
      />

      {articles.map((article) =>
        article.isRightSection ? (
          <RightSection
            key={article.title}
            title={article.title}
            subTitle={article.subTitle}
            single={article.single}
            imgOne={article.imgOne}
            imgOneAlt={article.imgOneAlt}
            imgTwo={article.imgTwo}
            imgTwoAlt={article.imgTwoAlt}
            btnExists={article.btnExists}
            btnTitle={article.btnTitle}
            btnURL={article.btnURL}
          />
        ) : (
          <LeftSection
            key={article.title}
            title={article.title}
            subTitle={article.subTitle}
            img={article.img!}
            imgAlt={article.imgAlt || ''}
            btnExists={article.btnExists}
            btnTitle={article.btnTitle}
            btnURL={article.btnURL}
          />
        )
      )}

      <FeaturesStats
        title="Changia kwa takwimu"
        subTitle="Ahadi yetu ya uwazi na kuegemea imejengwa katika kila kampani. Tunabuni kwa malipo yaliyothibitishwa, ada wazi na rekodi zilizoandaliwa kwa ukaguzi."
        mainStatTitle="TZS 100"
        mainStatSubTitle="mchango wa chini zaidi uliowekwa kwenye kila kampeni ya Changia"
        stats={[
          { stat: '5 %', description: 'ada ya huduma inayoweza kusanidiwa kwenye kiwango cha kampeni' },
          { stat: '600 000', description: 'jumla ya TZS za maendeleo ya Campaign katika kampani tatu' },
          { stat: '3', description: 'kampani huru na za kulipwa za Campaign' },
        ]}
      />
    </>
  );
}
