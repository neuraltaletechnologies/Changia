import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ProductTabs from '@components/products/ProductTabs';
import { getProductEntries } from '@/lib/content';

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getProductEntries('fr').map((p) => ({ id: p.slug }));
}

function findProduct(id: string) {
  return getProductEntries('fr').find((p) => p.slug === id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const product = findProduct(id);
  if (!product) return { title: 'Produits' };
  return {
    title: product.data.title,
    description: product.data.description,
    openGraph: {
      title: `${product.data.title} | Outils Matériels | ScrewFast`,
      description: product.data.description,
    },
  };
}

export default async function FrenchProductDetailPage({ params }: Params) {
  const { id } = await params;
  const product = findProduct(id);
  if (!product) notFound();
  const data = product.data;

  return (
    <>
      <section className="mx-auto flex max-w-[85rem] flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
        <div>
          <p className="mb-8 max-w-prose font-light text-pretty text-neutral-700 sm:text-xl dark:text-neutral-300">
            {data.main.content}
          </p>
        </div>
        <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
          <div>
            <h1 className="block text-4xl font-bold tracking-tighter text-neutral-800 sm:text-5xl md:text-6xl lg:text-7xl dark:text-neutral-200">
              {data.title}
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              {data.description}
            </p>
          </div>
          <div>
            <Image
              src={data.main.imgMain}
              className="w-[600px]"
              alt={data.main.imgAlt}
              width={600}
              height={400}
              priority
            />
          </div>
        </div>
      </section>

      <ProductTabs product={data} />
    </>
  );
}
