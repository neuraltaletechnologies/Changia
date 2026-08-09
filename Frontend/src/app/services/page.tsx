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
  title: 'Services',
  description:
    'Uniting expertise with your vision, ScrewFast provides exceptional service and comprehensive solutions in the hardware and construction industry, from consultation to project completion.',
  openGraph: {
    title: 'Expert Consultation Services | ScrewFast',
    description:
      'Uniting expertise with your vision, ScrewFast provides exceptional service and comprehensive solutions in the hardware and construction industry, from consultation to project completion.',
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
    title: 'Delivering Expert Guidance',
    subTitle:
      'Embarking on a construction project can be overwhelming. With our professional consultation services, we guide you through every stage, ensuring you make informed decisions. Whether you are a DIY enthusiast or a skilled contractor, our experts are on hand to offer tailored advice on product selection, project scope, and compliance with local regulations.',
    single: false,
    imgOne: blueprints,
    imgOneAlt: 'Blueprints and digital tablet with construction plans.',
    imgTwo: personWorking,
    imgTwoAlt: 'Person working in the office',
  },
  {
    isRightSection: false,
    title: 'Transforming Designs into Reality',
    subTitle:
      'Our skilled craftsmen bring precision and excellence to every construction project. From minor installations to substantial structural work, ScrewFast offers reliable construction services to turn your plans into tangible outcomes. We ensure the highest standards of safety and workmanship, utilizing top-quality tools and materials from our extensive inventory.',
    img: beforeAfter,
    imgAlt: 'Construction site before and after',
    btnExists: true,
    btnTitle: 'Learn More',
    btnURL: '#',
  },
  {
    isRightSection: true,
    title: 'Navigating Projects with Professional Oversight',
    subTitle:
      'Effective project management is at the heart of any successful build. ScrewFast provides thorough planning and robust management services that keep your project on time and within budget. Let us handle the complexities of workflow coordination, resource allocation, and stakeholder communication while you focus on your vision.',
    single: false,
    imgOne: constructionWorkers,
    imgOneAlt: 'Construction workers orchestrating a project',
    imgTwo: aerialView,
    imgTwoAlt: 'Aerial view of managed construction',
  },
  {
    isRightSection: false,
    title: 'Ensuring Long-lasting Performance',
    subTitle:
      "Our commitment to your project doesn't end at completion. ScrewFast offers ongoing maintenance and support services to ensure your construction's longevity and performance. From regular check-ups to emergency assistance, our responsive team is there to provide seamless support.",
    img: usingTools,
    imgAlt: 'Professionals using ScrewFast tools on a maintenance job',
    btnExists: true,
    btnTitle: 'Schedule a Consultation',
    btnURL: '#',
  },
];

export default function ServicesPage() {
  return (
    <>
      <MainSection
        title="Uniting Expertise with Your Vision"
        subTitle="At ScrewFast, we take pride in providing comprehensive solutions and exceptional service in the hardware and construction industry. Our experienced team is dedicated to supporting your project from inception to completion with a range of specialized services."
        btnExists
        btnTitle="Schedule a Consultation"
        btnURL="#"
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
        title="By the Numbers"
        subTitle="Our commitment to quality and reliability is evident in every project we undertake. At ScrewFast, we are dedicated to delivering industry-leading services that ensure your construction projects are built to last."
        mainStatTitle="96%"
        mainStatSubTitle="of our clients rate their experience with ScrewFast as exceptional"
        stats={[
          { stat: '99.8%', description: 'project completion rate' },
          { stat: '5,000+', description: 'successful installations' },
          { stat: '85%', description: 'client growth year-over-year' },
        ]}
      />
    </>
  );
}
