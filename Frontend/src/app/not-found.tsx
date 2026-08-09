'use client';

import { usePathname } from 'next/navigation';

export default function NotFound() {
  const pathname = usePathname();
  const isFr = pathname?.startsWith('/fr');

  const pageTitle = isFr
    ? 'Page Non Trouvée | ScrewFast'
    : 'Page Not Found | ScrewFast';
  const subTitle = isFr
    ? "Oops, ce n'est pas l'outil que vous recherchiez!"
    : "Oops, this isn't the tool you were looking for!";
  const content = isFr
    ? "Ne laissez pas ce contretemps vous ralentir. Revenons à la construction de votre chef-d'œuvre."
    : "Don't let this hiccup slow you down. Let's get you back to building your masterpiece.";
  const btnTitle = isFr ? 'Retournez' : 'Go Back';

  return (
    <section className="grid h-svh place-content-center">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 lg:px-6 lg:py-16">
        <div className="mx-auto max-w-(--breakpoint-sm) text-center">
          <h1 className="text-dark mb-4 text-7xl font-extrabold text-yellow-500 lg:text-9xl dark:text-yellow-400">
            404
          </h1>
          <p className="mb-4 text-3xl font-bold tracking-tight text-balance text-neutral-700 md:text-4xl dark:text-neutral-300">
            {subTitle}
          </p>
          <p className="mb-4 text-lg text-pretty text-neutral-600 dark:text-neutral-400">
            {content}
          </p>
          <button
            type="button"
            onClick={() => (typeof window !== 'undefined' ? window.history.back() : undefined)}
            className="group inline-flex items-center justify-center gap-x-2 rounded-lg border border-transparent bg-orange-400 px-4 py-3 text-sm font-bold text-neutral-50 ring-zinc-500 transition duration-300 focus-visible:ring-3 outline-hidden hover:bg-orange-500 active:bg-orange-500 dark:ring-zinc-200 dark:focus:outline-hidden"
          >
            {btnTitle}
            <span className="inline-flex">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
