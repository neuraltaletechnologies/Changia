'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import EmailInput from './input/EmailInput';
import PasswordInput from './input/PasswordInput';
import Checkbox from './input/Checkbox';
import GoogleBtn from '../buttons/GoogleBtn';
import AuthBtn from '../buttons/AuthBtn';
import { ApiClientError, registerRequest, setSession } from '@/lib/api-client';
import {
  closeAuthModal,
  getAuthNextFromLocation,
  REGISTER_MODAL_SELECTOR,
} from './auth-modal-utils';

const config = {
  id: 'hs-toggle-between-modals-register-modal',
  title: 'Sign up',
  subTitle: 'Already have an account?',
  loginBtn: 'Sign in here',
  loginBtnDataHS: '#hs-toggle-between-modals-login-modal',
};

const inputClass =
  'block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:border-neutral-200 focus:ring-3 focus:ring-neutral-400 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300 dark:focus:ring-1';

export default function RegisterModal() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    email: '',
    phone: '',
    organizationName: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setField = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'Full name is required.';
    else if (form.firstName.trim().length < 2)
      nextErrors.firstName = 'Full name must be at least 2 characters.';
    else if (form.firstName.trim().length > 100)
      nextErrors.firstName = 'Full name must be 100 characters or fewer.';
    if (!form.organizationName.trim())
      nextErrors.organizationName = 'Organization name is required.';
    else if (form.organizationName.trim().length < 2)
      nextErrors.organizationName = 'Organization name must be at least 2 characters.';
    else if (form.organizationName.trim().length > 150)
      nextErrors.organizationName = 'Organization name must be 150 characters or fewer.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/.+@.+\..+/.test(form.email.trim()))
      nextErrors.email = 'Please enter a valid email address.';
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';
    else if (!/^(\+?255|0)?[67][0-9]{8}$/.test(form.phone.replace(/[\s-]/g, '')))
      nextErrors.phone = 'Enter a valid Tanzanian phone number.';
    if (!form.password) nextErrors.password = 'Password is required.';
    else if (form.password.length < 8)
      nextErrors.password = 'Password must be at least 8 characters.';
    else if (form.password.length > 128)
      nextErrors.password = 'Password must be 128 characters or fewer.';
    if (form.confirmPassword !== form.password)
      nextErrors.confirmPassword = 'Passwords do not match.';
    if (!termsAccepted) nextErrors.terms = 'Please accept the terms and conditions to continue.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const { accessToken, user } = await registerRequest({
        firstName: form.firstName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
        organizationName: form.organizationName,
        termsAccepted,
      });
      setSession(accessToken, user);
      closeAuthModal(REGISTER_MODAL_SELECTOR);
      router.push(getAuthNextFromLocation());
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to create your account. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div
      id={config.id}
      className="hs-overlay hs-overlay-backdrop-open:bg-neutral-900/90 absolute start-0 top-0 z-50 hidden h-full w-full"
      data-lenis-prevent
    >
      <div className="hs-overlay-open:mt-7 hs-overlay-open:opacity-100 hs-overlay-open:duration-500 m-3 mt-0 opacity-0 transition-all ease-out sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="mx-auto w-full max-w-md p-6">
          <div className="mt-7 flex max-h-[calc(100vh-8rem)] flex-col rounded-xl border border-neutral-200 bg-neutral-100 shadow-xs dark:border-neutral-700 dark:bg-neutral-800">
            <div className="overflow-y-auto p-4 sm:p-7">
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

              {error ? (
                <div
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <div className="mt-5">
                <GoogleBtn title="Sign up with Google" />
                <div className="flex items-center py-3 text-xs text-neutral-400 uppercase before:me-6 before:flex-[1_1_0%] before:border-t before:border-neutral-200 after:ms-6 after:flex-[1_1_0%] after:border-t after:border-neutral-200 dark:text-neutral-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
                  Or
                </div>
                <form onSubmit={handleSubmit} noValidate>
                  <div className="grid gap-y-4">
                    <div>
                      <label
                        htmlFor="register-name"
                        className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
                      >
                        Full name
                      </label>
                      <input
                        id="register-name"
                        name="firstName"
                        value={form.firstName}
                        onChange={(e) => setField('firstName')(e.target.value)}
                        maxLength={100}
                        required
                        aria-invalid={Boolean(errors.firstName)}
                        className={inputClass}
                        placeholder="Amina Msuya"
                      />
                      {errors.firstName ? (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                      ) : null}
                    </div>
                    <div>
                      <label
                        htmlFor="register-org-name"
                        className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
                      >
                        Organization name
                      </label>
                      <input
                        id="register-org-name"
                        name="organizationName"
                        value={form.organizationName}
                        onChange={(e) => setField('organizationName')(e.target.value)}
                        maxLength={150}
                        required
                        aria-invalid={Boolean(errors.organizationName)}
                        className={inputClass}
                        placeholder="Dr. Msuya Foundation"
                      />
                      {errors.organizationName ? (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors.organizationName}</p>
                      ) : null}
                    </div>
                    <EmailInput
                      id="register-email"
                      errorId="register-email-error"
                      value={form.email}
                      onChange={setField('email')}
                      error={errors.email}
                    />
                    <div>
                      <label
                        htmlFor="register-phone"
                        className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
                      >
                        Phone number
                      </label>
                      <input
                        id="register-phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setField('phone')(e.target.value)}
                        required
                        aria-invalid={Boolean(errors.phone)}
                        className={inputClass}
                        placeholder="0712 345 678"
                      />
                      {errors.phone ? (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors.phone}</p>
                      ) : null}
                    </div>
                    <PasswordInput
                      id="create-password"
                      errorId="register-password-error"
                      content="8+ characters required"
                      value={form.password}
                      onChange={setField('password')}
                      error={errors.password}
                    />
                    <PasswordInput
                      label="Confirm Password"
                      id="confirm-password"
                      errorId="confirm-password-error"
                      content="Password does not match the password"
                      value={form.confirmPassword}
                      onChange={setField('confirmPassword')}
                      error={errors.confirmPassword}
                    />
                    <Checkbox
                      label="I accept the "
                      id="terms-agree"
                      checked={termsAccepted}
                      onChange={setTermsAccepted}
                    >
                      <a
                        className="font-medium text-emerald-600 decoration-2 hover:underline dark:text-emerald-400 dark:focus:outline-hidden"
                        href="/terms"
                        target="_blank"
                      >
                        Terms and Conditions
                      </a>
                    </Checkbox>
                    {errors.terms ? (
                      <p role="alert" className="-mt-2 text-xs text-red-600">{errors.terms}</p>
                    ) : null}
                    <AuthBtn
                      title={loading ? 'Creating account…' : 'Sign up'}
                      disabled={loading}
                    />
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
