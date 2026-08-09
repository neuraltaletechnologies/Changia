import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import IconBlock from '@/components/ui/blocks/IconBlock';
import Icon from '@/components/ui/icons/Icon';

type Feature = {
  heading: string;
  content: string;
  svg: string;
};

type FeaturesGeneralProps = {
  title?: string;
  subTitle?: string;
  features?: Feature[];
  src?: StaticImageData;
  alt?: string;
};

export default function FeaturesGeneral({
  title,
  subTitle,
  src,
  alt,
  features,
}: FeaturesGeneralProps) {
  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
      <div className="relative mb-6 overflow-hidden md:mb-8">
        {src && alt ? (
          <Image
            src={src}
            alt={alt}
            className="h-full w-full object-cover object-center"
            width={1600}
            height={700}
            draggable={false}
            loading="eager"
          />
        ) : null}
      </div>

      <div className="mt-5 grid gap-8 lg:mt-16 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-bold text-balance text-neutral-800 md:text-3xl dark:text-neutral-200">
            {title}
          </h2>
          {subTitle ? (
            <p className="mt-2 text-pretty text-neutral-600 md:mt-4 dark:text-neutral-400">
              {subTitle}
            </p>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <div className="grid gap-8 sm:grid-cols-2 md:gap-12">
            {features?.map((feature) => (
              <IconBlock
                key={feature.heading}
                heading={feature.heading}
                content={feature.content}
              >
                <Icon name={feature.svg} />
              </IconBlock>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
