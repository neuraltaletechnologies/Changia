'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/api-client';

/**
 * Protects dashboard routes. When there is no valid session it sends the user
 * to the landing page with the login modal auto-opened (`?auth=login`) and the
 * current path in `next` so the modal can return them here after they sign in.
 * There is no standalone /login route.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      router.replace(`/?auth=login&next=${next}`);
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Checking session…</div>
      </div>
    );
  }

  return <>{children}</>;
}
