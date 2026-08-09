import type { Metadata } from 'next';
import PrimaryCTA from '@components/ui/buttons/PrimaryCTA';
import CardSmall from '@components/ui/cards/CardSmall';
import CardWide from '@components/ui/cards/CardWide';
import FeaturesStatsAlt from '@components/sections/features/FeaturesStatsAlt';
import TestimonialsSectionAlt from '@components/sections/testimonials/TestimonialsSectionAlt';
import { getProductEntries } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Explore the durability and precision of ScrewFast tools, designed for both professionals and enthusiasts.',
  openGraph: {
    title: 'Hardware Tools | ScrewFast',
    description:
      'Explore the durability and precision of ScrewFast tools, designed for both professionals and enthusiasts.',
  },
};

const title = 'Products';
const subTitle =
  'Explore the durability and precision of ScrewFast tools, designed for both professionals and enthusiasts. Each of our products is crafted with precision and built to last, ensuring you have the right tool for every job.';

const testimonials = [
  {
    content:
      '"Since switching to ScrewFast\'s hardware tools, the efficiency on our construction sites has skyrocketed. The durability of the hex bolts and precision of the machine screws are simply unmatched. It\'s refreshing to work with a company that truly understands the daily demands of the industry."',
    author: 'Jason Clark',
    role: 'Site Foreman | TopBuild',
    avatarSrc:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Image Description',
  },
  {
    content:
      '"As an interior designer, I\'m always looking for high-quality materials and tools that help bring my visions to life. ScrewFast\'s mixed screws assortment has been a game-changer for my projects, providing the perfect blend of quality and variety. The outstanding customer support was just the cherry on top!"',
    author: 'Maria Gonzalez',
    role: 'Interior Designer | Creative Spaces',
    avatarSrc:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1376&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Image Description',
  },
  {
    content:
      "\"I've been a professional carpenter for over 15 years, and I can sincerely say that ScrewFast's tap bolts and nuts are some of the best I've used. They grip like no other, and I have full confidence in every joint and fixture. Plus, the service is impeccable – they truly care about my project's success.\"",
    author: 'Richard Kim',
    role: 'Master Carpenter | WoodWright',
    avatarSrc:
      'https://images.unsplash.com/photo-1474176857210-7287d38d27c6?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
    avatarAlt: 'Image Description',
  },
];

export default function ProductsIndexPage() {
  const product = getProductEntries('en').sort(
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
          <PrimaryCTA title="Customer Stories" url="#testimonials" noArrow />
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 xl:gap-8">
          {product.map((p, index) => {
            const position = index % 4;
            if (position === 0 || position === 3) {
              return <CardSmall key={p.id} product={p} />;
            }
            return <CardWide key={p.id} product={p} />;
          })}
        </section>
      </div>

      <FeaturesStatsAlt
        title="Why Choose ScrewFast?"
        subTitle="Transform your ideas into tangible results with ScrewFast tools. Whether you're starting with a sketch on a napkin or diving into a comprehensive construction project, our tools are engineered to help you build with confidence."
        benefits={[
          'Robust and reliable tools for long-lasting performance.',
          'Innovative solutions tailored to modern construction needs.',
          "Customer support dedicated to your project's success.",
        ]}
      />

      <TestimonialsSectionAlt title="What Our Customers Say" testimonials={testimonials} />
    </>
  );
}
