type Partner = {
  /** Path to the official logo file, e.g. `/payments/mpesa.svg`. */
  logo: string;
  /** Optional inline-SVG fallback used until a real logo file is dropped in. */
  icon?: string;
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
      <div className="-mx-4 flex flex-row flex-nowrap items-center justify-start gap-x-5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-5 sm:px-0 lg:gap-x-14">
        {partners.map((partner, i) => (
          <a
            key={i}
            href={partner.href}
            rel="noopener noreferrer"
            aria-label={partner.name}
            className="shrink-0"
          >
            {partner.icon ? (
              <div dangerouslySetInnerHTML={{ __html: partner.icon }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.logo}
                alt={partner.name ?? ''}
                loading="lazy"
                className="block h-12 w-auto max-w-[150px] object-contain sm:h-14"
              />
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
