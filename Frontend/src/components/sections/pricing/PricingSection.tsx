import SecondaryCTA from '@/components/ui/buttons/SecondaryCTA';
import Icon from '@/components/ui/icons/Icon';

type Campaign = {
  name: string;
  description: string;
  price: string;
  cents: string;
  billingFrequency: string;
  features: string[];
  purchaseBtnTitle: string;
  purchaseLink: string;
};

type PricingData = {
  title: string;
  subTitle: string;
  badge: string;
  thirdOption?: string;
  btnText?: string;
  starterKit: Campaign;
  professionalToolbox: Campaign;
};

type PricingSectionProps = {
  pricing: PricingData;
};

export default function PricingSection({ pricing }: PricingSectionProps) {
  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
      <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-14">
        <h2 className="text-2xl font-bold tracking-tight text-balance text-neutral-800 md:text-4xl md:leading-tight dark:text-neutral-200">
          {pricing.title}
        </h2>
        <p className="mt-1 text-pretty text-neutral-600 dark:text-neutral-400">
          {pricing.subTitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-0">
        <div className="w-full rounded-xl bg-gray-800 p-6 sm:w-1/2 sm:rounded-r-none sm:p-8 lg:w-1/3">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-neutral-100 sm:text-3xl">
              {pricing.starterKit.name}
            </h3>
            <p className="text-blue-300">{pricing.starterKit.description}</p>
          </div>
          <div className="mb-4">
            <span className="text-4xl font-bold text-neutral-200">
              {pricing.starterKit.price}
            </span>
            <span className="text-lg font-bold text-neutral-300">
              {pricing.starterKit.cents}
            </span>
            <span className="ms-3 text-sm text-blue-200">
              {pricing.starterKit.billingFrequency}
            </span>
          </div>
          <ul className="mb-6 space-y-2 text-neutral-300">
            {pricing.starterKit.features.map((feature) => (
              <li key={feature} className="flex items-center gap-1.5">
                <Icon name="checkCircle" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <a
            href={pricing.starterKit.purchaseLink}
            className="block rounded-lg bg-gray-500 px-8 py-3 text-center text-sm font-bold text-gray-100 ring-blue-300 outline-hidden transition duration-100 hover:bg-gray-600 focus-visible:ring-3 active:text-gray-300 md:text-base"
          >
            {pricing.starterKit.purchaseBtnTitle}
          </a>
        </div>

        <div className="w-full rounded-xl bg-linear-to-tr from-emerald-700 to-emerald-500 p-6 shadow-xl sm:w-1/2 sm:p-8">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 lg:flex-row">
            <div>
              <h3 className="text-2xl font-bold text-neutral-100 sm:text-3xl">
                {pricing.professionalToolbox.name}
              </h3>
              <p className="text-emerald-200">
                {pricing.professionalToolbox.description}
              </p>
            </div>
            <span className="bg-opacity-50 order-first inline-block rounded-full bg-emerald-200/60 px-3 py-1 text-center text-xs font-bold tracking-wider text-emerald-700 uppercase lg:order-none">
              {pricing.badge}
            </span>
          </div>
          <div className="mb-4">
            <span className="text-6xl font-bold text-neutral-100">
              {pricing.professionalToolbox.price}
            </span>
            <span className="text-lg font-bold text-emerald-100">
              {pricing.professionalToolbox.cents}
            </span>
            <span className="ms-3 text-emerald-200">
              {pricing.professionalToolbox.billingFrequency}
            </span>
          </div>
          <ul className="mb-6 space-y-2 text-emerald-100">
            {pricing.professionalToolbox.features.map((feature) => (
              <li key={feature} className="flex items-center gap-1.5">
                <Icon name="checkCircle" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <a
            href={pricing.professionalToolbox.purchaseLink}
            className="bg-opacity-50 block rounded-lg bg-emerald-200/40 px-8 py-3 text-center text-sm font-bold text-neutral-100 ring-emerald-300 outline-hidden transition duration-300 hover:bg-emerald-300 focus-visible:ring-3 active:bg-emerald-400 md:text-base"
          >
            {pricing.professionalToolbox.purchaseBtnTitle}
          </a>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-x-3 md:mt-12">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {pricing.thirdOption}
        </p>
        <SecondaryCTA title={pricing.btnText} url="#" />
      </div>
    </section>
  );
}
