import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import PrimaryCTA from '@/components/ui/buttons/PrimaryCTA';

type RightSectionProps = {
  title: string;
  subTitle: string;
  btnExists?: boolean;
  btnTitle?: string;
  btnURL?: string;
  single?: boolean;
  imgOne?: StaticImageData;
  imgOneAlt?: string;
  imgTwo?: StaticImageData;
  imgTwoAlt?: string;
};

export default function RightSection({
  title,
  subTitle,
  btnExists,
  btnTitle,
  btnURL,
  single,
  imgOne,
  imgOneAlt,
  imgTwo,
  imgTwoAlt,
}: RightSectionProps) {
  return (
    <section className="mx-auto max-w-[85rem] items-center gap-16 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-2 lg:px-8 lg:py-14 2xl:max-w-full">
      <div>
        <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-balance text-neutral-800 dark:text-neutral-200">
          {title}
        </h2>
        <p className="mb-4 max-w-prose font-normal text-pretty text-neutral-600 sm:text-lg dark:text-neutral-400">
          {subTitle}
        </p>
        {btnExists ? <PrimaryCTA title={btnTitle} url={btnURL} /> : null}
      </div>
      {single || !imgTwo ? (
        <div className="mt-8">
          {imgOne ? (
            <Image
              className="w-full rounded-lg"
              src={imgOne}
              alt={imgOneAlt || ''}
              width={800}
              height={600}
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4">
          {imgOne ? (
            <Image
              className="w-full rounded-xl"
              src={imgOne}
              alt={imgOneAlt || ''}
              width={800}
              height={600}
              draggable={false}
            />
          ) : null}
          {imgTwo ? (
            <Image
              className="mt-4 w-full rounded-xl lg:mt-10"
              src={imgTwo}
              alt={imgTwoAlt || ''}
              width={800}
              height={600}
              draggable={false}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
