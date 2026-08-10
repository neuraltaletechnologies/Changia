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
import faqs from '@data/fr/faqs.json';
import features from '@data/fr/features.json';
import pricing from '@data/fr/pricing.json';
import featureImage from '@images/features-image.avif';
import construction from '@images/construction-image.avif';
import tools from '@images/automated-tools.avif';
import dashboard from '@images/dashboard-image.avif';
import { partnersData } from '@/data_files/constants';

export const metadata = {
  title: 'Changia',
  description:
    'Changia est une plateforme tanzanienne de collecte de fonds numérique, orientée mobile money. Créez une campagne, partagez un lien et collectez des contributions mobile money avec moins de frictions.',
};

const avatarSrcs: string[] = [
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1531927557220-a9e23c1e4794?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&&auto=format&fit=facearea&facepad=3&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
];

export default function FrenchHomePage() {
  return (
    <>
      <AnnouncementBanner
        btnId="dismiss-button"
        btnTitle="Explorer la plateforme"
        url="/fr/products"
        title="Nous construisons une plateforme tanzanienne de collecte de fonds, mobile money d'abord."
      />

      <HeroSection
        title='Collectez de petites contributions mobile money avec <span class="text-yellow-500 dark:text-yellow-400">moins de frictions</span>'
        subTitle="Changia est une plateforme tanzanienne de collecte de fonds, mobile money d'abord. Les propriétaires de campagnes créent une page claire, partagent un lien et transforment la volonté d'aider d'un donateur en paiement effectué."
        primaryBtn="Lancer une campagne"
        primaryBtnURL="/fr/contact"
        secondaryBtn="Explorer les modules"
        secondaryBtnURL="/fr/products"
        withReview
        avatars={avatarSrcs}
        rating='<span class="font-bold">TZS 1 000</span>'
        starCount={4}
        reviews="don minimum sur toute campagne Changia"
        src={heroImage}
        alt="Une page de campagne Changia affichée sur un smartphone"
      />

      <ClientsSection
        title="Fonctionne avec le mobile money que vos donateurs utilisent déjà"
        subTitle="Les donateurs donnent depuis n'importe quel smartphone et confirment avec leur propre PIN dans l'invite de la passerelle en laquelle ils ont confiance."
        partners={partnersData}
      />

      <FeaturesGeneral
        title="Une façon plus simple de donner"
        subTitle="La collecte de fonds perd souvent des donateurs entre l'intention et le paiement. Changia réduit cette friction avec des pages de campagne claires, des liens partageables et une demande de paiement directe."
        src={featureImage}
        alt="Le tableau de bord Changia sur un ordinateur portable"
        features={features}
      />

      <FeaturesNavs
        title={'Les trois modules du MVP <span class="text-yellow-500 dark:text-yellow-400">Changia</span> mènent une campagne de l\u2019idée au paiement effectué.'}
        tabs={[
          {
            heading: 'Plateforme de base et base de donateurs',
            content:
              "Une fondation sécurisée et réactive pour les administrateurs, les responsables et les donateurs — avec accès par rôles, tableaux de bord, journal d'audit et un CRM de donateurs respectueux du consentement.",
            svg: 'tools',
            src: tools,
            alt: "Espace de travail du tableau de bord d'administration Changia",
            first: true,
          },
          {
            heading: 'Distribution de liens de campagne',
            content:
              "Créez des campagnes, définissez un montant requis, générez un lien court et un QR code, puis distribuez des SMS, WhatsApp ou emails approuvés à la base de donateurs ou aux canaux publics.",
            svg: 'dashboard',
            src: dashboard,
            alt: 'Page de campagne Changia avec barre de progression et options de don',
            second: true,
          },
          {
            heading: 'Don par poussée instantanée',
            content:
              "Un responsable de campagne qui a obtenu l'accord d'un donateur envoie une demande de paiement directe. Le donateur confirme avec son PIN et le callback vérifié met à jour la campagne exactement une fois.",
            svg: 'house',
            src: construction,
            alt: 'Un collecteur de terrain confirmant une demande de don sur un téléphone',
          },
        ]}
      />

      <TestimonialsSection
        title="Convertir la volonté d'aider en paiements effectués"
        subTitle="De la radio, des SMS et WhatsApp à grande échelle à la collecte de terrain pilotée par les responsables, Changia fait le pont entre l'intention et la contribution."
        testimonials={[
          {
            content:
              "Nous avons mené le Fonds pour la Chirurgie des Enfants avec un objectif public de TZS 10 500 000 — le montant prévu de 10 000 000 plus les frais Changia de 5 %. Chaque contribution est créditée à sa pleine valeur et les donateurs reçoivent un reçu ainsi qu'une mise à jour en direct. Une collecte qui inspire confiance.",
            author: 'Dr Msuya',
            role: 'Partenaire de lancement initial',
            avatarSrc:
              'https://images.unsplash.com/photo-1593104547489-5cfb3839a3b5?q=80&w=1453&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
          },
        ]}
        statistics={[
          {
            count: 'TZS 1 000',
            description: 'don minimum sur chaque campagne Changia',
          },
          {
            count: '5 %',
            description: 'frais de service configurables au niveau de la campagne',
          },
          {
            count: '3',
            description: 'modules MVP, livrés et payables indépendamment',
          },
          {
            count: 'TZS 200 000',
            description: 'frais de développement par module approuvé',
          },
        ]}
      />

      <PricingSection pricing={pricing} />

      <FAQ title="Questions<br />fréquemment posées" faqs={faqs} />

      <HeroSectionAlt
        title="Collectons ensemble"
        subTitle="Changia est conçu pour la Tanzanie : utile pour notre première organisation aujourd'hui, et adaptable demain aux hôpitaux, églises, écoles, ONG, groupes communautaires et particuliers."
      />
    </>
  );
}