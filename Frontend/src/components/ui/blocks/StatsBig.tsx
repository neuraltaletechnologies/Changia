type StatsBigProps = {
  title: string;
  subTitle: string;
};

export default function StatsBig({ title, subTitle }: StatsBigProps) {
  return (
    <div className="lg:pe-6 xl:pe-12">
      <p className="text-6xl leading-10 font-bold text-blue-600 dark:text-blue-400">
        {title}
      </p>
      <p className="mt-2 text-neutral-600 sm:mt-3 dark:text-neutral-400">{subTitle}</p>
    </div>
  );
}
