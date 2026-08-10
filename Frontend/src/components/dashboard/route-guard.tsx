"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldX } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/dashboard/ui/button";
import { getRoleMeta } from "@/lib/dashboard/permissions";

/**
 * Route-level RBAC guard. Renders the children only if the current user's role
 * is allowed to open the current path. Otherwise shows a 403 panel explaining
 * which role the page is restricted to.
 *
 * Place inside the dashboard layout alongside AuthGuard.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, resolved, canAccessRoute, meta } = useRole();

  // Wait for the session to hydrate (AuthGuard handles the not-logged-in case).
  if (!resolved) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (canAccessRoute(pathname)) {
    return <>{children}</>;
  }

  const roleLabel = role ? getRoleMeta(role).label : "Your role";

  return (
    <div className="flex flex-1 items-center justify-center p-6 min-h-[60vh]">
      <div className="bg-card border border-border rounded-xl shadow-sm max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ShieldX className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Access restricted
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This area is not available to <span className="font-medium text-foreground">{roleLabel}</span>.
        </p>
        {meta.scope && (
          <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3 text-left leading-relaxed">
            {meta.scope}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}