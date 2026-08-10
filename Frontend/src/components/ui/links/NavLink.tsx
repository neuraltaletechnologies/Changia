'use client';

import { usePathname } from 'next/navigation';

type NavLinkProps = {
  url: string;
  name: string;
};

export default function NavLink({ url, name }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === url ||
    (url !== '/' && pathname?.startsWith(url)) ||
    (url === '/' && (pathname === '/' || pathname === '/sw'));

  const activeClasses =
    'text-orange-400 dark:text-orange-300';
  const inactiveClasses =
    'text-neutral-600 hover:text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-500';

  return (
    <a
      id={url === '/' ? 'home' : url.replace(/\//g, '')}
      href={url}
      aria-current={isActive ? 'page' : undefined}
      className={`rounded-lg text-base font-medium ring-zinc-500 outline-hidden focus-visible:ring-3 md:py-3 md:text-sm 2xl:text-base dark:ring-zinc-200 dark:focus:outline-hidden ${
        isActive ? activeClasses : inactiveClasses
      }`}
    >
      {name}
    </a>
  );
}
