import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import PrimaryCTA from '@/components/ui/buttons/PrimaryCTA';

type LeftSectionProps = {
  title: string;
  subTitle: string;
  btnExists?: boolean;
  btnTitle?: string;
  btnURL?: string;
  img: StaticImageData;
  imgAlt: string;
};

export default function LeftSection({
  title,
  subTitle,
  btnExists,
  btnTitle,
  btnURL,
  img,
  imgAlt,
}: LeftSectionProps) {
  return (
    <section className="mx-auto max-w-[85rem] items-center gap-8 px-4 py-10 sm:px-6 sm:py-16 md:grid md:grid-cols-2 lg:grid lg:grid-cols-2 lg:px-8 lg:py-14 xl:gap-16 2xl:max-w-full">
      <Image
        className="w-full rounded-xl"
        src={img}
        alt={imgAlt}
        width={800}
        height={600}
        draggable={false}
      />
      <div className="mt-4 md:mt-0">
        <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-balance text-neutral-800 dark:text-neutral-200">
          {title}
        </h2>
        <p className="mb-4 max-w-prose font-normal text-pretty text-neutral-600 sm:text-lg dark:text-neutral-400">
          {subTitle}
        </p>
        {btnExists ? <PrimaryCTA title={btnTitle} url={btnURL} /> : null}
      </div>
    </section>
  );
}
