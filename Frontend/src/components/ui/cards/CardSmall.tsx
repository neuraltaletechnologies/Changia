import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/ui/icons/Icon';
import type { ProductData } from '@/lib/types';

type CardSmallProps = {
  product: { id: string; data: ProductData };
  productLocale?: string;
};

const imageClass =
  'absolute inset-0 h-full w-full object-cover object-center transition duration-[600ms] ease-[cubic-bezier(0.45,0,0.55,1)] group-hover:scale-110';

export default function CardSmall({ product, productLocale = '' }: CardSmallProps) {
  const slug = product.id.replace(/^(en|sw)\//, '');
  const href =
    productLocale && productLocale !== 'en'
      ? `/${productLocale}/products/${slug}/`
      : `/products/${slug}/`;

  return (
    <Link
      href={href}
      className="group relative flex h-48 items-end overflow-hidden rounded-xl shadow-lg ring-zinc-500 outline-hidden focus-visible:ring-3 md:h-80 dark:ring-zinc-200 dark:focus:outline-hidden"
    >
      <Image
        src={product.data.main.imgCard}
        alt={product.data.main.imgAlt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={imageClass}
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-neutral-800 via-transparent to-transparent opacity-50" />
      <span className="relative mb-3 ml-4 inline-block text-sm font-bold text-neutral-50 transition duration-[600ms] ease-[cubic-bezier(0.45,0,0.55,1)] group-hover:scale-110 md:ml-5 md:text-lg">
        {product.data.description} <Icon name="openInNew" />
      </span>
    </Link>
  );
}
