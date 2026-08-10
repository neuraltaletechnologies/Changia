'use client';

import { usePathname } from 'next/navigation';
import ThemeIcon from '@/components/ThemeIcon';
import NavLink from '@/components/ui/links/NavLink';
import Authentication from '@/components/sections/misc/Authentication';
import BrandLogo from '@/components/BrandLogo';
import LanguagePicker from '@/components/ui/LanguagePicker';
import enStrings from '@/utils/navigation';
import swStrings from '@/utils/sw/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const isSw = pathname?.startsWith('/sw');
  const strings = isSw ? swStrings : enStrings;
  const homeUrl = isSw ? '/sw' : '/';

  return (
    <header className="sticky inset-x-0 top-4 z-50 flex w-full flex-wrap text-sm md:flex-nowrap md:justify-start">
      <nav
        className="relative mx-2 w-full rounded-[36px] border border-yellow-100/40 bg-yellow-50/60 px-4 py-3 backdrop-blur-md md:flex md:items-center md:justify-between md:px-6 md:py-0 lg:px-8 xl:mx-auto dark:border-neutral-700/40 dark:bg-neutral-800/80 dark:backdrop-blur-md"
        aria-label="Global"
      >
        <div className="flex items-center justify-between">
          <a
            className="flex-none rounded-lg text-xl font-bold ring-zinc-500 outline-hidden focus-visible:ring-3 dark:ring-zinc-200 dark:focus:outline-hidden"
            href={homeUrl}
            aria-label="Brand"
          >
            <BrandLogo className="h-auto w-24" />
          </a>

          <div className="mr-5 ml-auto md:hidden">
            <button
              type="button"
              className="hs-collapse-toggle flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-neutral-600 transition duration-300 hover:bg-neutral-200 disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:focus:outline-hidden"
              data-hs-collapse="#navbar-collapse-with-animation"
              aria-controls="navbar-collapse-with-animation"
              aria-label="Toggle navigation"
            >
              <svg
                className="hs-collapse-open:hidden h-[1.25rem] w-[1.25rem] shrink-0"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" x2="21" y1="6" y2="6" />
                <line x1="3" x2="21" y1="12" y2="12" />
                <line x1="3" x2="21" y1="18" y2="18" />
              </svg>
              <svg
                className="hs-collapse-open:block hidden h-[1.25rem] w-[1.25rem] shrink-0"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <span className="inline-block md:hidden">
            <ThemeIcon />
          </span>
        </div>

        <div
          id="navbar-collapse-with-animation"
          className="hs-collapse hidden grow basis-full overflow-hidden transition-all duration-300 md:block"
        >
          <div className="mt-5 flex w-full flex-col items-center gap-y-4 md:mt-0 md:flex-row md:justify-between">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center md:gap-x-6">
              {strings.navBarLinks.map((link) => (
                <NavLink key={link.url} url={link.url} name={link.name} />
              ))}
            </div>

            <div className="flex items-center gap-x-3">
              <LanguagePicker />
              <Authentication />
              <span className="hidden md:inline-block">
                <ThemeIcon />
              </span>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
