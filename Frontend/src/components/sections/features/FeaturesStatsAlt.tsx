import Image from 'next/image';
import campaign5 from '@/images/features-image.avif';

type FeaturesStatsAltProps = {
  title: string;
  subTitle?: string;
  benefits?: string[];
};

const ListItemMarker =
  '<svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mt-0.5 h-6 w-6 text-blue-600 dark:text-blue-400 flex-none"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>';

export default function FeaturesStatsAlt({
  title,
  subTitle,
  benefits,
}: FeaturesStatsAltProps) {
  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
      <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-7">
          <Image
            className="rounded-xl"
            src={campaign5}
            alt="Mockup of floating boxes"
            width={1200}
            height={800}
          />
        </div>
        <div className="mt-5 sm:mt-10 lg:col-span-5 lg:mt-0">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-2 md:space-y-4">
              <h2 className="text-3xl font-bold text-balance text-neutral-800 lg:text-4xl dark:text-neutral-200">
                {title}
              </h2>
              {subTitle ? (
                <p className="text-pretty text-neutral-600 dark:text-neutral-400">
                  {subTitle}
                </p>
              ) : null}
            </div>
            {benefits ? (
              <ul className="space-y-2 sm:space-y-4">
                {benefits.map((item) => (
                  <li key={item} className="flex space-x-3">
                    <span dangerouslySetInnerHTML={{ __html: ListItemMarker }} />
                    <span className="text-base font-medium text-pretty text-neutral-600 dark:text-neutral-400">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
