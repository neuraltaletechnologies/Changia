type Partner = {
  icon: string;
  name?: string;
  href?: string;
};

type ClientsSectionProps = {
  title: string;
  subTitle?: string;
  partners: Partner[];
};

export default function ClientsSection({
  title,
  subTitle,
  partners,
}: ClientsSectionProps) {
  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
      <div className="mx-auto mb-6 w-full space-y-1 text-center sm:w-1/2 lg:w-1/3">
        <h2 className="text-2xl leading-tight font-bold text-balance text-neutral-800 sm:text-3xl dark:text-neutral-200">
          {title}
        </h2>
        {subTitle ? (
          <p className="leading-tight text-pretty text-neutral-600 dark:text-neutral-400">
            {subTitle}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-center justify-center gap-y-2 sm:flex-row sm:gap-x-12 sm:gap-y-0 lg:gap-x-24">
        {partners.map((partner, i) => (
          <a key={i} href={partner.href} rel="noopener noreferrer">
            <div dangerouslySetInnerHTML={{ __html: partner.icon }} />
          </a>
        ))}
      </div>
    </section>
  );
}
