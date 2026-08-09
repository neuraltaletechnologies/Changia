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
    "Unissant l'expertise à votre vision, ScrewFast fournit un service exceptionnel et des solutions complètes dans le secteur du matériel et de la construction, de la consultation à l'achèvement du projet.",
  openGraph: {
    title: "Services de Consultation d'Experts | ScrewFast",
    description:
      "Unissant l'expertise à votre vision, ScrewFast fournit un service exceptionnel et des solutions complètes dans le secteur du matériel et de la construction, de la consultation à l'achèvement du projet.",
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
    title: "Fournir des conseils d'experts",
    subTitle:
      "Se lancer dans un projet de construction peut être accablant. Avec nos services de consultation professionnelle, nous vous guidons à chaque étape, en veillant à ce que vous preniez des décisions éclairées. Que vous soyez un passionné du bricolage ou un entrepreneur qualifié, nos experts sont là pour vous offrir des conseils sur mesure sur la sélection de produits, l'envergure du projet et la conformité aux réglementations locales.",
    single: false,
    imgOne: blueprints,
    imgOneAlt: 'Plans et tablette numérique avec des plans de construction.',
    imgTwo: personWorking,
    imgTwoAlt: 'Personne travaillant au bureau',
  },
  {
    isRightSection: false,
    title: 'Transformer les conceptions en réalité',
    subTitle:
      'Nos artisans qualifiés apportent précision et excellence à chaque projet de construction. Des installations mineures aux travaux structuraux substantiels, ScrewFast offre des services de construction fiables pour concrétiser vos plans. Nous assurons les normes les plus élevées de sécurité et de savoir-faire, en utilisant des outils et des matériaux de haute qualité de notre vaste inventaire.',
    img: beforeAfter,
    imgAlt: 'Chantier de construction avant et après',
    btnExists: true,
    btnTitle: 'En savoir plus',
    btnURL: '#',
  },
];

export default function FrenchServicesPage() {
  return (
    <>
      <MainSection
        title="Unir l'expertise à votre vision"
        subTitle="Chez ScrewFast, nous sommes fiers de fournir des solutions complètes et un service exceptionnel dans l'industrie du matériel et de la construction. Notre équipe expérimentée est dédiée à soutenir votre projet de sa conception à son achèvement avec une gamme de services spécialisés."
        btnExists
        btnTitle="Planifier une consultation"
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
        title="Par les chiffres"
        subTitle="Notre engagement envers la qualité et la fiabilité est évident dans chaque projet que nous entreprenons. Chez ScrewFast, nous nous engageons à fournir des services de premier plan dans l'industrie qui garantissent que vos projets de construction sont conçus pour durer."
        mainStatTitle="96%"
        mainStatSubTitle="de nos clients évaluent leur expérience avec ScrewFast comme exceptionnelle"
        stats={[
          { stat: '99,8%', description: 'taux de réalisation de projets' },
          { stat: '5 000+', description: 'installations réussies' },
          { stat: '85%', description: 'croissance client année après année' },
        ]}
      />
    </>
  );
}
