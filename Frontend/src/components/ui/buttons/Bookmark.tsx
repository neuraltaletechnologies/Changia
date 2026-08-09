'use client';

import { useEffect } from 'react';
import Icon from '../icons/Icon';

export default function Bookmark() {
  useEffect(() => {
    const KEY = 'bookmarks';
    const button = document.querySelector<HTMLButtonElement>(
      '[data-bookmark-button="bookmark-button"]'
    );

    if (!button) return;

    const getStored = (): string[] => {
      const item = localStorage.getItem(KEY);
      return item ? JSON.parse(item) : [];
    };

    const markAsStored = () => {
      button.classList.add('bookmarked');
      const svg = button.querySelector('svg');
      svg?.setAttribute('class', 'h-6 w-6 fill-red-500 dark:fill-red-500');
      const path = svg?.querySelector('path');
      path?.setAttribute('class', 'fill-current text-red-500 dark:text-red-500');
    };

    const unmarkAsStored = () => {
      button.classList.remove('bookmarked');
      const svg = button.querySelector('svg');
      svg?.setAttribute('class', 'h-6 w-6 fill-none');
      const path = svg?.querySelector('path');
      path?.setAttribute(
        'class',
        'fill-current text-neutral-500 group-hover:text-red-400 dark:text-neutral-500 dark:group-hover:text-red-400'
      );
    };

    if (getStored().includes(window.location.pathname)) markAsStored();

    const onClick = () => {
      const stored = getStored();
      const idx = stored.indexOf(window.location.pathname);
      if (idx !== -1) {
        stored.splice(idx, 1);
        unmarkAsStored();
      } else {
        stored.push(window.location.pathname);
        markAsStored();
      }
      localStorage.setItem(KEY, JSON.stringify(stored));
    };

    button.addEventListener('click', onClick);
    return () => button.removeEventListener('click', onClick);
  }, []);

  return (
    <button
      type="button"
      className="focus-visible:ring-secondary group inline-flex items-center rounded-lg p-2.5 text-neutral-600 ring-zinc-500 outline-hidden transition duration-300 hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-1 focus-visible:outline-hidden dark:text-neutral-400 dark:ring-zinc-200 dark:hover:bg-neutral-700"
      data-bookmark-button="bookmark-button"
    >
      <Icon name="bookmark" />
    </button>
  );
}
