'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { ApiClientError, resetPasswordRequest } from '@/lib/api-client';

const inputClass =
  'block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:border-neutral-200 focus:ring-3 focus:ring-neutral-400 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300 dark:focus:ring-1';

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    if (!password) nextErrors.password = 'Password is required.';
    else if (password.length < 8)
      nextErrors.password = 'Password must be at least 8 characters.';
    else if (password.length > 128)
      nextErrors.password = 'Password must be 128 characters or fewer.';
    if (confirmPassword !== password)
      nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await resetPasswordRequest({ token, password, confirmPassword });
      setDone(true);
      setTimeout(() => router.push('/?auth=login'), 2500);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to reset your password. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-900">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-6 shadow-xs sm:p-8 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
              Set a new password
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Choose a new password for your Changia account.
            </p>
          </div>

          {!token ? (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300"
            >
              This reset link is missing its token. Please request a new link from
              the{' '}
              <Link href="/?auth=login" className="font-medium underline">
                sign-in
              </Link>{' '}
              screen.
            </div>
          ) : done ? (
            <div
              role="status"
              className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300"
            >
              Your password has been reset. Redirecting you to sign in…
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-y-4">
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300"
                >
                  {error}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="reset-password"
                  className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
                >
                  New password
                </label>
                <input
                  id="reset-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  required
                  aria-invalid={Boolean(errors.password)}
                  className={inputClass}
                  placeholder="8+ characters"
                />
                {errors.password ? (
                  <p role="alert" className="mt-1 text-xs text-red-600">
                    {errors.password}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
                >
                  Confirm new password
                </label>
                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength={128}
                  required
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className={inputClass}
                  placeholder="Re-enter your new password"
                />
                {errors.confirmPassword ? (
                  <p role="alert" className="mt-1 text-xs text-red-600">
                    {errors.confirmPassword}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-x-2 rounded-lg border border-transparent bg-emerald-600 px-4 py-3 text-sm font-bold text-neutral-50 transition duration-300 hover:bg-emerald-700 focus-visible:ring-3 outline-hidden disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
          <Link
            href="/?auth=login"
            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
