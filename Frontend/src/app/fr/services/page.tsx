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
  title: 'Comment ça marche',
  description:
    "Découvrez comment Changia mène une campagne du brouillon au paiement effectué — des campagnes approuvées aux parcours de donateurs en passant par les dons pilotés par les responsables, avec une transparence prête pour l'audit à chaque étape.",
  openGraph: {
    title: 'Comment ça marche | Changia',
    description:
      "Découvrez comment Changia mène une campagne du brouillon au paiement effectué — des campagnes approuvées aux parcours de donateurs en passant par les dons pilotés par les responsables, avec une transparence prête pour l'audit à chaque étape.",
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
    title: 'Du brouillon à une campagne approuvée',
    subTitle:
      "Les administrateurs d'organisation créent une campagne avec un montant prévu, des frais de service configurables, un objectif public, une échéance et un état qui passe de « brouillon » à « approuvé » puis « active ». Les responsables de campagne sont assignés campagne par campagne, de sorte que chaque demande reste liée à la bonne personne et aux bonnes règles.",
    single: false,
    imgOne: blueprints,
    imgOneAlt: "Feuille de configuration de campagne et outils de planification numériques.",
    imgTwo: personWorking,
    imgTwoAlt: "Administrateur d'organisation approuvant une campagne",
  },
  {
    isRightSection: false,
    title: 'Le parcours du donateur jusqu’au paiement effectué',
    subTitle:
      "Un donateur ouvre un lien court depuis un SMS, WhatsApp, un email ou une affiche QR, choisit ou confirme un montant, puis approuve le paiement dans l'invite de la passerelle avec son propre PIN. Seul un callback vérifié crée le don — les donateurs reçoivent un reçu et une mise à jour en direct, et le total de la campagne est mis à jour exactement une fois.",
    img: beforeAfter,
    imgAlt: 'Progression de la campagne avant et après les dons vérifiés',
    btnExists: true,
    btnTitle: 'Explorer les modules',
    btnURL: '/fr/products',
  },
  {
    isRightSection: true,
    title: 'Collecte de terrain pilotée par les responsables',
    subTitle:
      "Les responsables de campagne recherchent ou ajoutent des donateurs consentants, saisissent un montant convenu et envoient une demande de don par poussée instantanée. Le donateur confirme avec son PIN, et des limites de débit ainsi qu'un délai de refroidissement protègent contre les demandes en double ou non souhaitées. Les responsables suivent leurs résultats sans jamais toucher aux retraits.",
    single: false,
    imgOne: constructionWorkers,
    imgOneAlt: 'Responsable de collecte examinant les campagnes assignées',
    imgTwo: aerialView,
    imgTwoAlt: 'Vue d’ensemble de la progression des campagnes et des performances',
  },
  {
    isRightSection: false,
    title: 'Confiance, audit et accompagnement continu',
    subTitle:
      "Chaque demande, tentative et callback est enregistré(e) pour la réconciliation, avec des montants entiers en TZS et des événements d'audit immuables. Notre équipe est là après le lancement avec la formation, une garantie de 30 jours sur les défauts et un chemin clair vers le module suivant dès que vous êtes prêt.",
    img: usingTools,
    imgAlt: 'Équipe surveillant les callbacks vérifiés et les événements d’audit',
    btnExists: true,
    btnTitle: 'Contacter l’équipe',
    btnURL: '/fr/contact',
  },
];

export default function ServicesPage() {
  return (
    <>
      <MainSection
        title="Une collecte de fonds qui inspire confiance"
        subTitle="Changia combine la collecte numérique de masse et la collecte de terrain pilotée par les responsables. D'une page de campagne claire à un paiement mobile money vérifié, chaque étape est conçue pour réduire les frictions et garder les comptes transparents."
        btnExists
        btnTitle="Lancer une campagne"
        btnURL="/fr/contact"
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
        title="Changia en chiffres"
        subTitle="Notre engagement envers la transparence et la fiabilité est intégré dans chaque module. Nous concevons pour des paiements vérifiés, des frais clairs et des enregistrements prêts pour l'audit."
        mainStatTitle="TZS 1 000"
        mainStatSubTitle="don minimum défini sur chaque campagne Changia"
        stats={[
          { stat: '5 %', description: 'frais de service configurables au niveau de la campagne' },
          { stat: '600 000', description: 'total TZS du développement du MVP en trois modules' },
          { stat: '3', description: 'modules MVP indépendants et payables' },
        ]}
      />
    </>
  );
}