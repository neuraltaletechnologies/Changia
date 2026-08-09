import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import PrimaryCTA from '@/components/ui/buttons/PrimaryCTA';
import SecondaryCTA from '@/components/ui/buttons/SecondaryCTA';
import ReviewComponent from '@/components/ui/blocks/ReviewComponent';

type HeroSectionProps = {
  title: string;
  subTitle?: string;
  primaryBtn?: string;
  primaryBtnURL?: string;
  secondaryBtn?: string;
  secondaryBtnURL?: string;
  withReview?: boolean;
  avatars?: string[];
  starCount?: number;
  rating?: string;
  reviews?: string;
  src?: StaticImageData;
  alt?: string;
};

export default function HeroSection({
  title,
  subTitle,
  primaryBtn,
  primaryBtnURL,
  secondaryBtn,
  secondaryBtnURL,
  withReview,
  avatars,
  starCount,
  rating,
  reviews,
  src,
  alt,
}: HeroSectionProps) {
  return (
    <section className="mx-auto grid max-w-[85rem] gap-4 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center md:gap-8 lg:px-8 2xl:max-w-full">
      <div>
        <h1
          className="block text-3xl font-bold tracking-tight text-balance text-neutral-800 sm:text-4xl lg:text-6xl lg:leading-tight dark:text-neutral-200"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        {subTitle ? (
          <p className="mt-3 text-lg leading-relaxed text-pretty text-neutral-700 lg:w-4/5 dark:text-neutral-400">
            {subTitle}
          </p>
        ) : null}

        <div className="mt-7 grid w-full gap-3 sm:inline-flex">
          {primaryBtn ? <PrimaryCTA title={primaryBtn} url={primaryBtnURL} /> : null}
          {secondaryBtn ? (
            <SecondaryCTA title={secondaryBtn} url={secondaryBtnURL} />
          ) : null}
        </div>

        {withReview ? (
          <ReviewComponent
            avatars={avatars}
            starCount={starCount}
            rating={rating}
            reviews={reviews}
          />
        ) : null}
      </div>
      {src && alt ? (
        <div className="flex w-full">
          <div className="top-12 overflow-hidden">
            <Image
              src={src}
              alt={alt}
              className="h-full w-full scale-110 object-cover object-center"
              width={1200}
              height={900}
              draggable={false}
              loading="eager"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
