"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import {
  ApiClientError,
  changePasswordRequest,
  clearSession,
  getStoredUser,
  getToken,
  setSession,
} from "@/lib/api-client";

/**
 * Full-screen gate shown by AuthGuard when the signed-in user is still on a
 * temporary password (`mustChangePassword`). Nothing else in the dashboard
 * renders until they choose a new one.
 */
export function ForcePasswordChange({ onDone }: { onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) return setError("Enter your temporary password.");
    if (newPassword.length < 8)
      return setError("Your new password must be at least 8 characters.");
    if (newPassword !== confirmPassword)
      return setError("The two new passwords don't match.");
    if (newPassword === currentPassword)
      return setError("Choose a password different from the temporary one.");

    setLoading(true);
    try {
      await changePasswordRequest({ currentPassword, newPassword, confirmPassword });
      const token = getToken();
      const user = getStoredUser();
      if (token && user) {
        setSession(token, { ...user, mustChangePassword: false });
      }
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Couldn't update your password. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-center text-lg font-semibold tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Your account was created with a temporary password. Choose your own
          before continuing.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fpc-current" className="text-xs">
              Temporary password
            </Label>
            <Input
              id="fpc-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fpc-new" className="text-xs">
              New password
            </Label>
            <Input
              id="fpc-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fpc-confirm" className="text-xs">
              Confirm new password
            </Label>
            <Input
              id="fpc-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {loading ? "Saving…" : "Save & continue"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            clearSession();
            window.location.assign("/?auth=login");
          }}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
