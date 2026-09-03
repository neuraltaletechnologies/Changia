import AvatarTestimonialSection from '@/components/ui/avatars/AvatarTestimonialSection';

type Testimonial = {
  content: string;
  author: string;
  role: string;
  avatarSrc?: string | null;
  avatarAlt?: string;
};

type TestimonialsSectionAltProps = {
  title: string;
  testimonials: Testimonial[];
};

export default function TestimonialsSectionAlt({
  title,
  testimonials,
}: TestimonialsSectionAltProps) {
  if (!testimonials.length) return null;

  return (
    <section
      className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full"
      id="testimonials"
    >
      <div className="mb-6 w-3/4 max-w-2xl sm:mb-10 md:mb-16 lg:w-1/2">
        <h2 className="text-2xl font-bold text-balance text-neutral-800 sm:text-3xl lg:text-4xl dark:text-neutral-200">
          {title}
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <div key={i} className="flex h-auto">
            <div className="flex flex-col rounded-xl bg-neutral-50 dark:bg-neutral-700">
              <div className="flex-auto p-4 md:p-6">
                <p className="text-base text-pretty text-neutral-600 italic md:text-lg dark:text-neutral-300">
                  {t.content}
                </p>
              </div>
              <div className="rounded-b-xl bg-neutral-300/30 p-4 md:px-7 dark:bg-neutral-900/30">
                <div className="flex items-center">
                  <AvatarTestimonialSection src={t.avatarSrc} alt={t.avatarAlt || t.author} />
                  <div className="ms-3 grow">
                    <p className="text-sm font-bold text-neutral-800 sm:text-base dark:text-neutral-200">
                      {t.author}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
