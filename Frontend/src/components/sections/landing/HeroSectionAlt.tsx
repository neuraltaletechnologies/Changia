import GithubBtn from '@/components/ui/buttons/GithubBtn';

type HeroSectionAltProps = {
  title: string;
  subTitle?: string;
  url?: string;
};

export default function HeroSectionAlt({ title, subTitle, url }: HeroSectionAltProps) {
  return (
    <section className="relative mx-auto max-w-[85rem] px-4 pt-10 pb-24 sm:px-6 lg:px-8">
      <div className="absolute top-[55%] left-0 scale-90 md:top-[20%] xl:top-[25%] xl:left-[10%]">
        <svg width="64" height="64" fill="none" strokeWidth="1.5" color="#ea580c" viewBox="0 0 24 24">
          <path fill="#ea580c" stroke="#ea580c" strokeLinecap="round" strokeLinejoin="round" d="M12 23a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM3 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM3 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
          <path stroke="#ea580c" strokeLinecap="round" strokeLinejoin="round" d="M21 7.353v9.294a.6.6 0 0 1-.309.525l-8.4 4.666a.6.6 0 0 1-.582 0l-8.4-4.666A.6.6 0 0 1 3 16.647V7.353a.6.6 0 0 1 .309-.524l8.4-4.667a.6.6 0 0 1 .582 0l8.4 4.667a.6.6 0 0 1 .309.524Z" />
          <path stroke="#ea580c" strokeLinecap="round" strokeLinejoin="round" d="m3.528 7.294 8.18 4.544a.6.6 0 0 0 .583 0l8.209-4.56M12 21v-9" />
        </svg>
      </div>
      <div className="absolute top-0 left-[85%] scale-75">
        <svg width="64" height="64" fill="none" strokeWidth="1.5" color="#fbbf24" viewBox="0 0 24 24">
          <path stroke="#fbbf24" strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
          <path fill="#fbbf24" stroke="#fbbf24" strokeLinecap="round" strokeLinejoin="round" d="M5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
          <path stroke="#fbbf24" strokeLinecap="round" strokeLinejoin="round" d="M5 10.5V9M5 15v-1.5" />
          <path fill="#fbbf24" stroke="#fbbf24" strokeLinecap="round" strokeLinejoin="round" d="M5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
          <path stroke="#fbbf24" strokeLinecap="round" strokeLinejoin="round" d="M10.5 19H9M15 19h-1.5" />
        </svg>
      </div>
      <div className="mx-auto mt-5 max-w-xl text-center">
        <h2 className="block text-4xl leading-tight font-bold tracking-tight text-balance text-neutral-800 md:text-5xl lg:text-6xl dark:text-neutral-200">
          {title}
        </h2>
      </div>
      <div className="mx-auto mt-5 max-w-3xl text-center">
        {subTitle ? (
          <p className="text-lg text-pretty text-neutral-600 dark:text-neutral-400">{subTitle}</p>
        ) : null}
      </div>
      {url ? (
        <div className="mt-8 flex justify-center gap-3">
          <GithubBtn url={url} title="Continue with Github" />
        </div>
      ) : null}
    </section>
  );
}
