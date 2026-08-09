'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'preline';

/**
 * Client-side setup that mirrors what the Astro MainLayout did on the client:
 * initialise Lenis smooth scrolling and (re)initialise Preline UI components
 * such as dropdowns, accordions, modals and the dark-mode toggle.
 */
export default function SiteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });

    const initPreline = () => {
      type WindowWithPreline = Window & {
        HSStaticMethods?: { autoInit?: () => void };
      };
      (window as WindowWithPreline).HSStaticMethods?.autoInit?.();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPreline);
    } else {
      initPreline();
    }

    return () => {
      lenis.destroy();
      document.removeEventListener('DOMContentLoaded', initPreline);
    };
  }, []);

  return <>{children}</>;
}
