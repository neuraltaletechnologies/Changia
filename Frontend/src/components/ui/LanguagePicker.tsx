'use client';

import { usePathname, useRouter } from 'next/navigation';
import Icon from './icons/Icon';
import { languages } from '@/utils/ui';

const LANGS = ['en', 'sw'] as const;
type TLanguage = (typeof LANGS)[number];

export default function LanguagePicker() {
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (lang: string) => {
    const url = new URL(window.location.href);
    const currentPath = pathname
      .split('/')
      .filter((part) => part && !LANGS.includes(part as TLanguage))
      .join('/');

    let newPath = lang !== 'en' ? `/${lang}${currentPath ? '/' + currentPath : ''}` : `/${currentPath}`;
    newPath = newPath.replace(/\/+/g, '/');
    if (newPath === '') newPath = '/';
    if (newPath === '/sw/') newPath = '/sw';

    router.push(`${newPath}${url.search}`);
  };

  return (
    <div className="hs-dropdown relative inline-flex">
      <button
        id="hs-dropdown-default"
        type="button"
        aria-label="Change language"
        title="Change language"
        className="hs-dropdown-toggle inline-flex items-center gap-x-2 rounded-lg px-1.5 py-1.5 text-sm font-medium text-neutral-600 ring-zinc-500 outline-hidden transition duration-300 hover:bg-neutral-200 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-400 dark:ring-zinc-200 dark:hover:bg-neutral-700 dark:hover:text-blue-400 dark:focus:outline-hidden"
      >
        <Icon name="earth" />
        <svg
          className="hs-dropdown-open:rotate-180 size-4"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        className="hs-dropdown-menu duration hs-dropdown-open:opacity-100 top-[98%]! left-[20%]! mt-2 hidden transform-none! rounded-lg bg-neutral-50 p-2 opacity-0 shadow-md transition-[opacity,margin] before:absolute before:start-0 before:-top-4 before:h-4 before:w-full after:absolute after:start-0 after:-bottom-4 after:h-4 after:w-full md:top-[80%]! md:left-[90%]! dark:divide-neutral-700 dark:border dark:border-neutral-700 dark:bg-neutral-800"
        aria-labelledby="hs-dropdown-default"
      >
        {Object.entries(languages).map(([lang, label]) => (
          <button
            key={lang}
            type="button"
            onClick={() => switchTo(lang)}
            className="flex w-full items-center gap-x-3.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-hidden dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
