import type { Metadata } from 'next';
import PrimaryCTA from '@components/ui/buttons/PrimaryCTA';
import CardSmall from '@components/ui/cards/CardSmall';
import CardWide from '@components/ui/cards/CardWide';
import FeaturesStatsAlt from '@components/sections/features/FeaturesStatsAlt';
import TestimonialsSectionAlt from '@components/sections/testimonials/TestimonialsSectionAlt';
import { getProductEntries } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Modules',
  description:
    'Découvrez les trois modules du MVP Changia : plateforme de base et base de donateurs, distribution de liens de campagne et don par poussée instantanée.',
  openGraph: {
    title: 'Modules du MVP Changia | Changia',
    description:
      'Découvrez les trois modules du MVP Changia : plateforme de base et base de donateurs, distribution de liens de campagne et don par poussée instantanée.',
  },
};

const title = 'Modules';
const subTitle =
  "Découvrez les trois modules indépendants et payables du MVP Changia. Chaque module produit un résultat clé — d'une plateforme de base sécurisée et d'une base de donateurs à la distribution de liens de campagne et aux dons pilotés par les responsables.";

const testimonials = [
  {
    content:
      "En tant que partenaire de lancement, nous avons pu mettre en place un tableau de bord sécurisé, gérer les utilisateurs par rôle et tenir une base de donateurs prête pour l'audit dès le premier jour. Le module 1 nous a donné les fondations nécessaires pour mener des campagnes dignes de confiance.",
    author: 'Dr Msuya',
    role: "Administrateur d'organisation | Partenaire de lancement initial",
    avatarSrc:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: "Description de l'image",
  },
  {
    content:
      "Avec le module de distribution de liens, nous transformons les auditeurs de radio et de WhatsApp en donateurs. Un lien court, un QR code et une page de campagne mobile — dès TZS 1 000 — et chaque contribution vérifiée met à jour la barre de progression.",
    author: 'Amadi Kimaro',
    role: 'Responsable de campagne | Fonds communautaire pour la santé',
    avatarSrc:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1376&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: "Description de l'image",
  },
  {
    content:
      "Le don par poussée instantanée est l'innovation que nous attendions. Après une conversation en face à face et un accord, le donateur reçoit une demande de paiement directe et confirme avec son propre PIN. Les callbacks vérifiés garantissent des totaux toujours exacts.",
    author: 'Neema Mushi',
    role: 'Responsable de la collecte de terrain',
    avatarSrc:
      'https://images.unsplash.com/photo-1474176857210-7287d38d27c6?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: "Description de l'image",
  },
];

export default function FrenchProductsIndexPage() {
  const product = getProductEntries('fr').sort(
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
          <PrimaryCTA title="Histoires de campagnes" url="#testimonials" noArrow />
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 xl:gap-8">
          {product.map((p, index) => {
            const position = index % 4;
            if (position === 0 || position === 3) {
              return <CardSmall key={p.id} product={p} productLocale="fr" />;
            }
            return <CardWide key={p.id} product={p} productLocale="fr" />;
          })}
        </section>
      </div>

      <FeaturesStatsAlt
        title="Pourquoi choisir Changia ?"
        subTitle="Changia est conçu dès le départ pour les flux de travail mobile money tanzaniens. Que vous lanciez votre première campagne ou meniez un appel national, la plateforme est pensée pour convertir la volonté d'aider en paiements effectués."
        benefits={[
          'Une fondation sécurisée et mobile-first, adaptée aux réseaux à faible bande passante.',
          "Gestion des donateurs respectueuse du consentement avec contrôles d'opt-out.",
          'Callbacks vérifiés et enregistrements prêts pour l’audit que vos donateurs peuvent faire confiance.',
        ]}
      />

      <TestimonialsSectionAlt
        title="Ce que disent les propriétaires de campagnes"
        testimonials={testimonials}
      />
    </>
  );
}