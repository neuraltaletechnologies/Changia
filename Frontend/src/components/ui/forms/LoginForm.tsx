'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { FormEvent } from 'react';
import EmailInput from './input/EmailInput';
import PasswordInput from './input/PasswordInput';
import Checkbox from './input/Checkbox';
import AuthBtn from '../buttons/AuthBtn';
import GoogleBtn from '../buttons/GoogleBtn';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push(redirect);
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
            href="/"
            className="rounded-lg p-1 font-medium text-orange-400 decoration-2 ring-zinc-500 outline-hidden hover:underline focus-visible:ring-3 dark:text-orange-400 dark:ring-zinc-200 dark:focus:outline-hidden"
          >
            Sign up here
          </Link>
        </p>
      </div>
      <div className="mt-5">
        <GoogleBtn title="Sign in with Google" redirectTo={redirect} />
        <div className="flex items-center py-3 text-xs text-neutral-400 uppercase before:me-6 before:flex-[1_1_0%] before:border-t before:border-neutral-200 after:ms-6 after:flex-[1_1_0%] after:border-t after:border-neutral-200 dark:text-neutral-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          Or
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-y-4">
            <EmailInput id="login-email" errorId="login-email-error" />
            <PasswordInput
              forgot
              id="password"
              errorId="login-password-error"
              content="8+ characters required"
            />
            <Checkbox id="remember-me" />
            <AuthBtn title="Sign in" />
          </div>
        </form>
      </div>
    </div>
  );
}
