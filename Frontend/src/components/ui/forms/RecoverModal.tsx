'use client';

import { useState, type FormEvent } from 'react';
import EmailInput from './input/EmailInput';
import AuthBtn from '../buttons/AuthBtn';
import { ApiClientError, forgotPasswordRequest } from '@/lib/api-client';

const config = {
  id: 'hs-toggle-between-modals-recover-modal',
  title: 'Forgot password?',
  subTitle: 'Remember your password?',
  loginBtn: 'Sign in here',
  loginBtnDataHS: '#hs-toggle-between-modals-login-modal',
};

export default function RecoverModal() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !/.+@.+\..+/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordRequest(email.trim());
      setEmail('');
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to send the reset link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id={config.id}
      className="hs-overlay hs-overlay-backdrop-open:bg-neutral-900/90 absolute start-0 top-0 z-50 hidden h-full w-full"
    >
      <div className="hs-overlay-open:mt-7 hs-overlay-open:opacity-100 hs-overlay-open:duration-500 m-3 mt-0 opacity-0 transition-all ease-out sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="mx-auto w-full max-w-md p-6">
          <div className="mt-7 rounded-xl border border-neutral-200 bg-neutral-100 shadow-xs dark:border-neutral-700 dark:bg-neutral-800">
            <div className="p-4 sm:p-7">
              <div className="text-center">
                <div
                  className="block text-2xl font-bold text-neutral-800 dark:text-neutral-200"
                  role="heading"
                  aria-level={1}
                  aria-label={config.title}
                >
                  {config.title}
                </div>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {config.subTitle}{' '}
                  <button
                    className="rounded-lg p-1 font-medium text-emerald-600 decoration-2 ring-zinc-500 outline-hidden hover:underline focus-visible:ring-3 dark:text-emerald-400 dark:ring-zinc-200 dark:focus:outline-hidden"
                    data-hs-overlay={config.loginBtnDataHS}
                  >
                    {config.loginBtn}
                  </button>
                </p>
              </div>
              <div className="mt-5">
                <form onSubmit={handleSubmit} noValidate>
                  <div className="grid gap-y-4">
                    <EmailInput
                      id="recover-email"
                      errorId="recover-email-error"
                      value={email}
                      onChange={setEmail}
                      error={error ?? undefined}
                    />
                    {sent ? (
                      <div
                        role="status"
                        className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300"
                      >
                        If that email exists, a reset link has been sent.
                      </div>
                    ) : (
                      <AuthBtn
                        title={loading ? 'Sending…' : 'Reset password'}
                        disabled={loading}
                      />
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
