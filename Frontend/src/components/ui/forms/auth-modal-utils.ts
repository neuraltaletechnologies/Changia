'use client';

/**
 * Shared helpers for the navbar auth modals (login / register / recover).
 * These modals are the only auth surface — there is no standalone /login page —
 * so they need to honour a `next` query param and tidy up the Preline overlay
 * before navigating away.
 */

export const LOGIN_MODAL_SELECTOR = '#hs-toggle-between-modals-login-modal';
export const REGISTER_MODAL_SELECTOR = '#hs-toggle-between-modals-register-modal';

type HSOverlayLike = {
  close?: (target: string) => void;
  getInstance?: (
    target: string,
    isInstance?: boolean
  ) => { element?: { close?: (forceClose?: boolean) => unknown } } | undefined;
};

/** Resolve a safe internal path to send the user to after they authenticate. */
export function resolveAuthNext(raw: string | null | undefined): string {
  if (!raw) return '/dashboard';
  // Only allow internal, single-slash paths — no open-redirect vector.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

/**
 * The post-auth destination taken from the current URL's `next` param. Read
 * straight off `window.location` so the modals don't need `useSearchParams`
 * (which would force a Suspense boundary around the navbar on every page).
 */
export function getAuthNextFromLocation(): string {
  if (typeof window === 'undefined') return '/dashboard';
  return resolveAuthNext(
    new URLSearchParams(window.location.search).get('next')
  );
}

/**
 * Remove any leftover Preline overlay chrome: the backdrop element (Preline
 * appends it to <body>, outside React) and the scroll-lock it puts on <body>.
 * Safe to call anywhere, any time — it only touches Preline's own artefacts.
 */
export function clearOverlayBackdrop() {
  if (typeof document === 'undefined') return;
  document
    .querySelectorAll(
      '.hs-overlay-backdrop, [data-hs-overlay-backdrop-template]'
    )
    .forEach((el) => el.remove());
  document.body.classList.remove('hs-overlay-body-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
}

/**
 * Close an open Preline auth overlay by selector and clear its backdrop.
 * We navigate away right after this (into the dashboard, which has no Preline),
 * so force the close — an animated close would leave the backdrop behind.
 */
export function closeAuthModal(selector: string) {
  if (typeof window === 'undefined') return;
  const HSOverlay = (window as Window & { HSOverlay?: HSOverlayLike }).HSOverlay;
  try {
    const instance = HSOverlay?.getInstance?.(selector, true);
    if (instance?.element?.close) {
      instance.element.close(true);
    } else {
      HSOverlay?.close?.(selector);
    }
  } catch {
    // Preline not ready / element gone — the sweep below still cleans up.
  }
  clearOverlayBackdrop();
}
