import StatsBig from '@/components/ui/blocks/StatsBig';
import StatsSmall from '@/components/ui/blocks/StatsSmall';

type Stat = {
  stat: string;
  description: string;
};

type FeaturesStatsProps = {
  title: string;
  subTitle?: string;
  mainStatTitle: string;
  mainStatSubTitle: string;
  stats?: Stat[];
};

export default function FeaturesStats({
  title,
  subTitle,
  mainStatTitle,
  mainStatSubTitle,
  stats,
}: FeaturesStatsProps) {
  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
      <div className="max-w-(--breakpoint-md)">
        <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-balance text-neutral-800 dark:text-neutral-200">
          {title}
        </h2>
        {subTitle ? (
          <p className="mb-16 max-w-prose font-normal text-pretty text-neutral-600 sm:text-xl dark:text-neutral-400">
            {subTitle}
          </p>
        ) : null}
      </div>
      <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <StatsBig title={mainStatTitle} subTitle={mainStatSubTitle} />
        </div>
        {stats ? (
          <div className="relative lg:col-span-8 lg:before:absolute lg:before:-start-12 lg:before:top-0 lg:before:h-full lg:before:w-px lg:before:bg-neutral-300 lg:dark:before:bg-neutral-700">
            <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4 lg:grid-cols-3">
              {stats.map((stat) => (
                <StatsSmall
                  key={stat.stat}
                  title={stat.stat}
                  subTitle={stat.description}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
