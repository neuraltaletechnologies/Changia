import TestimonialItem from './TestimonialItem';
import StatsGrid from '@/components/ui/blocks/StatsGrid';

type Testimonial = {
  content: string;
  author: string;
  role: string;
  avatarSrc: string;
};

type StatProps = {
  count: string;
  description: string;
};

type TestimonialsSectionProps = {
  title: string;
  subTitle?: string;
  testimonials?: Testimonial[];
  statistics?: StatProps[];
};

export default function TestimonialsSection({
  title,
  subTitle,
  testimonials,
  statistics,
}: TestimonialsSectionProps) {
  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
      <div className="lg:grid lg:grid-cols-12 lg:items-center lg:justify-between lg:gap-16">
        <div className="lg:col-span-5 lg:col-start-1">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold text-neutral-800 lg:text-4xl dark:text-neutral-200">
              {title}
            </h2>
            {subTitle ? (
              <p className="text-neutral-600 dark:text-neutral-400">{subTitle}</p>
            ) : null}
          </div>
          {testimonials?.map((t) => (
            <TestimonialItem
              key={t.author}
              content={t.content}
              author={t.author}
              role={t.role}
              avatarSrc={t.avatarSrc}
            />
          ))}
        </div>
        {statistics ? (
          <div className="mt-10 lg:col-span-6 lg:col-end-13 lg:mt-0">
            <div className="space-y-6 sm:space-y-8">
              <ul className="grid grid-cols-2 divide-x-2 divide-y-2 divide-neutral-300 overflow-hidden dark:divide-neutral-700">
                {statistics.map((stat, index) => (
                  <StatsGrid
                    key={index}
                    count={stat.count}
                    description={stat.description}
                    index={index}
                  />
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
