import type { Metadata } from 'next';
import PrimaryCTA from '@components/ui/buttons/PrimaryCTA';
import CardSmall from '@components/ui/cards/CardSmall';
import CardWide from '@components/ui/cards/CardWide';
import FeaturesStatsAlt from '@components/sections/features/FeaturesStatsAlt';
import TestimonialsSectionAlt from '@components/sections/testimonials/TestimonialsSectionAlt';
import { getProductEntries } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Produits',
  description:
    'Explorez la durabilité et la précision des outils ScrewFast, conçus aussi bien pour les professionnels que pour les passionnés.',
  openGraph: {
    title: 'Outils Matériels | ScrewFast',
    description:
      'Explorez la durabilité et la précision des outils ScrewFast, conçus aussi bien pour les professionnels que pour les passionnés.',
  },
};

const title = 'Produits';
const subTitle =
  'Explorez la durabilité et la précision des outils ScrewFast, conçus aussi bien pour les professionnels que pour les amateurs. Chacun de nos produits est fabriqué avec précision et conçu pour durer, garantissant que vous disposez du bon outil pour chaque tâche.';

const testimonials = [
  {
    content:
      "Depuis que nous avons adopté les outils matériels de ScrewFast, l'efficacité sur nos chantiers de construction a explosé. La durabilité des boulons hexagonaux et la précision des vis machine sont tout simplement inégalées. C'est rafraîchissant de travailler avec une entreprise qui comprend vraiment les exigences quotidiennes de l'industrie.",
    author: 'Jason Clark',
    role: 'Contremaître de chantier | TopBuild',
    avatarSrc:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: "Description de l'image",
  },
  {
    content:
      "En tant que designer d'intérieur, je suis toujours à la recherche de matériaux et d'outils de haute qualité qui m'aident à donner vie à mes visions. L'assortiment de vis mixtes de ScrewFast a révolutionné mes projets, offrant le mélange parfait de qualité et de variété. Le support client exceptionnel était la cerise sur le gâteau !",
    author: 'Maria Gonzalez',
    role: "Designer d'intérieur | Creative Spaces",
    avatarSrc:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1376&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: "Description de l'image",
  },
  {
    content:
      "Je suis menuisier professionnel depuis plus de 15 ans, et je peux sincèrement dire que les boulons et écrous à tarauder de ScrewFast sont parmi les meilleurs que j'ai utilisés. Ils adhèrent comme aucun autre, et j'ai une confiance totale dans chaque joint et élément. De plus, le service est impeccable - ils se soucient vraiment du succès de mon projet.",
    author: 'Richard Kim',
    role: 'Menuisier-Maître | WoodWright',
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
          <PrimaryCTA title="Histoires de clients" url="#testimonials" noArrow />
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
        title="Pourquoi choisir ScrewFast ?"
        subTitle="Transformez vos idées en résultats tangibles avec les outils ScrewFast. Que vous commenciez par un croquis sur un coin de table ou plongiez dans un projet de construction complet, nos outils sont conçus pour vous aider à construire en toute confiance."
        benefits={[
          'Outils robustes et fiables pour des performances durables.',
          'Solutions innovantes adaptées aux besoins de construction modernes.',
          'Support client dédié au succès de votre projet.',
        ]}
      />

      <TestimonialsSectionAlt title="Ce que disent nos clients" testimonials={testimonials} />
    </>
  );
}
