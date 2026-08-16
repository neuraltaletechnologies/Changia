'use client';

import { useEffect, useState } from 'react';

export default function ThemeIcon() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('hs_theme');
    const initialDark =
      stored === 'dark' ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(initialDark);
  }, []);

  const toggle = (next: boolean) => {
    setDark(next);
    localStorage.setItem('hs_theme', next ? 'dark' : 'default');
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Dark Theme Toggle"
        title="Toggle theme"
        className={`group flex h-8 w-8 items-center justify-center rounded-full font-medium text-neutral-600 ring-zinc-500 outline-hidden transition duration-300 hover:bg-neutral-200 hover:text-blue-600 dark:text-neutral-400 dark:ring-zinc-200 dark:hover:text-blue-400 dark:focus:outline-hidden ${
          dark ? 'hidden' : 'flex'
        }`}
        onClick={() => toggle(true)}
      >
        <svg
          className="size-4 shrink-0"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Light Theme Toggle"
        title="Toggle theme"
        className={`group flex h-8 w-8 items-center justify-center rounded-full font-medium text-neutral-600 ring-zinc-500 outline-hidden transition duration-300 hover:text-blue-600 dark:text-neutral-400 dark:ring-zinc-200 dark:hover:bg-neutral-700 dark:hover:text-blue-400 dark:focus:outline-hidden ${
          dark ? 'flex' : 'hidden'
        }`}
        onClick={() => toggle(false)}
      >
        <svg
          className="size-4.5 shrink-0"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 8a2 2 0 1 0 4 4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </button>
    </>
  );
}

