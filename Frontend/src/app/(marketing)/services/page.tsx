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
  title: 'How It Works',
  description:
    'See how Changia takes a Campaign  from draft to completed payment — from approved Campaigns and donor journeys to manager-led push donations, with audit-ready transparency at every step.',
  openGraph: {
    title: 'How It Works | Changia',
    description:
      'See how Changia takes a Campaign  from draft to completed payment — from approved Campaigns and donor journeys to manager-led push donations, with audit-ready transparency at every step.',
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
    title: 'From Draft to an Approved Campaign ',
    subTitle:
      'Organization administrators create a Campaign  with a purpose amount, a configurable service fee, a public target, a deadline and a state that moves from draft to approved to active. Campaign  managers are assigned per Campaign , so every request stays tied to the right person and the right rules.',
    single: false,
    imgOne: blueprints,
    imgOneAlt: 'Campaign  setup worksheet and digital planning tools.',
    imgTwo: personWorking,
    imgTwoAlt: 'Organization administrator approving a Campaign ',
  },
  {
    isRightSection: false,
    title: 'The Donor Journey to a Completed Payment',
    subTitle:
      "A donor opens a short link from SMS, WhatsApp, email or a QR poster, chooses or confirms an amount, and approves the payment in the gateway prompt with their own PIN. Only a verified callback creates the donation — donors get a receipt and a live progress update, and the Campaign  total is updated exactly once.",
    img: beforeAfter,
    imgAlt: 'Campaign  progress before and after verified donations',
    btnExists: true,
    btnTitle: 'Explore the Campaigns',
    btnURL: '/campaigns',
  },
  {
    isRightSection: true,
    title: 'Manager-Led Field Fundraising',
    subTitle:
      'Campaign  managers search or add consented donors, enter an agreed amount and send an instant push donation request. The donor confirms with their PIN, and rate limits plus a cooling period protect against duplicate or unwanted requests. Managers track their results without ever touching withdrawals.',
    single: false,
    imgOne: constructionWorkers,
    imgOneAlt: 'Fundraising manager reviewing assigned Campaigns',
    imgTwo: aerialView,
    imgTwoAlt: 'Overview of Campaign  progress and manager performance',
  },
  {
    isRightSection: false,
    title: 'Trust, Audit and Ongoing Support',
    subTitle:
      "Every request, attempt and callback is logged for reconciliation, with integer TZS amounts and immutable audit events. Our team is there after launch with training, a 30-day defect warranty and a clear path to the next Campaign whenever you're ready.",
    img: usingTools,
    imgAlt: 'Team monitoring verified callbacks and audit events',
    btnExists: true,
    btnTitle: 'Contact the Team',
    btnURL: '/contact',
  },
];

export default function ServicesPage() {
  return (
    <>
      <MainSection
        title="Fundraising That Inspires Trust"
        subTitle="Changia combines mass digital fundraising with manager-led field fundraising. From a clear Campaign  page to a verified mobile-money payment, every step is designed to reduce friction and keep the books transparent."
        btnExists
        btnTitle="Start a Campaign "
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
        title="Changia by the Numbers"
        subTitle="Our commitment to transparency and reliability is built into every Campaign. We design for verified payments, clear fees and audit-ready records."
        mainStatTitle="TZS 100"
        mainStatSubTitle="minimum donation set on every Changia Campaign "
        stats={[
          { stat: '5%', description: 'Campaign -level service fee' },
          { stat: '600,000', description: 'total TZS development for the campaigns' },
          { stat: '3', description: 'independent, payable Campaigns' },
        ]}
      />
    </>
  );
}