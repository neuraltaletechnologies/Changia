'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, isAuthenticated } from '@/lib/api-client';
import { ForcePasswordChange } from '@/components/dashboard/force-password-change';

/**
 * Protects dashboard routes. When there is no valid session it sends the user
 * to the landing page with the login modal auto-opened (`?auth=login`) and the
 * current path in `next` so the modal can return them here after they sign in.
 * There is no standalone /login route.
 *
 * If the signed-in user is still on a temporary password
 * (`mustChangePassword`), a full-screen gate replaces the whole dashboard
 * until they choose a new one.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      router.replace(`/?auth=login&next=${next}`);
      return;
    }
    setMustChange(Boolean(getStoredUser()?.mustChangePassword));
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Checking session…</div>
      </div>
    );
  }

  if (mustChange) {
    return <ForcePasswordChange onDone={() => setMustChange(false)} />;
  }

  return <>{children}</>;
}
