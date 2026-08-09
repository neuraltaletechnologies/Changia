import PrimaryCTA from '@/components/ui/buttons/PrimaryCTA';

type MainSectionProps = {
  title: string;
  subTitle: string;
  btnExists?: boolean;
  btnTitle?: string;
  btnURL?: string;
};

export default function MainSection({
  title,
  subTitle,
  btnExists,
  btnTitle,
  btnURL,
}: MainSectionProps) {
  return (
    <section className="mx-auto mt-10 max-w-[85rem] px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-14 2xl:max-w-full">
      <div className="max-w-(--breakpoint-md)">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-balance text-neutral-800 dark:text-neutral-200">
          {title}
        </h1>
        <p className="mb-8 max-w-prose font-normal text-pretty text-neutral-600 sm:text-xl dark:text-neutral-400">
          {subTitle}
        </p>
        {btnExists ? (
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <PrimaryCTA title={btnTitle} url={btnURL} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
