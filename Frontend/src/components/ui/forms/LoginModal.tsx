'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import EmailInput from './input/EmailInput';
import PasswordInput from './input/PasswordInput';
import Checkbox from './input/Checkbox';
import AuthBtn from '../buttons/AuthBtn';
import GoogleBtn from '../buttons/GoogleBtn';

const config = {
  id: 'hs-toggle-between-modals-login-modal',
  title: 'Sign in',
  subTitle: "Don't have an account yet?",
  registerBtn: 'Sign up here',
  registerBtnDataHS: '#hs-toggle-between-modals-register-modal',
};

export default function LoginModal() {
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div
      id={config.id}
      className="hs-overlay hs-overlay-backdrop-open:bg-neutral-900/90 absolute start-0 top-0 z-50 hidden h-full w-full"
      data-lenis-prevent
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
                    className="rounded-lg p-1 font-medium text-orange-400 decoration-2 ring-zinc-500 outline-hidden hover:underline focus-visible:ring-3 dark:text-orange-400 dark:ring-zinc-200 dark:focus:outline-hidden"
                    data-hs-overlay={config.registerBtnDataHS}
                  >
                    {config.registerBtn}
                  </button>
                </p>
              </div>
              <div className="mt-5">
                <GoogleBtn title="Sign in with Google" />
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
          </div>
        </div>
      </div>
    </div>
  );
}
