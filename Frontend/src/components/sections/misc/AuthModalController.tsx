'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/api-client';
import {
  LOGIN_MODAL_SELECTOR,
  REGISTER_MODAL_SELECTOR,
  resolveAuthNext,
} from '@/components/ui/forms/auth-modal-utils';

type PrelineWindow = Window & {
  HSOverlay?: { open?: (target: string) => void };
  HSStaticMethods?: { autoInit?: (collection?: string | string[]) => void };
};

/**
 * Opens the navbar login/register modal when the URL asks for it
 * (`?auth=login` / `?auth=register`) — used by the auth guard, the API client's
 * 401 handler and the marketing "Start a Fundraiser" CTAs now that there is no
 * standalone /login page. If the visitor is already signed in, it skips the
 * modal and forwards straight to `next`.
 */
function AuthModalControllerInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const which = params.get('auth');
    if (which !== 'login' && which !== 'register') return;

    if (isAuthenticated()) {
      router.replace(resolveAuthNext(params.get('next')));
      return;
    }

    const selector =
      which === 'register' ? REGISTER_MODAL_SELECTOR : LOGIN_MODAL_SELECTOR;

    // Preline initialises its overlays on the client after hydration — poll
    // briefly until HSOverlay and the modal element are both ready.
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const w = window as PrelineWindow;
      const el = document.querySelector(selector);
      if (w.HSOverlay?.open && el) {
        // Make sure Preline has registered this overlay before opening it.
        w.HSStaticMethods?.autoInit?.('overlay');
        w.HSOverlay.open(selector);
        window.clearInterval(timer);
      } else if (tries > 60) {
        window.clearInterval(timer);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [params, router]);

  return null;
}

export default function AuthModalController() {
  return (
    <Suspense fallback={null}>
      <AuthModalControllerInner />
    </Suspense>
  );
}
