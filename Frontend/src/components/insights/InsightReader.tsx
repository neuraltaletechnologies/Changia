'use client';

import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u00FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function InsightReader({ body }: { body: string }) {
  useEffect(() => {
    const onScroll = () => {
      const article = document.querySelector('article');
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const scrollTop = window.scrollY;
      const articleOffsetTop = rect.top + scrollTop;
      const articleHeight = rect.height;
      const progress = Math.min(
        100,
        Math.max(
          0,
          ((scrollTop - articleOffsetTop) / (articleHeight - window.innerHeight)) * 100
        )
      );
      const bar = document.getElementById('progress');
      const barMobile = document.getElementById('progress-mobile');
      if (bar) bar.style.width = `${progress}%`;
      if (barMobile) barMobile.style.width = `${progress}%`;
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="mt-8 scroll-mt-24 text-3xl font-bold text-neutral-800 dark:text-neutral-200">
        {children}
      </h1>
    ),
    h2: ({ children }) => {
      const text = String(children ?? '');
      const id = slugify(text);
      return (
        <h2
          id={id}
          className="mt-8 scroll-mt-24 text-2xl font-bold text-neutral-800 dark:text-neutral-200"
        >
          {children}
        </h2>
      );
    },
    p: ({ children }) => (
      <p className="mt-4 text-lg text-pretty text-neutral-700 dark:text-neutral-300">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mt-4 list-disc space-y-2 ps-6 text-lg text-neutral-700 dark:text-neutral-300">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-2 ps-6 text-lg text-neutral-700 dark:text-neutral-300">
        {children}
      </ol>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-medium text-blue-600 underline dark:text-blue-400"
      >
        {children}
      </a>
    ),
  };

  return (
    <article className="text-lg text-pretty text-neutral-700 dark:text-neutral-300">
      <ReactMarkdown components={components}>{body}</ReactMarkdown>
    </article>
  );
}

