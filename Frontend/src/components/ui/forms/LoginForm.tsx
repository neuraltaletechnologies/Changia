'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import EmailInput from './input/EmailInput';
import PasswordInput from './input/PasswordInput';
import Checkbox from './input/Checkbox';
import AuthBtn from '../buttons/AuthBtn';
import GoogleBtn from '../buttons/GoogleBtn';
import { ApiClientError, loginRequest, setSession } from '@/lib/api-client';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Only allow internal redirects to avoid an open-redirect vector
  const rawRedirect = params.get('redirect') || '/dashboard';
  const redirect =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await loginRequest(email, password);
      setSession(accessToken, user);
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to sign in. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-7">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Don&apos;t have an account yet?{' '}
          <Link
            href="/register"
            className="rounded-lg p-1 font-medium text-orange-400 decoration-2 ring-zinc-500 outline-hidden hover:underline focus-visible:ring-3 dark:text-orange-400 dark:ring-zinc-200 dark:focus:outline-hidden"
          >
            Sign up here
          </Link>
        </p>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-5">
        <GoogleBtn title="Sign in with Google" redirectTo={redirect} />
        <div className="flex items-center py-3 text-xs text-neutral-400 uppercase before:me-6 before:flex-[1_1_0%] before:border-t before:border-neutral-200 after:ms-6 after:flex-[1_1_0%] after:border-t after:border-neutral-200 dark:text-neutral-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          Or
        </div>
        <form onSubmit={handleSubmit} className="grid gap-y-4">
          <div className="grid gap-y-4">
            <EmailInput
              id="login-email"
              errorId="login-email-error"
              value={email}
              onChange={setEmail}
            />
            <PasswordInput
              forgot
              id="password"
              errorId="login-password-error"
              content="8+ characters required"
              value={password}
              onChange={setPassword}
            />
            <Checkbox
              id="remember-me"
              label="Remember me"
              checked={rememberMe}
              onChange={setRememberMe}
            />
            <AuthBtn title={loading ? 'Signing in…' : 'Sign in'} disabled={loading} />
          </div>
        </form>
      </div>
    </div>
  );
}
