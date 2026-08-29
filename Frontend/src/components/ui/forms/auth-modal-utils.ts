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

/** Close an open Preline auth overlay (and its backdrop) by selector. */
export function closeAuthModal(selector: string) {
  if (typeof window === 'undefined') return;
  const HSOverlay = (window as Window & { HSOverlay?: HSOverlayLike }).HSOverlay;
  try {
    HSOverlay?.close?.(selector);
  } catch {
    // Preline not ready / element gone — navigation below unmounts it anyway.
  }
}
